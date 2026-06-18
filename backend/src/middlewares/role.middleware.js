const { fail } = require("../utils/response");

function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) return fail(res, "Missing user role", 403);
    if (!roles.includes(role)) return fail(res, "Forbidden", 403);
    return next();
  };
}

module.exports = { requireRole };

