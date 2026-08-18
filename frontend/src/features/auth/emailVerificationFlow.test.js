import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("unverified login is redirected to a refresh-safe verification URL", () => {
  const login = read("../../pages/Login.jsx");
  assert.match(login, /EMAIL_NOT_VERIFIED/);
  assert.match(login, /verify-email\?email=/);
  assert.match(login, /encodeURIComponent\(normalizedEmail\)/);
});

test("registration and verification page preserve the pending email", () => {
  const register = read("../../pages/Register.jsx");
  const verify = read("../../pages/VerifyEmail.jsx");
  assert.match(register, /verify-email\?email=/);
  assert.match(verify, /useSearchParams/);
  assert.match(verify, /searchParams\.get\("email"\)/);
});
