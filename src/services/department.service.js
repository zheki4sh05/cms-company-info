const crypto = require("crypto");
const departmentRepository = require("../repositories/department.repository");
const companyRepository = require("../repositories/company.repository");
const {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} = require("../errors/AppError");

const EXECUTIVE_ROLE = "EXECUTIVE";

function mapDepartmentRow(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    name: row.name,
    description: row.description ?? null,
    managerId: row.manager_id != null ? String(row.manager_id) : null,
    managerName: null,
    employeeCount:
      row.employee_count != null ? Number(row.employee_count) : 0,
    createdAt: departmentRepository.toIso(row.created_at),
    updatedAt: departmentRepository.toIso(row.updated_at),
  };
}

async function listDepartments(companyId) {
  const rows = await departmentRepository.listByCompanyId(companyId);
  return rows.map(mapDepartmentRow);
}

async function getDepartmentById(userId, departmentId) {
  const row = await departmentRepository.findById(departmentId);
  if (!row) {
    throw new NotFoundError("Department not found");
  }
  const member = await companyRepository.findEmployeeByUserAndCompany(
    userId,
    row.company_id
  );
  if (!member) {
    throw new ForbiddenError("You are not a member of this company");
  }
  return mapDepartmentRow(row);
}

async function patchDepartmentById(userId, departmentId, body) {
  const row = await departmentRepository.findById(departmentId);
  if (!row) {
    throw new NotFoundError("Department not found");
  }
  const member = await companyRepository.findEmployeeByUserAndCompany(
    userId,
    row.company_id
  );
  if (!member) {
    throw new ForbiddenError("You are not a member of this company");
  }
  if (member.role !== EXECUTIVE_ROLE) {
    throw new ForbiddenError("Only EXECUTIVE role can perform this action");
  }
  return updateDepartment(row.company_id, departmentId, body);
}

async function setDepartmentManager(userId, departmentId, body) {
  if (body == null || typeof body !== "object") {
    throw new BadRequestError("Body must be a JSON object");
  }
  const managerId = assertNonEmptyString(body.managerId, "managerId");

  const row = await departmentRepository.findById(departmentId);
  if (!row) {
    throw new NotFoundError("Department not found");
  }
  const member = await companyRepository.findEmployeeByUserAndCompany(
    userId,
    row.company_id
  );
  if (!member) {
    throw new ForbiddenError("You are not a member of this company");
  }
  if (member.role !== EXECUTIVE_ROLE) {
    throw new ForbiddenError("Only EXECUTIVE role can perform this action");
  }

  await assertManagerInCompany(managerId, row.company_id);

  await departmentRepository.updateDepartment(departmentId, row.company_id, {
    name: row.name,
    description: row.description,
    managerId,
  });

  await departmentRepository.addDepartmentMember(departmentId, managerId);

  const full = await departmentRepository.findById(departmentId);
  return mapDepartmentRow(full);
}

function assertNonEmptyString(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new BadRequestError(`"${field}" is required`);
  }
  return value.trim();
}

