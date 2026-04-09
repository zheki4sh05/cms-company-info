-- Одноразовая миграция: company.id и employee.company_id приведены к UUID,
-- если они были созданы как TEXT. Затем заново создаются department-персистентные таблицы.
--
-- Перед запуском: значения id/company_id должны быть валидными UUID-строками,
-- иначе USING id::uuid завершится ошибкой (тогда правьте данные или пересоздайте БД).
--
-- Запуск (из psql или клиента): подключитесь к company_db и выполните этот файл.

DROP TABLE IF EXISTS department_employee CASCADE;
DROP TABLE IF EXISTS department CASCADE;

ALTER TABLE employee DROP CONSTRAINT IF EXISTS employee_company_id_fkey;

ALTER TABLE company ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE employee ALTER COLUMN company_id TYPE UUID USING company_id::uuid;

ALTER TABLE employee
  ADD CONSTRAINT employee_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE CASCADE;

-- Фрагмент актуальной схемы (совпадает с db/schema.sql для department)
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

CREATE TABLE IF NOT EXISTS department_employee (
  department_id UUID NOT NULL REFERENCES department (id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL REFERENCES employee (employee_id) ON DELETE CASCADE,
  PRIMARY KEY (department_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_department_employee_employee ON department_employee (employee_id);
