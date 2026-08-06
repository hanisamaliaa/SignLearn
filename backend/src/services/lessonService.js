import * as lessonRepository from "../repositories/lessonRepository.js";

export const getAllLessons = async () => {
  return await lessonRepository.getAllLessons();
};

export async function getLessonsByCourse(courseId) {
  return await lessonRepository.findByCourseId(courseId);
}

export async function getLessonById(id) {
  return await lessonRepository.findById(id);
}

export async function createLesson(data) {
  return await lessonRepository.create(data);
}

export async function updateLesson(id, data) {
  return await lessonRepository.update(id, data);
}

export async function deleteLesson(id) {
  await lessonRepository.remove(id);
}