async function transferEmployee(userId, body) {
  if (body == null || typeof body !== "object") {
    throw new BadRequestError("Body must be a JSON object");
  }
  const employeeId = assertNonEmptyString(body.employeeId, "employeeId");
  const fromDepartmentId = assertNonEmptyString(
    body.fromDepartmentId,
    "fromDepartmentId"
  );
  const toDepartmentId = assertNonEmptyString(
    body.toDepartmentId,
    "toDepartmentId"
  );

  if (fromDepartmentId === toDepartmentId) {
    throw new BadRequestError(
      "fromDepartmentId and toDepartmentId must differ"
    );
  }

  const fromDept = await departmentRepository.findById(fromDepartmentId);
  const toDept = await departmentRepository.findById(toDepartmentId);
  if (!fromDept || !toDept) {
    throw new NotFoundError("Department not found");
  }
  if (fromDept.company_id !== toDept.company_id) {
    throw new BadRequestError(
      "Departments must belong to the same company"
    );
  }

  const companyId = fromDept.company_id;
  const member = await companyRepository.findEmployeeByUserAndCompany(
    userId,
    companyId
  );
  if (!member) {
    throw new ForbiddenError("You are not a member of this company");
  }
  if (member.role !== EXECUTIVE_ROLE) {
    throw new ForbiddenError("Only EXECUTIVE role can perform this action");
  }

  const emp = await companyRepository.findEmployeeInCompany(
    employeeId,
    companyId
  );
  if (!emp) {
    throw new BadRequestError(
      "employeeId must be an employee of this company"
    );
  }

  const result = await departmentRepository.transferEmployeeBetweenDepartments({
    employeeId,
    fromDepartmentId,
    toDepartmentId,
    companyId,
  });

  if (!result.ok) {
    if (result.code === "DEPARTMENT_NOT_FOUND") {
      throw new NotFoundError("Department not found");
    }
    if (result.code === "NOT_IN_SOURCE_DEPARTMENT") {
      throw new BadRequestError(
        "Employee is not assigned to the source department"
      );
    }
  }

  return {
    ok: true,
    employeeId,
    fromDepartmentId,
    toDepartmentId,
  };
}

async function deleteDepartmentById(userId, departmentId) {
  const row = await departmentRepository.findById(departmentId);
  if (!row) {
    throw new NotFoundError("Department not found");
  }
  const member = await companyRepository.findEmployeeByUserAndCompany(
    userId,
    row.company_id
  );
  if (!member) {
    throw new ForbiddenError("You are not a member of this company");
  }
  if (member.role !== EXECUTIVE_ROLE) {
    throw new ForbiddenError("Only EXECUTIVE role can perform this action");
  }

  const assigned = Number(row.employee_count) || 0;
  if (assigned > 0) {
    throw new BadRequestError(
      "Cannot delete department while it has employees assigned"
    );
  }

  await departmentRepository.deleteDepartment(
    departmentId,
    row.company_id
  );
  return { success: true, id: String(departmentId) };
}

function assertName(body) {
  if (body == null || typeof body !== "object") {
    throw new BadRequestError("Body must be a JSON object");
  }
  const { name } = body;
  if (typeof name !== "string" || !name.trim()) {
    throw new BadRequestError('"name" must be a non-empty string');
  }
  return {
    name: name.trim(),
    description:
      body.description === undefined
        ? null
        : body.description === null
          ? null
          : typeof body.description === "string"
            ? body.description
            : (() => {
                throw new BadRequestError('"description" must be a string or null');
              })(),
    managerId:
      body.managerId === undefined || body.managerId === null
        ? null
        : typeof body.managerId === "string" && body.managerId.trim()
          ? body.managerId.trim()
          : (() => {
              throw new BadRequestError('"managerId" must be a non-empty string or null');
            })(),
  };
}

async function assertManagerInCompany(managerId, companyId) {
  if (!managerId) return;
  const emp = await companyRepository.findEmployeeInCompany(
    managerId,
    companyId
  );
  if (!emp) {
    throw new BadRequestError("managerId must refer to an employee in this company");
  }
}

async function createDepartment(companyId, body) {
  const parsed = assertName(body);
  await assertManagerInCompany(parsed.managerId, companyId);

  const id = crypto.randomUUID();
  const inserted = await departmentRepository.insertDepartment({
    id,
    companyId,
    name: parsed.name,
    description: parsed.description,
    managerId: parsed.managerId,
  });

  if (parsed.managerId) {
    await departmentRepository.addDepartmentMember(id, parsed.managerId);
  }

  const full = await departmentRepository.findByIdAndCompany(id, companyId);
  return mapDepartmentRow(full);
}

