/**
 * Quiz service — handles quiz submission and the unlock logic (pass ≥ 70).
 * Maps to future POST /quiz/submit.
 */
import { MIN_PASSING_SCORE } from "../constants/app";
import { getUserCourses } from "./courseService";
import { getUserById } from "./userService";

/**
 * Record a quiz result for a user and, if passed, unlock the next lesson
 * and mark the current lesson complete. Returns updated learning state.
 *
 * @param {string} userId
 * @param {string} lessonId
 * @param {number} score
 * @returns {{ passed: boolean, learning: object }}
 */
export function submitQuiz(userId, lessonId, score) {
  const user = getUserById(userId);
  if (!user) return { passed: false, learning: null };

  const learning = {
    ...user.learning,
    completedLessons: [...(user.learning.completedLessons || [])],
    unlockedLessons: [...(user.learning.unlockedLessons || [])],
    quizResults: [...(user.learning.quizResults || [])],
    progress: { ...(user.learning.progress || {}) },
  };

  const passed = score >= MIN_PASSING_SCORE;
  const date = new Date().toISOString().split("T")[0];

  // Always record the quiz result.
  learning.quizResults.push({ lessonId, score, passed, date });

  if (passed) {
    // Mark current lesson complete if not already.
    if (!learning.completedLessons.includes(lessonId)) {
      learning.completedLessons.push(lessonId);
    }

    // Find the next lesson in the course and unlock it.
    const courses = getUserCourses(user);
    const course = courses.find((c) =>
      (c.lessons || []).some((l) => l.id === lessonId),
    );
    if (course && course.lessons) {
      const idx = course.lessons.findIndex((l) => l.id === lessonId);
      const next = course.lessons[idx + 1];
      if (next && !learning.unlockedLessons.includes(next.id)) {
        learning.unlockedLessons.push(next.id);
      }
    }

    // Update per-course progress.
    const courseForProgress = courses.find((c) =>
      (c.lessons || []).some((l) => l.id === lessonId),
    );
    if (courseForProgress) {
      const completedCount = learning.completedLessons.filter((id) =>
        (courseForProgress.lessons || []).some((l) => l.id === id),
      ).length;
      learning.progress[courseForProgress.id] = {
        completedLessons: completedCount,
      };
    }
  }

  return { passed, learning };
}
