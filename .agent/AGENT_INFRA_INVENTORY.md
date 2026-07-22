# Agent infrastructure inventory — video-gallery

**Last reviewed:** 2026-05-31.

| Path | Purpose | Status |
|------|---------|--------|
| [AGENTS.md](../AGENTS.md) | Commands, boundaries | active |
| [CLAUDE.md](../CLAUDE.md) | Orientation | active |
| [.cursorrules](../.cursorrules) | Cursor IDE stub | active |
| [.agent/PROJECT_GUIDE.md](PROJECT_GUIDE.md) | Agent navigation | active |
| [.agent/COMMANDS.md](COMMANDS.md) | npm commands | active |
| [.agent/SAFETY.md](SAFETY.md) | IPC / git hygiene | active |
| [.agent/ai_edit_spec.md](ai_edit_spec.md) | Edit conventions | active |
| [.agent/SKILL_INVENTORY.md](SKILL_INVENTORY.md) | Skills index | active |
| [.cursor/rules/*.mdc](../.cursor/rules/) | Cursor rules | active |
| [.cursor/commands/*.md](../.cursor/commands/) | Slash commands | active |
| [.cursor/skills/*/SKILL.md](../.cursor/skills/) | Project skills | active |
| [.cursor/agents/*.md](../.cursor/agents/) | Subagents | active |
| [.claude/commands/](../.claude/commands/) | Claude command mirrors | active |
| [.claude/agents/](../.claude/agents/) | Claude agent mirrors | active |
| [.claude/rules/](../.claude/rules/) | Claude rule mirrors | active |
| [.claude/skills/](../.claude/skills/) | Claude skill mirrors (subset) | active |

| [.cursor/mcp.json](../.cursor/mcp.json) | MCP: video-gallery-stdio, video-gallery-live, cli-review | active |
| [mcp-server/](../mcp-server/) | Project MCP implementation | active |
| [.agent/mcp_tools_reference.md](mcp_tools_reference.md) | MCP tool catalog | active |

## Not in this repo

- `docs/CANONICAL_SOURCES.md` wiki tree (add when the video repo grows a `docs/` folder)

## Subagents

| Agent | File |
|-------|------|
| video-electron-ts | `.cursor/agents/video-electron-ts.md` |
| video-mcp-debug | `.cursor/agents/video-mcp-debug.md` |
| pr-ready-hygiene | `.cursor/agents/pr-ready-hygiene.md` |
| external-*-review | Codex/Gemini CLI review agents |
