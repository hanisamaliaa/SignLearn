import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  seedDemoUsers,
  hashDemoPasswords,
  authenticate,
  logoutUser,
  registerUser,
  getCurrentUser,
  updateUser,
  saveUserLearning,
  saveUserSettings,
} from "../services/userService";
import {
  getUserCourses,
  getUserCourseById,
  getUserQuizHistory,
  getUserStats,
} from "../services/courseService";
import { submitQuiz } from "../services/quizService";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const navigate = useNavigate();

  // Seed demo accounts on first load (idempotent — never overwrites).
  const [users, setUsers] = useState(() => seedDemoUsers());
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [quizScore, setQuizScore] = useState(null);
  const [quizPassed, setQuizPassed] = useState(null);

  // Hash demo passwords once after seeding (async, idempotent).
  useEffect(() => {
    hashDemoPasswords();
  }, []);

  // ----- Derived per-user data -----
  const courses = useMemo(
    () => (currentUser ? getUserCourses(currentUser) : []),
    [currentUser],
  );
  const quizHistory = useMemo(
    () => (currentUser ? getUserQuizHistory(currentUser) : []),
    [currentUser],
  );
  const stats = useMemo(
    () => (currentUser ? getUserStats(currentUser) : null),
    [currentUser],
  );

  const login = useCallback(
    async (email, password) => {
      const result = await authenticate(email, password);
      if (!result.success) return result;
      setCurrentUser(result.user);
      navigate(
        result.user.role === "admin" ? "/admin/dashboard" : "/dashboard",
      );
      return { success: true, message: "" };
    },
    [navigate],
  );

  const logout = useCallback(() => {
    logoutUser();
    setCurrentUser(null);
    navigate("/");
  }, [navigate]);

  const register = useCallback(async (data) => {
    const result = await registerUser(data);
    if (!result.success) return false;
    // Refresh the users list so admin console sees the new user.
    setUsers(seedDemoUsers());
    return true;
  }, []);

  const updateProfile = useCallback((data) => {
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        name: data.name ?? prev.name,
        email: data.email ?? prev.email,
        profileType: data.profileType ?? prev.profileType,
        profile: {
          ...prev.profile,
          phone: data.profile?.phone ?? data.phone ?? prev.profile?.phone,
          avatar: data.profile?.avatar ?? data.avatar ?? prev.profile?.avatar,
          bio: data.profile?.bio ?? data.bio ?? prev.profile?.bio,
        },
      };
      // Persist full user (name/email/profileType/profile) via updateUser.
      updateUser(next);
      return next;
    });
  }, []);

  /** Persist a user's own settings (theme, fontSize, notifications, ...). */
  const updateUserSettings = useCallback((settings) => {
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, settings };
      saveUserSettings(next.id, next.settings);
      return next;
    });
  }, []);

  /** Record quiz result & unlock next lesson (per user only). */
  const recordQuizResult = useCallback((lessonId, score) => {
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const { learning } = submitQuiz(prev.id, lessonId, score);
      if (!learning) return prev;
      saveUserLearning(prev.id, learning);
      return { ...prev, learning };
    });
    return score >= 70;
  }, []);

  const setSelectedCourse = useCallback((id) => {
    setSelectedCourseId(id);
  }, []);

  const setSelectedLesson = useCallback((id) => {
    setSelectedLessonId(id);
  }, []);

  const setQuizResult = useCallback((score) => {
    setQuizScore(score);
    setQuizPassed(score >= 70);
  }, []);

  /** Mark a lesson as watched/completed (per user only). */
  const completeLesson = useCallback(
    (lessonId) => {
      setCurrentUser((prev) => {
        if (!prev) return prev;
        const learning = {
          ...prev.learning,
          completedLessons: [...(prev.learning.completedLessons || [])],
          unlockedLessons: [...(prev.learning.unlockedLessons || [])],
          progress: { ...prev.learning.progress },
        };
        if (!learning.completedLessons.includes(lessonId)) {
          learning.completedLessons.push(lessonId);
        }
        // Unlock the next lesson in the same course.
        const course = courses.find((c) =>
          (c.lessons || []).some((l) => l.id === lessonId),
        );
        if (course && course.lessons) {
          const idx = course.lessons.findIndex((l) => l.id === lessonId);
          const next = course.lessons[idx + 1];
          if (next && !learning.unlockedLessons.includes(next.id)) {
            learning.unlockedLessons.push(next.id);
          }
          const completedCount = learning.completedLessons.filter((id) =>
            (course.lessons || []).some((l) => l.id === id),
          ).length;
          learning.progress[course.id] = { completedLessons: completedCount };
        }
        saveUserLearning(prev.id, learning);
        return { ...prev, learning };
      });
    },
    [courses],
  );

  const selectedCourse = useMemo(
    () =>
      currentUser ? getUserCourseById(currentUser, selectedCourseId) : null,
    [currentUser, selectedCourseId],
  );

  const value = useMemo(
    () => ({
      currentUser,
      users,
      courses,
      quizHistory,
      stats,
      selectedCourseId,
      selectedLessonId,
      selectedCourse,
      quizScore,
      quizPassed,
      navigate,
      login,
      logout,
      register,
      updateProfile,
      updateUserSettings,
      recordQuizResult,
      completeLesson,
      setSelectedCourse,
      setSelectedLesson,
      setQuizResult,
    }),
    [
      currentUser,
      users,
      courses,
      quizHistory,
      stats,
      selectedCourseId,
      selectedLessonId,
      selectedCourse,
      quizScore,
      quizPassed,
      navigate,
      login,
      logout,
      register,
      updateProfile,
      updateUserSettings,
      recordQuizResult,
      completeLesson,
      setSelectedCourse,
      setSelectedLesson,
      setQuizResult,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
