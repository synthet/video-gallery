---
description: Verify video-gallery before PR — typecheck main + renderer
---

## Commands

```bash
npx tsc -p electron/tsconfig.json --noEmit
npx tsc --noEmit
```

## Optional

- Smoke: `npm run dev:web` and open `http://localhost:5173`
- Full stack: `npm run dev` and exercise scan/playback in Electron

## Done when

Both typechecks pass with no errors.