async function updateDepartment(companyId, departmentId, body) {
  if (body == null || typeof body !== "object") {
    throw new BadRequestError("Body must be a JSON object");
  }
  const existing = await departmentRepository.findByIdAndCompany(
    departmentId,
    companyId
  );
  if (!existing) {
    throw new NotFoundError("Department not found");
  }

  let name;
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      throw new BadRequestError('"name" must be a non-empty string');
    }
    name = body.name.trim();
  }

  let description;
  if (body.description !== undefined) {
    if (body.description !== null && typeof body.description !== "string") {
      throw new BadRequestError('"description" must be a string or null');
    }
    description = body.description;
  }

  let managerId;
  if (body.managerId !== undefined) {
    if (body.managerId !== null) {
      if (typeof body.managerId !== "string" || !body.managerId.trim()) {
        throw new BadRequestError('"managerId" must be a non-empty string or null');
      }
      managerId = body.managerId.trim();
      await assertManagerInCompany(managerId, companyId);
    } else {
      managerId = null;
    }
  }

  const hasPatch =
    name !== undefined ||
    description !== undefined ||
    managerId !== undefined;
  if (!hasPatch) {
    throw new BadRequestError("No fields to update");
  }

  const mergedName = name !== undefined ? name : existing.name;
  let mergedDescription = existing.description;
  if (description !== undefined) {
    mergedDescription = description;
  }
  let mergedManagerId = existing.manager_id;
  if (managerId !== undefined) {
    mergedManagerId = managerId;
  }

  await departmentRepository.updateDepartment(departmentId, companyId, {
    name: mergedName,
    description: mergedDescription,
    managerId: mergedManagerId,
  });

  if (
    mergedManagerId &&
    mergedManagerId !== existing.manager_id
  ) {
    await departmentRepository.addDepartmentMember(
      departmentId,
      mergedManagerId
    );
  }

  const full = await departmentRepository.findByIdAndCompany(
    departmentId,
    companyId
  );
  return mapDepartmentRow(full);
}

async function deleteDepartment(companyId, departmentId) {
  const ok = await departmentRepository.deleteDepartment(
    departmentId,
    companyId
  );
  if (!ok) {
    throw new NotFoundError("Department not found");
  }
}

async function addMember(companyId, departmentId, body) {
  if (body == null || typeof body !== "object") {
    throw new BadRequestError("Body must be a JSON object");
  }
  const employeeId =
    typeof body.employeeId === "string" && body.employeeId.trim()
      ? body.employeeId.trim()
      : null;
  if (!employeeId) {
    throw new BadRequestError('"employeeId" is required');
  }

  const dept = await departmentRepository.findByIdAndCompany(
    departmentId,
    companyId
  );
  if (!dept) {
    throw new NotFoundError("Department not found");
  }

  const emp = await companyRepository.findEmployeeInCompany(
    employeeId,
    companyId
  );
  if (!emp) {
    throw new BadRequestError("employeeId must be an employee of this company");
  }

  await departmentRepository.addDepartmentMember(departmentId, employeeId);
  const full = await departmentRepository.findByIdAndCompany(
    departmentId,
    companyId
  );
  return mapDepartmentRow(full);
}

async function removeMember(companyId, departmentId, employeeId) {
  if (typeof employeeId !== "string" || !employeeId.trim()) {
    throw new BadRequestError("Invalid employeeId");
  }
  const id = employeeId.trim();

  const dept = await departmentRepository.findByIdAndCompany(
    departmentId,
    companyId
  );
  if (!dept) {
    throw new NotFoundError("Department not found");
  }

  await departmentRepository.clearManagerIfMatches(departmentId, id);
  const removed = await departmentRepository.removeDepartmentMember(
    departmentId,
    id
  );
  if (!removed) {
    throw new NotFoundError("Employee is not assigned to this department");
  }
}

module.exports = {
  listDepartments,
  getDepartmentById,
  patchDepartmentById,
  setDepartmentManager,
  transferEmployee,
  deleteDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  addMember,
  removeMember,
};
