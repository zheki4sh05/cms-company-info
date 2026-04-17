const { pool } = require("../config/db");

/**
 * Singleton / first-row company for GET /company, PATCH /company, DELETE /company
 */
async function findFirst() {
  const { rows } = await pool.query(
    `SELECT c.id, c.name,
            COALESCE(COUNT(e.employee_id), 0)::int AS employee_count
     FROM company c
     LEFT JOIN employee e ON e.company_id = c.id
     GROUP BY c.id, c.name
     ORDER BY c.id
     LIMIT 1`
  );
  return rows[0] ?? null;
}

async function findByEmployeeAndUser(employeeId, userId) {
  const { rows } = await pool.query(
    `SELECT c.id,
            c.name,
            COALESCE(ec.cnt, 0)::int AS employee_count
     FROM employee e
     JOIN company c ON c.id = e.company_id
     LEFT JOIN (
       SELECT company_id, COUNT(*)::int AS cnt
       FROM employee
       GROUP BY company_id
     ) ec ON ec.company_id = c.id
     WHERE e.employee_id = $1 AND e.user_id = $2
     LIMIT 1`,
    [employeeId, userId]
  );
  return rows[0] ?? null;
}

async function updateNameById(companyId, name) {
  const { rows } = await pool.query(
    `UPDATE company SET name = $2 WHERE id = $1 RETURNING id, name`,
    [companyId, name]
  );
  return rows[0] ?? null;
}

async function deleteById(companyId) {
  const { rowCount } = await pool.query(`DELETE FROM company WHERE id = $1`, [
    companyId,
  ]);
  return rowCount > 0;
}

async function employeeCountByCompanyId(companyId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM employee WHERE company_id = $1`,
    [companyId]
  );
  return rows[0]?.cnt ?? 0;
}

async function createCompanyWithEmployee({
  companyId,
  companyName,
  employeeId,
  userId,
  role,
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO company (id, name)
       VALUES ($1, $2)`,
      [companyId, companyName]
    );

    await client.query(
      `INSERT INTO employee (employee_id, user_id, company_id, role)
       VALUES ($1, $2, $3, $4)`,
      [employeeId, userId, companyId, role]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function findEmployeeInCompanyByNameAndUserAndRole({
  companyName,
  userId,
  role,
}) {
  const { rows } = await pool.query(
    `SELECT c.id AS company_id, e.employee_id
     FROM company c
     JOIN employee e ON e.company_id = c.id
     WHERE c.name = $1
       AND e.user_id = $2
       AND e.role = $3
     LIMIT 1`,
    [companyName, userId, role]
  );
  return rows[0] ?? null;
}

async function findEmployeeByUserId(userId) {
  const { rows } = await pool.query(
    `SELECT employee_id
     FROM employee
     WHERE user_id = $1
     ORDER BY created_at ASC
     LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
}

async function findCompanyIdByUserId(userId) {
  const { rows } = await pool.query(
    `SELECT company_id
     FROM employee
     WHERE user_id = $1
     ORDER BY created_at ASC
     LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
}

async function findEmployeeByUserAndCompany(userId, companyId) {
  const { rows } = await pool.query(
    `SELECT employee_id, user_id, company_id, role
     FROM employee
     WHERE user_id = $1 AND company_id = $2
     LIMIT 1`,
    [userId, companyId]
  );
  return rows[0] ?? null;
}

async function findEmployeeInCompany(employeeId, companyId) {
  const { rows } = await pool.query(
    `SELECT employee_id, user_id, company_id, role
     FROM employee
     WHERE employee_id = $1 AND company_id = $2
     LIMIT 1`,
    [employeeId, companyId]
  );
  return rows[0] ?? null;
}

async function listEmployeesByCompany(companyId) {
  const { rows } = await pool.query(
    `SELECT e.employee_id,
            e.user_id,
            e.role,
            e.company_id,
            (
              SELECT de.department_id
              FROM department_employee de
              WHERE de.employee_id = e.employee_id
              ORDER BY de.department_id
              LIMIT 1
            ) AS department_id
     FROM employee e
     WHERE e.company_id = $1
     ORDER BY e.created_at ASC`,
    [companyId]
  );
  return rows;
}

module.exports = {
  findFirst,
  findByEmployeeAndUser,
  updateNameById,
  deleteById,
  employeeCountByCompanyId,
  createCompanyWithEmployee,
  findEmployeeInCompanyByNameAndUserAndRole,
  findEmployeeByUserId,
  findCompanyIdByUserId,
  findEmployeeByUserAndCompany,
  findEmployeeInCompany,
  listEmployeesByCompany,
};
