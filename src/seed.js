const { initDb, pool } = require("./db");

async function run() {
  await initDb();
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
