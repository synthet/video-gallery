# Safety and boundaries — video-gallery

## IPC

- Database (`sqlite3`) and filesystem operations **only** in the Electron main process.
- Expose capabilities through `electron/preload.ts` / `contextBridge`.
- Do not import `sqlite3`, `fs`, or `path` for library data access in `src/` renderer code.

## Secrets and local data

- Do not commit `config.json` with personal paths if it contains secrets (prefer `.gitignore` + example).
- Do not commit `*.db`, `*.sqlite`, thumbnail caches, or video files.
- Do not commit `.env` with real credentials.

## Git

- **Never modify `.git/config`** or add non-standard git extensions (breaks Antigravity / embedded git tools).

## Scope

- This app is **standalone** — do not assume image-scoring PostgreSQL or gallery MCP unless the user explicitly asks for cross-repo integration.
