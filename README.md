# water-countdown

A small Node.js + Express app that tracks water fountain counter observations, charts the trend, and projects when the counter will reach 30,000.

## Features
- Dashboard with time-series chart and projection to 30,000.
- Management page to list and add observations.
- PostgreSQL-backed storage (Cloud SQL compatible).
- Simple server-rendered EJS templates.

## Requirements
- Node.js 18+
- PostgreSQL instance (local or Cloud SQL)

## Environment variables

### For local/direct TCP connection:
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=water-observations
```

### For Cloud SQL Auth Proxy (Cloud Run):
```
INSTANCE_CONNECTION_NAME=PROJECT_ID:REGION:INSTANCE_NAME
DB_USER=water_user
DB_PASSWORD=waterapp2024pass
DB_NAME=water-observations
```

## Local run
```
npm install
npm start
```

The app listens on `http://localhost:8080` by default.

## Seed data
A small CSV seed file lives at `seed/observations.csv`. On startup, if the `observations` table is empty, the app will insert these rows.

You can also run seeding directly:
```
npm run seed
```

## Docker
Build and run locally with direct TCP connection:
```
docker build -t water-countdown .
docker run --rm -p 8080:8080 \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5432 \
  -e DB_USER=postgres \
  -e DB_PASSWORD=yourpassword \
  -e DB_NAME=water-observations \
  water-countdown
```

## Cloud SQL connectivity notes
- The app supports two connection modes:
  - **TCP direct connection**: Use the Cloud SQL public IP (requires authorized networks firewall rule)
  - **Cloud SQL Auth Proxy socket** (recommended for Cloud Run): Uses service account authentication via Unix socket, no password needed in proxy config

## Cloud Run deployment
The app is configured to deploy from GitHub via Cloud Build. On Cloud Run, it uses Cloud SQL Auth Proxy for secure socket-based connections.

Required setup:
1. Create a database user for the app:
```
gcloud sql users create water_user --instance=INSTANCE_NAME --password=waterapp2024pass
```

2. Ensure the `water-observations` database exists:
```
gcloud sql databases create water-observations --instance=INSTANCE_NAME
```

3. Environment variables are automatically set by Cloud Build/Cloud Run:
   - `INSTANCE_CONNECTION_NAME` is injected via the `cloudsql-instances` annotation
   - The app uses `water_user` with its password for authentication via the Unix socket

## Project structure
```
.
├── AGENTS.md
├── Dockerfile
├── README.md
├── package.json
├── public
│   └── styles.css
├── seed
│   └── observations.csv
├── src
│   ├── db.js
│   ├── regression.js
│   ├── routes
│   │   ├── dashboard.js
│   │   └── observations.js
│   ├── seed.js
│   └── server.js
└── views
    ├── dashboard.ejs
    ├── layout.ejs
    └── observations.ejs
```
