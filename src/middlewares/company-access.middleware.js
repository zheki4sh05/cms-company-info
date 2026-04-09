const companyRepository = require("../repositories/company.repository");
const {
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
} = require("../errors/AppError");

const EXECUTIVE_ROLE = "EXECUTIVE";

function requireUser(req, res, next) {
  if (!req.authContext?.userId) {
    return next(
      new UnauthorizedError("Bearer token with userId is required")
    );
  }
  return next();
}

async function requireCompanyMember(req, res, next) {
  try {
    const companyId = req.params.companyId;
    const userId = req.authContext.userId;
    const member = await companyRepository.findEmployeeByUserAndCompany(
      userId,
      companyId
    );
    if (!member) {
      return next(
        new ForbiddenError("You are not a member of this company")
      );
    }
    req.companyMember = {
      employeeId: member.employee_id,
      userId: member.user_id,
      companyId: member.company_id,
      role: member.role,
    };
    return next();
  } catch (err) {
    return next(err);
  }
}

function requireExecutive(req, res, next) {
  if (req.companyMember?.role !== EXECUTIVE_ROLE) {
    return next(
      new ForbiddenError("Only EXECUTIVE role can perform this action")
    );
  }
  return next();
}

async function requireCompanyMemberFromBody(req, res, next) {
  try {
    const raw = req.body?.companyId;
    if (typeof raw !== "string" || !raw.trim()) {
      return next(new BadRequestError('"companyId" is required'));
    }
    const companyId = raw.trim();
    const userId = req.authContext.userId;
    const member = await companyRepository.findEmployeeByUserAndCompany(
      userId,
      companyId
    );
    if (!member) {
      return next(
        new ForbiddenError("You are not a member of this company")
      );
    }
    req.companyMember = {
      employeeId: member.employee_id,
      userId: member.user_id,
      companyId: member.company_id,
      role: member.role,
    };
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  requireUser,
  requireCompanyMember,
  requireCompanyMemberFromBody,
  requireExecutive,
};
