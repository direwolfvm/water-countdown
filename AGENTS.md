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

### Cloud Run deployment
**Database and user setup (one-time):**
```bash
# Create a user for the app
gcloud sql users create water_user --instance=metabase-sql --password=waterapp2024pass

# Ensure database exists (should already exist, but verify)
gcloud sql databases create water-observations --instance=metabase-sql
```

**Environment variables for Cloud Run:**
- The app auto-detects `INSTANCE_CONNECTION_NAME` (set by Cloud Build) and uses Unix socket auth
- No need to manually set `DB_HOST`, `DB_PORT`, or `DB_PASSWORD` when using Cloud SQL Auth Proxy
- If manually updating the service, ensure old TCP env vars are removed to avoid fallback failures

**Common pitfalls:**
- Database name is `water-observations` (plural), not `water-observation`
- Must use `water_user` with password when connecting via Cloud SQL Auth Proxy socket
- Do NOT set `DB_PASSWORD` as empty string; the pg client will fail auth
- Remove old `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` env vars from the service once migrated to socket auth

**Deployment flow:**
1. Push code to GitHub
2. Cloud Build automatically triggers, builds image, and deploys to Cloud Run
3. Cloud Run injects `INSTANCE_CONNECTION_NAME` and `cloudsql-instances` annotation
4. Container connects via Unix socket to Cloud SQL Auth Proxy
5. Database initialization happens on first startup (idempotent)
