# Changelog

All notable changes to **Driftara Video** (`video-gallery`) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project uses [Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-07-21

### Added
- **Design-system UI**: Shared `@synthet/image-scoring-design` tokens, local layout/spacing tokens, and `design:check` guard.
- **Component shell**: MainLayout, FilterPanel, FolderTree, VideoGrid/VideoCard, TheaterView, Ingest and Logs modals (sidebar filters replace tab chrome).
- **MCP tooling**: `mcp-server` (stdio + Electron-hosted live SSE), `mcp:install` / `mcp:build`, and live hooks in the main process.
- **Agent infra**: `AGENTS.md` / `CLAUDE.md`, Cursor and Claude commands/rules/skills, and `ui:review` Playwright audit script.
- **UX polish**: Keyboard-open cards, Escape dismiss for overlays, filter a11y labels/`aria-pressed`, narrow-viewport sidebar scrim, empty-state CTAs.

### Changed
- **App structure**: Monolithic `App.tsx` split into `AppContent` and feature CSS Modules; Vite default port **5174**.
- **Dependencies**: `sqlite3` to ^6; Playwright added for visual review.

### Fixed
- **Accessibility**: Select names, Clear-filters contrast (≥4.5:1), muted badge/pagination contrast; Lighthouse a11y **100** on re-check.
- **Cards**: Thumbnail `onError` fallback, hide empty duration/meta, lazy hover preview mount.

## [1.0.0] - 2026-05-31

### Added
- Initial Driftara Video desktop app (Electron + React + Vite, SQLite library scan/ingest).
