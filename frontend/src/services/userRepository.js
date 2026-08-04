/**
 * User repository — the single source of truth for reading/writing the
 * users collection in localStorage.
 *
 * This is the abstraction layer that later maps 1:1 to a REST API
 * (GET /users/me, PUT /users/me, ...). Swapping localStorage for Axios only
 * requires changing this file — the UI/context never calls storage directly.
 */
import { getItem, setItem } from "../utils/storage";
import { STORAGE_KEYS } from "../constants/app";

/** Default learning state for a brand-new user (0% progress). */
export function defaultLearning() {
  return {
    enrolledCourses: [],
    completedLessons: [],
    unlockedLessons: [],
    quizResults: [],
    progress: {}, // { courseId: { completedLessons: number } }
  };
}

/** Default settings for a new user. */
export function defaultSettings() {
  return {
    theme: "system",
    fontSize: 16,
    notifications: {
      quizReminder: true,
      streakReminder: true,
      newContent: true,
      weeklyReport: false,
      email: true,
    },
    accessibility: {
      reducedMotion: false,
      highContrast: false,
      showSubtitles: true,
    },
  };
}

/** Default profile for a new user. */
export function defaultProfile() {
  return {
    phone: "",
    avatar: "",
    bio: "",
  };
}

/** Build a complete, validated user object. Merges stored + defaults. */
export function normalizeUser(raw) {
  if (!raw) return raw;
  return {
    id: raw.id,
    name: raw.name || "",
    email: raw.email || "",
    password: raw.password || "",
    role: raw.role || "user",
    profileType: raw.profileType || raw.profile || "general",
    profile: {
      ...defaultProfile(),
      ...raw.profile,
    },
    learning: {
      ...defaultLearning(),
      ...raw.learning,
      progress: raw.learning?.progress || {},
    },
    settings: {
      ...defaultSettings(),
      ...raw.settings,
      notifications: {
        ...defaultSettings().notifications,
        ...raw.settings?.notifications,
      },
      accessibility: {
        ...defaultSettings().accessibility,
        ...raw.settings?.accessibility,
      },
    },
    joinDate: raw.joinDate || new Date().toISOString().split("T")[0],
  };
}

/** Read all users from storage. */
export function getUsers() {
  const stored = getItem(STORAGE_KEYS.USERS);
  if (!Array.isArray(stored)) return [];
  return stored.map(normalizeUser);
}

/** Persist the full users collection. */
export function saveUsers(users) {
  setItem(STORAGE_KEYS.USERS, users);
}

/** Find a user by email. */
export function findUserByEmail(users, email) {
  if (!email) return undefined;
  return users.find(
    (u) => u.email.toLowerCase() === String(email).toLowerCase(),
  );
}

/** Find a user by id. */
export function findUserById(users, id) {
  return users.find((u) => u.id === id);
}

/** Read the currently authenticated user id. */
export function getCurrentUserId() {
  return getItem(STORAGE_KEYS.CURRENT_USER_ID);
}

/** Persist the current authenticated user id. */
export function saveCurrentUserId(id) {
  if (id) setItem(STORAGE_KEYS.CURRENT_USER_ID, id);
}

/** Clear the current authenticated user id. */
export function removeCurrentUserId() {
  setItem(STORAGE_KEYS.CURRENT_USER_ID, null);
}

/** Generate a unique id. */
export function generateUserId() {
  return `u${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
