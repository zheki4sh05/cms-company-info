const companyRepository = require("../repositories/company.repository");
const authRestClient = require("../clients/auth.rest-client");
const {
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} = require("../errors/AppError");

const DEPARTMENT_MANAGER_ROLE = "SUPERVISOR";

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

function assertRequiredParam(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new BadRequestError(`"${field}" query parameter is required`);
  }
  return value.trim();
}

async function getDepartmentManagerByEmployee(query) {
  const userId = assertRequiredParam(query?.userId, "userId");
  const employeeId = assertRequiredParam(query?.employeeId, "employeeId");
  const companyId = assertRequiredParam(query?.companyId, "companyId");

  const employee =
    await companyRepository.findEmployeeByUserAndEmployeeAndCompany({
      userId,
      employeeId,
      companyId,
    });
  if (!employee) {
    throw new NotFoundError("Employee not found for provided userId/companyId");
  }

  const departmentManager =
    await companyRepository.findDepartmentManagerByEmployeeAndCompany(
      employeeId,
      companyId
    );
  if (!departmentManager) {
    throw new NotFoundError("Employee is not assigned to any department");
  }
  if (!departmentManager.manager_id) {
    throw new NotFoundError("Department manager is not assigned");
  }
  if (!departmentManager.manager_user_id) {
    throw new NotFoundError("Department manager employee not found");
  }
  if (departmentManager.manager_role !== DEPARTMENT_MANAGER_ROLE) {
    throw new NotFoundError("Department manager must have SUPERVISOR role");
  }

  return {
    departmentId: String(departmentManager.department_id),
    employeeId: String(departmentManager.manager_id),
    userId: String(departmentManager.manager_user_id),
    companyId: String(companyId),
    role: departmentManager.manager_role ?? null,
  };
}

module.exports = {
  getEmployeeIdByToken,
  listCompanyEmployees,
  getDepartmentManagerByEmployee,
};
