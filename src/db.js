const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const { Connector } = require("@google-cloud/cloud-sql-connector");

const connector = new Connector();
let pool;

async function getPool() {
  if (pool) {
    return pool;
  }

  if (process.env.INSTANCE_CONNECTION_NAME) {
    const clientOpts = await connector.getOptions({
      instanceConnectionName: process.env.INSTANCE_CONNECTION_NAME,
      ipType: "PUBLIC",
      authType: "IAM",
    });

    pool = new Pool({
      ...clientOpts,
      user: process.env.DB_USER,
      database: process.env.DB_NAME,
    });
    return pool;
  }

  pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  return pool;
}

async function query(text, params) {
  const currentPool = await getPool();
  return currentPool.query(text, params);
}

async function ensureTable() {
  const createSql = `
    CREATE TABLE IF NOT EXISTS observations (
      id SERIAL PRIMARY KEY,
      observed_at TIMESTAMPTZ NOT NULL,
      value NUMERIC NOT NULL
    );
  `;
  await query(createSql);
}

async function seedIfEmpty() {
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
      "INSERT INTO observations (observed_at, value) VALUES ($1, $2)",
      [observedAt.toISOString(), value]
    );
  }
}

async function initDb() {
  await ensureTable();
  await seedIfEmpty();
}

module.exports = {
  query,
  initDb,
  getPool,
  connector,
};
