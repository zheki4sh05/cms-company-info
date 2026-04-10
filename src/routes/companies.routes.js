const { Router } = require("express");
const departmentController = require("../controllers/department.controller");
const employeeController = require("../controllers/employee.controller");
const {
  requireUser,
  requireCompanyMember,
  requireExecutive,
} = require("../middlewares/company-access.middleware");

const router = Router({ mergeParams: true });

router.get(
  "/:companyId/departments",
  requireUser,
  requireCompanyMember,
  departmentController.list
);

router.get(
  "/:companyId/employees",
  requireUser,
  requireCompanyMember,
  employeeController.listCompanyEmployees
);

router.post(
  "/:companyId/departments",
  requireUser,
  requireCompanyMember,
  requireExecutive,
  departmentController.create
);

router.patch(
  "/:companyId/departments/:departmentId",
  requireUser,
  requireCompanyMember,
  requireExecutive,
  departmentController.update
);

router.delete(
  "/:companyId/departments/:departmentId",
  requireUser,
  requireCompanyMember,
  requireExecutive,
  departmentController.destroy
);

router.post(
  "/:companyId/departments/:departmentId/members",
  requireUser,
  requireCompanyMember,
  requireExecutive,
  departmentController.addMember
);

router.delete(
  "/:companyId/departments/:departmentId/members/:employeeId",
  requireUser,
  requireCompanyMember,
  requireExecutive,
  departmentController.removeMember
);

module.exports = router;
