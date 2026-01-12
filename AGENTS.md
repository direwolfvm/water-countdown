# AGENTS.md

## Codex working agreement (global)

### Communication
- Be explicit about assumptions and unknowns.
- Prefer concise, structured output.
- If asked to change code, summarize the plan before editing.

### Engineering defaults
- Prefer small, reviewable changes.
- Match existing project conventions.
- Avoid unnecessary dependencies.
- Add or update tests when behavior changes.

### Safety and hygiene
- Do not commit secrets.
- If operating in a destructive mode (migrations, deletes), call it out clearly.
- Prefer idempotent scripts for setup and data changes.

---

## Project notes: water-countdown

### Scope
- Node.js + Express app for Cloud Run and local usage.
- Server-rendered EJS views, Chart.js via CDN.
- PostgreSQL via `pg`.

### Conventions
- Source in `src/`, views in `views/`, static assets in `public/`.
- Keep logic modular (routes, db helpers, regression helper).
- Use async/await and handle errors.

### Run and test
- Local run: `npm install` then `npm start`.
- No automated tests yet; if behavior changes, add tests where reasonable.

### Data safety
- Table creation and seed are idempotent; avoid destructive migrations.
