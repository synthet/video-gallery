---
name: gallery-ui
description: React component patterns, state management, and styling for Driftara Video renderer (aligned with image-scoring-gallery).
---

# Video gallery UI (Driftara Video)

## Component architecture

```
App.tsx → AppContent.tsx
├── MainLayout (250px sidebar, 40px top bar, job progress footer)
│   ├── sidebar
│   │   ├── SidebarBrand
│   │   ├── FilterPanel (search, rating, labels, date, sort)
│   │   ├── FolderTree
│   │   ├── KeywordSection
│   │   └── SidebarFooter (SQLite status)
│   └── content
│       └── VideoGrid → VideoCard
├── TheaterView (overlay)
├── IngestModal
└── IngestLogsModal
```

## State

- **Zustand:** `src/store/videoStore.ts` — videos, filters, scan/ingest, selection.
- **Local UI:** `AppContent` — sidebar open, modal open flags.

## Styling

| File | Role |
|------|------|
| `src/styles/tokens.css` | `@synthet/image-scoring-design/tokens.css` |
| `src/styles/tokens.local.css` | Layout width, spacing, `--card-bg`, focus ring |
| `src/styles/layout.css` | Shell: `.app-container`, `.sidebar`, `.top-bar` |
| `src/index.css` | Reset, buttons, modals, terminal |
| `*.module.css` | Per-component (FilterPanel, VideoCard, …) |

VS Code Dark+ — flat `#007acc` accents; no purple gradients. See `docs/design/DESIGN_SYSTEM.md`.

## Design check

```bash
npm run design:check
```

## IPC

Renderer uses `window.electronAPI` / `videoStore` `api` helper only — no direct SQLite.
