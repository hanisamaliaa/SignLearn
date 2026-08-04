/**
 * Course service — derives per-user course state from the user's learning
 * data. This maps to a future REST API (GET /courses, GET /courses/:id)
 * where the backend returns the user's personalized course state.
 */
import { COURSES as BASE_COURSES } from "../data/mock";

/**
 * Build the course catalog personalized for a given user's learning state.
 * Each lesson's status is derived from the user's completed/unlocked lessons.
 *
 * @param {object} user - the current user (with user.learning)
 * @returns {Array} list of courses with per-lesson status for this user
 */
export function getUserCourses(user) {
  const learning = user?.learning || {};
  const completedLessons = learning.completedLessons || [];
  const unlocked = learning.unlockedLessons || [];
  const progress = learning.progress || {};

  return BASE_COURSES.map((course) => {
    let completedCount = 0;

    const lessons = (course.lessons || []).map((lesson, idx) => {
      let status;
      if (completedLessons.includes(lesson.id)) {
        status = "completed";
        completedCount += 1;
      } else if (unlocked.includes(lesson.id) || idx === 0) {
        status = "current";
      } else {
        status = "locked";
      }
      return { ...lesson, status };
    });

    const courseProgress = progress[course.id];
    const completedLessonCount =
      courseProgress?.completedLessons ?? completedCount;

    return {
      ...course,
      lessons,
      completedLessons: completedLessonCount,
      isLocked: course.isLocked,
    };
  });
}

/** Get a single personalized course by id. */
export function getUserCourseById(user, courseId) {
  const courses = getUserCourses(user);
  return courses.find((c) => c.id === courseId) || courses[0] || null;
}

/** Get the list of quiz results for a user, enriched with course/lesson names. */
export function getUserQuizHistory(user, quizResults) {
  const results = quizResults || user?.learning?.quizResults || [];
  const courses = getUserCourses(user);

  return results.map((r, idx) => {
    const course = courses.find((c) =>
      (c.lessons || []).some((l) => l.id === r.lessonId),
    );
    const lesson = course?.lessons?.find((l) => l.id === r.lessonId);
    return {
      id: `qr_${idx}`,
      lesson: lesson?.title || r.lessonId,
      course: course?.title || "Kursus",
      score: r.score,
      date: r.date,
      passed: r.passed,
    };
  });
}

/** Compute per-user dashboard stats. */
export function getUserStats(user) {
  const courses = getUserCourses(user);
  const learning = user?.learning || {};
  const quizResults = learning.quizResults || [];

  const completedLessons = courses.reduce(
    (s, c) => s + (c.completedLessons || 0),
    0,
  );
  const totalLessons = courses.reduce((s, c) => s + (c.totalLessons || 0), 0);
  const passed = quizResults.filter((q) => q.passed);
  const avgScore = passed.length
    ? Math.round(passed.reduce((s, q) => s + q.score, 0) / passed.length)
    : 0;

  return {
    completedLessons,
    totalLessons,
    overallPct: totalLessons
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0,
    quizResults,
    avgScore,
    passedQuizzes: passed.length,
    activeCourses: courses.filter(
      (c) => !c.isLocked && c.completedLessons < c.totalLessons,
    ).length,
  };
}
