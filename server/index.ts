import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import * as db from '../electron/db';
import { getLibraryRoot } from '../electron/db/provider';
import { scanLibrary, getScanProgress } from '../electron/scanner';

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3002;

// Serve Vite build outputs in production
const distDir = path.resolve(__dirname, '../dist');
if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
}

// ── Helper responses ─────────────────────────────────────────────────────────

function ok(res: Response, data: unknown) {
    res.json({ ok: true, data });
}

function fail(res: Response, err: unknown, status = 500) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Server Error]', message);
    res.status(status).json({ ok: false, error: message });
}

function wrap(handler: (req: Request, res: Response) => Promise<void>) {
    return (req: Request, res: Response, next: NextFunction) => {
        handler(req, res).catch(next);
    };
}

function parseQueryOptions(query: Record<string, any>): Record<string, any> {
    const opts: Record<string, any> = {};
    for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === '') continue;
        if (v === 'true') { opts[k] = true; continue; }
        if (v === 'false') { opts[k] = false; continue; }
        const num = Number(v);
        if (!isNaN(num)) { opts[k] = num; continue; }
        opts[k] = v;
    }
    return opts;
}

// ── /gallery-api Endpoints ────────────────────────────────────────────────────

app.get('/gallery-api/ping', (_req, res) => res.json('pong'));

app.get('/gallery-api/db/check-connection', wrap(async (_req, res) => {
    try {
        const result = await db.checkConnection();
        ok(res, result);
    } catch (e) { fail(res, e); }
}));

app.get('/gallery-api/db/video-count', wrap(async (req, res) => {
    try {
        const count = await db.getVideoCount(parseQueryOptions(req.query));
        ok(res, count);
    } catch (e) { fail(res, e); }
}));

app.get('/gallery-api/db/videos', wrap(async (req, res) => {
    try {
        const videos = await db.getVideos(parseQueryOptions(req.query));
        ok(res, videos);
    } catch (e) { fail(res, e); }
}));

app.get('/gallery-api/db/video/:id', wrap(async (req, res) => {
    try {
        const details = await db.getVideoDetails(parseInt(req.params.id, 10));
        ok(res, details);
    } catch (e) { fail(res, e); }
}));

app.post('/gallery-api/db/video/:id', wrap(async (req, res) => {
    try {
        const details = await db.updateVideoDetails(parseInt(req.params.id, 10), req.body);
        ok(res, details);
    } catch (e) { fail(res, e); }
}));

app.delete('/gallery-api/db/video/:id', wrap(async (req, res) => {
    try {
        const deleteDisk = req.body.deleteFileFromDisk === true;
        const success = await db.deleteVideo(parseInt(req.params.id, 10), deleteDisk);
        ok(res, success);
    } catch (e) { fail(res, e); }
}));

app.get('/gallery-api/db/folders', wrap(async (_req, res) => {
    try {
        const folders = await db.getFolders();
        ok(res, folders);
    } catch (e) { fail(res, e); }
}));

app.delete('/gallery-api/db/folder/:id', wrap(async (req, res) => {
    try {
        const success = await db.deleteFolder(parseInt(req.params.id, 10));
        ok(res, success);
    } catch (e) { fail(res, e); }
}));

app.get('/gallery-api/db/keywords', wrap(async (_req, res) => {
    try {
        const keywords = await db.getKeywords();
        ok(res, keywords);
    } catch (e) { fail(res, e); }
}));

app.get('/gallery-api/db/dates-with-shots', wrap(async (req, res) => {
    try {
        const dates = await db.getDatesWithShots(parseQueryOptions(req.query));
        ok(res, dates);
    } catch (e) { fail(res, e); }
}));

app.get('/gallery-api/scanner/progress', wrap(async (_req, res) => {
    try {
        ok(res, getScanProgress());
    } catch (e) { fail(res, e); }
}));

app.post('/gallery-api/scanner/run', wrap(async (_req, res) => {
    try {
        const progress = await scanLibrary();
        ok(res, progress);
    } catch (e) { fail(res, e); }
}));

