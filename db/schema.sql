-- Company singleton resource (id matches API shape, e.g. company-1)
CREATE TABLE IF NOT EXISTS company (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

-- Employees belong to a company; removed when company is deleted (CASCADE)
CREATE TABLE IF NOT EXISTS employee (
  employee_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT NOT NULL REFERENCES company (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_company_id ON employee (company_id);

-- Optional seed for local dev (comment out if not needed)
-- INSERT INTO company (id, name) VALUES ('company-1', 'TrustFlow')
-- ON CONFLICT (id) DO NOTHING;
