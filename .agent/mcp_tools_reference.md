# MCP Tools Quick Reference — Driftara Video

Project MCP servers (see [`.cursor/mcp.json`](../.cursor/mcp.json)):

- **`video-gallery-stdio`** — local stdio app built from [`mcp-server/`](../mcp-server/). Read-only: config, `video_status`, dev Express `api_*` probes.
- **`video-gallery-live`** — SSE when Electron dev is running. `cdp_*`, `video_window_status`, `video_ipc_ping`.
- **`cli-review`** — external Codex/Gemini reviews via sibling [`subagent-orchestrator`](../subagent-orchestrator).

## Read-only diagnostics profile (preferred)

### From `video-gallery-stdio`

| Tool | Purpose |
|------|---------|
| `video_status` | One-shot reachability: dev Express API + Electron CDP. **Start here.** |
| `get_electron_config` | `config.json` (`libraryRoot`, `expressPort`) |
| `get_electron_logs` | Guidance (session log files not implemented yet) |
| `get_system_stats` | Host CPU / RAM / uptime |
| `api_health` | `/gallery-api/ping` + `/gallery-api/db/check-connection` |
| `api_probe` | Timed GET under `/gallery-api/*` |
| `api_scanner_progress` | Library scan progress |
| `api_video_count` | Video row count |

### From `video-gallery-live`

| Tool | Purpose |
|------|---------|
| `video_window_status` | Main window bounds / visibility |
| `video_ipc_ping` | Live transport round-trip |
| `cdp_console_logs`, `cdp_evaluate`, `cdp_screenshot` | Renderer inspection when CDP is enabled |

## Quick triage flow

1. `video_status` — what's reachable?
2. `api_health` / `api_probe` — dev server up?
3. `get_electron_logs` / terminal from `npm run dev` — recent errors?
4. `cdp_console_logs` (live + CDP) — renderer errors?

## Pointers

- Subagents: [`.cursor/agents/`](../.cursor/agents/), [subagents/README.md](subagents/README.md).
- External reviews: [.cursor/skills/subagent-review/SKILL.md](../.cursor/skills/subagent-review/SKILL.md).
