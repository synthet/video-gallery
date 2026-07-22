import path from "path";

export interface VideoLiveServerHandle {
    port: number;
    sseUrl: string;
    close: () => Promise<void>;
}

let videoMcpLive: VideoLiveServerHandle | null = null;

export function isVideoMcpLiveEnabled(): boolean {
    return process.env.ELECTRON_IS_DEV === "1" || process.env.ENABLE_GALLERY_MCP_SSE === "1";
}

export async function startVideoMcpLiveFromElectron(options: {
    projectRoot: string;
    getWindowStatus: () => Promise<Record<string, unknown>>;
}): Promise<void> {
    if (!isVideoMcpLiveEnabled() || videoMcpLive) {
        return;
    }

    const port = parseInt(process.env.GALLERY_MCP_PORT ?? "9373", 10);
    // Use dynamic import evaluator to prevent tsc from transpiling import() to require() in CommonJS target
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const importESM = new Function("specifier", "return import(specifier)");
    const mod = await importESM("../mcp-server/dist/liveServer.js");
    videoMcpLive = await mod.startVideoMcpLiveServer({
        projectRoot: options.projectRoot,
        port,
        hooks: { getWindowStatus: options.getWindowStatus },
    });
    console.log(`[Main] video-gallery-live MCP at ${videoMcpLive?.sseUrl ?? "unknown"}`);
}

export async function stopVideoMcpLiveFromElectron(): Promise<void> {
    if (!videoMcpLive) return;
    await videoMcpLive.close();
    videoMcpLive = null;
}

export function videoMcpLockPath(projectRoot: string): string {
    return path.join(projectRoot, "video-mcp.lock");
}
