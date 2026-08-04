/**
 * Course validators. Return an array of error strings (empty = valid).
 */

export function validateCourse(body) {
  const errors = [];
  if (!body?.title || body.title.trim().length < 3) {
    errors.push("Judul kursus minimal 3 karakter.");
  }
  if (!body?.category) {
    errors.push("Kategori kursus wajib diisi.");
  }
  if (!body?.level) {
    errors.push("Level kursus wajib diisi.");
  }
  return errors;
}

export function validateLesson(body) {
  const errors = [];
  if (!body?.title || body.title.trim().length < 3) {
    errors.push("Judul pelajaran minimal 3 karakter.");
  }
  return errors;
}

export function validateQuiz(body) {
  const errors = [];
  if (!body?.title || body.title.trim().length < 3) {
    errors.push("Judul kuis minimal 3 karakter.");
  }
  return errors;
}
