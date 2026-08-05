import * as courseRepository from "../repositories/courseRepository.js";

export async function getAllCourses() {
  return await courseRepository.findAll();
}

export async function getCourseById(id) {
  return await courseRepository.findById(id);
}

export async function createCourse(data) {
  return await courseRepository.create(data);
}

export async function updateCourse(id, data) {
  return await courseRepository.update(id, data);
}

export async function deleteCourse(id) {
  await courseRepository.remove(id);
}
