---
name: video-electron-ts
description: >-
  Electron + TypeScript for video-gallery: SQLite in main process, IPC/preload,
  scanner/ingest, React/Vite. Use for desktop bugs, schema changes, or electron/ src/ work.
---

# video-electron-ts

Specialist workflow for **Driftara Video** (`video-gallery`).

## When to use

- IPC, preload, or main-process bugs
- SQLite schema or query changes (`electron/db/`)
- Library scan, metadata queue, ingest (`electron/scanner.ts`, `electron/ingestRunner.ts`)
- Renderer UI under `src/` tied to `window.electronAPI`

## Authority

- **SQLite schema:** `electron/db/schema.ts` (this repo)
- **IPC contract:** `electron/preload.ts` + handlers in `electron/main.ts`
- **Library paths:** `electron/config.ts`, `config.json` → `libraryRoot`

## Commands

```bash
npx tsc -p electron/tsconfig.json --noEmit
npx tsc --noEmit
npm run dev          # full stack
npm run dev:web      # no Electron
```

## IPC checklist

1. `ipcMain.handle` in `electron/main.ts` (use `envelope()` where present)
2. Expose on `contextBridge` in `electron/preload.ts`
3. Consume from React via `window.electronAPI`

Never add `sqlite3` or `fs` usage in the renderer.

## Cross-repo

- Design tokens: `@synthet/image-scoring-design` from sibling **image-scoring-ui**
- For shared backlog/process: **image-scoring-gallery** docs and **image-scoring-backend** when coordinating scoring work
