# Driftara Video (`video-gallery`)

Standalone Electron desktop app for browsing and managing a local video library (scan, metadata, thumbnails, ingest).

## Related projects

| Project | Repository / path | Role |
|---------|-------------------|------|
| **video-gallery** (this) | `synthet/video-gallery` (local clone) | Desktop UI, SQLite, scan/ingest |
| **image-scoring-ui** | sibling `../image-scoring-ui` | Shared React design package |
| **image-scoring-gallery** | sibling `../image-scoring-gallery` | Photo gallery; agent infra reference |
| **image-scoring-pipeline** | [github.com/synthet/image-scoring-pipeline](https://github.com/synthet/image-scoring-pipeline) | Scoring stack; shared GitHub Project backlog when coordinating |

## Backlog (when using shared project board)

If your team uses the cross-repo GitHub Project board (same as image-scoring repos):

**→ https://github.com/users/synthet/projects/1**

1. Pick from **`Stage = Ready`**, sorted by priority.
2. Claim via `/task-claim` or [`image-scoring-gallery` backlog doc](../image-scoring-gallery/docs/project/00-backlog-workflow.md).
3. Move to **`In Progress`** on first commit; **`Review`** when PR is open; `Closes #N` in the PR.

For video-only work without a board issue, confirm with the maintainer before inventing scope.

## Agent infra

- **[`AGENTS.md`](AGENTS.md)** — commands, MCP notes, boundaries
- **[`.agent/AGENT_INFRA_INVENTORY.md`](.agent/AGENT_INFRA_INVENTORY.md)** — path catalog
- **[`.cursor/rules/`](.cursor/rules/)** — focused rules (`agent-canonical-sources.mdc`, SDLC, backlog)
- **[`.cursor/commands/`](.cursor/commands/)** — slash commands (`/spec`, `/plan`, `/implement`, …)

## Key files

- `electron/main.ts` — main process, IPC handlers
- `electron/preload.ts` — `contextBridge` API
- `electron/db.ts`, `electron/db/provider.ts`, `electron/db/schema.ts` — SQLite layer
- `electron/scanner.ts`, `electron/ingestRunner.ts` — library scan and ingest
- `electron/config.ts` — `config.json` load/save
- `server/` — Express dev API (`npm run server`)
- `src/` — React + Vite renderer

## IPC pattern (required)

1. Handler in `electron/main.ts` via `ipcMain.handle` (often wrapped with `envelope()`).
2. Expose in `electron/preload.ts` through `contextBridge`.
3. Type in renderer (`src/` types for `window.electronAPI`).
4. Call from React via `window.electronAPI`.

**Renderer must not** open SQLite or read arbitrary filesystem paths directly.

## Development guidelines

- **Never modify `.git/config`** (see `AGENTS.md`).
- Prefer **small, focused diffs**; match existing patterns in `electron/` and `src/`.
- Run typecheck before claiming work is done: `npx tsc -p electron/tsconfig.json --noEmit` and `npx tsc --noEmit`.

## Commands

- `npm run dev` — server + Vite + Electron
- `npm run dev:web` — server + Vite only
- `npm run build` — compile electron + renderer
- `npm run dist` — Windows NSIS package

@AGENTS.md
