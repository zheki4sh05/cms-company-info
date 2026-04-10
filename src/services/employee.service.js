const companyRepository = require("../repositories/company.repository");
const authRestClient = require("../clients/auth.rest-client");
const {
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
} = require("../errors/AppError");

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

function mapEmployeeRow(base, authData) {
  const email = authData?.email ?? base.user_id;
  return {
    id: authData?.id ?? base.user_id,
    email,
    firstName: authData?.firstName ?? null,
    lastName: authData?.lastName ?? null,
    role: base.role,
    companyId: String(base.company_id),
    departmentId: base.department_id != null ? String(base.department_id) : null,
    employeeId: base.employee_id != null ? String(base.employee_id) : null,
    isFirstLogin:
      typeof authData?.isFirstLogin === "boolean" ? authData.isFirstLogin : null,
  };
}

async function listCompanyEmployees(authContext, bearerHeader, companyId) {
  const userId = authContext?.userId;
  if (!userId) {
    throw new UnauthorizedError("Bearer token with userId is required");
  }

  const requester = await companyRepository.findEmployeeByUserAndCompany(
    userId,
    companyId
  );
  if (!requester) {
    throw new ForbiddenError("You are not a member of this company");
  }

  const rows = await companyRepository.listEmployeesByCompany(companyId);

  const enriched = await Promise.all(
    rows.map(async (row) => {
      const authData = await authRestClient.getEmployeeByUserId(
        row.user_id,
        bearerHeader
      );
      return mapEmployeeRow(row, authData);
    })
  );

  return enriched;
}

module.exports = { getEmployeeIdByToken, listCompanyEmployees };
