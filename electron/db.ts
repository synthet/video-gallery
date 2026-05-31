import fs from 'fs';
import path from 'path';
import { createDatabaseConnector, getDbPath, IDatabaseConnector, QueryParam } from './db/provider';
import { initSchema } from './db/schema';

const connector: IDatabaseConnector = createDatabaseConnector();
let dbInitialized = false;

export async function connectDB(): Promise<void> {
    await connector.connect();
    if (!dbInitialized) {
        await initSchema(connector);
        dbInitialized = true;
    }
}

export async function closeConnection(): Promise<void> {
    await connector.close();
}

export async function checkConnection(): Promise<boolean> {
    try {
        await connectDB();
        return await connector.checkConnection();
    } catch {
        return false;
    }
}

export async function query<T = unknown>(sql: string, params: QueryParam[] = []): Promise<T[]> {
    await connectDB();
    return connector.query<T>(sql, params);
}

export interface VideoQueryOptions {
    limit?: number;
    offset?: number;
    folderId?: number;
    minRating?: number;
    colorLabel?: string;
    keyword?: string;
    sortBy?: string;
    order?: 'ASC' | 'DESC';
    capturedDate?: string; // YYYY-MM-DD
}

function buildWhereClause(options: VideoQueryOptions, params: QueryParam[]): string {
    const whereParts: string[] = [];

    if (options.folderId) {
        whereParts.push('folder_id = ?');
        params.push(options.folderId);
    }

    if (options.minRating !== undefined && options.minRating > 0) {
        whereParts.push('rating >= ?');
        params.push(options.minRating);
    }

    if (options.colorLabel) {
        whereParts.push('label = ?');
        params.push(options.colorLabel);
    }

    if (options.capturedDate) {
        whereParts.push('captured_at = ?');
        params.push(options.capturedDate);
    }

    if (options.keyword) {
        whereParts.push(`(
            file_name LIKE ? OR 
            title LIKE ? OR 
            description LIKE ? OR 
            id IN (
                SELECT video_id FROM video_tags WHERE tag LIKE ?
            )
        )`);
        const searchLike = `%${options.keyword}%`;
        params.push(searchLike, searchLike, searchLike, searchLike);
    }

    return whereParts.length > 0 ? 'WHERE ' + whereParts.join(' AND ') : '';
}

export async function getVideoCount(options: VideoQueryOptions = {}): Promise<number> {
    const params: QueryParam[] = [];
    const whereClause = buildWhereClause(options, params);
    
    const rows = await query<{ count: number }>(
        `SELECT COUNT(*) as count FROM videos ${whereClause}`, 
        params
    );
    return rows[0]?.count || 0;
}

