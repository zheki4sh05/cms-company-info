const DEFAULT_POSTGRES_PORT = 5432;

function resolvePostgresPort(raw) {
  if (raw == null) return DEFAULT_POSTGRES_PORT;
  const trimmed = String(raw).trim();
  if (trimmed === "") return DEFAULT_POSTGRES_PORT;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 1 || n > 65535) {
    return DEFAULT_POSTGRES_PORT;
  }
  return n;
}

function getConnectionConfig() {
  const host = process.env.POSTGRES_HOST || "localhost";
  const port = resolvePostgresPort(process.env.POSTGRES_PORT);
  const user = process.env.POSTGRES_USER || "postgres";
  const password = process.env.POSTGRES_PASSWORD || "postgres";
  const database = process.env.POSTGRES_DB || "company_db";
  return { host, port, user, password, database };
}

function getDatabaseUrl() {
  const raw = process.env.DATABASE_URL && process.env.DATABASE_URL.trim();
  if (raw) return raw;
  const c = getConnectionConfig();
  const u = encodeURIComponent(c.user);
  const p = encodeURIComponent(c.password);
  return `postgresql://${u}:${p}@${c.host}:${c.port}/${c.database}`;
}

/** Allows only safe unquoted PostgreSQL identifiers (e.g. db name). */
function assertSafeDbName(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid POSTGRES_DB name: ${name}`);
  }
}

module.exports = {
  getConnectionConfig,
  getDatabaseUrl,
  assertSafeDbName,
};
