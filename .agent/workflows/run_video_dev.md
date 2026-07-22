---
description: Run Driftara Video in dev — Express + Vite + Electron
---

## Purpose

Start the full dev stack for UI and IPC work.

## Commands (repo root)

```bash
npm install
npm run dev
```

**Web only:**

```bash
npm run dev:web
```

**Linux / headless:**

```bash
npm run dev:web
npx tsc -p electron/tsconfig.json
ELECTRON_IS_DEV=1 npx electron .
```

## Prerequisites

- `config.json` with a valid `libraryRoot` (or default `D:\Videos` on Windows)
- Node 20+ recommended

## See also

- [AGENTS.md](../../AGENTS.md)
- [COMMANDS.md](../COMMANDS.md)
