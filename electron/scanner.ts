import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import * as db from './db';
import { getLibraryRoot, getThumbnailsDir } from './db/provider';

const VIDEO_EXTS = new Set([
    '.mp4', '.mov', '.avi', '.mkv', '.wmv', '.webm', '.m4v', '.flv', '.3gp', '.mpeg', '.mpg', '.ogv'
]);

// Helper to check if file is a video
export function isVideoFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return VIDEO_EXTS.has(ext);
}

// Calculate perfect SHA-256 hash of a file matching python scripts
export function calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', (err) => reject(err));
    });
}

// Format date helper
function formatDate(d: Date): string {
    return d.toISOString().split('T')[0];
}

// Parse YYYYMMDD to YYYY-MM-DD
function formatYmd(s: string): string {
    if (s.length !== 8) return '';
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

// Parse metadata/source from filename
export function extractDateAndSource(filePath: string, mtime: Date): { source: string; capturedAt: string } {
    const fileName = path.basename(filePath);
    
    // DJI: DJI_20251123153554_0043_D.MP4
    const djiMatch = fileName.match(/^DJI_(\d{8})\d{6}_.*\.(mp4|mov|avi|mkv)$/i);
    if (djiMatch) {
        return { source: 'DJI', capturedAt: formatYmd(djiMatch[1]) };
    }
    
    // ActionCam: 20250505_0959.MOV
    const actionCamMatch = fileName.match(/^(\d{8})_\d+\.(mp4|mov|avi|mkv)$/i);
    if (actionCamMatch) {
        return { source: 'ActionCam', capturedAt: formatYmd(actionCamMatch[1]) };
    }

    // Pixel: PXL_20240330_151858411_compressed.mp4
    const pixelMatch = fileName.match(/^PXL_(\d{8})_.*\.(mp4|mov|avi|mkv)$/i);
    if (pixelMatch) {
        return { source: 'Pixel', capturedAt: formatYmd(pixelMatch[1]) };
    }

    // Nikon: DSC_0632.MOV or DSC_0632_a1b2c3d4.MOV
    const nikonMatch = fileName.match(/^DSC_\d+(?:_[a-f0-9]{8})?\.(mp4|mov|avi|mkv)$/i);
    if (nikonMatch) {
        return { source: 'Nikon', capturedAt: formatDate(mtime) };
    }

    // Fallback 1: starts with 8 digits
    const fallbackMatch = fileName.match(/^(\d{8})/);
    if (fallbackMatch) {
        const parsed = formatYmd(fallbackMatch[1]);
        if (parsed) return { source: 'Other', capturedAt: parsed };
    }

    // Fallback 2: check folders structure in path (DJI/Nikon/Pixel etc. inside D:\Videos)
    const libraryRoot = getLibraryRoot();
    const relative = path.relative(libraryRoot, filePath);
    const parts = relative.split(path.sep);
    if (parts.length > 1) {
        const potentialSource = parts[0];
        const knownSources = ['DJI', 'Nikon', 'Pixel', 'ActionCam', 'Edited', 'Other'];
        if (knownSources.includes(potentialSource)) {
            return { source: potentialSource, capturedAt: formatDate(mtime) };
        }
    }

    // Fallback 3: mtime
    return { source: 'Other', capturedAt: formatDate(mtime) };
}

interface ScanProgress {
    scanned: number;
    added: number;
    updated: number;
    removed: number;
    queueLength: number;
    status: 'idle' | 'scanning' | 'processing_metadata';
}

let activeProgress: ScanProgress = {
    scanned: 0,
    added: 0,
    updated: 0,
    removed: 0,
    queueLength: 0,
    status: 'idle'
};

export function getScanProgress(): ScanProgress {
    return activeProgress;
}

// Recursive directory walk
function walkDir(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        // Skip hidden folders and our driftara data directory
        if (file.startsWith('.') || file === '$RECYCLE.BIN' || file === 'System Volume Information') {
            continue;
        }
        
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walkDir(filePath, fileList);
        } else if (stat.isFile() && isVideoFile(filePath)) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

// Queue for videos needing background metadata & thumbnail processing
export const metadataQueue: Array<{
    id: number;
    filePath: string;
}> = [];

// Incremental scan
export async function scanLibrary(): Promise<ScanProgress> {
    if (activeProgress.status === 'scanning' || activeProgress.status === 'processing_metadata') {
        console.log('[Scanner] Scan is already running. Skipping request.');
        return activeProgress;
    }

    const libraryRoot = getLibraryRoot();
    console.log(`[Scanner] Starting scan of library root: ${libraryRoot}`);
    
    activeProgress = {
        scanned: 0,
        added: 0,
        updated: 0,
        removed: 0,
        queueLength: 0,
        status: 'scanning'
    };

    try {
        await db.connectDB();

        // 1. Walk directory tree
        if (!fs.existsSync(libraryRoot)) {
            console.error(`[Scanner] Library root ${libraryRoot} does not exist! Creating...`);
            fs.mkdirSync(libraryRoot, { recursive: true });
        }
        
        const filesOnDisk = walkDir(libraryRoot);
        activeProgress.scanned = filesOnDisk.length;
        console.log(`[Scanner] Discovered ${filesOnDisk.length} video files on disk.`);

        // 2. Fetch existing database records
        const videosInDb = await db.query<any>('SELECT id, file_path, size_bytes, captured_at FROM videos');
        const dbVideosMap = new Map<string, { id: number; size: number }>();
        for (const v of videosInDb) {
            dbVideosMap.set(v.file_path, { id: v.id, size: v.size_bytes });
        }

        // 3. Compare and index new/modified files
        const diskPathsSet = new Set<string>();
        for (const filePath of filesOnDisk) {
            const resolvedPath = path.resolve(filePath);
            diskPathsSet.add(resolvedPath);
            
            const stats = fs.statSync(filePath);
            const dbRecord = dbVideosMap.get(resolvedPath);

            // Extract classification info
            const { source, capturedAt } = extractDateAndSource(resolvedPath, stats.mtime);
            const folderId = await db.getOrCreateFolder(path.dirname(resolvedPath));

            if (!dbRecord) {
                // NEW Video: Insert skeleton record
                const fileName = path.basename(filePath);
                const fileType = path.extname(filePath).slice(1).toUpperCase();

                const rows = await db.query<any>(
                    `INSERT INTO videos (folder_id, file_path, file_name, file_type, size_bytes, captured_at)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [folderId, resolvedPath, fileName, fileType, stats.size, capturedAt]
                );
                
                // Get the inserted ID using last_insert_rowid()
                const idRows = await db.query<{ id: number }>('SELECT last_insert_rowid() as id');
                const videoId = idRows[0]?.id;

                if (videoId) {
                    metadataQueue.push({ id: videoId, filePath: resolvedPath });
                    activeProgress.added++;
                }
            } else if (dbRecord.size !== stats.size) {
                // MODIFIED Video: Update record size and queue for metadata
                await db.query(
                    `UPDATE videos 
                     SET size_bytes = ?, captured_at = ?, folder_id = ?, updated_at = datetime('now', 'localtime') 
                     WHERE id = ?`,
                    [stats.size, capturedAt, folderId, dbRecord.id]
                );
                metadataQueue.push({ id: dbRecord.id, filePath: resolvedPath });
                activeProgress.updated++;
            }
        }

        // 4. Remove missing files from database
        for (const v of videosInDb) {
            if (!diskPathsSet.has(v.file_path)) {
                await db.deleteVideo(v.id, false); // false = do not delete on-disk since it's already gone
                activeProgress.removed++;
            }
        }

        activeProgress.queueLength = metadataQueue.length;
        console.log(`[Scanner] Scan finished. Added: ${activeProgress.added}, Updated: ${activeProgress.updated}, Removed: ${activeProgress.removed}. Queue for metadata processing: ${metadataQueue.length}`);
        
        if (metadataQueue.length > 0) {
            activeProgress.status = 'processing_metadata';
        } else {
            activeProgress.status = 'idle';
        }
    } catch (err) {
        console.error('[Scanner] Fatal scan error:', err);
        activeProgress.status = 'idle';
    }

    return activeProgress;
}
