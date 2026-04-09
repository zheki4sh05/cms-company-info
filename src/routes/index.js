const { Router } = require("express");
const companyRoutes = require("./company.routes");
const employeeRoutes = require("./employee.routes");

const router = Router();

router.use("/company", companyRoutes);
router.use("/employee", employeeRoutes);

module.exports = router;
