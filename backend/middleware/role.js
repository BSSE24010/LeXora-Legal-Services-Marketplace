function requireRole(...roles) {
  const allowed = new Set(roles);
  return function roleGuard(req, res, next) {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!allowed.has(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}

module.exports = { requireRole };

