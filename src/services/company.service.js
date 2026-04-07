const companyRepository = require("../repositories/company.repository");
const { NotFoundError, BadRequestError } = require("../errors/AppError");

function toResponse(row, employeeCount) {
  return {
    id: row.id,
    name: row.name,
    employeeCount,
  };
}

async function getCompany() {
  const row = await companyRepository.findFirst();
  if (!row) {
    throw new NotFoundError("Company not found");
  }
  const count =
    row.employee_count != null
      ? row.employee_count
      : await companyRepository.employeeCountByCompanyId(row.id);
  return toResponse(row, count);
}

function assertPatchBody(body) {
  if (body == null || typeof body !== "object") {
    throw new BadRequestError('Body must be JSON object with "name" string');
  }
  const { name } = body;
  if (typeof name !== "string") {
    throw new BadRequestError('"name" must be a string');
  }
  const trimmed = name.trim();
  if (!trimmed) {
    throw new BadRequestError('"name" must not be empty');
  }
  return trimmed;
}

async function patchCompany(body) {
  const name = assertPatchBody(body);
  const row = await companyRepository.findFirst();
  if (!row) {
    throw new NotFoundError("Company not found");
  }
  const updated = await companyRepository.updateNameById(row.id, name);
  if (!updated) {
    throw new NotFoundError("Company not found");
  }
  const employeeCount = await companyRepository.employeeCountByCompanyId(
    updated.id
  );
  return toResponse(updated, employeeCount);
}

async function deleteCompany() {
  const row = await companyRepository.findFirst();
  if (!row) {
    throw new NotFoundError("Company not found");
  }
  await companyRepository.deleteById(row.id);
}

module.exports = {
  getCompany,
  patchCompany,
  deleteCompany,
};
