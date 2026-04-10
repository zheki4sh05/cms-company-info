const { Router } = require("express");
const companyRoutes = require("./company.routes");
const employeeRoutes = require("./employee.routes");
const companiesRoutes = require("./companies.routes");
const departmentsRoutes = require("./departments.routes");
const invitationRoutes = require("./invitation.routes");

const router = Router();

router.use("/company", companyRoutes);
router.use("/employee", employeeRoutes);
router.use("/companies", companiesRoutes);
router.use("/departments", departmentsRoutes);
router.use("/invitations", invitationRoutes);

module.exports = router;
