declare module "../mcp-server/dist/liveServer.js" {
    export interface VideoLiveServer {
        port: number;
        sseUrl: string;
        close: () => Promise<void>;
    }

    export function startVideoMcpLiveServer(options: {
        port?: number;
        projectRoot: string;
        hooks?: {
            getWindowStatus?: () => Promise<Record<string, unknown>>;
        };
    }): Promise<VideoLiveServer>;
}
