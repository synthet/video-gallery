import { contextBridge, ipcRenderer } from 'electron';

function unwrapEnvelope<T>(response: { ok: boolean; data?: T; error?: string }): T {
    if (response.ok) {
        return response.data as T;
    }
    throw new Error(response.error || 'Unknown error');
}

contextBridge.exposeInMainWorld('electron', {
    ping: () => ipcRenderer.invoke('ping'),
    
    // DB Queries
    checkDbConnection: async () => {
        const response = await ipcRenderer.invoke('db:check-connection');
        return unwrapEnvelope<boolean>(response);
    },
    getVideoCount: async (options?: any) => {
        const response = await ipcRenderer.invoke('db:get-video-count', options);
        return unwrapEnvelope<number>(response);
    },
    getVideos: async (options?: any) => {
        const response = await ipcRenderer.invoke('db:get-videos', options);
        return unwrapEnvelope<any[]>(response);
    },
    getVideoDetails: async (id: number) => {
        const response = await ipcRenderer.invoke('db:get-video-details', id);
        return unwrapEnvelope<any | null>(response);
    },
    updateVideoDetails: async (id: number, updates: any) => {
        const response = await ipcRenderer.invoke('db:update-video-details', { id, updates });
        return unwrapEnvelope<any>(response);
    },
    deleteVideo: async (id: number, deleteFileFromDisk = false) => {
        const response = await ipcRenderer.invoke('db:delete-video', { id, deleteFileFromDisk });
        return unwrapEnvelope<boolean>(response);
    },
    getFolders: async () => {
        const response = await ipcRenderer.invoke('db:get-folders');
        return unwrapEnvelope<any[]>(response);
    },
    deleteFolder: async (id: number) => {
        const response = await ipcRenderer.invoke('db:delete-folder', id);
        return unwrapEnvelope<boolean>(response);
    },
    getKeywords: async () => {
        const response = await ipcRenderer.invoke('db:get-keywords');
        return unwrapEnvelope<string[]>(response);
    },
    getDatesWithShots: async (options?: any) => {
        const response = await ipcRenderer.invoke('db:get-dates-with-shots', options);
        return unwrapEnvelope<string[]>(response);
    },

    // Directory Scanner
    getScanProgress: async () => {
        const response = await ipcRenderer.invoke('scanner:get-progress');
        return unwrapEnvelope<any>(response);
    },
    startScan: async () => {
        const response = await ipcRenderer.invoke('scanner:start-scan');
        return unwrapEnvelope<any>(response);
    },
    onScanProgressUpdate: (callback: (progress: any) => void) => {
        const handler = (_: unknown, progress: any) => callback(progress);
        ipcRenderer.on('scanner:progress-update', handler);
        return () => {
            ipcRenderer.removeListener('scanner:progress-update', handler);
        };
    },

    // Python Ingest Integrations
    runPythonIngest: async (sourcePath: string, options?: { dryRun?: boolean }) => {
        const response = await ipcRenderer.invoke('ingest:run', { sourcePath, dryRun: options?.dryRun });
        return unwrapEnvelope<boolean>(response);
    },
    getIngestLogs: async () => {
        const response = await ipcRenderer.invoke('ingest:get-logs');
        return unwrapEnvelope<any[]>(response);
    },
    onIngestOutput: (callback: (data: {
        type: 'stdout' | 'stderr' | 'exit';
        text?: string;
        code?: number;
        dryRun?: boolean;
        copied?: number;
        skipped?: number;
        errors?: number;
    }) => void) => {
        const handler = (_: unknown, data: any) => callback(data);
        ipcRenderer.on('ingest:output', handler);
        return () => {
            ipcRenderer.removeListener('ingest:output', handler);
        };
    },

    // OS Utilities
    selectDirectory: async () => {
        const response = await ipcRenderer.invoke('fs:select-directory');
        return unwrapEnvelope<string | null>(response);
    },
    openExternalUrl: async (url: string) => {
        await ipcRenderer.invoke('system:open-external-url', url);
    },
    revealInExplorer: async (filePath: string) => {
        const response = await ipcRenderer.invoke('fs:reveal-in-explorer', filePath);
        return unwrapEnvelope<boolean>(response);
    },
    getLibraryRootPath: async () => {
        return ipcRenderer.invoke('system:get-library-root');
    }
});
