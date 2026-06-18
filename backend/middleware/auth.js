const { verifyToken } = require("../utils/jwt");

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  try {
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId || !decoded.role) {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.user = { userId: decoded.userId, role: decoded.role };
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = auth;

