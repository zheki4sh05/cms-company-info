require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { getConnectionConfig } = require("../src/config/databaseEnv");

let migrationFile = process.argv[2];
if (!migrationFile) {
  migrationFile = path.join(__dirname, "..", "db", "migrate_legacy_text_to_uuid.sql");
} else if (!path.isAbsolute(migrationFile)) {
  migrationFile = path.join(process.cwd(), migrationFile);
}

async function main() {
  const cfg = getConnectionConfig();
  const sql = fs.readFileSync(migrationFile, "utf8");
  const client = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
  });
  await client.connect();
  try {
    await client.query(sql);
    console.log(`Applied: ${migrationFile}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
