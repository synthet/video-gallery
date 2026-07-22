---
name: driftara-video-mcp
description: How to use video-gallery MCP servers for diagnostics, dev API probing, and renderer inspection.
---

# Driftara Video MCP

Project MCP keys in [`.cursor/mcp.json`](../../../.cursor/mcp.json):

- **`video-gallery-stdio`** — Node stdio, `mcp-server/dist/index.js`
- **`video-gallery-live`** — SSE when Electron dev runs (`video-mcp.lock` for port)
- **`cli-review`** — external Codex/Gemini reviews (optional for DB triage: open **image-scoring-backend** workspace)

## Start Here

1. Run **`video_status`** on **video-gallery-stdio**.
2. If `dev_api.reachable` → use **`api_*`** (`npm run dev:web` or `npm run dev`).
3. If `electron_cdp.reachable` → use **`cdp_*`** on **video-gallery-live** (`npm run dev`).
4. Live window state → **`video_window_status`** on **video-gallery-live**.

## Gallery MCP Tools (`video-gallery-stdio`)

### Local

| Tool | Purpose |
|------|---------|
| `video_status` | Probe dev Express + CDP before other tools |
| `get_electron_config` | Read `config.json` |
| `get_electron_logs` | Log guidance (no rotating log files yet) |
| `get_system_stats` | Host stats |

### Dev API (`api_*`)

| Tool | Purpose |
|------|---------|
| `api_health` | ping + DB check-connection |
| `api_probe` | GET under `/gallery-api/...` |
| `api_scanner_progress` | Scan progress |
| `api_video_count` | Video count |

### Live (`video-gallery-live`)

| Tool | Purpose |
|------|---------|
| `video_window_status` | Main window state |
| `video_ipc_ping` | Live transport ping |
| `cdp_screenshot`, `cdp_evaluate`, `cdp_console_logs` | Renderer CDP |

## Build

```bash
npm run mcp:install
npm run mcp:build
```

Reload MCP in Cursor after build.
