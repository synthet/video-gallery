import { create } from 'zustand';

// Abstraction helper to detect if running inside Electron
export const isElectron = typeof (window as any).electron !== 'undefined';

// Master API wrapper supporting both Electron IPC and Browser HTTP
export const api = {
    checkDbConnection: () => isElectron ? (window as any).electron.checkDbConnection() : fetchApi('/db/check-connection'),
    getVideoCount: (options: any) => isElectron ? (window as any).electron.getVideoCount(options) : fetchApi('/db/video-count', options),
    getVideos: (options: any) => isElectron ? (window as any).electron.getVideos(options) : fetchApi('/db/videos', options),
    getVideoDetails: (id: number) => isElectron ? (window as any).electron.getVideoDetails(id) : fetchApi(`/db/video/${id}`),
    updateVideoDetails: (id: number, updates: any) => isElectron ? (window as any).electron.updateVideoDetails(id, updates) : fetchApi(`/db/video/${id}`, { updates }, 'POST'),
    deleteVideo: (id: number, deleteFileFromDisk: boolean) => isElectron ? (window as any).electron.deleteVideo(id, deleteFileFromDisk) : fetchApi(`/db/video/${id}`, { deleteFileFromDisk }, 'DELETE'),
    getFolders: () => isElectron ? (window as any).electron.getFolders() : fetchApi('/db/folders'),
    deleteFolder: (id: number) => isElectron ? (window as any).electron.deleteFolder(id) : fetchApi(`/db/folder/${id}`, {}, 'DELETE'),
    getKeywords: () => isElectron ? (window as any).electron.getKeywords() : fetchApi('/db/keywords'),
    getDatesWithShots: (options: any) => isElectron ? (window as any).electron.getDatesWithShots(options) : fetchApi('/db/dates-with-shots', options),
    getScanProgress: () => isElectron ? (window as any).electron.getScanProgress() : fetchApi('/scanner/progress'),
    startScan: () => isElectron ? (window as any).electron.startScan() : fetchApi('/scanner/run', {}, 'POST'),
    getIngestLogs: () => isElectron ? (window as any).electron.getIngestLogs() : fetchApi('/ingest/logs'),
    runPythonIngest: (sourcePath: string, options?: { dryRun?: boolean }) =>
        isElectron
            ? (window as any).electron.runPythonIngest(sourcePath, options)
            : fetchApi('/ingest/run', { sourcePath, dryRun: options?.dryRun }, 'POST'),
    selectDirectory: () => isElectron ? (window as any).electron.selectDirectory() : Promise.resolve(null),
    revealInExplorer: (filePath: string) => isElectron ? (window as any).electron.revealInExplorer(filePath) : Promise.resolve(false),
    getLibraryRoot: () => isElectron ? (window as any).electron.getLibraryRootPath() : Promise.resolve('D:\\Videos'),
};

async function fetchApi(endpoint: string, data: any = null, method = 'GET'): Promise<any> {
    const url = `/gallery-api${endpoint}`;
    let fetchUrl = url;
    const headers: any = { 'Content-Type': 'application/json' };
    const options: any = { method, headers };

    if (method === 'GET' && data) {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(data)) {
            if (v !== null && v !== undefined) params.append(k, String(v));
        }
        fetchUrl = `${url}?${params.toString()}`;
    } else if (data) {
        options.body = JSON.stringify(data);
    }

    const res = await fetch(fetchUrl, options);
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
    }
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Server error');
    return json.data;
}

export interface VideoFilters {
    folderId: number | null;
    minRating: number;
    colorLabel: string | null;
    keyword: string;
    capturedDate: string | null;
    sortBy: string;
    order: 'ASC' | 'DESC';
}

interface VideoState {
    videos: any[];
    folders: any[];
    dates: string[];
    keywords: string[];
    ingestLogs: any[];
    selectedVideoId: number | null;
    selectedVideo: any | null;
    
    // Filters & Pagination
    filters: VideoFilters;
    page: number;
    limit: number;
    totalCount: number;

    // Async states
    isDbConnected: boolean;
    dbError: string | null;
    isRefreshing: boolean;
    
