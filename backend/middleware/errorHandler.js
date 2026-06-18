function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error(err);

  if (res.headersSent) return next(err);

  // express-validator style errors (if any route passes them as Error)
  if (err && err.type === "validation") {
    return res.status(400).json({ error: err.message || "Validation error" });
  }

  // PostgreSQL errors
  if (err && err.code) {
    if (err.code === "23505") return res.status(409).json({ error: "Conflict" }); // unique violation
    if (err.code === "23503") return res.status(400).json({ error: "Invalid reference" }); // FK violation
    if (err.code === "23514") return res.status(400).json({ error: "Invalid data" }); // check violation
  }

  const status = err && Number.isInteger(err.status) ? err.status : 500;
  const message =
    err && typeof err.message === "string" && err.message.trim()
      ? err.message
      : "Server error";
  return res.status(status).json({ error: message });
}

module.exports = errorHandler;

