import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Verifies the Bearer token and attaches the decoded payload to req.user.
 * Used to protect authenticated routes.
 */
export function authenticate(req, _res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(new ApiError(401, "Authentication token is required."));
  }

  try {
    const payload = jwt.verify(token, env.jwt.secret);
    req.user = payload;
    return next();
  } catch (err) {
    return next(new ApiError(401, "Invalid or expired token."));
  }
}

/**
 * Optional auth — attaches req.user if a valid token is present, otherwise
 * continues without one. Used for routes that behave differently for guests.
 */
export function optionalAuthenticate(req, _res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme === "Bearer" && token) {
    try {
      req.user = jwt.verify(token, env.jwt.secret);
    } catch {
      req.user = null;
    }
  }

  return next();
}
