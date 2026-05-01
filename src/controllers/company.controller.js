const companyService = require("../services/company.service");
const { AppError } = require("../errors/AppError");

function extractRootCause(error) {
  let current = error;
  let depth = 0;
  while (current?.cause && depth < 10) {
    current = current.cause;
    depth += 1;
  }
  return current ?? error;
}

function classifyErrorReason(error) {
  const root = extractRootCause(error);
  const message = String(root?.message ?? error?.message ?? "").toLowerCase();

  if (
    message.includes("connectexception") ||
    message.includes("connection refused") ||
    message.includes("connection timed out") ||
    message.includes("econnrefused") ||
    message.includes("etimedout")
  ) {
    return "Downstream connection failed";
  }
  if (message.includes("timeout") || message.includes("aborted")) {
    return "Downstream timeout";
  }
  if (message.includes("operator does not exist")) {
    return "Database query type mismatch";
  }
  if (message.includes("forbidden")) {
    return "Access denied";
  }
  if (message.includes("unauthorized")) {
    return "Authentication failed";
  }
  if (message.includes("not found")) {
    return "Entity not found";
  }
  return "Unhandled internal error";
}

async function getCompany(req, res, next) {
  const requestId = req.headers["x-request-id"] || "-";
  const hasAuthHeader = typeof req.headers.authorization === "string";
  const startedAt = Date.now();
  const gatewayRouteId = req.headers["x-gateway-route-id"] ?? "-";
  const userAgent = req.headers["user-agent"] ?? "-";
  const forwardedFor =
    req.headers["x-forwarded-for"] ?? req.socket?.remoteAddress ?? "-";
  const forwardedProto = req.headers["x-forwarded-proto"] ?? "-";
  const companyIdHeader = req.headers.companyid ?? "-";
  console.log(
    `[GET /company] request start requestId=${requestId} hasAuthHeader=${hasAuthHeader} employeeIdHeader=${req.headers.employeeid ?? req.headers.employeid ?? req.headers["x-employee-id"] ?? "-"} authContextUserId=${req.authContext?.userId ?? "-"} authContextEmployeeId=${req.authContext?.employeeId ?? "-"} companyIdHeader=${companyIdHeader} routeId=${gatewayRouteId} forwardedFor=${forwardedFor} forwardedProto=${forwardedProto} userAgent="${userAgent}"`
  );

  try {
    console.log(
      `[GET /company] requestId=${requestId} calling companyService.getCompany`
    );
    const data = await companyService.getCompany(req.authContext);
    const elapsed = Date.now() - startedAt;
    console.log(
      `[GET /company] request success requestId=${requestId} companyId=${data.id} employeeCount=${data.employeeCount} elapsedMs=${elapsed}`
    );
    res.json(data);
  } catch (err) {
    const elapsed = Date.now() - startedAt;
    const root = extractRootCause(err);
    const reason = classifyErrorReason(err);
    console.error(
      `[GET /company] request failed requestId=${requestId} status=${err?.statusCode ?? 500} reason="${reason}" message="${err?.message ?? "unknown error"}" code=${err?.code ?? "-"} elapsedMs=${elapsed}`
    );
    console.error(
      `[GET /company] requestId=${requestId} rootCauseMessage="${root?.message ?? "-"}" rootCauseCode=${root?.code ?? "-"} rootCauseErrno=${root?.errno ?? "-"} rootCauseSyscall=${root?.syscall ?? "-"} rootCauseAddress=${root?.address ?? "-"} rootCausePort=${root?.port ?? "-"}`
    );
    if (err?.stack) {
      console.error(`[GET /company] requestId=${requestId} stack=${err.stack}`);
    }
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
    return res.status(err.statusCode).json({
      error: err.message,
      message: err.message,
    });
  }
  console.error(err);
  return res.status(500).json({
    error: "Internal server error",
    message: "Internal server error",
  });
}

module.exports = {
  getCompany,
  getCompanyIdByUserId,
  patchCompany,
  deleteCompany,
  errorHandler,
};
