import { asyncHandler } from "../utils/asyncHandler.js";
import { success, created } from "../utils/apiResponse.js";
import * as service from "../services/translationService.js";
import * as mediaService from "../services/mediaService.js";

export const list = asyncHandler(async (req, res) => {
  const result = await service.list(
    { q: req.query.q, category: req.query.category, status: req.query.status },
    { page: req.query.page, limit: req.query.limit },
    req.user,
  );
  success(res, result, "Bank kata berhasil diambil.");
});

export const categories = asyncHandler(async (req, res) => {
  success(res, { items: await service.categories(req.user) });
});

export const lookup = asyncHandler(async (req, res) => {
  success(res, { translation: await service.lookup(req.query.word) }, "Gerakan BISINDO ditemukan.");
});

export const getById = asyncHandler(async (req, res) => {
  success(res, { translation: await service.getById(req.params.id, req.user) });
});

export const createItem = asyncHandler(async (req, res) => {
  created(res, { translation: await service.create(req.body) }, "Kata BISINDO berhasil ditambahkan.");
});

export const updateItem = asyncHandler(async (req, res) => {
  success(res, { translation: await service.update(req.params.id, req.body) }, "Kata BISINDO berhasil diperbarui.");
});

export const uploadImage = asyncHandler(async (req, res) => {
  const { resource: translation, asset } = await mediaService.replaceTranslationImage(
    req.params.id,
    req.file,
  );
  success(res, { translation, asset }, "Gambar bank kata berhasil diunggah.");
});

export const deleteItem = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  success(res, null, "Kata BISINDO berhasil dihapus.");
});
