import assert from "node:assert/strict";
import test from "node:test";
import {
  validateCreateTranslation,
  validateLookup,
  validateTranslationQuery,
  validateUpdateTranslation,
} from "../src/validators/translationValidator.js";
import { normalizeWord } from "../src/utils/normalizeWord.js";

test("normalizes Indonesian word-bank queries consistently", () => {
  assert.equal(normalizeWord("  TERIMA   KASIH  "), "terima kasih");
  assert.equal(normalizeWord("ＭＡＡＦ"), "maaf");
});

test("accepts a valid word-bank entry", () => {
  assert.deepEqual(validateCreateTranslation({
    word: "Terima kasih",
    translation: "TERIMA KASIH",
    category: "Sapaan",
    status: "active",
    aliases: ["makasih"],
    signVideo: "https://cdn.example.test/terima-kasih.mp4",
  }), []);
});

test("rejects invalid media, status, and empty required fields", () => {
  const errors = validateCreateTranslation({
    word: " ", translation: "", status: "draft", signImage: "javascript:alert(1)",
  });
  assert.deepEqual(errors.map((error) => error.field), ["word", "translation", "signImage", "status"]);
});

test("requires at least one update field", () => {
  assert.equal(validateUpdateTranslation({})[0].field, "body");
});

test("validates lookup and list query", () => {
  assert.equal(validateLookup(null, null, {}).length, 1);
  assert.deepEqual(validateLookup(null, null, { word: "halo" }), []);
});

test("allows a one-character search because the dictionary is an alphabet", () => {
  // Dulu ditolak. Kamus ini isinya huruf, jadi mencari "A" justru pemakaian
  // yang paling wajar — menolaknya membuat penelusuran per huruf mustahil.
  assert.deepEqual(validateTranslationQuery(null, null, { q: "a" }), []);
  assert.deepEqual(validateTranslationQuery(null, null, { q: "Z" }), []);
});

test("still rejects an absurdly long search", () => {
  assert.equal(validateTranslationQuery(null, null, { q: "x".repeat(200) }).length, 1);
});

test("rejects a YouTube page pasted into the image field", () => {
  // Persis baris rusak yang ditemukan di basis data: tautan halaman YouTube
  // pada `sign_image` lolos validasi lama, lalu tampil sebagai gambar rusak.
  const errors = validateCreateTranslation({
    word: "Halo",
    translation: "H-A-L-O",
    signImage: "https://www.youtube.com/watch?v=kXYrQys-Me8",
  });
  assert.equal(errors.length, 1);
  assert.equal(errors[0].field, "signImage");
  assert.match(errors[0].message, /YouTube/);
});

test("rejects an image URL that points at no image file", () => {
  const errors = validateCreateTranslation({
    word: "Halo", translation: "H-A-L-O", signImage: "https://example.test/gambar",
  });
  assert.equal(errors.length, 1);
  assert.equal(errors[0].field, "signImage");
});

test("accepts every image extension we can actually render", () => {
  for (const extension of ["jpg", "jpeg", "png", "webp", "gif", "svg", "avif"]) {
    assert.deepEqual(
      validateCreateTranslation({
        word: "Halo", translation: "H-A-L-O",
        signImage: `https://cdn.example.test/halo.${extension}`,
      }),
      [],
      `ekstensi ${extension} seharusnya diterima`,
    );
  }
});

test("ignores query strings and casing when reading the extension", () => {
  assert.deepEqual(validateCreateTranslation({
    word: "Halo", translation: "H-A-L-O",
    signImage: "https://cdn.example.test/Halo.PNG?v=2&w=400",
  }), []);
});

test("accepts YouTube in the video field, where a player exists for it", () => {
  for (const url of [
    "https://www.youtube.com/watch?v=kXYrQys-Me8",
    "https://youtu.be/kXYrQys-Me8",
    "https://m.youtube.com/watch?v=kXYrQys-Me8",
  ]) {
    assert.deepEqual(
      validateCreateTranslation({ word: "Halo", translation: "H-A-L-O", signVideo: url }),
      [], `seharusnya diterima: ${url}`,
    );
  }
});

test("rejects a YouTube channel, playlist, or malformed video id", () => {
  for (const signVideo of [
    "https://www.youtube.com/@signlearn",
    "https://www.youtube.com/playlist?list=PL123",
    "https://youtu.be/terlalu-pendek",
    "https://www.youtube.com/watch?v=invalid",
  ]) {
    const errors = validateCreateTranslation({
      word: "Halo", translation: "H-A-L-O", signVideo,
    });
    assert.equal(errors.length, 1, signVideo);
    assert.equal(errors[0].field, "signVideo", signVideo);
  }
});

test("rejects a video URL that is neither a video file nor YouTube", () => {
  const errors = validateCreateTranslation({
    word: "Halo", translation: "H-A-L-O", signVideo: "https://vimeo.com/12345",
  });
  assert.equal(errors.length, 1);
  assert.equal(errors[0].field, "signVideo");
});

test("rejects non-http protocols in both media fields", () => {
  // `new URL()` menerima `javascript:` dengan senang hati, dan nilainya
  // berakhir di atribut `src`.
  for (const field of ["signImage", "signVideo"]) {
    const errors = validateCreateTranslation({
      word: "Halo", translation: "H-A-L-O", [field]: "javascript:alert(1)",
    });
    assert.equal(errors.length, 1, field);
    assert.equal(errors[0].field, field);
  }
});
