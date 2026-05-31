import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import * as db from './db';
import { loadAppConfig, saveAppConfig } from './config';
import { getLibraryRoot, getThumbnailsDir } from './db/provider';
import { scanLibrary, getScanProgress, metadataQueue, calculateFileHash } from './scanner';
import { getIngestTallies, spawnIngestScript } from './ingestRunner';

let mainWindow: BrowserWindow | null = null;
let workerWindow: BrowserWindow | null = null;
let isProcessingQueue = false;

// Envelope helper for IPC responses
function envelope<T>(fn: (...args: any[]) => Promise<T>) {
    return async (event: any, ...args: any[]): Promise<{ ok: boolean; data?: T; error?: string }> => {
        try {
            const res = await fn(...args);
            return { ok: true, data: res };
        } catch (err: any) {
            console.error('[IPC Main Error]', err);
            return { ok: false, error: err.message || String(err) };
        }
    };
}

function createWindow() {
    const isDev = process.env.ELECTRON_IS_DEV === '1';
    
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        title: 'Driftara Video',
        backgroundColor: '#09090b', // zinc-950
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
        },
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
        if (workerWindow) {
            workerWindow.close();
            workerWindow = null;
        }
    });
}

function createWorkerWindow() {
    workerWindow = new BrowserWindow({
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    workerWindow.loadFile(path.join(__dirname, 'worker.html'));
    
    workerWindow.on('closed', () => {
        workerWindow = null;
    });
}

// Queue Processor
async function processNextQueueItem() {
    if (isProcessingQueue || metadataQueue.length === 0) return;
    isProcessingQueue = true;

    const item = metadataQueue.shift();
    if (!item) {
        isProcessingQueue = false;
        return;
    }

    if (workerWindow) {
        workerWindow.webContents.send('extract-metadata', {
            videoId: item.id,
            filePath: item.filePath,
            thumbnailsDir: getThumbnailsDir()
        });
    } else {
        console.error('[Main] Frame capture worker window is not initialized. Skipping metadata processing.');
        isProcessingQueue = false;
    }
}

// ── Startup & Lifecycle ──────────────────────────────────────────────────────

app.whenReady().then(async () => {
    // 1. Initialize SQLite Database
    try {
        await db.connectDB();
        console.log('[Main] SQLite database initialized and migrated successfully');
    } catch (err) {
        console.error('[Main] Failed to initialize SQLite database:', err);
    }

    // 2. Build windows
    createWindow();
    createWorkerWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
            createWorkerWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// ── IPC Handlers Registration ────────────────────────────────────────────────

ipcMain.handle('ping', () => 'pong');

// DB connection
ipcMain.handle('db:check-connection', envelope(async () => {
    return db.checkConnection();
}));

// Video queries
ipcMain.handle('db:get-video-count', envelope(async (options: any) => {
    return db.getVideoCount(options);
}));

ipcMain.handle('db:get-videos', envelope(async (options: any) => {
    return db.getVideos(options);
}));

ipcMain.handle('db:get-video-details', envelope(async (id: number) => {
    return db.getVideoDetails(id);
}));

ipcMain.handle('db:update-video-details', envelope(async ({ id, updates }: { id: number; updates: any }) => {
    return db.updateVideoDetails(id, updates);
}));

ipcMain.handle('db:delete-video', envelope(async ({ id, deleteFileFromDisk }: { id: number; deleteFileFromDisk: boolean }) => {
    return db.deleteVideo(id, deleteFileFromDisk);
}));

ipcMain.handle('db:get-folders', envelope(async () => {
    return db.getFolders();
}));

ipcMain.handle('db:delete-folder', envelope(async (id: number) => {
    return db.deleteFolder(id);
}));

ipcMain.handle('db:get-keywords', envelope(async () => {
    return db.getKeywords();
}));

ipcMain.handle('db:get-dates-with-shots', envelope(async (options: any) => {
    return db.getDatesWithShots(options);
}));

// Scanner
ipcMain.handle('scanner:get-progress', envelope(async () => {
    return getScanProgress();
}));

ipcMain.handle('scanner:start-scan', envelope(async () => {
    const progress = await scanLibrary();
    // Start background processing loop for new items
    if (progress.queueLength > 0) {
        processNextQueueItem();
    }
    return progress;
}));

// Python Ingest Inbound Actions
ipcMain.handle('ingest:get-logs', envelope(async () => {
    return db.getIngestLogs();
}));

ipcMain.handle('ingest:run', envelope(async (payload: { sourcePath: string; dryRun?: boolean } | string) => {
    const sourcePath = typeof payload === 'string' ? payload : payload.sourcePath;
    const dryRun = typeof payload === 'string' ? false : Boolean(payload.dryRun);

    if (!sourcePath?.trim()) {
        throw new Error('sourcePath is required');
    }

    console.log(`[Main] Spawning python ingest for source: ${sourcePath}${dryRun ? ' (dry-run)' : ''}`);
    const libraryRoot = getLibraryRoot();

    let consoleOutput = '';
    const pythonProcess = spawnIngestScript({
        sourcePath: sourcePath.trim(),
        destRoot: libraryRoot,
        dryRun,
        onStdout: (text) => {
            consoleOutput += text;
            mainWindow?.webContents.send('ingest:output', { type: 'stdout', text });
        },
        onStderr: (text) => {
            consoleOutput += text;
            mainWindow?.webContents.send('ingest:output', { type: 'stderr', text });
        },
    });

    pythonProcess.on('close', async (code) => {
        const { copied, skipped, errors } = getIngestTallies(pythonProcess);
        console.log(`[Main] Ingest child process exited with code ${code}`);
        mainWindow?.webContents.send('ingest:output', {
            type: 'exit',
            code: code ?? 0,
            dryRun,
            copied,
            skipped,
            errors,
        });

        await db.writeIngestLog({
            source_path: dryRun ? `[dry-run] ${sourcePath}` : sourcePath,
            copied_count: copied,
            skipped_count: skipped,
            errors_count: errors,
            console_output: consoleOutput,
        });

        if (!dryRun) {
            const progress = await scanLibrary();
            mainWindow?.webContents.send('scanner:progress-update', progress);
            if (progress.queueLength > 0) {
                processNextQueueItem();
            }
        }
    });

    return true;
}));

// OS shell utilities
ipcMain.handle('fs:select-directory', envelope(async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    return result.canceled ? null : result.filePaths[0];
}));

ipcMain.handle('fs:reveal-in-explorer', envelope(async (filePath: string) => {
    if (fs.existsSync(filePath)) {
        shell.showItemInFolder(filePath);
        return true;
    }
    return false;
}));

ipcMain.handle('system:open-external-url', async (event, url) => {
    await shell.openExternal(url);
});

ipcMain.handle('system:get-library-root', () => {
    return getLibraryRoot();
});

// System settings load/save
ipcMain.handle('system:get-config', envelope(async () => {
    return loadAppConfig();
}));

ipcMain.handle('system:save-config', envelope(async (updates: any) => {
    return saveAppConfig(updates);
}));

// ── Background Worker Message Routing ────────────────────────────────────────

ipcMain.on('extract-metadata-success', async (event, { videoId, duration, width, height, thumbnailPath }) => {
    console.log(`[Main] Metadata & thumbnail succeeded for video ID: ${videoId}`);
    
    try {
        const video = await db.getVideoDetails(videoId);
        let hash = null;
        if (video && fs.existsSync(video.file_path)) {
            hash = await calculateFileHash(video.file_path);
        }

        // Commit full metadata to SQLite!
        await db.query(
            `UPDATE videos 
             SET duration = ?, width = ?, height = ?, thumbnail_path = ?, video_hash = ?, updated_at = datetime('now', 'localtime') 
             WHERE id = ?`,
            [duration, width, height, thumbnailPath, hash, videoId]
        );
    } catch (err) {
        console.error(`[Main] Failed to update SQLite video record ID ${videoId}:`, err);
    }

    // Refresh scanning progress counts
    const progress = getScanProgress();
    progress.queueLength = metadataQueue.length;
    if (metadataQueue.length === 0) {
        progress.status = 'idle';
    }
    mainWindow?.webContents.send('scanner:progress-update', progress);

    isProcessingQueue = false;
    processNextQueueItem();
});

ipcMain.on('extract-metadata-failure', async (event, { videoId, error }) => {
    console.warn(`[Main] Background worker failed to extract metadata for video ID ${videoId}: ${error}`);
    
    // Refresh scanning progress counts
    const progress = getScanProgress();
    progress.queueLength = metadataQueue.length;
    if (metadataQueue.length === 0) {
        progress.status = 'idle';
    }
    mainWindow?.webContents.send('scanner:progress-update', progress);

    isProcessingQueue = false;
    processNextQueueItem();
});
