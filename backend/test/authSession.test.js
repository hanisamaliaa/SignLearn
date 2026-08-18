import assert from "node:assert/strict";
import test from "node:test";
import { validateLogin } from "../src/validators/authValidator.js";

const credentials = {
  email: "user@example.com",
  password: "Kupu2#Terbang",
};

test("login accepts only a boolean remember preference", () => {
  assert.deepEqual(validateLogin(credentials), []);
  assert.deepEqual(validateLogin({ ...credentials, remember: false }), []);
  assert.deepEqual(validateLogin({ ...credentials, remember: true }), []);

  for (const remember of ["true", "false", 1, 0, null, {}]) {
    assert.ok(
      validateLogin({ ...credentials, remember }).some((error) => error.field === "remember"),
      `remember should be rejected: ${JSON.stringify(remember)}`,
    );
  }
});
