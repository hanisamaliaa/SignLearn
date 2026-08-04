import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Auth service — architecture only. Database queries are not implemented yet.
 * These methods describe the intended business logic and will be wired to the
 * repositories once the MySQL schema is finalized.
 */

export async function hashPassword(password) {
  return bcrypt.hash(password, env.bcryptRounds);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn },
  );
}

export function signRefreshToken(user) {
  return jwt.sign({ sub: user.id }, env.jwt.secret, {
    expiresIn: env.jwt.refreshExpiresIn,
  });
}

export async function generateTokens(user) {
  const accessToken = signToken(user);
  const refreshToken = signRefreshToken(user);
  return { accessToken, refreshToken };
}

// Placeholder service methods (to be implemented against the DB later).
export async function registerUser(/* payload */) {
  // TODO: persist user, hash password, return tokens.
  throw new ApiError(501, "Registration is not implemented yet.");
}

export async function loginUser(/* email, password */) {
  // TODO: look up user, verify password, return tokens.
  throw new ApiError(501, "Login is not implemented yet.");
}

export async function getCurrentUser(/* userId */) {
  // TODO: fetch user record by id.
  throw new ApiError(501, "Get current user is not implemented yet.");
}
