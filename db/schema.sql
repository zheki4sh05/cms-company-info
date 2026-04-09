-- Company singleton resource (id matches API shape, e.g. company-1)
CREATE TABLE IF NOT EXISTS company (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL
);

-- Employees belong to a company; removed when company is deleted (CASCADE)
CREATE TABLE IF NOT EXISTS employee (
  employee_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES company (id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE employee ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'EXECUTIVE';

CREATE INDEX IF NOT EXISTS idx_employee_company_id ON employee (company_id);

