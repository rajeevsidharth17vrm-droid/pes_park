export function errorHandler(err, req, res, next) {
  console.error(`[error] ${req.method} ${req.path}:`, err.message)

  // Zod validation errors
  if (err.name === "ZodError") {
    return res.status(400).json({
      error: "Validation failed",
      issues: err.errors.map(e => ({ path: e.path.join("."), message: e.message })),
    })
  }
  // Postgres unique violation
  if (err.code === "23505") {
    return res.status(409).json({ error: "Record already exists" })
  }
  // Postgres FK violation
  if (err.code === "23503") {
    return res.status(400).json({ error: "Referenced record not found" })
  }
  // JWT errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Invalid or expired token" })
  }

  res.status(err.status || 500).json({ error: err.message || "Internal server error" })
}
