/**
 * Titik masuk lapisan service.
 *
 * Ekspor bernamespace supaya pemanggil membaca `authService.login()` alih-alih
 * `login()` yang ambigu — ada `login`, `updateUser`, dan `getStats` di lebih
 * dari satu modul.
 */
export * as authService from "./authService";
export * as courseService from "./courseService";
export * as lessonService from "./lessonService";
export * as quizService from "./quizService";
export * as progressService from "./progressService";
export * as userService from "./userService";
export * as adminService from "./adminService";
export { bootstrapSession, onAuthFailure, normalizeError, API_MOCK_MODE } from "./api";

// Layanan AI BISINDO berdiri sendiri — origin berbeda, tanpa sesi SignLearn.
export * as bisindoRecognitionService from "./bisindoRecognitionService";
