import { IDatabaseConnector } from './provider';

export async function initSchema(connector: IDatabaseConnector): Promise<void> {
    console.log('[DB] Bootstrapping SQLite database schema...');
    
    // 1. Folders table
    await connector.query(`
        CREATE TABLE IF NOT EXISTS folders (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            path        TEXT UNIQUE NOT NULL,
            parent_id   INTEGER REFERENCES folders(id) ON DELETE CASCADE,
            created_at  TEXT DEFAULT (datetime('now', 'localtime'))
        );
    `);

    // 2. Videos table
    await connector.query(`
        CREATE TABLE IF NOT EXISTS videos (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            folder_id       INTEGER REFERENCES folders(id) ON DELETE SET NULL,
            file_path       TEXT UNIQUE NOT NULL,
            file_name       TEXT NOT NULL,
            file_type       TEXT,
            duration        REAL DEFAULT 0.0,
            width           INTEGER DEFAULT 0,
            height          INTEGER DEFAULT 0,
            size_bytes      INTEGER DEFAULT 0,
            thumbnail_path  TEXT,
            video_hash      TEXT UNIQUE,
            rating          INTEGER DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
            label           TEXT, -- Color label: 'Red', 'Yellow', 'Green', 'Blue', 'Purple' or null
            title           TEXT,
            description     TEXT,
            captured_at     TEXT, -- YYYY-MM-DD format
            created_at      TEXT DEFAULT (datetime('now', 'localtime')),
            updated_at      TEXT DEFAULT (datetime('now', 'localtime'))
        );
    `);

    // Indices for search/filter speed
    await connector.query(`CREATE INDEX IF NOT EXISTS idx_videos_folder_id ON videos(folder_id);`);
    await connector.query(`CREATE INDEX IF NOT EXISTS idx_videos_rating ON videos(rating);`);
    await connector.query(`CREATE INDEX IF NOT EXISTS idx_videos_label ON videos(label);`);
    await connector.query(`CREATE INDEX IF NOT EXISTS idx_videos_captured_at ON videos(captured_at);`);
    await connector.query(`CREATE INDEX IF NOT EXISTS idx_videos_hash ON videos(video_hash);`);

    // 3. Video Tags (Keywords) table
    await connector.query(`
        CREATE TABLE IF NOT EXISTS video_tags (
            video_id    INTEGER REFERENCES videos(id) ON DELETE CASCADE,
            tag         TEXT NOT NULL,
            PRIMARY KEY (video_id, tag)
        );
    `);
    await connector.query(`CREATE INDEX IF NOT EXISTS idx_video_tags_tag ON video_tags(tag);`);

    // 4. Ingest Logs table
    await connector.query(`
        CREATE TABLE IF NOT EXISTS ingest_logs (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            run_date        TEXT DEFAULT (datetime('now', 'localtime')),
            source_path     TEXT NOT NULL,
            copied_count    INTEGER DEFAULT 0,
            skipped_count   INTEGER DEFAULT 0,
            errors_count    INTEGER DEFAULT 0,
            console_output  TEXT
        );
    `);

    console.log('[DB] SQLite database schema bootstrap complete');
}
