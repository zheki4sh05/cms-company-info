const { Router } = require("express");
const employeeController = require("../controllers/employee.controller");

const router = Router();

router.get("/id", employeeController.getEmployeeIdByToken);
router.get(
  "/department-manager",
  employeeController.getDepartmentManagerByEmployee
);

module.exports = router;
