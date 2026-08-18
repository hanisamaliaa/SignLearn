import multer from "multer";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { ERROR_CODES } from "../constants/errorCodes.js";

export const ALLOWED_IMAGE_MIME_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const parser = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: env.upload.imageMaxBytes,
    fields: 0,
  },
  fileFilter(_req, file, callback) {
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      callback(
        new ApiError(415, "Format gambar tidak didukung.", {
          code: ERROR_CODES.UNSUPPORTED_MEDIA_TYPE,
          errors: [
            { field: "image", message: "Gunakan gambar JPEG, PNG, atau WebP." },
          ],
        }),
      );
      return;
    }
    callback(null, true);
  },
}).single("image");

/**
 * MIME dari browser tidak dipercaya. Pemeriksaan magic bytes ini sengaja
 * terbatas pada tiga format yang diterima sehingga tidak memerlukan parser
 * berkas kompleks di jalur request publik.
 */
export function detectImageMime(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length >= png.length && buffer.subarray(0, png.length).equals(png)) {
    return "image/png";
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

export function uploadSingleImage(req, res, next) {
  parser(req, res, (error) => {
    if (error) {
      // Multer melaporkan pelanggaran batas sebagai `MulterError`, dan error
      // itu sudah diterjemahkan di error.middleware. Yang TIDAK ditangani
      // adalah kegagalan parser di bawahnya: busboy melempar Error biasa
      // ("Malformed part header") ketika header multipart rusak — misalnya
      // nama berkas yang memuat null byte, muatan yang lazim dipakai memindai
      // kerentanan. Error biasa berakhir sebagai 500.
      //
      // Itu jawaban yang salah dan mahal: permintaan rusak adalah kesalahan
      // KLIEN, sedangkan 500 berarti "kami yang rusak". Setiap probe murah
      // menghasilkan satu stack trace di log, sehingga insiden sungguhan
      // tenggelam dalam derau yang dikendalikan penyerang.
      if (!(error instanceof ApiError) && error.name !== "MulterError") {
        return next(
          ApiError.badRequest("Permintaan upload tidak dapat dibaca.", [
            { field: "image", message: "Kirim satu gambar pada field 'image'." },
          ]),
        );
      }
      return next(error);
    }

    if (!req.file?.buffer?.length) {
      return next(
        ApiError.validation("Gambar wajib dipilih.", [
          { field: "image", message: "Kirim satu gambar pada field 'image'." },
        ]),
      );
    }

    const detectedMime = detectImageMime(req.file.buffer);
    if (!detectedMime || detectedMime !== req.file.mimetype) {
      return next(
        new ApiError(415, "Isi berkas tidak cocok dengan format gambarnya.", {
          code: ERROR_CODES.UNSUPPORTED_MEDIA_TYPE,
          errors: [
            { field: "image", message: "Gunakan berkas JPEG, PNG, atau WebP yang valid." },
          ],
        }),
      );
    }

    req.file.detectedMime = detectedMime;
    return next();
  });
}
