const crypto = require("crypto");
const companyRepository = require("../repositories/company.repository");
const { BadRequestError } = require("../errors/AppError");

function assertString(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    throw new BadRequestError(`Field "${fieldName}" must be a non-empty string`);
  }
  return value.trim();
}

async function handleCompanyCreatedEvent(message) {
  const name = assertString(message?.name, "name");
  const userId = assertString(message?.userId, "userId");
  const role = assertString(message?.role, "role");

  const existing = await companyRepository.findEmployeeInCompanyByNameAndUserAndRole(
    {
      companyName: name,
      userId,
      role,
    }
  );
  if (existing) {
    console.error(
      `Kafka company CREATED duplicate ignored: companyName="${name}", userId="${userId}", role="${role}"`
    );
    return {
      skipped: true,
      reason: "duplicate-company-employee",
      companyId: existing.company_id,
      employeeId: existing.employee_id,
    };
  }

  const companyId = crypto.randomUUID();
  const employeeId = crypto.randomUUID();

  await companyRepository.createCompanyWithEmployee({
    companyId,
    companyName: name,
    employeeId,
    userId,
    role,
  });

  return { skipped: false, companyId, employeeId };
}

module.exports = {
  handleCompanyCreatedEvent,
};
