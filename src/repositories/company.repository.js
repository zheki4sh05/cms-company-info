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

module.exports = {
  findFirst,
  updateNameById,
  deleteById,
  employeeCountByCompanyId,
};
