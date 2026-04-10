const { Router } = require("express");
const invitationController = require("../controllers/invitation.controller");
const { requireUser } = require("../middlewares/company-access.middleware");

const router = Router();

router.post("/send", requireUser, invitationController.send);

module.exports = router;
