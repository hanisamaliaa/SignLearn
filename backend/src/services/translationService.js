import * as repository from "../repositories/translationRepository.js";
import { ApiError } from "../utils/ApiError.js";
import { paginate, meta } from "../utils/pagination.js";
import { normalizeWord } from "../utils/normalizeWord.js";

function clean(data) {
  const result = {};
  if (data.word !== undefined) {
    result.word = data.word.trim();
    result.normalizedWord = normalizeWord(data.word);
  }
  if (data.translation !== undefined) result.translation = data.translation.trim();
  if (data.description !== undefined) result.description = data.description?.trim() || null;
  if (data.category !== undefined) result.category = data.category?.trim() || "Umum";
  if (data.status !== undefined) result.status = data.status;
  if (data.signImage !== undefined) result.signImage = data.signImage?.trim() || null;
  if (data.signVideo !== undefined) result.signVideo = data.signVideo?.trim() || null;
  if (data.aliases !== undefined) result.aliases = data.aliases.map(normalizeWord).filter(Boolean);
  return result;
}

export async function list(filters = {}, options = {}, viewer = null) {
  const { page, limit, offset } = paginate(options);
  const activeOnly = viewer?.role !== "admin";
  const total = await repository.count(filters, activeOnly);
  const items = await repository.findAll(filters, { limit, offset, activeOnly });
  return { items, pagination: meta(page, limit, total) };
}

export async function getById(id, viewer = null) {
  const item = await repository.findById(id, viewer?.role !== "admin");
  if (!item) throw ApiError.notFound("Kata BISINDO tidak ditemukan.");
  return item;
}

export async function lookup(word) {
  const normalized = normalizeWord(word);
  const item = await repository.findExact(normalized);
  if (!item) throw ApiError.notFound("Kata ini belum tersedia di Bank BISINDO kami.");
  return item;
}

export async function categories(viewer = null) {
  return repository.listCategories(viewer?.role !== "admin");
}

export async function create(data) {
  try {
    return await repository.create({
      category: "Umum", status: "active", description: null,
      signImage: null, signVideo: null, aliases: [], ...clean(data),
    });
  } catch (error) {
    if (error.code === "23505") throw ApiError.conflict("Kata atau alias tersebut sudah tersedia.");
    throw error;
  }
}

export async function update(id, data) {
  if (!await repository.findById(id)) throw ApiError.notFound("Kata BISINDO tidak ditemukan.");
  try {
    return await repository.update(id, clean(data));
  } catch (error) {
    if (error.code === "23505") throw ApiError.conflict("Kata atau alias tersebut sudah tersedia.");
    throw error;
  }
}

export async function remove(id) {
  if (!await repository.remove(id)) throw ApiError.notFound("Kata BISINDO tidak ditemukan.");
}
