# Logical subagent roles — video-gallery

| Role | Cursor agent / skill | Focus |
|------|----------------------|--------|
| video-electron-agent | [video-electron-ts](../.cursor/agents/video-electron-ts.md), [skill](../.cursor/skills/video-electron-ts/SKILL.md) | Main/preload, SQLite, scan/ingest |
| video-mcp-debug | [video-mcp-debug](../.cursor/agents/video-mcp-debug.md) | MCP triage (stdio + live) |
| pr-ready | [pr-ready-hygiene](../.cursor/agents/pr-ready-hygiene.md) | Typecheck + PR hygiene |
| external review | [external-cli-reviewer](../.cursor/agents/external-cli-reviewer.md), [subagent-review](../.cursor/skills/subagent-review/SKILL.md) | Codex/Gemini via **cli-review** MCP |

## Verify before handoff

```bash
npm run mcp:build
npx tsc -p electron/tsconfig.json --noEmit
npx tsc --noEmit
```
