---
name: pr-ready-hygiene
description: "Prepare video-gallery for merge: typecheck, focused self-review, PR text. Use before opening a PR or when the user says pr-ready."
---

You prepare **video-gallery** for a pull request.

## Checks

1. **Typecheck** — when TS changed:
   - `npx tsc -p electron/tsconfig.json --noEmit`
   - `npx tsc --noEmit`
2. **Self-review** — no debug logs, secrets, or accidental `*.db` / media files in the diff.
3. **IPC** — if handlers changed, preload and renderer types still match.

## Output

- Summary (user-facing)
- Test commands run
- Suggested commit message (Conventional Commits)
- Paste-ready PR body (use `.github/pull_request_template.md` if present)

## Cross-repo

If the user also changed **image-scoring-backend** or **image-scoring-gallery**, note what to verify there; do not invent paths.
