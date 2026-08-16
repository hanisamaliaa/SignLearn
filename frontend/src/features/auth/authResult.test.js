import assert from "node:assert/strict";
import test from "node:test";
import { authErrorMessage, authFieldErrors, isAuthFailure } from "./authResult.js";

test("a failed result is recognised even though it is a truthy object", () => {
  // Inti bug-nya: halaman pendaftaran memakai `if (!result)`, dan
  // `{ success: false }` adalah objek yang selalu truthy — sehingga setiap
  // pendaftaran yang ditolak server tetap dirayakan sebagai berhasil.
  const rejected = { success: false, message: "Email ini sudah terdaftar." };
  assert.equal(Boolean(rejected), true, "objek hasil memang selalu truthy");
  assert.equal(isAuthFailure(rejected), true);
});

test("a successful result is recognised", () => {
  assert.equal(isAuthFailure({ success: true, message: "" }), false);
});

test("anything that is not an explicit success counts as failure", () => {
  for (const value of [null, undefined, {}, { success: "true" }, { success: 1 }]) {
    assert.equal(isAuthFailure(value), true, `seharusnya gagal: ${JSON.stringify(value)}`);
  }
});

test("shows the server's reason rather than a guess", () => {
  // Menampilkan "Email sudah digunakan" untuk kata sandi lemah atau rate
  // limit akan menyuruh pengguna memperbaiki hal yang tidak salah.
  assert.equal(
    authErrorMessage({ success: false, message: "Kata sandi terlalu umum." }),
    "Kata sandi terlalu umum.",
  );
  assert.equal(
    authErrorMessage({ success: false, message: "Terlalu banyak pendaftaran dari perangkat ini. Coba lagi dalam 1 jam." }),
    "Terlalu banyak pendaftaran dari perangkat ini. Coba lagi dalam 1 jam.",
  );
});

test("falls back to the first field error when there is no summary message", () => {
  assert.equal(
    authErrorMessage({
      success: false,
      message: "",
      errors: [{ field: "password", message: "Kata sandi minimal 8 karakter." }],
    }),
    "Kata sandi minimal 8 karakter.",
  );
});

test("falls back to the provided default when the server said nothing useful", () => {
  assert.equal(authErrorMessage({ success: false }, "Coba lagi."), "Coba lagi.");
  assert.equal(authErrorMessage(null, "Coba lagi."), "Coba lagi.");
});

test("maps field errors so the form can mark the offending input", () => {
  assert.deepEqual(
    authFieldErrors({
      errors: [
        { field: "email", message: "Format email tidak valid." },
        { field: "password", message: "Terlalu pendek." },
        // Galat kedua untuk kolom yang sama diabaikan; satu pesan per kolom
        // sudah cukup dan yang pertama paling relevan.
        { field: "email", message: "Sudah dipakai." },
      ],
    }),
    { email: "Format email tidak valid.", password: "Terlalu pendek." },
  );
});

test("survives results without an errors array", () => {
  assert.deepEqual(authFieldErrors({ success: false }), {});
  assert.deepEqual(authFieldErrors(null), {});
  assert.deepEqual(authFieldErrors({ errors: "bukan array" }), {});
});
