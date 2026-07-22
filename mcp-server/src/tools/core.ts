import os from "os";

import { collectVideoStatus } from "../utils/capabilities.js";
import { readConfig, getConfigPath } from "../utils/config.js";

export interface ToolDef {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}

export interface ToolResult {
    [key: string]: unknown;
    content: { type: string; text?: string; data?: string; mimeType?: string }[];
    isError?: boolean;
}

export const coreToolDefs: ToolDef[] = [
    {
        name: "get_electron_logs",
        description:
            "Session log files are not written yet in Driftara Video. Returns guidance to use npm run dev console output.",
        inputSchema: {
            type: "object",
            properties: {
                lines: {
                    type: "number",
                    description: "Ignored until session logs exist (default 100).",
                },
            },
        },
    },
    {
        name: "get_electron_config",
        description: "Read config.json from the video-gallery project root.",
        inputSchema: { type: "object", properties: {} },
    },
    {
        name: "get_system_stats",
        description:
            "Host CPU, memory, uptime. Does not probe network; use video_status for dev API/CDP reachability.",
        inputSchema: { type: "object", properties: {} },
    },
    {
        name: "video_status",
        description:
            "Probe dev_api (Express /gallery-api) and electron_cdp (DevTools /json). Use first to choose api_* vs cdp_* tools.",
        inputSchema: { type: "object", properties: {} },
    },
];

export async function handleCoreTool(
    name: string,
    args: Record<string, unknown>,
): Promise<ToolResult> {
    if (name === "get_electron_logs") {
        return {
            content: [
                {
                    type: "text",
                    text: [
                        "Driftara Video does not write rotating session logs under %APPDATA% yet.",
                        "Use the terminal running `npm run dev` for main-process output, or enable CDP console capture via cdp_console_logs when Electron is running.",
                        `(Requested tail lines: ${(args?.lines as number) || 100})`,
                    ].join("\n"),
                },
            ],
        };
    }

    if (name === "get_electron_config") {
        const configPath = getConfigPath();
        try {
            const config = await readConfig();
            return {
                content: [
                    {
                        type: "text",
                        text: `Config (${configPath}):\n${JSON.stringify(config, null, 2)}`,
                    },
                ],
            };
        } catch {
            return { content: [{ type: "text", text: `No config.json found at: ${configPath}` }] };
        }
    }

    if (name === "get_system_stats") {
        const stats = {
            platform: os.platform(),
            release: os.release(),
            arch: os.arch(),
            cpus: os.cpus().length,
            totalMemoryGB: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2),
            freeMemoryGB: (os.freemem() / 1024 / 1024 / 1024).toFixed(2),
            uptimeSeconds: Math.floor(os.uptime()),
        };
        return { content: [{ type: "text", text: JSON.stringify(stats, null, 2) }] };
    }

    if (name === "video_status") {
        const status = await collectVideoStatus();
        return { content: [{ type: "text", text: JSON.stringify(status, null, 2) }] };
    }

    throw new Error(`Unknown core tool: ${name}`);
}
