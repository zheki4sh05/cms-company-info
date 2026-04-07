const { Router } = require("express");
const companyController = require("../controllers/company.controller");

const router = Router();

router.get("/", companyController.getCompany);
router.patch("/", companyController.patchCompany);
router.delete("/", companyController.deleteCompany);

module.exports = router;
