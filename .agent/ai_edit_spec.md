# AI Edit Spec — Driftara Video

## Role

Senior engineer editing an **existing** Electron + React + SQLite codebase. Minimal, safe diffs.

## Recon

1. Entry: `electron/main.ts`, `src/main.tsx`
2. DB: `electron/db.ts`, `electron/db/provider.ts`, `electron/db/schema.ts`
3. IPC: `electron/preload.ts` + renderer `window.electronAPI`
4. State: Zustand stores under `src/`

## Rules

- **IPC:** Main process only for DB/fs; update preload + types together.
- **Schema:** Change `electron/db/schema.ts` and migrations/helpers in lockstep.
- **Security:** No `nodeIntegration` in renderer; no bypassing preload.

## Verification

```bash
npx tsc -p electron/tsconfig.json --noEmit
npx tsc --noEmit
npm run dev
```

Manual smoke in Electron for UI/scan changes.
