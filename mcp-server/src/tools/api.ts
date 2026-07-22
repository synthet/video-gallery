import { resolveDevApiUrl } from "../utils/config.js";

interface ToolDef {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}

interface ToolResult {
    [key: string]: unknown;
    content: { type: string; text: string }[];
    isError?: boolean;
}

async function apiFetch(path: string, timeout = 5000): Promise<unknown> {
    const baseUrl = await resolveDevApiUrl();
    const url = `${baseUrl}${path}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(timeout) });
    if (!resp.ok) throw new Error(`API ${resp.status}: ${resp.statusText}`);
    const text = await resp.text();
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

function assertSafeGalleryApiPath(path: string): string {
    const p = path.trim();
    if (!p.startsWith("/gallery-api/")) {
        throw new Error("path must start with /gallery-api/");
    }
    if (p.includes("..") || p.includes("://") || p.includes("\n") || p.includes("\r")) {
        throw new Error("invalid path");
    }
    if (p.length > 512) throw new Error("path too long");
    return p;
}

export const apiToolDefs: ToolDef[] = [
    {
        name: "api_health",
        description:
            "Requires dev_api reachable (see video_status). GET /gallery-api/ping and /gallery-api/db/check-connection.",
        inputSchema: { type: "object", properties: {} },
    },
    {
        name: "api_probe",
        description:
            "Requires dev_api. Timed GET on dev Express; path must start with /gallery-api/, no ..",
        inputSchema: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "Relative path, e.g. /gallery-api/db/video-count",
                },
                timeout_ms: {
                    type: "number",
                    description: "Timeout in milliseconds (default 10000, max 120000)",
                },
            },
            required: ["path"],
        },
    },
    {
        name: "api_scanner_progress",
        description: "Requires dev_api. GET /gallery-api/scanner/progress.",
        inputSchema: { type: "object", properties: {} },
    },
    {
        name: "api_video_count",
        description: "Requires dev_api. GET /gallery-api/db/video-count.",
        inputSchema: { type: "object", properties: {} },
    },
];

export async function handleApiTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
        if (name === "api_health") {
            const baseUrl = await resolveDevApiUrl();
            const [ping, db] = await Promise.allSettled([
                fetch(`${baseUrl}/gallery-api/ping`, { signal: AbortSignal.timeout(5000) }),
                fetch(`${baseUrl}/gallery-api/db/check-connection`, {
                    signal: AbortSignal.timeout(5000),
                }),
            ]);

            const result: Record<string, unknown> = { base_url: baseUrl };
            if (ping.status === "fulfilled") {
                result.ping_status = ping.value.status;
                result.ping_body = await ping.value.text();
            } else {
                result.ping_error = ping.reason?.message;
            }
            if (db.status === "fulfilled") {
                result.db_status = db.value.status;
                try {
                    result.db_body = await db.value.json();
                } catch {
                    result.db_body = await db.value.text();
                }
            } else {
                result.db_error = db.reason?.message;
            }

            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }

        if (name === "api_probe") {
            const rawPath = assertSafeGalleryApiPath(String(args?.path ?? ""));
            let timeoutMs = 10000;
            if (typeof args?.timeout_ms === "number" && Number.isFinite(args.timeout_ms)) {
                timeoutMs = Math.min(120000, Math.max(100, Math.floor(args.timeout_ms)));
            }
            const baseUrl = await resolveDevApiUrl();
            const url = `${baseUrl}${rawPath}`;
            const t0 = Date.now();
            try {
                const resp = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
                const elapsedMs = Date.now() - t0;
                const body = await resp.text();
                const preview = body.length > 4000 ? `${body.slice(0, 4000)}…` : body;
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(
                                {
                                    url,
                                    status_code: resp.status,
                                    elapsed_ms: elapsedMs,
                                    body_chars: body.length,
                                    body_preview: preview,
                                },
                                null,
                                2,
                            ),
                        },
                    ],
                };
            } catch (error: unknown) {
                const elapsedMs = Date.now() - t0;
                const msg = error instanceof Error ? error.message : String(error);
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({ url, error: msg, elapsed_ms: elapsedMs }, null, 2),
                        },
                    ],
                };
            }
        }

        if (name === "api_scanner_progress") {
            const progress = await apiFetch("/gallery-api/scanner/progress");
            return { content: [{ type: "text", text: JSON.stringify(progress, null, 2) }] };
        }

        if (name === "api_video_count") {
            const count = await apiFetch("/gallery-api/db/video-count");
            return { content: [{ type: "text", text: JSON.stringify(count, null, 2) }] };
        }

        throw new Error(`Unknown API tool: ${name}`);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes("fetch failed") || msg.includes("ECONNREFUSED")) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Dev Express API is not reachable. Run npm run dev:web or npm run dev.\nError: ${msg}`,
                    },
                ],
                isError: true,
            };
        }
        return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
    }
}
