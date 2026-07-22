#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createVideoMcpServer } from "./createVideoMcpServer.js";

async function main() {
    const { server, toolDefs } = createVideoMcpServer({ mode: "stdio" });
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("video-gallery-stdio MCP v1.0.0");
    console.error(`Tools: ${toolDefs.map((t) => t.name).join(", ")}`);
}

main().catch((error) => {
    console.error("Fatal error running stdio MCP:", error);
    process.exit(1);
});
