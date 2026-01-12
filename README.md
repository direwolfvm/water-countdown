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
Set these before running:

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=water_observations
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
Build and run locally:
```
docker build -t water-countdown .
docker run --rm -p 8080:8080 \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5432 \
  -e DB_USER=postgres \
  -e DB_PASSWORD=yourpassword \
  -e DB_NAME=water_observations \
  water-countdown
```

## Cloud Run (high level)
1) Build and push an image:
```
docker build -t gcr.io/PROJECT_ID/water-countdown .
docker push gcr.io/PROJECT_ID/water-countdown
```

2) Deploy to Cloud Run:
```
gcloud run deploy water-countdown \
  --image gcr.io/PROJECT_ID/water-countdown \
  --region REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars DB_HOST=...,DB_PORT=...,DB_USER=...,DB_PASSWORD=...,DB_NAME=...
```

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
