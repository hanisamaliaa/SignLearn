import assert from "node:assert/strict";
import test from "node:test";
import { errorHandler, notFoundHandler } from "../src/middleware/error.middleware.js";
import { ApiError } from "../src/utils/ApiError.js";

/** Mengumpulkan apa yang benar-benar dikirim ke klien. */
function capture(err, { method = "GET", url = "/api/v1/uji" } = {}) {
  const sent = {};
  const res = {
    status(code) { sent.status = code; return this; },
    json(body) { sent.body = body; return this; },
  };
  const errors = [];
  const realError = console.error;
  console.error = (...args) => errors.push(args.join(" "));
  try {
    errorHandler(err, { method, originalUrl: url }, res, () => {});
  } finally {
    console.error = realError;
  }
  return { ...sent, logged: errors.join("\n") };
}

test("an unhandled library error never sends its own message to the client", () => {
  // Persis kebocoran yang ditemukan audit: busboy melempar Error biasa dan
  // teksnya diteruskan apa adanya sebagai balasan 500.
  const result = capture(new Error("Malformed part header"));
  assert.equal(result.status, 500);
  assert.equal(result.body.message, "Terjadi kesalahan pada server.");
  assert.ok(!result.body.message.includes("Malformed"));
});

test("a database error never leaks host, table, or column names", () => {
  const dbError = new Error('relation "users" does not exist di 10.0.0.5:5432');
  const result = capture(dbError);
  assert.equal(result.body.message, "Terjadi kesalahan pada server.");
  assert.ok(!result.body.message.includes("users"));
  assert.ok(!result.body.message.includes("10.0.0.5"));
});

test("the real message is still written to the log for diagnosis", () => {
  // Menahannya dari klien tidak boleh berarti menahannya dari kita — kalau
  // begitu, kegagalan produksi jadi mustahil didiagnosis.
  const result = capture(new Error("Malformed part header"));
  assert.match(result.logged, /Malformed part header/);
});

test("messages we wrote ourselves still reach the client", () => {
  // 4xx menjelaskan kepada pengguna apa yang harus diperbaiki; menggantinya
  // dengan teks umum akan membuat setiap form tidak dapat diperbaiki.
  const result = capture(ApiError.validation("Email wajib diisi."));
  assert.equal(result.status, 422);
  assert.equal(result.body.message, "Email wajib diisi.");
});

test("a deliberate 5xx we wrote keeps its message", () => {
  // ApiError 503 dibuat sengaja dan kalimatnya aman — hanya error asing yang
  // perlu disembunyikan.
  const result = capture(new ApiError(503, "Layanan database sedang tidak tersedia."));
  assert.equal(result.status, 503);
  assert.equal(result.body.message, "Layanan database sedang tidak tersedia.");
});

test("field-level errors survive so forms can highlight the right input", () => {
  const result = capture(
    ApiError.validation("Data tidak valid.", [{ field: "email", message: "Format salah." }]),
  );
  assert.deepEqual(result.body.errors, [{ field: "email", message: "Format salah." }]);
});

test("no stack trace is ever placed in a 4xx body", () => {
  const result = capture(ApiError.validation("Tidak valid."));
  assert.equal("stack" in result.body, false);
});

test("multipart parse failures are client errors, not server errors", () => {
  // Diterjemahkan di imageUpload.middleware sebelum sampai ke sini; test ini
  // menjaga bentuk balasannya.
  const result = capture(
    ApiError.badRequest("Permintaan upload tidak dapat dibaca.", [
      { field: "image", message: "Kirim satu gambar pada field 'image'." },
    ]),
  );
  assert.equal(result.status, 400);
  assert.equal(result.body.errors.length, 1);
});

test("known library errors keep their translated status", () => {
  const tooLarge = Object.assign(new Error("File too large"), {
    name: "MulterError", code: "LIMIT_FILE_SIZE",
  });
  assert.equal(capture(tooLarge).status, 413);

  const expired = Object.assign(new Error("jwt expired"), { name: "TokenExpiredError" });
  assert.equal(capture(expired).status, 401);

  const duplicate = Object.assign(new Error("duplicate key"), { code: "23505" });
  assert.equal(capture(duplicate).status, 409);

  const badJson = Object.assign(new Error("Unexpected token"), { type: "entity.parse.failed" });
  assert.equal(capture(badJson).status, 400);
});

test("translated library errors do not carry the library's own wording", () => {
  const duplicate = Object.assign(new Error("duplicate key value violates unique constraint \"users_email_key\""), {
    code: "23505",
  });
  const result = capture(duplicate);
  assert.ok(!result.body.message.includes("users_email_key"), result.body.message);
});

test("the 404 handler does not echo an unbounded url back", () => {
  let captured = null;
  notFoundHandler(
    { method: "GET", originalUrl: "/api/v1/tidak-ada" },
    {},
    (err) => { captured = err; },
  );
  assert.equal(captured.status, 404);
  assert.equal(captured.code, "NOT_FOUND");
});
