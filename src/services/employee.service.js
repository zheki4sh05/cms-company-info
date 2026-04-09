const companyRepository = require("../repositories/company.repository");
const { UnauthorizedError, NotFoundError } = require("../errors/AppError");

async function getEmployeeIdByToken(authContext) {
  const userId = authContext?.userId;
  if (!userId) {
    throw new UnauthorizedError("Bearer token with userId is required");
  }

  const row = await companyRepository.findEmployeeByUserId(userId);
  if (!row) {
    throw new NotFoundError("Employee not found for current user");
  }

  return { employeeId: row.employee_id };
}

module.exports = { getEmployeeIdByToken };
