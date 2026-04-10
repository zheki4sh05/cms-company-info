const invitationService = require("../services/invitation.service");

async function send(req, res, next) {
  try {
    const data = await invitationService.sendInvitation(
      req.authContext,
      req.headers.authorization,
      req.body
    );
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { send };
