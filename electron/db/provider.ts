import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';

export type QueryParam = string | number | null;
export type TxQuery = <R = unknown>(sql: string, params?: QueryParam[]) => Promise<R[]>;

export interface IDatabaseConnector {
    readonly type: 'sqlite';
    connect(): Promise<unknown>;
    close(): Promise<void>;
    query<T = unknown>(sql: string, params?: QueryParam[]): Promise<T[]>;
    runTransaction<T>(callback: (txQuery: TxQuery) => Promise<T>): Promise<T>;
    checkConnection(): Promise<boolean>;
    verifyStartup(): Promise<boolean>;
}

const DEFAULT_LIBRARY_ROOT = 'D:\\Videos';

export function getLibraryRoot(): string {
    // Check config.json or fallback to standard D:\Videos
    const projectRoot = path.resolve(__dirname, '..');
    const configPath = path.join(projectRoot, 'config.json');
    if (fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (config.libraryRoot) return path.resolve(config.libraryRoot);
        } catch {
            /* ignore config parse error */
        }
    }
    return DEFAULT_LIBRARY_ROOT;
}

export function getDbPath(): string {
    const root = getLibraryRoot();
    const dbDir = path.join(root, '.driftara');
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    return path.join(dbDir, 'driftara_video.db');
}

export function getThumbnailsDir(): string {
    const root = getLibraryRoot();
    const thumbDir = path.join(root, '.driftara', 'thumbnails');
    if (!fs.existsSync(thumbDir)) {
        fs.mkdirSync(thumbDir, { recursive: true });
    }
    return thumbDir;
}

export class SqliteConnector implements IDatabaseConnector {
    readonly type = 'sqlite' as const;
    private db: sqlite3.Database | null = null;
    private connectPromise: Promise<sqlite3.Database> | null = null;

    async connect(): Promise<sqlite3.Database> {
        if (this.db) return this.db;
        if (this.connectPromise) return this.connectPromise;

        this.connectPromise = new Promise<sqlite3.Database>((resolve, reject) => {
            const dbPath = getDbPath();
            console.log(`[DB] Connecting to SQLite database at: ${dbPath}`);
            
            const database = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('[DB] SQLite connection failed:', err);
                    reject(err);
                } else {
                    console.log('[DB] SQLite connected successfully');
                    this.db = database;
                    // Enable Foreign Key support
                    database.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
                        if (pragmaErr) console.warn('[DB] Failed to enable foreign keys:', pragmaErr);
                        resolve(database);
                    });
                }
            });
        }).finally(() => {
            this.connectPromise = null;
        });

        return this.connectPromise;
    }

    async close(): Promise<void> {
        if (!this.db) return;
        const database = this.db;
        this.db = null;
        await new Promise<void>((resolve, reject) => {
            database.close((err) => {
                if (err) {
                    console.error('[DB] SQLite close error:', err);
                    reject(err);
                } else {
                    console.log('[DB] SQLite connection closed');
                    resolve();
                }
            });
        });
    }

    async query<T = unknown>(sql: string, params: QueryParam[] = []): Promise<T[]> {
        const database = await this.connect();
        
        // Clean SQL queries of any Postgres-specific casting syntax (e.g. ::text or ::bigint)
        const cleanedSql = sql
            .replace(/::text/gi, '')
            .replace(/::bigint/gi, '')
            .replace(/::text/gi, '')
            .replace(/POSITION\(\'\/thumbnails\/\'\s+IN\s+[^)]+\)\s*=\s*0/gi, '1') // Simple SQLite patch for file paths checks
            .replace(/string_agg\(([^,]+),\s*[^)]+\)/gi, 'group_concat($1, ", ")'); // string_agg -> group_concat in SQLite

        return new Promise<T[]>((resolve, reject) => {
            database.all(cleanedSql, params, (err, rows) => {
                if (err) {
                    console.error(`[DB] SQLite query error:\nSQL: ${cleanedSql}\nParams: ${JSON.stringify(params)}\nError:`, err);
                    reject(err);
                } else {
                    resolve(rows as T[]);
                }
            });
        });
    }

    async runTransaction<T>(callback: (txQuery: TxQuery) => Promise<T>): Promise<T> {
        const database = await this.connect();

        const txQuery: TxQuery = async <R = unknown>(sql: string, params: QueryParam[] = []): Promise<R[]> => {
            const cleanedSql = sql
                .replace(/::text/gi, '')
                .replace(/::bigint/gi, '')
                .replace(/string_agg\(([^,]+),\s*[^)]+\)/gi, 'group_concat($1, ", ")');

            return new Promise<R[]>((resolve, reject) => {
                database.all(cleanedSql, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows as R[]);
                });
            });
        };

        try {
            await new Promise<void>((resolve, reject) => {
                database.run('BEGIN TRANSACTION', (err) => err ? reject(err) : resolve());
            });
            const result = await callback(txQuery);
            await new Promise<void>((resolve, reject) => {
                database.run('COMMIT', (err) => err ? reject(err) : resolve());
            });
            return result;
        } catch (e) {
            await new Promise<void>((resolve, reject) => {
                database.run('ROLLBACK', (err) => err ? reject(err) : resolve());
            });
            throw e;
        }
    }

    async checkConnection(): Promise<boolean> {
        try {
            const rows = await this.query<{ one: number }>('SELECT 1 as one');
            return rows.length > 0 && rows[0].one === 1;
        } catch (e) {
            console.error('[DB] SQLite connection check failed:', e);
            return false;
        }
    }

    async verifyStartup(): Promise<boolean> {
        return this.checkConnection();
    }
}

export function createDatabaseConnector(): IDatabaseConnector {
    return new SqliteConnector();
}
