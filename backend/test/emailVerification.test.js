import assert from "node:assert/strict";
import test from "node:test";
import {
  EMAIL_VERIFICATION_CODE_LENGTH,
  generateEmailVerificationCode,
  hashEmailVerificationCode,
  hashResetCode,
} from "../src/utils/crypto.js";
import {
  validateResendEmailVerification,
  validateVerifyEmail,
} from "../src/validators/authValidator.js";

test("registration verification codes are cryptographically generated six digit values", () => {
  const codes = Array.from({ length: 5000 }, generateEmailVerificationCode);
  assert.equal(EMAIL_VERIFICATION_CODE_LENGTH, 6);
  assert.ok(codes.every((code) => /^[0-9]{6}$/.test(code)));
  assert.ok(codes.some((code) => code.startsWith("0")), "leading zero must survive");
  assert.ok(new Set(codes).size > 4500, "generator appears stuck or too narrow");
});

test("verification hashes are bound to a user and isolated from password reset", () => {
  const code = "483921";
  const pepper = "unit-test-pepper-that-is-long-enough";
  assert.notEqual(
    hashEmailVerificationCode(1, code, pepper),
    hashEmailVerificationCode(2, code, pepper),
  );
  assert.notEqual(hashEmailVerificationCode(1, code, pepper), hashResetCode(1, code));
  assert.notEqual(
    hashEmailVerificationCode(1, code, pepper),
    hashEmailVerificationCode(1, code, "another-pepper"),
  );
  assert.equal(
    hashEmailVerificationCode(1, ` ${code} `, pepper),
    hashEmailVerificationCode(1, code, pepper),
  );
  assert.match(hashEmailVerificationCode(1, code, pepper), /^[a-f0-9]{64}$/);
  assert.throws(() => hashEmailVerificationCode(1, code), /pepper/i);
});

test("verify-email requires a valid email and exactly six digits", () => {
  assert.deepEqual(validateVerifyEmail({ email: "user@example.com", code: "483921" }), []);

  for (const code of ["", "12345", "1234567", "abcdef", "48 3921", null]) {
    assert.ok(
      validateVerifyEmail({ email: "user@example.com", code })
        .some((error) => error.field === "code"),
      `code should be rejected: ${JSON.stringify(code)}`,
    );
  }
  assert.ok(
    validateVerifyEmail({ email: "invalid", code: "483921" })
      .some((error) => error.field === "email"),
  );
});

test("resend only accepts a valid email address", () => {
  assert.deepEqual(validateResendEmailVerification({ email: "user@example.com" }), []);
  assert.ok(validateResendEmailVerification({ email: "" }).length > 0);
  assert.ok(validateResendEmailVerification({ email: "not-an-email" }).length > 0);
});