app.get('/gallery-api/ingest/logs', wrap(async (_req, res) => {
    try {
        const logs = await db.getIngestLogs();
        ok(res, logs);
    } catch (e) { fail(res, e); }
}));

app.post('/gallery-api/ingest/run', wrap(async (req, res) => {
    try {
        const { sourcePath, dryRun } = req.body;
        if (!sourcePath) {
            fail(res, 'sourcePath is required', 400);
            return;
        }

        const isDryRun = Boolean(dryRun);
        console.log(`[Server] Triggering python ingest from browser for: ${sourcePath}${isDryRun ? ' (dry-run)' : ''}`);
        const { getIngestTallies, spawnIngestScript } = await import('../electron/ingestRunner');
        const libraryRoot = getLibraryRoot();

        let consoleOutput = '';
        const pythonProcess = spawnIngestScript({
            sourcePath: String(sourcePath).trim(),
            destRoot: libraryRoot,
            dryRun: isDryRun,
            onStdout: (text) => { consoleOutput += text; },
            onStderr: (text) => { consoleOutput += text; },
        });

        pythonProcess.on('close', async (code) => {
            const { copied, skipped, errors } = getIngestTallies(pythonProcess);
            console.log(`[Server] Browser-triggered ingest finished with exit code ${code}`);
            await db.writeIngestLog({
                source_path: isDryRun ? `[dry-run] ${sourcePath}` : sourcePath,
                copied_count: copied,
                skipped_count: skipped,
                errors_count: errors,
                console_output: consoleOutput,
            });
            if (!isDryRun) {
                await scanLibrary();
            }
        });

        ok(res, { status: 'running' });
    } catch (e) { fail(res, e); }
}));

// ── HTTP Range-Based Media Stream Handler ──────────────────────────────────────

app.get('/media/*filePath', (req, res) => {
    const rawPath = (req.params as Record<string, string>).filePath ?? '';
    const filePath = decodeURIComponent(rawPath);

    if (!filePath) {
        res.status(400).send('Missing media file path');
        return;
    }

    // Handle standard drive mappings (WSL vs Windows absolute)
    let resolvedPath = filePath;
    if (process.platform === 'win32' && resolvedPath.startsWith('/mnt/')) {
        resolvedPath = resolvedPath.replace(/^\/mnt\/([a-zA-Z])\//, (match, drive) => `${drive.toUpperCase()}:/`);
    }

    if (!fs.existsSync(resolvedPath)) {
        console.error(`[Server Media] File not found: ${resolvedPath}`);
        res.status(404).send('File not found');
        return;
    }

    const stat = fs.statSync(resolvedPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const ext = path.extname(resolvedPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
        '.mp4': 'video/mp4',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
        '.mkv': 'video/x-matroska',
        '.webm': 'video/webm',
        '.ogg': 'video/ogg',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png'
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // Support Chrome/Electron Range Seeking
    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize || end >= fileSize) {
            res.status(416).send('Requested range not satisfiable\n' + start + ' - ' + end + ' / ' + fileSize);
            return;
        }

        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(resolvedPath, { start, end });
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': contentType,
        };

        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': contentType,
        };
        res.writeHead(200, head);
        fs.createReadStream(resolvedPath).pipe(res);
    }
});

// Serve index.html for Vite routing fallback
if (fs.existsSync(distDir)) {
    app.get('/*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
    });
}

// ── Server Startup ──────────────────────────────────────────────────────────

async function startServer() {
    try {
        await db.connectDB();
        console.log('[Server] Database connected and schema ready');
        
        // Trigger an initial fast library scan on startup!
        void scanLibrary().then(() => {
            console.log('[Server] Initial startup scan complete');
        });
    } catch (e) {
        console.warn('[Server] Initial database connection failed, will retry on demand:', e);
    }

    app.listen(PORT, () => {
        console.log(`[Server] Driftara Video browser server running at http://localhost:${PORT}`);
        console.log(`[Server] Targeting library storage: ${getLibraryRoot()}`);
    });
}

startServer().catch((e) => {
    console.error('[Server] Fatal startup error:', e);
    process.exit(1);
});
