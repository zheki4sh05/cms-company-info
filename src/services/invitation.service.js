const crypto = require("crypto");
const departmentRepository = require("../repositories/department.repository");
const companyRepository = require("../repositories/company.repository");
const invitationRepository = require("../repositories/invitation.repository");
const authRestClient = require("../clients/auth.rest-client");
const { sendAddUserCompanyEvent } = require("../kafka/auth.producer");
const {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} = require("../errors/AppError");

const ALLOWED_ROLES = new Set(["MANAGER", "SUPERVISOR", "EXECUTIVE"]);
const EXECUTIVE_ROLE = "EXECUTIVE";
const INVITE_TTL_DAYS = 7;

function assertString(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new BadRequestError(`"${field}" is required`);
  }
  return value.trim();
}

function assertRole(role) {
  const normalized = assertString(role, "role").toUpperCase();
  if (!ALLOWED_ROLES.has(normalized)) {
    throw new BadRequestError('"role" must be MANAGER | SUPERVISOR | EXECUTIVE');
  }
  return normalized;
}

function toResponse(invitationRow) {
  return {
    invitation: {
      id: String(invitationRow.id),
      email: invitationRow.email,
      role: invitationRow.role,
      departmentId:
        invitationRow.department_id != null
          ? String(invitationRow.department_id)
          : null,
      invitedBy: invitationRow.invited_by,
      invitedByName: invitationRow.invited_by_name ?? null,
      status: invitationRow.status,
      createdAt: new Date(invitationRow.created_at).toISOString(),
      expiresAt: new Date(invitationRow.expires_at).toISOString(),
    },
    message: "Invitation sent and employee added to company",
  };
}

async function sendInvitation(authContext, authHeader, body) {
  if (!authContext?.userId) {
    throw new BadRequestError("Bearer token with userId is required");
  }
  if (body == null || typeof body !== "object") {
    throw new BadRequestError("Body must be a JSON object");
  }

  const email = assertString(body.email, "email").toLowerCase();
  const role = assertRole(body.role);
  const departmentId = assertString(body.departmentId, "departmentId");
  const invitedBy = assertString(body.invitedBy, "invitedBy");

  if (invitedBy !== authContext.userId) {
    throw new BadRequestError('"invitedBy" must match token userId');
  }

  const invitedUserId = await authRestClient.getUserIdByEmail(email, authHeader);

  const department = await departmentRepository.findById(departmentId);
  if (!department) {
    throw new NotFoundError("Department not found");
  }
  const companyId = department.company_id;

  const inviter = await companyRepository.findEmployeeByUserAndCompany(
    authContext.userId,
    companyId
  );
  if (!inviter) {
    throw new ForbiddenError("You are not a member of this company");
  }
  if (inviter.role !== EXECUTIVE_ROLE) {
    throw new ForbiddenError("Only EXECUTIVE role can perform this action");
  }

  const exists = await companyRepository.findEmployeeByUserAndCompany(
    invitedUserId,
    companyId
  );
  if (exists) {
    throw new BadRequestError("Employee for this user already exists in company");
  }

  const invitationId = crypto.randomUUID();
  const employeeId = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  const status = "PENDING";

  const created = await invitationRepository.createInvitationWithEmployee({
    invitationId,
    email,
    userId: invitedUserId,
    role,
    departmentId,
    companyId,
    invitedBy,
    invitedByName: null,
    status,
    expiresAt,
    employeeId,
  });

  await sendAddUserCompanyEvent({
    userId: invitedUserId,
    companyId,
  });

  return toResponse(created);
}

module.exports = {
  sendInvitation,
};
