const { pool } = require("../config/db");

async function createInvitationWithEmployee({
  invitationId,
  email,
  userId,
  role,
  departmentId,
  companyId,
  invitedBy,
  invitedByName,
  status,
  expiresAt,
  employeeId,
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO employee (employee_id, user_id, company_id, role)
       VALUES ($1, $2, $3, $4)`,
      [employeeId, userId, companyId, role]
    );

    await client.query(
      `INSERT INTO department_employee (department_id, employee_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [departmentId, employeeId]
    );

    const { rows } = await client.query(
      `INSERT INTO invitation
       (id, email, role, department_id, company_id, invited_by, invited_by_name, status, employee_id, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id, email, role, department_id, invited_by, invited_by_name, status, created_at, expires_at`,
      [
        invitationId,
        email,
        role,
        departmentId,
        companyId,
        invitedBy,
        invitedByName ?? null,
        status,
        employeeId,
        expiresAt,
      ]
    );

    await client.query("COMMIT");
    return rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createInvitationWithEmployee,
};
