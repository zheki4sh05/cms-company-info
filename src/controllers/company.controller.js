const companyService = require("../services/company.service");
const { AppError } = require("../errors/AppError");

async function getCompany(req, res, next) {
  try {
    const data = await companyService.getCompany();
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
  patchCompany,
  deleteCompany,
  errorHandler,
};
