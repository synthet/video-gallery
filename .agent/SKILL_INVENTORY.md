# Skill inventory — video-gallery

Skills under `.cursor/skills/` (Claude mirrors where present in `.claude/skills/`).

| Skill | Path | Use when |
|-------|------|----------|
| video-electron-ts | `.cursor/skills/video-electron-ts/` | Electron, SQLite, IPC, scan/ingest |
| backlog-queue | `.cursor/skills/backlog-queue/` | GitHub Project board workflow |
| commit-conventions | `.cursor/skills/commit-conventions/` | Commit/PR message style |
| changelog-commit-push | `.cursor/skills/changelog-commit-push/` | Release hygiene |
| docs-wiki | `.cursor/skills/docs-wiki/` | Wiki/docs structure (when `docs/` exists) |
| security-review | `.cursor/skills/security-review/` | Security-sensitive changes |
| subagent-review | `.cursor/skills/subagent-review/` | External Codex/Gemini reviews |

Gallery-only skills under `.agent/skills/` (image-scoring-mcp, scoring-pipeline, etc.) are **reference copies** from image-scoring-gallery — prefer video-specific skills above for this repo.
