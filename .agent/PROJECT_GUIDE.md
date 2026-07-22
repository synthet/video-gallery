# Agent Project Guide: Driftara Video

Navigation for AI agents working in **video-gallery** (Driftara Video).

## Start here

| Doc | Purpose |
|-----|---------|
| [CLAUDE.md](../CLAUDE.md) | Orientation, key files, IPC |
| [AGENTS.md](../AGENTS.md) | Commands, agent infra, boundaries |
| [AGENT_INFRA_INVENTORY.md](AGENT_INFRA_INVENTORY.md) | Path catalog |
| [COMMANDS.md](COMMANDS.md) | npm commands |
| [SAFETY.md](SAFETY.md) | IPC + git hygiene |
| [ai_edit_spec.md](ai_edit_spec.md) | Edit style |

## Cursor / Claude layout

| Path | Purpose |
|------|---------|
| `.cursor/rules/*.mdc` | Always-on and scoped rules |
| `.cursor/commands/*.md` | Slash commands |
| `.cursor/skills/*/SKILL.md` | Project skills |
| `.cursor/agents/*.md` | Subagent prompts |
| `.claude/` | Mirrors commands, agents, rules, skills for Claude Code |

Reference implementation: sibling **image-scoring-gallery**.

## Architecture (short)

- **SQLite** in main process — `electron/db/provider.ts`, data under `{libraryRoot}/.driftara/`
- **Scan / ingest** — `electron/scanner.ts`, `electron/ingestRunner.ts`
- **IPC** — `electron/main.ts` + `electron/preload.ts`; renderer uses `window.electronAPI`
- **Dev server** — `server/` (Express) during `npm run dev`

## Backlog (optional)

If using the shared GitHub Project with image-scoring repos, follow [.cursor/skills/backlog-queue/SKILL.md](../.cursor/skills/backlog-queue/SKILL.md).

## Workflows

- [workflows/run_video_dev.md](workflows/run_video_dev.md) — start dev stack
- [workflows/verify_video.md](workflows/verify_video.md) — typecheck before PR
