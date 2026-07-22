import type { ToolDef, ToolResult } from "./core.js";

export interface VideoLiveHooks {
    getWindowStatus?: () => Promise<Record<string, unknown>>;
}

export function createLiveIpcToolDefs(): ToolDef[] {
    return [
        {
            name: "video_window_status",
            description:
                "Requires video-gallery-live (Electron running). Main window visibility, bounds, and focus from the main process.",
            inputSchema: { type: "object", properties: {} },
        },
        {
            name: "video_ipc_ping",
            description:
                "Requires video-gallery-live. Round-trip ping from MCP live server through Electron hooks.",
            inputSchema: { type: "object", properties: {} },
        },
    ];
}

export async function handleLiveIpcTool(
    name: string,
    _args: Record<string, unknown>,
    hooks: VideoLiveHooks,
): Promise<ToolResult> {
    if (name === "video_window_status") {
        if (!hooks.getWindowStatus) {
            return {
                content: [
                    {
                        type: "text",
                        text: "video_window_status requires Electron main-process hooks (video-gallery-live SSE).",
                    },
                ],
                isError: true,
            };
        }
        const status = await hooks.getWindowStatus();
        return { content: [{ type: "text", text: JSON.stringify(status, null, 2) }] };
    }

    if (name === "video_ipc_ping") {
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(
                        {
                            ok: true,
                            transport: "video-gallery-live",
                            pid: process.pid,
                            timestamp: new Date().toISOString(),
                        },
                        null,
                        2,
                    ),
                },
            ],
        };
    }

    throw new Error(`Unknown live IPC tool: ${name}`);
}
