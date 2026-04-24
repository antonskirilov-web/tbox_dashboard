# Repository Guidelines

## Project Structure & Module Organization

This repository is currently documentation-first. Key files and folders:

- `CLAUDE.md`: project architecture, Google Sheets schema, and operational notes.
- `prd.md`: product requirements and business workflows.
- `00_pics/`: PNG assets used for project visuals and future UI work.
- `.github/workflows/morning.yml`: sample scheduled GitHub Actions workflow.
- `.claude/`: local agent settings and statusline helpers.

Planned Google Apps Script source files are not committed yet, but contributors should keep this layout:
- `Code.gs`: server-side GAS logic (`doGet`, `doPost`, business rules).
- `Index.html`: single-page HTML/CSS/JS frontend.
- `appsscript.json`: GAS manifest.

## Build, Test, and Development Commands

There is no local build pipeline yet. Use Google Apps Script tooling when implementation begins:

```bash
npm install -g @google/clasp
clasp login
clasp push
clasp open
```

- `clasp login`: authenticate to Google Apps Script.
- `clasp push`: upload local GAS files to the bound script.
- `clasp open`: open the GAS editor for verification.

For local Claude statusline checks:

```bash
echo '{}' | node .claude/statusline.js
```

## Coding Style & Naming Conventions

Use 2-space indentation in `.gs`, `.html`, `.json`, and Markdown files. Prefer simple GAS-compatible JavaScript; avoid `require()`, npm runtime dependencies, and Node-only APIs in deployed code. Use descriptive names such as `getActiveTasks`, `appendTimeLog`, and `renderAdminView`.

Keep sheet/entity names aligned with the documented schema: `Users`, `Tasks`, `TimeLogs`, `QuantityLogs`, `Attendance`.

## Testing Guidelines

No automated test suite exists yet. Before submitting changes, verify:

- core flows against the PRD in `prd.md`
- Google Sheets reads/writes against the documented sheet structure
- role-based behavior for `admin` and `client`

When tests are added, place them near the relevant module or in a top-level `tests/` folder.

## Commit & Pull Request Guidelines

Recent history uses short imperative commit messages, for example:
- `Add Boxik assets and update project docs`
- `add morning scheduler: prints Поехали at 8:00 MSK daily`

Follow the same pattern: start with a verb, keep the subject specific, and group related changes in one commit.

Pull requests should include a short summary, affected files or sheets, manual verification steps, and screenshots for UI changes.
