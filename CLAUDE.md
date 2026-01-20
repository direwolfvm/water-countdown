# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install    # Install dependencies
npm start      # Run server (localhost:8080)
npm run seed   # Seed database manually
```

## Environment

Requires Node.js 18+ and PostgreSQL.

**Local development:**
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=water-observations
```

**Cloud Run (Cloud SQL Auth Proxy):**
- Set `INSTANCE_CONNECTION_NAME` - app auto-detects and uses Unix socket
- Uses `water_user` with password for socket auth
- Do NOT set empty `DB_PASSWORD`; remove old TCP env vars when using proxy

## Architecture

Node.js + Express app with server-rendered EJS templates. PostgreSQL via `pg` library.

**Core modules:**
- `src/server.js` - Express setup, mounts routes, calls `initDb()` on startup
- `src/db.js` - PostgreSQL pool (TCP or Cloud SQL socket), table creation, seeding
- `src/regression.js` - Linear regression for projecting when counter reaches target
- `src/routes/dashboard.js` - Main view with chart and projection
- `src/routes/observations.js` - CRUD for observations and fountains
- `src/routes/scan.js` - Camera scanning page (renders scan.ejs)

**Client-side modules (public/):**
- `scan.js` - Camera capture and OCR via tesseract.js (lazy-loaded from CDN)
- `scan.css` - Styles for scan page only

**Data model:**
- `fountains` table: id, name (unique), target
- `observations` table: id, observed_at, value, fountain_id (FK to fountains)
- Default fountain "734 JP" with target 30,000 is created on init

**Key behaviors:**
- Table creation and seeding are idempotent (safe to run multiple times)
- `initDb()` ensures tables exist, creates default fountain, migrates null fountain_ids
- Seed data from `seed/observations.csv` only loads if observations table is empty
- Deletion requires password "fountain" for both observations and fountains

## Conventions

- Async/await throughout with error handling via Express error middleware
- Routes pass data to EJS templates via `res.render("layout", {...})`
- Chart.js loaded via CDN in views; chart data computed server-side
