const { Router } = require("express");
const companyRoutes = require("./company.routes");

const router = Router();

router.use("/company", companyRoutes);

module.exports = router;
