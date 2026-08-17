import { request } from "./api";
import { validateImageFile } from "../features/media/imageUpload";

export async function uploadImage(url, file) {
  validateImageFile(file);
  const form = new FormData();
  form.append("image", file);
  // Jangan set Content-Type manual: browser menambahkan boundary multipart.
  return request({ method: "post", url, data: form, timeout: 30_000 });
}
