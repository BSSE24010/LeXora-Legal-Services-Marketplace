const { ok } = require("../utils/response");

exports.me = async (req, res) => {
  return ok(res, req.user);
};