export async function getVideos(options: VideoQueryOptions = {}): Promise<unknown[]> {
    const {
        limit = 50,
        offset = 0,
        sortBy = 'captured_at',
        order = 'DESC'
    } = options;

    const params: QueryParam[] = [];
    const whereClause = buildWhereClause(options, params);

    // Validate sort column
    const allowedSortCols = ['captured_at', 'file_name', 'size_bytes', 'duration', 'rating', 'id'];
    const sortCol = allowedSortCols.includes(sortBy) ? sortBy : 'captured_at';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

    const sql = `
        SELECT 
            id,
            folder_id,
            file_path,
            file_name,
            file_type,
            duration,
            width,
            height,
            size_bytes,
            thumbnail_path,
            video_hash,
            rating,
            label,
            title,
            description,
            captured_at,
            created_at,
            updated_at
        FROM videos
        ${whereClause}
        ORDER BY ${sortCol} ${sortOrder}, id DESC
        LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);
    return query(sql, params);
}

export async function getVideoDetails(id: number): Promise<any | null> {
    const videoRows = await query<any>(
        'SELECT * FROM videos WHERE id = ?', 
        [id]
    );

    if (videoRows.length === 0) return null;
    const video = videoRows[0];

    // Load tags
    const tagRows = await query<{ tag: string }>(
        'SELECT tag FROM video_tags WHERE video_id = ? ORDER BY tag ASC',
        [id]
    );
    video.tags = tagRows.map(r => r.tag);

    // Check if video file actually exists on local disk
    let fileExists = false;
    if (video.file_path) {
        fileExists = fs.existsSync(video.file_path);
    }
    video.file_exists = fileExists;

    return video;
}

export async function updateVideoDetails(id: number, updates: Record<string, any>): Promise<any | null> {
    const allowedUpdates = ['rating', 'label', 'title', 'description', 'captured_at'];
    const sets: string[] = [];
    const params: QueryParam[] = [];

    for (const [key, val] of Object.entries(updates)) {
        if (allowedUpdates.includes(key)) {
            sets.push(`${key} = ?`);
            params.push(val);
        }
    }

    if (sets.length === 0 && !updates.tags) {
        return getVideoDetails(id);
    }

    await connector.runTransaction(async (tx) => {
        if (sets.length > 0) {
            sets.push("updated_at = datetime('now', 'localtime')");
            params.push(id);
            await tx(`UPDATE videos SET ${sets.join(', ')} WHERE id = ?`, params);
        }

        // Re-apply tags if specified
        if (updates.tags && Array.isArray(updates.tags)) {
            await tx('DELETE FROM video_tags WHERE video_id = ?', [id]);
            for (const tag of updates.tags) {
                const cleanedTag = String(tag).trim();
                if (cleanedTag) {
                    await tx('INSERT OR IGNORE INTO video_tags (video_id, tag) VALUES (?, ?)', [id, cleanedTag]);
                }
            }
        }
    });

    return getVideoDetails(id);
}

export async function deleteVideo(id: number, deleteFileFromDisk = false): Promise<boolean> {
    try {
        const video = await getVideoDetails(id);
        if (!video) return false;

        await connector.runTransaction(async (tx) => {
            await tx('DELETE FROM video_tags WHERE video_id = ?', [id]);
            await tx('DELETE FROM videos WHERE id = ?', [id]);
        });

        // Optionally delete on-disk file
        if (deleteFileFromDisk && video.file_path && fs.existsSync(video.file_path)) {
            try {
                fs.unlinkSync(video.file_path);
            } catch (err) {
                console.error(`[DB] Failed to delete file on disk: ${video.file_path}`, err);
            }
        }

        // Delete thumbnail if it exists
        if (video.thumbnail_path && fs.existsSync(video.thumbnail_path)) {
            try {
                fs.unlinkSync(video.thumbnail_path);
            } catch (err) {
                console.error(`[DB] Failed to delete thumbnail file: ${video.thumbnail_path}`, err);
            }
        }

        return true;
    } catch (e) {
        console.error('[DB] Failed to delete video:', e);
        return false;
    }
}

export async function getFolders(): Promise<unknown[]> {
    const sql = `
        SELECT 
            f.id,
            f.path,
            f.parent_id,
            (SELECT COUNT(*) FROM videos v WHERE v.folder_id = f.id) as image_count -- Keep label as image_count for UI compatibility
        FROM folders f
        ORDER BY f.path ASC
    `;
    return query(sql);
}

export async function getOrCreateFolder(folderPath: string): Promise<number> {
    const resolvedPath = path.resolve(folderPath);
    const existing = await query<{ id: number }>('SELECT id FROM folders WHERE path = ?', [resolvedPath]);
    if (existing.length > 0) {
        return existing[0].id;
    }

    // Recursively resolve and create parents
    const parentPath = path.dirname(resolvedPath);
    let parentId: number | null = null;
    
    // Stop recursion at drive roots
    if (parentPath && parentPath !== resolvedPath && parentPath !== path.dirname(parentPath)) {
        parentId = await getOrCreateFolder(parentPath);
    }

    await query(
        'INSERT INTO folders (path, parent_id) VALUES (?, ?)',
        [resolvedPath, parentId]
    );

    const check = await query<{ id: number }>('SELECT id FROM folders WHERE path = ?', [resolvedPath]);
    return check[0].id;
}

export async function deleteFolder(id: number): Promise<boolean> {
    try {
        const videosInFolder = await query<{ c: number }>(
            'SELECT COUNT(*) as c FROM videos WHERE folder_id = ?', 
            [id]
        );
        if (videosInFolder[0].c > 0) {
            // Refuse to delete folder if it still contains videos in the database
            return false;
        }
        await query('DELETE FROM folders WHERE id = ?', [id]);
        return true;
    } catch (e) {
        console.error('[DB] Failed to delete folder:', e);
        return false;
    }
}

export async function getKeywords(): Promise<string[]> {
    const tagRows = await query<{ tag: string }>(
        'SELECT DISTINCT tag FROM video_tags WHERE tag IS NOT NULL AND tag <> "" ORDER BY tag ASC'
    );
    return tagRows.map(r => r.tag);
}

export async function getDatesWithShots(options: VideoQueryOptions = {}): Promise<string[]> {
    const params: QueryParam[] = [];
    const whereClause = buildWhereClause(options, params);
    
    const rows = await query<{ captured_at: string }>(
        `SELECT DISTINCT captured_at FROM videos ${whereClause} WHERE captured_at IS NOT NULL AND captured_at <> "" ORDER BY captured_at DESC`,
        params
    );
    return rows.map(r => r.captured_at);
}

export async function getIngestLogs(): Promise<unknown[]> {
    return query('SELECT * FROM ingest_logs ORDER BY run_date DESC LIMIT 100');
}

export async function writeIngestLog(log: {
    source_path: string;
    copied_count: number;
    skipped_count: number;
    errors_count: number;
    console_output: string;
}): Promise<boolean> {
    try {
        await query(
            `INSERT INTO ingest_logs (source_path, copied_count, skipped_count, errors_count, console_output)
             VALUES (?, ?, ?, ?, ?)`,
            [log.source_path, log.copied_count, log.skipped_count, log.errors_count, log.console_output]
        );
        return true;
    } catch (err) {
        console.error('[DB] Failed to write ingest log:', err);
        return false;
    }
}
