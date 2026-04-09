const { Router } = require("express");
const departmentController = require("../controllers/department.controller");
const {
  requireUser,
  requireCompanyMemberFromBody,
  requireExecutive,
} = require("../middlewares/company-access.middleware");

const router = Router();

router.post(
  "/",
  requireUser,
  requireCompanyMemberFromBody,
  requireExecutive,
  departmentController.createAtRoot
);

router.post("/transfer", requireUser, departmentController.transfer);

router.post(
  "/:departmentId/manager",
  requireUser,
  departmentController.assignManager
);

router.patch("/:id", requireUser, departmentController.patchAtRoot);

router.delete("/:id", requireUser, departmentController.destroyAtRoot);

router.get("/:id", requireUser, departmentController.getOne);

module.exports = router;
