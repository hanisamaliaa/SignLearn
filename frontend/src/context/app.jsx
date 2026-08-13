import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import * as authService from "../services/authService";
import * as courseService from "../services/courseService";
import * as progressService from "../services/progressService";
import * as quizService from "../services/quizService";
import * as userService from "../services/userService";
import { bootstrapSession, onAuthFailure, normalizeError } from "../services/api";

/**
 * State aplikasi — satu-satunya jembatan antara halaman dan backend.
 *
 * Versi sebelumnya menyimpan SELURUH state di localStorage: daftar pengguna,
 * kata sandi, progres belajar, hasil kuis. Aplikasinya berjalan sepenuhnya di
 * perangkat, jadi progres hilang saat ganti browser, dan "kelulusan kuis"
 * hanyalah angka di localStorage yang dapat disunting siapa pun lewat DevTools.
 *
 * Sekarang seluruhnya berasal dari API. Bentuk yang diekspor sengaja
 * dipertahankan persis supaya halaman-halaman tidak perlu ditulis ulang.
 */

const AppContext = createContext(null);

/**
 * `profileType` adalah alias untuk `profile` — KUNCI enumnya, bukan labelnya.
 *
 * Halaman memetakan sendiri kunci itu ke teks tampilan lewat tabelnya
 * masing-masing, jadi menaruh label di sini justru memecahkan keduanya.
 */
function toUiUser(user) {
  if (!user) return null;
  return { ...user, profileType: user.profile ?? "general" };
}

/**
 * Meratakan blok `progress` ke badan kursus.
 *
 * API mengembalikan `course.progress.completedLessons` (§8.1), sedangkan
 * seluruh halaman membaca `course.completedLessons`. Perataan dilakukan di
 * satu tempat ini, bukan di enam halaman.
 */
function toUiCourse(course) {
  return {
    ...course,
    completedLessons: course.progress?.completedLessons ?? 0,
    percent: course.progress?.percent ?? 0,
    lastAccessedAt: course.progress?.lastAccessedAt ?? null,
  };
}

/**
 * Menggabungkan detail kursus dengan status akses tiap pelajaran.
 *
 * Halaman Lesson.jsx mencari pelajaran berstatus "current", jadi tepat satu
 * pelajaran harus menyandangnya: yang pertama belum selesai DAN sudah terbuka.
 */
function mergeCourseAccess(detail, access) {
  if (!detail) return null;

  const byId = new Map((access ?? []).map((a) => [a.id, a]));
  let currentAssigned = false;

  const lessons = (detail.lessons ?? []).map((lesson) => {
    const a = byId.get(lesson.id);
    const status = a?.status ?? lesson.status ?? "not_started";
    const isAccessible = a?.isAccessible ?? true;

    let uiStatus = status;
    if (!isAccessible) {
      uiStatus = "locked";
    } else if (!currentAssigned && status !== "completed") {
      uiStatus = "current";
      currentAssigned = true;
    }

    return {
      ...lesson,
      status: uiStatus,
      rawStatus: status,
      isAccessible,
      lockReason: a?.lockReason ?? null,
      lockMessage: a?.lockMessage ?? null,
    };
  });

  return { ...toUiCourse(detail.course), lessons, quizzes: detail.quizzes ?? [] };
}

