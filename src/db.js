const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

// Support both TCP connections and Cloud SQL Auth Proxy socket
let poolConfig;

if (process.env.INSTANCE_CONNECTION_NAME) {
  // Cloud SQL Auth Proxy - uses Unix socket with service account auth
  poolConfig = {
    host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
    user: process.env.DB_USER || "water_user",
    password: process.env.DB_PASSWORD || "waterapp2024pass",
    database: process.env.DB_NAME || "water-observations",
  };
} else {
  // Direct TCP connection
  poolConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };
}

const pool = new Pool(poolConfig);

async function query(text, params) {
  return pool.query(text, params);
}

async function ensureTable() {
  const createFountains = `
    CREATE TABLE IF NOT EXISTS fountains (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      target NUMERIC NOT NULL
    );
  `;
  await query(createFountains);

  const createObservations = `
    CREATE TABLE IF NOT EXISTS observations (
      id SERIAL PRIMARY KEY,
      observed_at TIMESTAMPTZ NOT NULL,
      value NUMERIC NOT NULL
    );
  `;
  await query(createObservations);

  await query("ALTER TABLE observations ADD COLUMN IF NOT EXISTS fountain_id INTEGER");
  await query("CREATE INDEX IF NOT EXISTS idx_observations_fountain_id ON observations(fountain_id)");

  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'observations_fountain_id_fkey'
      ) THEN
        ALTER TABLE observations
        ADD CONSTRAINT observations_fountain_id_fkey
        FOREIGN KEY (fountain_id)
        REFERENCES fountains(id)
        ON DELETE CASCADE;
      END IF;
    END
    $$;
  `);
}

async function ensureDefaultFountain() {
  const { rows } = await query("SELECT id FROM fountains WHERE name = $1", [
    "734 JP",
  ]);
  if (rows.length > 0) {
    return rows[0].id;
  }

  const insert = await query(
    "INSERT INTO fountains (name, target) VALUES ($1, $2) RETURNING id",
    ["734 JP", 30000]
  );
  return insert.rows[0].id;
}

async function seedIfEmpty() {
  const defaultFountainId = await ensureDefaultFountain();
  const { rows } = await query("SELECT COUNT(*)::int AS count FROM observations");
  if (rows[0].count > 0) {
    return;
  }

  const seedPath = path.join(__dirname, "..", "seed", "observations.csv");
  if (!fs.existsSync(seedPath)) {
    return;
  }

  const csv = fs.readFileSync(seedPath, "utf8").trim();
  if (!csv) {
    return;
  }

  const lines = csv.split("\n");
  for (const line of lines) {
    const [observedAtRaw, valueRaw] = line.split(",");
    if (!observedAtRaw || !valueRaw) {
      continue;
    }

    const observedAt = new Date(observedAtRaw.trim());
    const value = Number(valueRaw.trim());
    if (Number.isNaN(value) || Number.isNaN(observedAt.getTime())) {
      continue;
    }

    await query(
      "INSERT INTO observations (observed_at, value, fountain_id) VALUES ($1, $2, $3)",
      [observedAt.toISOString(), value, defaultFountainId]
    );
  }
}

async function initDb() {
  await ensureTable();
  const defaultFountainId = await ensureDefaultFountain();
  await query("UPDATE observations SET fountain_id = $1 WHERE fountain_id IS NULL", [
    defaultFountainId,
  ]);
  await query("ALTER TABLE observations ALTER COLUMN fountain_id SET NOT NULL");
  await seedIfEmpty();
}

module.exports = {
  query,
  initDb,
  pool,
};
