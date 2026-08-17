import test from "node:test";
import assert from "node:assert/strict";
import {
  IMAGE_UPLOAD_MAX_BYTES,
  validateImageFile,
} from "./imageUpload.js";

test("menerima JPEG, PNG, dan WebP yang tidak kosong", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp"]) {
    assert.equal(validateImageFile({ type, size: 128 }).type, type);
  }
});

test("menolak tipe yang dapat mengeksekusi konten seperti SVG", () => {
  assert.throws(
    () => validateImageFile({ type: "image/svg+xml", size: 128 }),
    /JPEG, PNG, atau WebP/,
  );
});

test("menolak gambar kosong dan lebih dari 5 MB", () => {
  assert.throws(() => validateImageFile({ type: "image/png", size: 0 }), /kosong/);
  assert.throws(
    () => validateImageFile({ type: "image/png", size: IMAGE_UPLOAD_MAX_BYTES + 1 }),
    /maksimal 5 MB/,
  );
});