export function AppProvider({ children }) {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [progress, setProgress] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [selectedCourse, setSelectedCourseDetail] = useState(null);
  const [quizScore, setQuizScore] = useState(null);
  const [quizPassed, setQuizPassed] = useState(null);

  // ─── Pemuatan data ─────────────────────────────────────────────────────

  const loadLearnerData = useCallback(async () => {
    // Paralel: ketiganya tidak saling bergantung.
    const [courseList, dash, prog] = await Promise.all([
      courseService.getCourses({ limit: 100 }).catch(() => ({ items: [] })),
      progressService.getDashboard().catch(() => null),
      progressService.getUserProgress().catch(() => null),
    ]);
    setCourses((courseList?.items ?? []).map(toUiCourse));
    setDashboard(dash);
    setProgress(prog);
  }, []);

  const loadAdminData = useCallback(async () => {
    const [courseList, userList] = await Promise.all([
      courseService.getCourses({ limit: 100 }).catch(() => ({ items: [] })),
      userService.getUsers({ limit: 100 }).catch(() => ({ items: [] })),
    ]);
    setCourses((courseList?.items ?? []).map(toUiCourse));
    setUsers(userList?.items ?? []);
  }, []);

  const loadFor = useCallback(
    async (user) => {
      if (!user) return;
      if (user.role === "admin") await loadAdminData();
      else await loadLearnerData();
    },
    [loadAdminData, loadLearnerData],
  );

  /**
   * Memulihkan sesi saat aplikasi dimuat.
   *
   * Access token hidup di memori dan hilang setiap reload; cookie refresh
   * tidak. Tanpa langkah ini pengguna terlempar ke halaman masuk hanya karena
   * menekan F5 — satu-satunya harga dari tidak menyimpan token di localStorage.
   */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const user = await bootstrapSession();
      if (cancelled) return;

      if (user) {
        setCurrentUser(toUiUser(user));
        await loadFor(user);
      }
      if (!cancelled) setBooting(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [loadFor]);

  /** Sesi benar-benar habis (refresh gagal) — bersihkan dan minta masuk lagi. */
  useEffect(() => {
    onAuthFailure(() => {
      setCurrentUser(null);
      setCourses([]);
      setDashboard(null);
      setProgress(null);
      navigate("/login");
    });
  }, [navigate]);

  // ─── Autentikasi ───────────────────────────────────────────────────────

  const login = useCallback(
    async (email, password) => {
      try {
        const user = await authService.login(email, password);
        setCurrentUser(toUiUser(user));
        await loadFor(user);
        navigate(user.role === "admin" ? "/admin/dashboard" : "/dashboard");
        return { success: true, message: "" };
      } catch (error) {
        const e = normalizeError(error);
        return { success: false, message: e.message, code: e.code, errors: e.errors };
      }
    },
    [loadFor, navigate],
  );

  const register = useCallback(
    async (data) => {
      try {
        const user = await authService.register(data);
        setCurrentUser(toUiUser(user));
        await loadFor(user);
        return { success: true, message: "" };
      } catch (error) {
        const e = normalizeError(error);
        return { success: false, message: e.message, code: e.code, errors: e.errors };
      }
    },
    [loadFor],
  );

  /**
   * Keluar.
   *
   * Pembersihan sesi di klien BERJALAN APA PUN hasil panggilan jaringannya.
   *
   * Versi sebelumnya menulis `await authService.logout()` tanpa penjagaan, jadi
   * kegagalan apa pun — server mati, jaringan putus, atau 400 dari body request
   * yang cacat — melempar galat sebelum baris-baris di bawahnya sempat jalan.
   * Akibatnya pengguna menekan "Keluar" dan TIDAK TERJADI APA-APA: ia tetap
   * masuk, tetap di halaman yang sama, tanpa satu pun pesan.
   *
   * Menekan keluar adalah pernyataan kehendak pengguna, bukan permintaan izin
   * ke server. Pencabutan token di server penting, tetapi statusnya
   * best-effort; yang tidak boleh gagal adalah keluarnya itu sendiri.
   */
  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Token di memori sudah dibersihkan `authService.logout` lewat `finally`.
      // Sesi di server akan tetap kedaluwarsa sendiri sesuai TTL-nya.
    }

    setCurrentUser(null);
    setCourses([]);
    setUsers([]);
    setDashboard(null);
    setProgress(null);
    navigate("/");
  }, [navigate]);

  const updateProfile = useCallback(async (data) => {
    try {
      // Halaman Profile mengirim `profileType`; API menamainya `profile`.
      const user = await userService.updateProfile({
        name: data.name,
        phone: data.phone ?? data.profile?.phone,
        avatar: data.avatar ?? data.profile?.avatar,
        profile: data.profileType ?? undefined,
      });
      setCurrentUser(toUiUser(user));
      return { success: true, message: "" };
    } catch (error) {
      const e = normalizeError(error);
      return { success: false, message: e.message, errors: e.errors };
    }
  }, []);

  /**
   * Preferensi tampilan (tema, ukuran huruf) tetap di perangkat.
   *
   * Skema tidak punya kolom untuk itu, dan memang tidak perlu: preferensi
   * tampilan wajar berbeda antar-perangkat. `ThemeContext` yang mengelolanya
   * dan membaca `currentUser.settings` dari sini.
   */
  const updateUserSettings = useCallback((settings) => {
    setCurrentUser((prev) => (prev ? { ...prev, settings } : prev));
  }, []);

  // ─── Kursus & pelajaran ────────────────────────────────────────────────

  const selectCourse = useCallback(
    async (courseId) => {
      setSelectedCourseId(courseId);
      if (!courseId) {
        setSelectedCourseDetail(null);
        return;
      }

      const detail = await courseService.getCourseById(courseId).catch(() => null);

      // Status akses hanya bermakna untuk pembelajar; admin melihat semuanya.
      const access =
        currentUser?.role === "user"
          ? await progressService.getCourseAccess(courseId).catch(() => [])
          : [];

      setSelectedCourseDetail(mergeCourseAccess(detail, access));
    },
    [currentUser],
  );

  const selectLesson = useCallback((lessonId) => {
    setSelectedLessonId(lessonId);
  }, []);

  /**
   * Menandai pelajaran selesai.
   *
   * Server yang menentukan boleh atau tidaknya — pelajaran terkunci ditolak
   * 403 LESSON_LOCKED. Frontend tidak menduplikasi aturannya.
   */
  const completeLesson = useCallback(
    async (lessonId) => {
      try {
        await progressService.updateLessonProgress(lessonId, "completed");
        await loadLearnerData();
        if (selectedCourseId) await selectCourse(selectedCourseId);
        return { success: true };
      } catch (error) {
        const e = normalizeError(error);
        return { success: false, message: e.message, code: e.code };
      }
    },
    [loadLearnerData, selectCourse, selectedCourseId],
  );

  // ─── Kuis ──────────────────────────────────────────────────────────────

  /**
   * Mengerjakan kuis — skor DIHITUNG SERVER.
   *
   * Klien hanya mengirim indeks pilihan; ia tidak pernah menerima kunci
   * jawaban dan tidak pernah menentukan lulus atau tidak.
   */
  const submitQuiz = useCallback(
    async (courseId, quizId, answers, durationSeconds) => {
      try {
        const result = await quizService.submitQuiz(
          courseId, quizId, answers, durationSeconds,
        );
        setQuizScore(result.score);
        setQuizPassed(result.passed);
        await loadLearnerData();
        return { success: true, result };
      } catch (error) {
        const e = normalizeError(error);
        return { success: false, message: e.message, code: e.code, errors: e.errors };
      }
    },
    [loadLearnerData],
  );

  const setQuizResult = useCallback((score, passed = null) => {
    setQuizScore(score);
    setQuizPassed(passed);
  }, []);

  // ─── Turunan ───────────────────────────────────────────────────────────

  const stats = useMemo(
    () => dashboard?.summary ?? progress?.summary ?? null,
    [dashboard, progress],
  );

  const quizHistory = useMemo(() => dashboard?.recentQuizzes ?? [], [dashboard]);

  const badges = useMemo(
    () => dashboard?.badges ?? progress?.badges ?? [],
    [dashboard, progress],
  );

  const value = useMemo(
    () => ({
      currentUser,
      booting,
      users,
      courses,
      quizHistory,
      badges,
      stats,
      dashboard,
      progress,
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
      completeLesson,
      submitQuiz,
      setSelectedCourse: selectCourse,
      setSelectedLesson: selectLesson,
      setQuizResult,
      refresh: loadLearnerData,
    }),
    [
      currentUser, booting, users, courses, quizHistory, badges, stats, dashboard,
      progress, selectedCourseId, selectedLessonId, selectedCourse, quizScore,
      quizPassed, navigate, login, logout, register, updateProfile,
      updateUserSettings, completeLesson, submitQuiz, selectCourse, selectLesson,
      setQuizResult, loadLearnerData,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
