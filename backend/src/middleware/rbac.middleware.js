import { ApiError } from "../utils/ApiError.js";

/**
 * Role-Based Access Control.
 *
 * Usage:
 *   router.get("/", authorizeRoles("admin"), handler)
 *
 * Users cannot access admin routes and vice-versa. Must run after
 * `authenticate` so req.user is populated.
 */
export function authorizeRoles(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required."));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          "You do not have permission to access this resource.",
        ),
      );
    }

    return next();
  };
}

// Convenience guards
export const requireAdmin = authorizeRoles("admin");
export const requireUser = authorizeRoles("user");
