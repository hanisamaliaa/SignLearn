export const IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_UPLOAD_ACCEPT = "image/jpeg,image/png,image/webp";
export const IMAGE_UPLOAD_TYPES = Object.freeze(IMAGE_UPLOAD_ACCEPT.split(","));

export class ImageValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ImageValidationError";
    this.status = 422;
    this.code = "VALIDATION_FAILED";
    this.errors = [{ field: "image", message }];
  }
}

export function validateImageFile(file) {
  if (!file || typeof file !== "object") {
    throw new ImageValidationError("Pilih satu gambar terlebih dahulu.");
  }
  if (!IMAGE_UPLOAD_TYPES.includes(file.type)) {
    throw new ImageValidationError("Gunakan gambar JPEG, PNG, atau WebP.");
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw new ImageValidationError("Berkas gambar kosong atau tidak dapat dibaca.");
  }
  if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
    throw new ImageValidationError("Ukuran gambar maksimal 5 MB.");
  }
  return file;
}
