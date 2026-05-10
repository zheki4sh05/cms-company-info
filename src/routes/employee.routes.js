const { Router } = require("express");
const employeeController = require("../controllers/employee.controller");

const router = Router();

router.get("/id", employeeController.getEmployeeIdByToken);
router.get(
  "/internal/id/:userId",
  employeeController.getEmployeeDepartmentContextByUserId
);
router.get(
  "/department-manager",
  employeeController.getDepartmentManagerByEmployee
);
router.get(
  "/department-manager-subordinates",
  employeeController.getDepartmentHeadManagerSubordinateUserIds
);

module.exports = router;
