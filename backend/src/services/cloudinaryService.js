import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { ERROR_CODES } from "../constants/errorCodes.js";

if (env.cloudinary.enabled) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
}

export function isCloudinaryConfigured() {
  return env.cloudinary.enabled;
}

export function createPublicId(collection, resourceId) {
  const safeCollection = String(collection).replace(/[^a-zA-Z0-9_-]/g, "");
  const safeResourceId = String(resourceId).replace(/[^a-zA-Z0-9_-]/g, "");
  return `${env.cloudinary.folder}/${safeCollection}/${safeResourceId}/${randomUUID()}`;
}

function requireConfigured(client) {
  if (!env.cloudinary.enabled && client === cloudinary) {
    throw new ApiError(503, "Layanan upload gambar belum dikonfigurasi.", {
      code: ERROR_CODES.MEDIA_NOT_CONFIGURED,
    });
  }
}

function compactResult(result) {
  if (
    !result?.public_id ||
    !result?.secure_url ||
    !String(result.secure_url).startsWith("https://")
  ) {
    throw new Error("Cloudinary tidak mengembalikan secure_url yang valid.");
  }

  return {
    publicId: result.public_id,
    secureUrl: result.secure_url,
    width: Number(result.width) || null,
    height: Number(result.height) || null,
    format: result.format || null,
    bytes: Number(result.bytes) || null,
  };
}

/** Upload signed server-side; API secret tidak pernah mencapai browser. */
export function uploadImage(
  buffer,
  { publicId, maxWidth = 2400, maxHeight = 2400 } = {},
  client = cloudinary,
) {
  requireConfigured(client);

  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        resource_type: "image",
        type: "upload",
        public_id: publicId,
        overwrite: false,
        unique_filename: false,
        use_filename: false,
        invalidate: true,
        transformation: [
          { width: maxWidth, height: maxHeight, crop: "limit", quality: "auto:good" },
        ],
      },
      (error, result) => {
        if (error) {
          reject(
            new ApiError(502, "Gambar gagal diunggah ke penyimpanan media.", {
              code: ERROR_CODES.MEDIA_UPLOAD_FAILED,
            }),
          );
          return;
        }

        try {
          resolve(compactResult(result));
        } catch {
          reject(
            new ApiError(502, "Respons penyimpanan media tidak valid.", {
              code: ERROR_CODES.MEDIA_UPLOAD_FAILED,
            }),
          );
        }
      },
    );

    stream.on?.("error", () => {
      reject(
        new ApiError(502, "Koneksi ke penyimpanan media terputus.", {
          code: ERROR_CODES.MEDIA_UPLOAD_FAILED,
        }),
      );
    });
    stream.end(buffer);
  });
}

export async function destroyImage(publicId, client = cloudinary) {
  if (!publicId) return { result: "not_found" };
  requireConfigured(client);
  return client.uploader.destroy(publicId, {
    resource_type: "image",
    type: "upload",
    invalidate: true,
  });
}

/** Cleanup tidak boleh membalikkan mutasi database yang sudah berhasil. */
export async function destroyImageBestEffort(publicId, client = cloudinary) {
  if (!publicId) return;
  try {
    await destroyImage(publicId, client);
  } catch (error) {
    console.error(`[media] Gagal menghapus aset Cloudinary ${publicId}:`, error.message);
  }
}
