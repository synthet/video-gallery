import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import type { ToolDef } from "./tools/core.js";
import { coreToolDefs, handleCoreTool } from "./tools/core.js";
import { apiToolDefs, handleApiTool } from "./tools/api.js";
import { cdpToolDefs, handleCdpTool } from "./tools/cdp.js";
import {
    createLiveIpcToolDefs,
    handleLiveIpcTool,
    type VideoLiveHooks,
} from "./tools/liveIpc.js";

export type VideoMcpMode = "stdio" | "live";

export interface CreateVideoMcpServerOptions {
    mode: VideoMcpMode;
    hooks?: VideoLiveHooks;
}

function toolNames(defs: ToolDef[]): Set<string> {
    return new Set(defs.map((t) => t.name));
}

export function toolsForMode(mode: VideoMcpMode): ToolDef[] {
    if (mode === "stdio") {
        return [...coreToolDefs, ...apiToolDefs];
    }
    return [...cdpToolDefs, ...createLiveIpcToolDefs()];
}

export function createVideoMcpServer(options: CreateVideoMcpServerOptions): {
    server: Server;
    toolDefs: ToolDef[];
} {
    const { mode, hooks = {} } = options;
    const toolDefs = toolsForMode(mode);

    const mcpServer = new Server(
        {
            name: mode === "stdio" ? "video-gallery-stdio" : "video-gallery-live",
            version: "1.0.0",
        },
        { capabilities: { tools: {} } },
    );

    const coreTools = toolNames(coreToolDefs);
    const apiTools = toolNames(apiToolDefs);
    const cdpTools = toolNames(cdpToolDefs);
    const liveIpcTools = toolNames(createLiveIpcToolDefs());

    mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: toolDefs }));

    mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        const toolArgs = (args ?? {}) as Record<string, unknown>;

        try {
            if (coreTools.has(name)) return await handleCoreTool(name, toolArgs);
            if (apiTools.has(name)) return await handleApiTool(name, toolArgs);
            if (cdpTools.has(name)) return await handleCdpTool(name, toolArgs);
            if (liveIpcTools.has(name)) return await handleLiveIpcTool(name, toolArgs, hooks);
            throw new Error(`Unknown tool: ${name}`);
        } catch (error: unknown) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
                isError: true,
            };
        }
    });

    return { server: mcpServer, toolDefs };
}
