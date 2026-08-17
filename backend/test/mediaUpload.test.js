import assert from "node:assert/strict";
import test from "node:test";
import { Writable } from "node:stream";
import { detectImageMime } from "../src/middleware/imageUpload.middleware.js";
import {
  createPublicId,
  destroyImage,
  uploadImage,
} from "../src/services/cloudinaryService.js";
import { validateUpdateProfile } from "../src/validators/userValidator.js";
import { replaceMedia } from "../src/services/mediaService.js";

test("detects only supported image signatures instead of trusting extensions", () => {
  assert.equal(detectImageMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
  assert.equal(
    detectImageMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    "image/png",
  );
  assert.equal(detectImageMime(Buffer.from("RIFF1234WEBP", "ascii")), "image/webp");
  assert.equal(detectImageMime(Buffer.from("<svg><script/></svg>")), null);
  assert.equal(detectImageMime(Buffer.from("not an image")), null);
});

test("uploads through a signed server-side stream with bounded transformation", async () => {
  let options;
  let received = Buffer.alloc(0);
  const client = {
    uploader: {
      upload_stream(uploadOptions, callback) {
        options = uploadOptions;
        const stream = new Writable({
          write(chunk, _encoding, done) {
            received = Buffer.concat([received, chunk]);
            done();
          },
        });
        stream.on("finish", () => callback(null, {
          public_id: uploadOptions.public_id,
          secure_url: "https://res.cloudinary.com/demo/image/upload/example.webp",
          width: 800,
          height: 450,
          format: "webp",
          bytes: received.length,
        }));
        return stream;
      },
    },
  };

  const buffer = Buffer.from("image bytes");
  const result = await uploadImage(
    buffer,
    { publicId: "signlearn/test/id", maxWidth: 800, maxHeight: 450 },
    client,
  );

  assert.deepEqual(received, buffer);
  assert.equal(options.resource_type, "image");
  assert.equal(options.overwrite, false);
  assert.deepEqual(options.transformation, [
    { width: 800, height: 450, crop: "limit", quality: "auto:good" },
  ]);
  assert.equal(result.publicId, "signlearn/test/id");
  assert.match(result.secureUrl, /^https:\/\//);
});

test("maps provider errors to a stable production API error", async () => {
  const client = {
    uploader: {
      upload_stream(_options, callback) {
        const stream = new Writable({ write(_chunk, _encoding, done) { done(); } });
        stream.on("finish", () => callback(new Error("secret provider detail")));
        return stream;
      },
    },
  };

  await assert.rejects(
    uploadImage(Buffer.from("x"), { publicId: "signlearn/test/fail" }, client),
    (error) => error.status === 502 && error.code === "MEDIA_UPLOAD_FAILED",
  );
});

test("destroys images with CDN invalidation", async () => {
  let call;
  const client = {
    uploader: {
      async destroy(publicId, options) {
        call = { publicId, options };
        return { result: "ok" };
      },
    },
  };
  await destroyImage("signlearn/test/old", client);
  assert.deepEqual(call, {
    publicId: "signlearn/test/old",
    options: { resource_type: "image", type: "upload", invalidate: true },
  });
});

test("public ids are scoped and unique", () => {
  const first = createPublicId("course-thumbnails", "42");
  const second = createPublicId("course-thumbnails", "42");
  assert.match(first, /course-thumbnails\/42\/[0-9a-f-]{36}$/);
  assert.notEqual(first, second);
});

test("profile accepts built-in ids and HTTPS Cloudinary URLs only", () => {
  assert.deepEqual(validateUpdateProfile({ avatar: "luna" }), []);
  assert.deepEqual(
    validateUpdateProfile({ avatar: "https://res.cloudinary.com/demo/image/upload/a.webp" }),
    [],
  );
  assert.ok(validateUpdateProfile({ avatar: "http://example.com/a.jpg" }).length > 0);
  assert.ok(validateUpdateProfile({ avatar: "javascript:alert(1)" }).length > 0);
});

test("media replacement persists the new public id then removes the old asset", async () => {
  const destroyed = [];
  let persisted;
  const result = await replaceMedia(
    {
      file: { buffer: Buffer.from("new image") },
      collection: "test",
      resourceId: "7",
      maxWidth: 800,
      maxHeight: 800,
      findCurrent: async () => ({ url: "https://old", publicId: "old-public-id" }),
      persist: async (...args) => {
        persisted = args;
        return { id: "7", avatar: "https://new" };
      },
      notFoundMessage: "Tidak ditemukan.",
    },
    {
      createPublicId: () => "new-public-id",
      uploadImage: async () => ({ publicId: "new-public-id", secureUrl: "https://new" }),
      destroyImageBestEffort: async (publicId) => { if (publicId) destroyed.push(publicId); },
    },
  );

  assert.deepEqual(persisted, ["7", "https://new", "new-public-id", "old-public-id"]);
  assert.deepEqual(destroyed, ["old-public-id"]);
  assert.equal(result.resource.avatar, "https://new");
});

test("media replacement cleans the new upload when database persistence fails", async () => {
  const destroyed = [];
  await assert.rejects(
    replaceMedia(
      {
        file: { buffer: Buffer.from("new image") },
        collection: "test",
        resourceId: "8",
        findCurrent: async () => ({ url: null, publicId: null }),
        persist: async () => { throw new Error("database unavailable"); },
        notFoundMessage: "Tidak ditemukan.",
      },
      {
        createPublicId: () => "new-public-id",
        uploadImage: async () => ({ publicId: "new-public-id", secureUrl: "https://new" }),
        destroyImageBestEffort: async (publicId) => { destroyed.push(publicId); },
      },
    ),
    /database unavailable/,
  );
  assert.deepEqual(destroyed, ["new-public-id"]);
});

test("media replacement rejects stale concurrent writes and cleans its upload", async () => {
  const destroyed = [];
  await assert.rejects(
    replaceMedia(
      {
        file: { buffer: Buffer.from("new image") },
        collection: "test",
        resourceId: "9",
        findCurrent: async () => ({ url: "https://old", publicId: "old-public-id" }),
        persist: async () => null,
        notFoundMessage: "Tidak ditemukan.",
      },
      {
        createPublicId: () => "new-public-id",
        uploadImage: async () => ({ publicId: "new-public-id", secureUrl: "https://new" }),
        destroyImageBestEffort: async (publicId) => { destroyed.push(publicId); },
      },
    ),
    (error) => error.status === 409 && error.code === "STALE_RESOURCE",
  );
  assert.deepEqual(destroyed, ["new-public-id"]);
});
