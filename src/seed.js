const { initDb, getPool, connector } = require("./db");

async function run() {
  await initDb();
  const pool = await getPool();
  await pool.end();
  await connector.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
