/**
 * Application-wide constants for SignLearn.
 * Centralizes business rules so they can be consumed by both UI and services.
 */

// Quiz passing score (KKM — Kriteria Ketuntasan Minimal)
export const MIN_PASSING_SCORE = 70;

// Quiz focus mode timer (seconds)
export const QUIZ_DURATION_SECONDS = 5 * 60; // 5 minutes

// Application meta
export const APP_NAME = "SignLearn";
export const APP_TAGLINE = "Platform Belajar BISINDO";

// Roles
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
};

// Learning profile labels
export const PROFILE_LABELS = {
  parent: "Orang Tua dengan Anak Tunarungu",
  deaf: "Penyandang Tunarungu/Gangguan Pendengaran",
  general: "Pelajar Umum",
};

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: "authToken",
  CURRENT_USER: "signlearn.currentUser", // legacy (replaced by CURRENT_USER_ID)
  CURRENT_USER_ID: "signlearn.currentUserId",
  USERS: "signlearn.users",
};

// Backend API base URL (fallback for local dev)
export const API_DEFAULT_BASE_URL = "http://localhost:5000/api";

// Feature placeholders
export const AI_SUBTITLE_PLACEHOLDER =
  "AI subtitle generation is not implemented yet.";
export const AI_QUIZ_GENERATOR_PLACEHOLDER =
  "AI quiz generation is not implemented yet.";
