const { pool } = require("../config/db");

function toIso(value) {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function listByCompanyId(companyId) {
  const { rows } = await pool.query(
    `SELECT d.id,
            d.name,
            d.description,
            d.manager_id,
            d.created_at,
            d.updated_at,
            COALESCE(cnt.cnt, 0)::int AS employee_count
     FROM department d
     LEFT JOIN (
       SELECT department_id, COUNT(*)::int AS cnt
       FROM department_employee
       GROUP BY department_id
     ) cnt ON cnt.department_id = d.id
     WHERE d.company_id = $1
     ORDER BY d.name ASC`,
    [companyId]
  );
  return rows;
}

async function findByIdAndCompany(departmentId, companyId) {
  const { rows } = await pool.query(
    `SELECT d.id,
            d.company_id,
            d.name,
            d.description,
            d.manager_id,
            d.created_at,
            d.updated_at,
            COALESCE(cnt.cnt, 0)::int AS employee_count
     FROM department d
     LEFT JOIN (
       SELECT department_id, COUNT(*)::int AS cnt
       FROM department_employee
       GROUP BY department_id
     ) cnt ON cnt.department_id = d.id
     WHERE d.id = $1 AND d.company_id = $2
     LIMIT 1`,
    [departmentId, companyId]
  );
  return rows[0] ?? null;
}

async function findById(departmentId) {
  const { rows } = await pool.query(
    `SELECT d.id,
            d.company_id,
            d.name,
            d.description,
            d.manager_id,
            d.created_at,
            d.updated_at,
            COALESCE(cnt.cnt, 0)::int AS employee_count
     FROM department d
     LEFT JOIN (
       SELECT department_id, COUNT(*)::int AS cnt
       FROM department_employee
       GROUP BY department_id
     ) cnt ON cnt.department_id = d.id
     WHERE d.id = $1
     LIMIT 1`,
    [departmentId]
  );
  return rows[0] ?? null;
}

async function insertDepartment({ id, companyId, name, description, managerId }) {
  const { rows } = await pool.query(
    `INSERT INTO department (id, company_id, name, description, manager_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, description, manager_id, created_at, updated_at`,
    [id, companyId, name, description ?? null, managerId ?? null]
  );
  return rows[0];
}

async function updateDepartment(departmentId, companyId, fields) {
  const { rows } = await pool.query(
    `UPDATE department
     SET name = $3,
         description = $4,
         manager_id = $5,
         updated_at = NOW()
     WHERE id = $1 AND company_id = $2
     RETURNING id, name, description, manager_id, created_at, updated_at`,
    [
      departmentId,
      companyId,
      fields.name,
      fields.description,
      fields.managerId,
    ]
  );
  return rows[0] ?? null;
}

async function deleteDepartment(departmentId, companyId) {
  const { rowCount } = await pool.query(
    `DELETE FROM department WHERE id = $1 AND company_id = $2`,
    [departmentId, companyId]
  );
  return rowCount > 0;
}

async function addDepartmentMember(departmentId, employeeId) {
  await pool.query(
    `INSERT INTO department_employee (department_id, employee_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [departmentId, employeeId]
  );
}

async function removeDepartmentMember(departmentId, employeeId) {
  const { rowCount } = await pool.query(
    `DELETE FROM department_employee
     WHERE department_id = $1 AND employee_id = $2`,
    [departmentId, employeeId]
  );
  return rowCount > 0;
}

async function clearManagerIfMatches(departmentId, employeeId) {
  await pool.query(
    `UPDATE department
     SET manager_id = NULL, updated_at = NOW()
     WHERE id = $1 AND manager_id = $2`,
    [departmentId, employeeId]
  );
}

async function assignDepartmentSupervisor({
  departmentId,
  companyId,
  newSupervisorEmployeeId,
  oldSupervisorEmployeeId,
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (
      oldSupervisorEmployeeId &&
      oldSupervisorEmployeeId !== newSupervisorEmployeeId
    ) {
      const { rows: managedRows } = await client.query(
        `SELECT COUNT(*)::int AS cnt
         FROM department
         WHERE company_id = $1
           AND manager_id = $2
           AND id <> $3`,
        [companyId, oldSupervisorEmployeeId, departmentId]
      );
      const managedElsewhere = Number(managedRows[0]?.cnt ?? 0) > 0;

      if (!managedElsewhere) {
        await client.query(
          `UPDATE employee
           SET role = 'MANAGER'
           WHERE employee_id = $1
             AND company_id = $2
             AND role = 'SUPERVISOR'`,
          [oldSupervisorEmployeeId, companyId]
        );
      }
    }

    await client.query(
      `UPDATE employee
       SET role = 'SUPERVISOR'
       WHERE employee_id = $1 AND company_id = $2`,
      [newSupervisorEmployeeId, companyId]
    );

    await client.query(
      `UPDATE department
       SET manager_id = $3, updated_at = NOW()
       WHERE id = $1 AND company_id = $2`,
      [departmentId, companyId, newSupervisorEmployeeId]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Atomically: remove member from source dept, add to target, clear source manager if needed.
 * Caller must ensure same company and business rules.
 */
async function transferEmployeeBetweenDepartments({
  employeeId,
  fromDepartmentId,
  toDepartmentId,
  companyId,
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: fromRows } = await client.query(
      `SELECT 1 FROM department WHERE id = $1 AND company_id = $2`,
      [fromDepartmentId, companyId]
    );
    const { rows: toRows } = await client.query(
      `SELECT 1 FROM department WHERE id = $1 AND company_id = $2`,
      [toDepartmentId, companyId]
    );
    if (fromRows.length === 0 || toRows.length === 0) {
      await client.query("ROLLBACK");
      return { ok: false, code: "DEPARTMENT_NOT_FOUND" };
    }

    const { rowCount: removed } = await client.query(
      `DELETE FROM department_employee
       WHERE department_id = $1 AND employee_id = $2`,
      [fromDepartmentId, employeeId]
    );
    if (removed === 0) {
      await client.query("ROLLBACK");
      return { ok: false, code: "NOT_IN_SOURCE_DEPARTMENT" };
    }

    await client.query(
      `UPDATE department
       SET manager_id = NULL, updated_at = NOW()
       WHERE id = $1 AND manager_id = $2`,
      [fromDepartmentId, employeeId]
    );

    await client.query(
      `INSERT INTO department_employee (department_id, employee_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [toDepartmentId, employeeId]
    );

    await client.query("COMMIT");
    return { ok: true };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  listByCompanyId,
  findByIdAndCompany,
  findById,
  insertDepartment,
  updateDepartment,
  deleteDepartment,
  addDepartmentMember,
  removeDepartmentMember,
  clearManagerIfMatches,
  assignDepartmentSupervisor,
  transferEmployeeBetweenDepartments,
  toIso,
};
