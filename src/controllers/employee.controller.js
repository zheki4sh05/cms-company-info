const employeeService = require("../services/employee.service");

async function getEmployeeIdByToken(req, res, next) {
  try {
    const data = await employeeService.getEmployeeIdByToken(req.authContext);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function listCompanyEmployees(req, res, next) {
  try {
    const data = await employeeService.listCompanyEmployees(
      req.authContext,
      req.headers.authorization,
      req.params.companyId
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { getEmployeeIdByToken, listCompanyEmployees };
