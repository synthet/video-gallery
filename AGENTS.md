# AI Agents Configuration: Driftara Video

This document describes the AI agent integration for **Driftara Video** (`video-gallery`).

## Overview

This project is optimized for AI-assisted development using Cursor IDE and Claude Code. It vendors **[agent-sdlc](https://github.com/synthet/agent-sdlc)**-style Cursor rules (`.cursor/rules/`), slash commands (`.cursor/commands/`), and project skills (`.cursor/skills/`). **This `AGENTS.md` file** is the source of truth for canonical commands, repository layout, and boundaries.

### Agent skills inventory

Project skills live under [`.cursor/skills/`](.cursor/skills/) (mirrored in `.claude/skills/` where noted). Inventory: [.agent/SKILL_INVENTORY.md](.agent/SKILL_INVENTORY.md).

**Cursor slash commands** (type `/` in chat): **`/spec`**, **`/plan`**, **`/implement`**, **`/test-and-fix`**, **`/pr-ready`**, **`/release-notes`**, **`/check-subagents`**, **`/run-codex-review`**, **`/run-gemini-review`**, **`/run-subagent-review`**. **Claude Code** mirrors these under `.claude/commands/`.

**External CLI reviews:** project MCP **`cli-review`** (sibling [`subagent-orchestrator`](../subagent-orchestrator)) — see [.cursor/skills/subagent-review/SKILL.md](.cursor/skills/subagent-review/SKILL.md).

## MCP Configuration

Project servers are defined in [`.cursor/mcp.json`](.cursor/mcp.json). One-time build: `npm run mcp:install` then `npm run mcp:build` (or `cd mcp-server && npm install && npm run build`).

| Cursor server key | Transport | Requires running app? |
|-------------------|-----------|------------------------|
| **`video-gallery-stdio`** | stdio (Node `mcp-server`) | No — config, `video_status`, `api_*` (when dev server is up) |
| **`video-gallery-live`** | SSE (Electron-hosted) | Yes — `npm run dev` or `ENABLE_GALLERY_MCP_SSE=1` |
| **`cli-review`** | stdio | No — external Codex/Gemini review orchestrator |

After changing MCP config or building `mcp-server`, reload MCP servers in Cursor.

### Environment (live SSE / CDP)

| Variable | Purpose |
|----------|---------|
| `GALLERY_MCP_PORT` | Live SSE port (default `9373`; see `video-mcp.lock`) |
| `GALLERY_MCP_TOKEN` | Optional Bearer token for `video-gallery-live` |
| `ENABLE_GALLERY_MCP_SSE` | Start live MCP outside `ELECTRON_IS_DEV` |
| `ELECTRON_REMOTE_DEBUGGING_PORT` | CDP port for `cdp_*` tools (default `9222`) |
| `ELECTRON_CDP_URL` | Full CDP base URL override |

### MCP smoke (agents)

1. Reload MCP — **`video-gallery-stdio`** connects.
2. **`video_status`** — with dev server stopped, `dev_api.reachable` is false; with `npm run dev:web`, true.
3. **`npm run dev`** — **`video-gallery-live`** connects; `video_window_status` / `cdp_*` when CDP is up.
4. **`/check-subagents`** — **`cli-review`** exposes `detect_subagents` / `run_subagent`.

If **`cli-review`** fails, build the sibling orchestrator: `cd ../subagent-orchestrator/agent-orchestrator && npm install && npm run build`.

## Related projects

| Project | Role |
|---------|------|
| **video-gallery** (this) | Standalone Electron video library (SQLite, local scan/ingest) |
| **image-scoring-ui** | Shared design tokens (`@synthet/image-scoring-design`) — sibling `../image-scoring-ui` |
| **image-scoring-gallery** | Reference for agent infra layout — sibling `../image-scoring-gallery` |
| **subagent-orchestrator** | External CLI review MCP — sibling `../subagent-orchestrator` |

## Git Configuration — Do Not Modify

**Never modify `.git/config`** — do not set `extensions.worktreeConfig`, change `core.repositoryformatversion`, or add git extensions. Third-party tools (Gemini Code Assist / Antigravity) use embedded git libraries that fail on non-standard extensions. If a worktree is needed, use a temporary one and clean it up immediately.

## Documentation References

- **[`.cursorrules`](.cursorrules)** — IDE stub; points at `CLAUDE.md` and `.cursor/rules/`.
- **[`.agent/PROJECT_GUIDE.md`](.agent/PROJECT_GUIDE.md)** — Navigation for agents.
- **[`.agent/ai_edit_spec.md`](.agent/ai_edit_spec.md)** — Coding guidelines.
- **[`.agent/COMMANDS.md`](.agent/COMMANDS.md)** — Verified npm commands.
- **[`.agent/mcp_tools_reference.md`](.agent/mcp_tools_reference.md)** — MCP tool quick reference.
- **[`.agent/SAFETY.md`](.agent/SAFETY.md)** — IPC boundary and hygiene.
- **[`.agent/AGENT_INFRA_INVENTORY.md`](.agent/AGENT_INFRA_INVENTORY.md)** — Agent-facing path catalog.

## Commands (verify in `package.json`)

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local Express server + Vite + Electron |
| `npm run dev:web` | Server + Vite only (no Electron) |
| `npm run build` | Production build (electron + renderer) |
| `npm run dist` | Windows installer via electron-builder |
| `npm run mcp:install` | Install `mcp-server` dependencies |
| `npm run mcp:build` | Build MCP stdio + live bundles |
| `npx tsc --noEmit` | Renderer typecheck (`tsc -b`) |
| `npx tsc -p electron/tsconfig.json --noEmit` | Main-process typecheck |

## Architecture notes for agents

- **SQLite** lives under `{libraryRoot}/.driftara/` — see `electron/db/provider.ts`, `electron/db/schema.ts`.
- **Library root** — `config.json` → `libraryRoot` (default `D:\Videos` on Windows).
- **IPC** — all DB and filesystem access in the **Electron main process**; renderer uses `window.electronAPI` via `preload.ts`.
- **Express server** — `server/` + `npm run server` for dev API used by the renderer during development (`/gallery-api/*`).

## Cursor Cloud / Linux dev

1. `npm run dev:web` — server + Vite on `http://localhost:5173`
2. `npx tsc -p electron/tsconfig.json`
3. `ELECTRON_IS_DEV=1 npx electron .`

Ensure `libraryRoot` in `config.json` points at a readable video folder (or accept empty library for UI-only work).
