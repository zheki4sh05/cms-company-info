require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const {
  getConnectionConfig,
  assertSafeDbName,
} = require("../src/config/databaseEnv");

const MAINTENANCE_DB = "postgres";

async function ensureDatabase(adminClient, dbName) {
  assertSafeDbName(dbName);
  const { rows } = await adminClient.query(
    "SELECT 1 AS ok FROM pg_database WHERE datname = $1",
    [dbName]
  );
  if (rows.length === 0) {
    await adminClient.query(`CREATE DATABASE ${dbName}`);
    console.log(`Created database: ${dbName}`);
  } else {
    console.log(`Database already exists: ${dbName}`);
  }
}

async function applySchema(client, schemaPath) {
  const sql = fs.readFileSync(schemaPath, "utf8");
  await client.query(sql);
  console.log(`Applied schema: ${schemaPath}`);
}

async function main() {
  const cfg = getConnectionConfig();
  assertSafeDbName(cfg.database);

  const admin = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: MAINTENANCE_DB,
  });

  await admin.connect();
  try {
    await ensureDatabase(admin, cfg.database);
  } finally {
    await admin.end();
  }

  const appDb = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
  });

  await appDb.connect();
  try {
    const schemaPath = path.join(__dirname, "..", "db", "schema.sql");
    await applySchema(appDb, schemaPath);
  } finally {
    await appDb.end();
  }

  console.log("DB init finished.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
