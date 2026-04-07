const { Pool } = require("pg");
const { getDatabaseUrl } = require("./databaseEnv");

const pool = new Pool({
  connectionString: getDatabaseUrl(),
  max: 10,
  idleTimeoutMillis: 30_000,
});

module.exports = { pool };
