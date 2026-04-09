-- Идентификаторы company / department — UUID (см. employee.company_id, department.company_id).
-- Если в уже существующей БД company.id был TEXT, сначала выполните db/migrate_legacy_text_to_uuid.sql.

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

-- Departments (отделы) привязаны к компании
CREATE TABLE IF NOT EXISTS department (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES company (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  manager_id TEXT REFERENCES employee (employee_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_department_company_id ON department (company_id);

-- Связь сотрудник ↔ отдел (многие ко многим через таблицу связей)
CREATE TABLE IF NOT EXISTS department_employee (
  department_id UUID NOT NULL REFERENCES department (id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL REFERENCES employee (employee_id) ON DELETE CASCADE,
  PRIMARY KEY (department_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_department_employee_employee ON department_employee (employee_id);

