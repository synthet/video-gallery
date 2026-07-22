# Command quick reference — video-gallery

From [AGENTS.md](../AGENTS.md) and [package.json](../package.json). Run from **repo root** unless noted.

## Setup

- `npm install`
- `npm run mcp:install` and `npm run mcp:build` once for **video-gallery-stdio** / **video-gallery-live** MCP

## Development

- Full dev (server + Vite + Electron): `npm run dev`
- Web only (no Electron): `npm run dev:web`
- Linux / headless-friendly: `npm run dev:web`, then `npx tsc -p electron/tsconfig.json`, then `ELECTRON_IS_DEV=1 npx electron .` per AGENTS.md

## Types

- Renderer: `npx tsc --noEmit`
- Electron main: `npx tsc -p electron/tsconfig.json --noEmit`

## MCP / support

- Primary: **video-gallery-stdio** — start with `video_status`
- Live: **video-gallery-live** — `npm run dev`; port in `video-mcp.lock`
- External review: **cli-review** — `/check-subagents`, `/run-codex-review`, etc.
- Live smoke: `cd mcp-server && npm run test:live-smoke`

## Cross-repo

- Agent infra reference: sibling **image-scoring-gallery**
- External CLI orchestrator: **../subagent-orchestrator/agent-orchestrator**
