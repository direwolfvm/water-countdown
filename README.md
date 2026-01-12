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
Set these before running (local user/password):

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=water-observation
```

For IAM DB Auth via Cloud SQL Connector (recommended on Cloud Run), set:

```
INSTANCE_CONNECTION_NAME=permitting-ai-helper:us-east4:metabase-sql
DB_USER=service-account@PROJECT_ID.iam.gserviceaccount.com
DB_NAME=water-observation
```

For local IAM usage, ensure Application Default Credentials are available (for example `gcloud auth application-default login`).

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
  -e DB_NAME=water-observation \
  water-countdown
```

## Cloud SQL connectivity notes
- Public IP is enabled and private IP is disabled, so direct connections must use the instance public IP (for example `DB_HOST=34.186.108.171`).
- Your local IP or Cloud Run egress IP must be added to the Cloud SQL authorized networks list; otherwise connections will be blocked.
- For IAM DB auth, use the Cloud SQL Node.js Connector and set `INSTANCE_CONNECTION_NAME` and `DB_USER`. On Cloud Run, ensure the service account has the Cloud SQL Client role and is mapped to a database user.
- IAM DB Auth for PostgreSQL requires enabling the instance flag for IAM DB authentication and creating a matching database user for the IAM principal.

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
  --set-env-vars INSTANCE_CONNECTION_NAME=permitting-ai-helper:us-east4:metabase-sql,DB_USER=service-account@PROJECT_ID.iam.gserviceaccount.com,DB_NAME=water-observation
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