    // Scanner Progress
    scanProgress: {
        scanned: number;
        added: number;
        updated: number;
        removed: number;
        queueLength: number;
        status: 'idle' | 'scanning' | 'processing_metadata';
    };

    // Python Ingest states
    ingestSourcePath: string;
    isIngesting: boolean;
    ingestLogsConsole: string[];

    // Action dispatches
    setFilters: (filters: Partial<VideoFilters>) => void;
    clearFilters: () => void;
    setPage: (page: number) => void;
    selectVideo: (id: number | null) => Promise<void>;
    updateVideoDetails: (updates: any) => Promise<void>;
    deleteSelectedVideo: (deleteFileFromDisk: boolean) => Promise<void>;
    
    // Core loader triggers
    refreshLibrary: () => Promise<void>;
    triggerScanner: () => Promise<void>;
    selectIngestFolder: () => Promise<void>;
    setIngestSourcePath: (path: string) => void;
    runIngest: (dryRun?: boolean) => Promise<void>;
}

export const useVideoStore = create<VideoState>((set, get) => {
    
    // Set up standard IPC background event listeners in Electron mode
    if (isElectron) {
        (window as any).electron.onScanProgressUpdate((progress: any) => {
            set({ scanProgress: progress });
            // If scanner finished, refresh grid to show thumbnails/metadata!
            if (progress.status === 'idle') {
                void get().refreshLibrary();
            }
        });

        (window as any).electron.onIngestOutput((data: { type: 'stdout' | 'stderr' | 'exit'; text?: string; code?: number; dryRun?: boolean; copied?: number; skipped?: number; errors?: number }) => {
            if (data.type === 'stdout' || data.type === 'stderr') {
                const logs = [...get().ingestLogsConsole];
                logs.push((data.type === 'stderr' ? 'ERR: ' : '') + (data.text || ''));
                set({ ingestLogsConsole: logs });
            } else if (data.type === 'exit') {
                set({ isIngesting: false });
                const logs = [...get().ingestLogsConsole];
                const label = data.dryRun ? 'Dry-run' : 'Ingest';
                const summary = data.copied !== undefined
                    ? `${label} finished (exit ${data.code}). Would copy/copy: ${data.copied}, skipped: ${data.skipped}, errors: ${data.errors}.`
                    : `[Process completed with exit code: ${data.code}]`;
                logs.push(`\n${summary}\n`);
                set({ ingestLogsConsole: logs });
                if (!data.dryRun) {
                    void get().refreshLibrary();
                }
            }
        });
    }

    return {
        videos: [],
        folders: [],
        dates: [],
        keywords: [],
        ingestLogs: [],
        selectedVideoId: null,
        selectedVideo: null,

        filters: {
            folderId: null,
            minRating: 0,
            colorLabel: null,
            keyword: '',
            capturedDate: null,
            sortBy: 'captured_at',
            order: 'DESC'
        },
        page: 1,
        limit: 50,
        totalCount: 0,

        isDbConnected: false,
        dbError: null,
        isRefreshing: false,

        scanProgress: {
            scanned: 0,
            added: 0,
            updated: 0,
            removed: 0,
            queueLength: 0,
            status: 'idle'
        },

        ingestSourcePath: '',
        isIngesting: false,
        ingestLogsConsole: [],

        setFilters: (newFilters) => {
            set((state) => ({
                filters: { ...state.filters, ...newFilters },
                page: 1 // Reset pagination on filter change
            }));
            void get().refreshLibrary();
        },

        clearFilters: () => {
            set({
                filters: {
                    folderId: null,
                    minRating: 0,
                    colorLabel: null,
                    keyword: '',
                    capturedDate: null,
                    sortBy: 'captured_at',
                    order: 'DESC'
                },
                page: 1
            });
            void get().refreshLibrary();
        },

        setPage: (page) => {
            set({ page });
            void get().refreshLibrary();
        },

        selectVideo: async (id) => {
            set({ selectedVideoId: id });
            if (id === null) {
                set({ selectedVideo: null });
                return;
            }
            try {
                const details = await api.getVideoDetails(id);
                set({ selectedVideo: details });
            } catch (err) {
                console.error('[Store] Failed to load video details:', err);
            }
        },

        updateVideoDetails: async (updates) => {
            const id = get().selectedVideoId;
            if (id === null) return;
            try {
                const updatedVideo = await api.updateVideoDetails(id, updates);
                set({ selectedVideo: updatedVideo });
                // Instantly update item in local grid arrays
                set((state) => ({
                    videos: state.videos.map(v => v.id === id ? { ...v, ...updates } : v)
                }));
            } catch (err) {
                console.error('[Store] Failed to update video details:', err);
            }
        },

        deleteSelectedVideo: async (deleteFileFromDisk) => {
            const id = get().selectedVideoId;
            if (id === null) return;
            try {
                const success = await api.deleteVideo(id, deleteFileFromDisk);
                if (success) {
                    set({ selectedVideoId: null, selectedVideo: null });
                    void get().refreshLibrary();
                }
            } catch (err) {
                console.error('[Store] Failed to delete video:', err);
            }
        },

        refreshLibrary: async () => {
            set({ isRefreshing: true });
            try {
                // 1. Verify DB connection
                const connected = await api.checkDbConnection();
                set({ isDbConnected: connected });
                if (!connected) {
                    set({ dbError: 'Could not connect to local SQLite database.', isRefreshing: false });
                    return;
                }
                set({ dbError: null });

                // 2. Fetch sidebar groups
                const foldersList = await api.getFolders();
                const datesList = await api.getDatesWithShots(get().filters);
                const keywordsList = await api.getKeywords();
                const logsList = await api.getIngestLogs();

                // 3. Fetch paginated grid videos
                const countOptions = { ...get().filters };
                const count = await api.getVideoCount(countOptions);
                
                const listOptions = {
                    ...get().filters,
                    limit: get().limit,
                    offset: (get().page - 1) * get().limit
                };
                const videosList = await api.getVideos(listOptions);

                // 4. Update scanner status
                const scannerProgress = await api.getScanProgress();

                set({
                    folders: foldersList,
                    dates: datesList,
                    keywords: keywordsList,
                    ingestLogs: logsList,
                    totalCount: count,
                    videos: videosList,
                    scanProgress: scannerProgress
                });
            } catch (err: any) {
                console.error('[Store] Library refresh failed:', err);
                set({ dbError: err.message || 'Error occurred loading data.' });
            } finally {
                set({ isRefreshing: false });
            }
        },

        triggerScanner: async () => {
            try {
                const progress = await api.startScan();
                set({ scanProgress: progress });
                void get().refreshLibrary();
            } catch (err) {
                console.error('[Store] Scanner failed to trigger:', err);
            }
        },

        selectIngestFolder: async () => {
            try {
                const path = await api.selectDirectory();
                if (path) {
                    set({ ingestSourcePath: path });
                }
            } catch (err) {
                console.error('[Store] Select directory dialog failed:', err);
            }
        },

        setIngestSourcePath: (path: string) => set({ ingestSourcePath: path }),

        runIngest: async (dryRun = false) => {
            const src = get().ingestSourcePath.trim();
            if (!src) return;
            const modeLabel = dryRun ? 'dry-run preview' : 'full ingest';
            set({
                isIngesting: true,
                ingestLogsConsole: [`[Main] Starting ${modeLabel} from: ${src}\n`],
            });
            try {
                await api.runPythonIngest(src, { dryRun });
                // In non-Electron browser mode, we trigger and return instantly.
                // We'll run a background check to update log later.
                if (!isElectron) {
                    set({ isIngesting: false, ingestLogsConsole: ['[Server] Ingestion script triggered. Check terminal console output of running backend process.\n'] });
                    setTimeout(() => get().refreshLibrary(), 2000);
                }
            } catch (err: any) {
                console.error('[Store] Ingestion failure:', err);
                set({
                    isIngesting: false,
                    ingestLogsConsole: [`[Store Error] Failed to run ingest child: ${err.message}\n`]
                });
            }
        }
    };
});
