import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";

/** 404 handler for unmatched routes. */
export function notFoundHandler(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

/** Centralized error handler. Converts any thrown error into a JSON response. */
export function errorHandler(err, _req, res, _next) {
  let status = err.status || 500;
  let message = err.message || "Internal server error";

  // Handle common third-party errors.
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    status = 401;
    message = "Invalid or expired token.";
  }
  if (err.code === "ER_DUP_ENTRY") {
    status = 409;
    message = "Duplicate entry — this record already exists.";
  }

  if (env.isProduction) {
    // Never leak stack traces in production.
    return res.status(status).json({
      success: false,
      status,
      message,
    });
  }

  return res.status(status).json({
    success: false,
    status,
    message,
    stack: err.stack,
  });
}
