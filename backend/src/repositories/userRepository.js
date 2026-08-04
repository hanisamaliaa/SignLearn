import pool from "../config/database.js";

/**
 * User repository — MySQL data layer. Queries are NOT implemented yet.
 * This file establishes the pattern for how repositories will interact
 * with the connection pool.
 */

export async function findUserByEmail(email) {
  // TODO: SELECT * FROM users WHERE email = ?
  throw new Error("findUserByEmail not implemented");
}

export async function findUserById(id) {
  // TODO: SELECT * FROM users WHERE id = ?
  throw new Error("findUserById not implemented");
}

export async function createUser(user) {
  // TODO: INSERT INTO users ...
  throw new Error("createUser not implemented");
}

export async function updateUser(id, fields) {
  // TODO: UPDATE users SET ...
  throw new Error("updateUser not implemented");
}

export async function deleteUser(id) {
  // TODO: DELETE FROM users WHERE id = ?
  throw new Error("deleteUser not implemented");
}

export async function listUsers() {
  // TODO: SELECT * FROM users
  throw new Error("listUsers not implemented");
}

// Keep a reference to the pool so it is tree-shaken/imported lazily.
export { pool };
