/**
 * User service — business logic for authentication and user data lifecycle.
 *
 * This is the layer that maps to a future REST API (POST /auth/login,
 * POST /auth/register, GET /users/me, PUT /users/me, ...). Currently it reads
 * from the localStorage repository, but the UI consumes only these functions
 * so swapping to Axios later is a drop-in change.
 */
import {
  getUsers,
  saveUsers,
  findUserByEmail,
  findUserById,
  getCurrentUserId,
  saveCurrentUserId,
  removeCurrentUserId,
  generateUserId,
  defaultLearning,
  defaultSettings,
  defaultProfile,
  normalizeUser,
} from "./userRepository";
import { hashPassword, verifyPassword } from "../utils/password";
import { MIN_PASSING_SCORE } from "../constants/app";

/**
 * Ensure the demo accounts always exist. Runs on app startup.
 * Never overwrites existing demo users — only appends if missing.
 */
export function seedDemoUsers() {
  const users = getUsers();
  const demo = buildDemoUsers();

  let changed = false;
  const merged = [...users];

  for (const d of demo) {
    const existing = findUserByEmail(merged, d.email);
    if (!existing) {
      merged.push(d);
      changed = true;
    }
  }

  if (changed) saveUsers(merged);
  return merged;
}

function buildDemoUsers() {
  return [
    {
      id: "u1",
      name: "Budi Santoso",
      email: "budi@example.com",
      password: "demo-hash-budi", // replaced by hashed value below
      role: "user",
      profileType: "general",
      profile: {
        phone: "081234567890",
        avatar: "BS",
        bio: "Pelajar BISINDO",
      },
      learning: {
        enrolledCourses: ["c1"],
        completedLessons: ["l1-1", "l1-2", "l1-3", "l1-4"],
        unlockedLessons: ["l1-1", "l1-2", "l1-3", "l1-4", "l1-5"],
        quizResults: [
          { lessonId: "l1-1", score: 90, passed: true, date: "2025-07-20" },
          { lessonId: "l1-2", score: 80, passed: true, date: "2025-07-22" },
          { lessonId: "l1-3", score: 75, passed: true, date: "2025-07-24" },
          { lessonId: "l1-4", score: 85, passed: true, date: "2025-07-26" },
        ],
        progress: { c1: { completedLessons: 4 } },
      },
      settings: {
        theme: "light",
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
      },
      joinDate: "2025-01-15",
    },
    {
      id: "a1",
      name: "Admin SignLearn",
      email: "admin@signlearn.id",
      password: "demo-hash-admin", // replaced by hashed value below
      role: "admin",
      profileType: "general",
      profile: {
        phone: "081999000111",
        avatar: "AS",
        bio: "Administrator SignLearn",
      },
      learning: {
        enrolledCourses: [],
        completedLessons: [],
        unlockedLessons: [],
        quizResults: [],
        progress: {},
      },
      settings: {
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
      },
      joinDate: "2024-06-01",
    },
  ];
}

/**
 * Hash the demo users' passwords and persist them. Runs once after seeding
 * so the demo accounts have proper (hashed) passwords.
 */
export async function hashDemoPasswords() {
  const users = getUsers();
  let changed = false;

  const next = await Promise.all(
    users.map(async (u) => {
      if (u.email === "budi@example.com" && u.password === "demo-hash-budi") {
        changed = true;
        return { ...u, password: await hashPassword("password") };
      }
      if (
        u.email === "admin@signlearn.id" &&
        u.password === "demo-hash-admin"
      ) {
        changed = true;
        return { ...u, password: await hashPassword("admin123") };
      }
      return u;
    }),
  );

  if (changed) saveUsers(next);
  return next;
}

/** Login a user by email + password. Returns { success, message, user } */
export async function authenticate(email, password) {
  const users = getUsers();
  const user = findUserByEmail(users, email);

  if (!user) {
    return { success: false, message: "Email atau kata sandi salah." };
  }

  // If the stored password is the legacy demo marker, treat as verified once.
  const valid =
    (await verifyPassword(password, user.password)) ||
    (user.password === "demo-hash-budi" && password === "password") ||
    (user.password === "demo-hash-admin" && password === "admin123");

  if (!valid) {
    return { success: false, message: "Email atau kata sandi salah." };
  }

  saveCurrentUserId(user.id);
  return { success: true, message: "", user: normalizeUser(user) };
}

/** Logout — clears auth only, never deletes users/data. */
export function logoutUser() {
  removeCurrentUserId();
}

/** Register a brand-new user. Never overwrites existing users. */
export async function registerUser({ name, email, password, profile }) {
  const users = getUsers();

  if (findUserByEmail(users, email)) {
    return { success: false, message: "Email sudah terdaftar." };
  }

  const newUser = normalizeUser({
    id: generateUserId(),
    name,
    email,
    password: await hashPassword(password),
    role: "user",
    profileType: profile || "general",
    profile: {
      ...defaultProfile(),
      avatar: name.slice(0, 2).toUpperCase(),
    },
    learning: defaultLearning(),
    settings: defaultSettings(),
    joinDate: new Date().toISOString().split("T")[0],
  });

  saveUsers([...users, newUser]);
  return { success: true, message: "", user: newUser };
}

/** Read the currently authenticated user (full object). */
export function getCurrentUser() {
  const id = getCurrentUserId();
  if (!id) return null;
  const users = getUsers();
  const user = findUserById(users, id);
  return user ? normalizeUser(user) : null;
}

/** Read a user by id (full object). */
export function getUserById(id) {
  const users = getUsers();
  const user = findUserById(users, id);
  return user ? normalizeUser(user) : null;
}

/** Update a single user's list (persist whole collection). */
export function updateUser(updatedUser) {
  const users = getUsers();
  const next = users.map((u) =>
    u.id === updatedUser.id ? normalizeUser(updatedUser) : u,
  );
  saveUsers(next);
  return normalizeUser(updatedUser);
}

/** Persist a user's own learning state (progress, quiz, unlocks). */
export function saveUserLearning(userId, learning) {
  const users = getUsers();
  const next = users.map((u) => (u.id === userId ? { ...u, learning } : u));
  saveUsers(next);
}

/** Persist a user's own settings. */
export function saveUserSettings(userId, settings) {
  const users = getUsers();
  const next = users.map((u) => (u.id === userId ? { ...u, settings } : u));
  saveUsers(next);
}

/** Persist a user's own profile. */
export function saveUserProfile(userId, profile) {
  const users = getUsers();
  const next = users.map((u) => (u.id === userId ? { ...u, profile } : u));
  saveUsers(next);
}

export { MIN_PASSING_SCORE };
