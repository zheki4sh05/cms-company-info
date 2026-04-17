const companyService = require("../services/company.service");
const { AppError } = require("../errors/AppError");

async function getCompany(req, res, next) {
  const requestId = req.headers["x-request-id"] || "-";
  const hasAuthHeader = typeof req.headers.authorization === "string";
  console.log(
    `[GET /company] requestId=${requestId} hasAuthHeader=${hasAuthHeader} employeeIdHeader=${req.headers.employeeid ?? req.headers.employeid ?? req.headers["x-employee-id"] ?? "-"} authContextUserId=${req.authContext?.userId ?? "-"}`
  );

  try {
    const data = await companyService.getCompany(req.authContext);
    console.log(
      `[GET /company] requestId=${requestId} success companyId=${data.id} employeeCount=${data.employeeCount}`
    );
    res.json(data);
  } catch (err) {
    console.error(
      `[GET /company] requestId=${requestId} failed status=${err?.statusCode ?? 500} message="${err?.message ?? "unknown error"}"`
    );
    next(err);
  }
}

async function getCompanyIdByUserId(req, res, next) {
  try {
    const data = await companyService.getCompanyIdByUserId(req.params.userId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function patchCompany(req, res, next) {
  try {
    const data = await companyService.patchCompany(req.body);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function deleteCompany(req, res, next) {
  try {
    await companyService.deleteCompany();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}

module.exports = {
  getCompany,
  getCompanyIdByUserId,
  patchCompany,
  deleteCompany,
  errorHandler,
};
