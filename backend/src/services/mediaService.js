import * as userRepository from "../repositories/userRepository.js";
import * as courseRepository from "../repositories/courseRepository.js";
import * as translationRepository from "../repositories/translationRepository.js";
import { ApiError } from "../utils/ApiError.js";
import { ERROR_CODES } from "../constants/errorCodes.js";
import {
  createPublicId,
  destroyImageBestEffort,
  uploadImage,
} from "./cloudinaryService.js";

export async function replaceMedia({
  file,
  collection,
  resourceId,
  maxWidth,
  maxHeight,
  findCurrent,
  persist,
  notFoundMessage,
}, dependencies = {}) {
  const upload = dependencies.uploadImage ?? uploadImage;
  const makePublicId = dependencies.createPublicId ?? createPublicId;
  const destroy = dependencies.destroyImageBestEffort ?? destroyImageBestEffort;
  const current = await findCurrent(resourceId);
  if (!current) throw ApiError.notFound(notFoundMessage);

  const asset = await upload(file.buffer, {
    publicId: makePublicId(collection, resourceId),
    maxWidth,
    maxHeight,
  });

  let resource;
  try {
    resource = await persist(
      resourceId,
      asset.secureUrl,
      asset.publicId,
      current.publicId,
    );
    if (!resource) {
      throw ApiError.conflict(
        "Gambar baru saja diubah dari perangkat lain. Muat ulang lalu coba lagi.",
        ERROR_CODES.STALE_RESOURCE,
      );
    }
  } catch (error) {
    await destroy(asset.publicId);
    throw error;
  }

  await destroy(current.publicId);
  return { resource, asset };
}

export function replaceProfileAvatar(userId, file) {
  return replaceMedia({
    file,
    collection: "profile-avatars",
    resourceId: userId,
    maxWidth: 1200,
    maxHeight: 1200,
    findCurrent: userRepository.findAvatarMedia,
    persist: userRepository.updateAvatarMedia,
    notFoundMessage: "Pengguna tidak ditemukan.",
  });
}

export function replaceCourseThumbnail(courseId, file) {
  return replaceMedia({
    file,
    collection: "course-thumbnails",
    resourceId: courseId,
    maxWidth: 2400,
    maxHeight: 1350,
    findCurrent: courseRepository.findThumbnailMedia,
    persist: courseRepository.updateThumbnailMedia,
    notFoundMessage: "Kursus tidak ditemukan.",
  });
}

export function replaceTranslationImage(translationId, file) {
  return replaceMedia({
    file,
    collection: "word-bank",
    resourceId: translationId,
    maxWidth: 2000,
    maxHeight: 2000,
    findCurrent: translationRepository.findImageMedia,
    persist: translationRepository.updateImageMedia,
    notFoundMessage: "Kata BISINDO tidak ditemukan.",
  });
}
