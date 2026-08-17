import { request } from "./api";
import { uploadImage } from "./mediaService";

export async function getTranslations(params = {}) {
  return request({ url: "/translations", params });
}

export async function getTranslation(id) {
  const payload = await request({ url: `/translations/${id}` });
  return payload.translation;
}

export async function lookupTranslation(word) {
  const payload = await request({ url: "/translations/lookup", params: { word } });
  return payload.translation;
}

export async function getCategories() {
  const payload = await request({ url: "/translations/categories" });
  return payload.items;
}

export async function createTranslation(data) {
  const payload = await request({ method: "post", url: "/translations", data });
  return payload.translation;
}

export async function updateTranslation(id, data) {
  const payload = await request({ method: "put", url: `/translations/${id}`, data });
  return payload.translation;
}

export async function uploadTranslationImage(id, file) {
  const payload = await uploadImage(`/translations/${id}/image`, file);
  return payload.translation;
}

export async function deleteTranslation(id) {
  return request({ method: "delete", url: `/translations/${id}` });
}
