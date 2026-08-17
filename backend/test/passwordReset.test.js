import assert from "node:assert/strict";
import test from "node:test";
import {
  RESET_CODE_LENGTH,
  generateResetCode,
  hashResetCode,
  hashToken,
} from "../src/utils/crypto.js";
import { validateResetPassword, validateForgotPassword } from "../src/validators/authValidator.js";

const fieldsOf = (errors) => errors.map((e) => e.field).sort();

test("generates codes that are always six digits, zero padding included", () => {
  // Tanpa nol di depan, satu dari sepuluh kode akan lebih pendek dan penerima
  // "48291" akan mengira ada digit yang hilang.
  const codes = Array.from({ length: 5000 }, generateResetCode);
  for (const code of codes) {
    assert.match(code, /^[0-9]{6}$/, `kode tidak sah: ${code}`);
    assert.equal(code.length, RESET_CODE_LENGTH);
  }
  assert.ok(codes.some((code) => code.startsWith("0")), "nol di depan harus dipertahankan");
});

test("spreads codes across the whole range", () => {
  // Bukan uji keacakan yang ketat, hanya penjaga agar generator tidak macet
  // di satu nilai atau satu rentang sempit.
  const codes = Array.from({ length: 5000 }, generateResetCode);
  assert.ok(new Set(codes).size > 4500, "kode terlalu banyak yang berulang");
  assert.ok(codes.some((c) => Number(c) < 100_000), "tidak ada kode di paruh bawah");
  assert.ok(codes.some((c) => Number(c) > 900_000), "tidak ada kode di paruh atas");
});

test("binds the code hash to its owner", () => {
  // Inti pertahanannya: kode enam digit hanya punya sejuta kemungkinan. Bila
  // hash tidak terikat pengguna, satu tebakan yang cocok membuka reset milik
  // siapa saja yang sedang aktif.
  assert.notEqual(hashResetCode(1, "482917"), hashResetCode(2, "482917"));
  assert.notEqual(hashResetCode(1, "482917"), hashToken("482917"));
  assert.equal(hashResetCode(1, "482917"), hashResetCode(1, "482917"));
  assert.equal(hashResetCode("1", "482917"), hashResetCode(1, "482917"));
});

test("trims the code before hashing so a stray space still verifies", () => {
  assert.equal(hashResetCode(7, " 482917 "), hashResetCode(7, "482917"));
});

test("reset requires an email, a six digit code, and a policy-compliant password", () => {
  assert.deepEqual(
    validateResetPassword({ email: "a@b.com", code: "482917", password: "Rahasia#2026" }),
    [],
  );
});

test("reset refuses codes that could never have been issued", () => {
  const bad = ["", "12345", "1234567", "abcdef", "48 291", "48291a", null, undefined];
  for (const code of bad) {
    const errors = validateResetPassword({ email: "a@b.com", code, password: "Rahasia#2026" });
    assert.ok(
      errors.some((e) => e.field === "code"),
      `seharusnya ditolak: ${JSON.stringify(code)}`,
    );
  }
});

test("reset refuses a missing email", () => {
  // Tanpa email, kode hanya dapat dicari lewat hash-nya sendiri — persis
  // celah yang ditutup oleh pengikatan ke pengguna.
  const errors = validateResetPassword({ code: "482917", password: "Rahasia#2026" });
  assert.ok(errors.some((e) => e.field === "email"));
});

test("reset still enforces the password policy", () => {
  const errors = validateResetPassword({ email: "a@b.com", code: "482917", password: "12345678" });
  assert.ok(errors.some((e) => e.field === "password"));
});

test("reset reports every missing field at once", () => {
  assert.deepEqual(fieldsOf(validateResetPassword({})), ["code", "email", "password"]);
});

test("forgot-password still only needs an email", () => {
  assert.deepEqual(validateForgotPassword({ email: "a@b.com" }), []);
  assert.ok(validateForgotPassword({}).some((e) => e.field === "email"));
});
