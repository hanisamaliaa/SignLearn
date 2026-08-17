import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, StatCard, FloatingShapes, AnimatedCounter } from "../../components/ui/ui";
import { useApp } from "../../context/app";
import {
  TrophyIcon,
  ChartIcon,
  FireIcon,
  StarIcon,
} from "../../components/ui/Icons";
import * as progressService from "../../services/progressService";
import QuizHistory from "../../features/progress/QuizHistory";
import ScoreTrend from "../../features/progress/ScoreTrend";
import ProgressHero from "../../features/progress/ProgressHero";
import CourseProgressCard from "../../features/progress/CourseProgressCard";
import AchievementCard from "../../features/progress/AchievementCard";
import Pagination from "../../components/common/Pagination";
import {
  TabContentSkeleton,
} from "../../features/progress/ProgressSkeleton";
import ProgressEmptyState from "../../features/progress/ProgressEmptyState";

const TABS = [
  { id: "overview", label: "Ringkasan" },
  { id: "courses", label: "Kursus" },
  { id: "quizzes", label: "Kuis" },
  { id: "achievements", label: "Pencapaian" },
];

const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const SCORE_DISTRIBUTION = [
  { range: "90 – 100", color: "var(--chart-green)" },
  { range: "70 – 89", color: "var(--chart-blue)" },
  { range: "50 – 69", color: "var(--chart-yellow)" },
  { range: "< 50", color: "var(--chart-red)" },
];

const COURSE_FILTERS = [
  { id: "all", label: "Semua" },
  { id: "active", label: "Berlangsung" },
  { id: "completed", label: "Selesai" },
];

const PAGE_SIZE_DESKTOP = 8;
const PAGE_SIZE_MOBILE = 5;

/* ── Animation variants ─────────────────────────────────────────────── */
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const fadeSlideUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15 } },
};

const tabContentVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.12 } },
};

export default function Progress() {
  const { courses, quizHistory, badges, stats } = useApp();

  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [hoveredDay, setHoveredDay] = useState(null);
  const [hoveredScore, setHoveredScore] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);

  /* Pagination state */
  const [coursePage, setCoursePage] = useState(1);
  const [quizPage, setQuizPage] = useState(1);
  const [courseFilter, setCourseFilter] = useState("all");

  const contentRef = useRef(null);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const pageSize = isMobile ? PAGE_SIZE_MOBILE : PAGE_SIZE_DESKTOP;

  useEffect(() => {
    let cancelled = false;
    progressService
      .getQuizHistory()
      .then((data) => {
        if (!cancelled) setHistory(data);
      })
      .catch((error) => {
        if (!cancelled) setHistoryError(error?.message ?? "Riwayat kuis gagal dimuat.");
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  /* ── Derived data ──────────────────────────────────────────────────── */
  const COURSES = courses ?? [];
  const QUIZ_HISTORY = quizHistory ?? [];
  const AVAILABLE_COURSES = COURSES.filter((course) => !course.isLocked);

  const totalLessons = AVAILABLE_COURSES.reduce((s, c) => s + (c.totalLessons ?? 0), 0);
  const completedLessons = AVAILABLE_COURSES.reduce((s, c) => s + (c.completedLessons ?? 0), 0);
  const avgScore = history?.summary?.averageBestScore ?? 0;
  const overallPct = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const activeCourses = AVAILABLE_COURSES.filter(
    (c) => (c.completedLessons ?? 0) < (c.totalLessons ?? 0),
  ).length;

  /* ── Weekly activity ───────────────────────────────────────────────── */
  const todayIndex = (new Date().getDay() + 6) % 7;
  const weekActivity = useMemo(() => {
    const counts = Array(7).fill(0);
    const now = new Date();
    for (const course of COURSES) {
      if (!course.lastAccessedAt) continue;
      const accessed = new Date(course.lastAccessedAt);
      if (Number.isNaN(accessed.getTime())) continue;
      const diffDays = Math.floor((now - accessed) / 86400000);
      if (diffDays >= 0 && diffDays < 7) {
        counts[(todayIndex - diffDays + 7) % 7] += 1;
      }
    }
    const peak = Math.max(1, ...counts);
    return counts.map((count) => ({
      count,
      percent: count ? Math.max(14, Math.round((count / peak) * 100)) : 5,
    }));
  }, [COURSES, todayIndex]);

  /* ── Score distribution ────────────────────────────────────────────── */
  const scoreCounts = useMemo(
    () =>
      SCORE_DISTRIBUTION.map((d) => {
        const count = QUIZ_HISTORY.filter((q) => {
          const score = Number(q.score) || 0;
          if (d.range === "90 – 100") return score >= 90;
          if (d.range === "70 – 89") return score >= 70 && score < 90;
          if (d.range === "50 – 69") return score >= 50 && score < 70;
          return score < 50;
        }).length;
        return { ...d, count };
      }),
    [QUIZ_HISTORY],
  );

  /* ── Course filtering & pagination ─────────────────────────────────── */
  const filteredCourses = useMemo(() => {
    if (courseFilter === "active") return AVAILABLE_COURSES.filter((c) => (c.completedLessons ?? 0) < (c.totalLessons ?? 0));
    if (courseFilter === "completed") return AVAILABLE_COURSES.filter((c) => (c.completedLessons ?? 0) === (c.totalLessons ?? 0) && (c.totalLessons ?? 0) > 0);
    return AVAILABLE_COURSES;
  }, [AVAILABLE_COURSES, courseFilter]);

  const totalCoursePages = Math.max(1, Math.ceil(filteredCourses.length / pageSize));
  const safeCoursePage = Math.min(coursePage, totalCoursePages);
  const pagedCourses = filteredCourses.slice((safeCoursePage - 1) * pageSize, safeCoursePage * pageSize);

  /* ── Quiz pagination ───────────────────────────────────────────────── */
  const quizzes = history?.quizzes ?? [];
  const totalQuizPages = Math.max(1, Math.ceil(quizzes.length / pageSize));
  const safeQuizPage = Math.min(quizPage, totalQuizPages);
  const pagedQuizzes = quizzes.slice((safeQuizPage - 1) * pageSize, safeQuizPage * pageSize);

  /* ── Handlers ──────────────────────────────────────────────────────── */
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    setCoursePage(1);
    setQuizPage(1);
    setCourseFilter("all");
    contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleCourseFilterChange = useCallback((filter) => {
    setCourseFilter(filter);
    setCoursePage(1);
  }, []);

  const handleCourseSelect = useCallback((courseId) => {
    setSelectedCourse(selectedCourse === courseId ? null : courseId);
  }, [selectedCourse]);

  /* ── Tab meta ──────────────────────────────────────────────────────── */
  const tabMeta = useMemo(() => ({
    courses: AVAILABLE_COURSES.length,
    quizzes: history?.summary?.totalAttempts ?? QUIZ_HISTORY.length,
    achievements: badges.filter((b) => b.earned).length,
  }), [AVAILABLE_COURSES, history, QUIZ_HISTORY, badges]);

  /* ── Render ────────────────────────────────────────────────────────── */
  return (
    <div className="progress-page space-y-6" ref={contentRef}>
      <FloatingShapes count={3} />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-extrabold text-[var(--text)]">
          Progress Belajar
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          Pantau perkembangan belajar BISINDO kamu
        </p>
      </motion.div>

      {/* Learning Hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.04 }}
      >
        <ProgressHero
          completedLessons={completedLessons}
          totalLessons={totalLessons}
          overallPct={overallPct}
        />
      </motion.div>

      {/* Statistics */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeSlideUp}>
          <StatCard
            label="Kursus Aktif"
            value={<AnimatedCounter value={activeCourses} />}
            icon={<ChartIcon size={18} />}
            color="var(--chart-blue)"
          />
        </motion.div>
        <motion.div variants={fadeSlideUp}>
          <StatCard
            label="Kuis Terbaru"
            value={<AnimatedCounter value={QUIZ_HISTORY.length} />}
            icon={<TrophyIcon size={18} />}
            color="var(--chart-yellow)"
          />
        </motion.div>
        <motion.div variants={fadeSlideUp}>
          <StatCard
            label="Rata-rata Skor"
            value={<><AnimatedCounter value={avgScore} suffix="%" /></>}
            icon={<StarIcon size={18} />}
            color="var(--chart-green)"
          />
        </motion.div>
        <motion.div variants={fadeSlideUp}>
          <StatCard
            label="Streak Belajar"
            value={<><AnimatedCounter value={stats?.streakDays ?? 0} /> <span className="text-sm">hari</span></>}
            icon={<FireIcon size={18} />}
            color="var(--chart-red)"
          />
        </motion.div>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div
        className="progress-tabs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.12 }}
        role="tablist"
        aria-label="Progress belajar"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = tab.id === "courses" ? tabMeta.courses : tab.id === "quizzes" ? tabMeta.quizzes : tab.id === "achievements" ? tabMeta.achievements : undefined;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              role="tab"
              className={`progress-tab ${isActive ? "progress-tab--active" : ""}`}
            >
              <span className="progress-tab__label">{tab.label}</span>
              {count !== undefined && (
                <span className={`progress-tab__count ${isActive ? "progress-tab__count--active" : ""}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {/* ── OVERVIEW ────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            id="panel-overview"
            role="tabpanel"
            variants={tabContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="grid min-w-0 grid-cols-1 lg:grid-cols-2 gap-5"
          >
            {/* Weekly activity */}
            <Card className="overflow-visible">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-bold text-[var(--text)]">Aktivitas Minggu Ini</h2>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Kursus yang diakses dalam 7 hari terakhir</p>
                </div>
                <span className="rounded-full bg-[var(--surface-3)] px-2.5 py-1 text-xs font-bold text-[var(--text-muted)]">
                  {weekActivity.reduce((a, d) => a + d.count, 0)} sesi
                </span>
              </div>
              <div className="weekly-activity-chart flex min-w-0 items-end justify-between gap-2 h-36 sm:h-40">
                {DAYS.map((day, i) => {
                  const isToday = i === todayIndex;
                  const isHovered = hoveredDay === i;
                  return (
                    <div
                      key={day}
                      className="relative min-w-0 flex flex-col items-center gap-1 flex-1 h-full"
                      onMouseEnter={() => setHoveredDay(i)}
                      onMouseLeave={() => setHoveredDay(null)}
                    >
                      <div className="relative w-full flex-1 flex items-end justify-center px-1">
                        {isHovered && (
                          <div className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[var(--text)] px-2.5 py-1.5 text-[11px] font-bold text-white shadow-lg">
                            {weekActivity[i].count} {weekActivity[i].count === 1 ? "akses" : "akses"}
                          </div>
                        )}
                        <div
                          className="w-full max-w-12 rounded-lg transition-all duration-300 ease-out"
                          style={{
                            height: `${weekActivity[i].percent}%`,
                            background: weekActivity[i].count > 0 ? "var(--chart-blue)" : "var(--surface-3)",
                            opacity: isHovered ? 1 : 0.85,
                            transform: isHovered ? "scaleX(1.08)" : "none",
                          }}
                        />
                      </div>
                      <span className={`text-xs font-medium transition-all duration-200 ${isToday ? "text-[var(--primary)] font-extrabold" : "text-[var(--text-subtle)]"}`}>
                        {day}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3 text-sm">
                <span className="font-bold text-[var(--text)]">{weekActivity.filter((d) => d.count > 0).length} hari aktif</span>
              </div>
            </Card>

            {/* Score distribution */}
            <Card>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-bold text-[var(--text)]">Distribusi Nilai Kuis</h2>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Dari kuis terbaru yang tersedia</p>
                </div>
                <span className="rounded-full bg-[var(--surface-3)] px-2.5 py-1 text-xs font-bold text-[var(--text-muted)]">{QUIZ_HISTORY.length} kuis</span>
              </div>
              <div className="space-y-3">
                {scoreCounts.map((d) => {
                  const percent = QUIZ_HISTORY.length ? Math.round((d.count / QUIZ_HISTORY.length) * 100) : 0;
                  const isHovered = hoveredScore === d.range;
                  return (
                    <div
                      key={d.range}
                      className="flex items-center gap-3 text-sm rounded-lg px-1 py-1 transition-all duration-200 hover:bg-[var(--surface-2)]"
                      onMouseEnter={() => setHoveredScore(d.range)}
                      onMouseLeave={() => setHoveredScore(null)}
                    >
                      <span className="w-16 text-[var(--text-muted)] text-xs">{d.range}</span>
                      <div className="flex-1 h-5 bg-[var(--surface-3)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${percent}%`, background: d.color, transformOrigin: "left" }}
                        />
                      </div>
                      <span className={`w-12 text-xs text-right font-semibold transition-transform duration-200 ${isHovered ? "scale-110 text-[var(--text)]" : "text-[var(--text-subtle)]"}`}>
                        {d.count} · {percent}%
                      </span>
                    </div>
                  );
                })}
              </div>
              {QUIZ_HISTORY.length === 0 && (
                <div className="mt-4 rounded-xl border border-dashed border-[var(--border)] p-4 text-center text-sm text-[var(--text-muted)]">
                  Belum ada data kuis untuk ditampilkan.
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* ── COURSES ─────────────────────────────────────────────────── */}
        {activeTab === "courses" && (
          <motion.div
            key="courses"
            id="panel-courses"
            role="tabpanel"
            variants={tabContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-4"
          >
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-[var(--text-muted)]">Filter:</span>
              {COURSE_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleCourseFilterChange(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    courseFilter === f.id
                      ? "bg-[var(--primary)] text-white shadow-sm"
                      : "bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Course list */}
            {filteredCourses.length === 0 ? (
              <ProgressEmptyState type="courses" />
            ) : (
              <>
                <motion.div
                  className="space-y-3"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {pagedCourses.map((course) => (
                    <motion.div key={course.id} variants={fadeSlideUp}>
                      <CourseProgressCard
                        course={course}
                        onSelectCourse={handleCourseSelect}
                      />
                    </motion.div>
                  ))}
                </motion.div>

                {/* Pagination info + controls */}
                <div className="flex flex-col items-center gap-3 pt-2">
                  <p className="text-xs text-[var(--text-muted)]">
                    Menampilkan {Math.min((safeCoursePage - 1) * pageSize + 1, filteredCourses.length)}–{Math.min(safeCoursePage * pageSize, filteredCourses.length)} dari {filteredCourses.length} kursus
                  </p>
                  <Pagination
                    currentPage={safeCoursePage}
                    totalPages={totalCoursePages}
                    onPageChange={setCoursePage}
                  />
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ── QUIZZES ─────────────────────────────────────────────────── */}
        {activeTab === "quizzes" && (
          <motion.div
            key="quizzes"
            id="panel-quizzes"
            role="tabpanel"
            variants={tabContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-5"
          >
            {/* Score trend */}
            <Card>
              <h2 className="mb-1 font-bold text-[var(--text)]">Peningkatan nilai kuis</h2>
              <p className="mb-4 text-xs text-[var(--text-muted)]">
                Setiap titik adalah satu percobaan, dari yang terlama ke terbaru.
              </p>
              <ScoreTrend points={history?.trend} />
            </Card>

            {/* Letter mistakes */}
            {history?.letterMistakes?.length > 0 && (
              <Card>
                <h2 className="mb-1 font-bold text-[var(--text)]">Huruf yang perlu dilatih</h2>
                <p className="mb-4 text-xs text-[var(--text-muted)]">
                  Huruf yang paling sering keliru saat diperagakan di kuis kamera.
                </p>
                <div className="flex flex-wrap gap-2">
                  {history.letterMistakes.slice(0, 12).map((item) => (
                    <span
                      key={item.letter}
                      className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
                    >
                      <strong className="text-lg font-extrabold text-[var(--text)]">
                        {item.letter}
                      </strong>
                      <span className="text-xs text-[var(--text-subtle)]">{item.count}x</span>
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {/* Quiz history */}
            <Card>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-[var(--text)]">Riwayat kuis</h2>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Dikelompokkan per kuis; klik sebuah percobaan untuk melihat soal
                    mana yang benar dan salah.
                  </p>
                </div>
                <span className="rounded-full bg-[var(--surface-3)] px-2.5 py-1 text-xs font-bold text-[var(--text-muted)]">
                  {history?.summary?.totalAttempts ?? 0} percobaan
                </span>
              </div>

              {historyError ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-[var(--danger)] mb-3">{historyError}</p>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 rounded-lg bg-[var(--surface-3)] text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
                  >
                    Coba Lagi
                  </button>
                </div>
              ) : historyLoading ? (
                <TabContentSkeleton count={3} />
              ) : quizzes.length === 0 ? (
                <ProgressEmptyState type="quizzes" />
              ) : (
                <>
                  <QuizHistory quizzes={pagedQuizzes} />

                  {totalQuizPages > 1 && (
                    <div className="flex flex-col items-center gap-3 pt-4">
                      <p className="text-xs text-[var(--text-muted)]">
                        Menampilkan {Math.min((safeQuizPage - 1) * pageSize + 1, quizzes.length)}–{Math.min(safeQuizPage * pageSize, quizzes.length)} dari {quizzes.length} kuis
                      </p>
                      <Pagination
                        currentPage={safeQuizPage}
                        totalPages={totalQuizPages}
                        onPageChange={setQuizPage}
                      />
                    </div>
                  )}
                </>
              )}
            </Card>
          </motion.div>
        )}

        {/* ── ACHIEVEMENTS ────────────────────────────────────────────── */}
        {activeTab === "achievements" && (
          <motion.div
            key="achievements"
            id="panel-achievements"
            role="tabpanel"
            variants={tabContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {badges.length === 0 ? (
              <ProgressEmptyState type="achievements" />
            ) : (
              <>
                <div className="mb-2">
                  <p className="text-sm text-[var(--text-muted)]">
                    {badges.filter((b) => b.earned).length} dari {badges.length} pencapaian terbuka
                  </p>
                </div>
                <motion.div
                  className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {badges.map((a) => (
                    <motion.div key={a.code} variants={fadeSlideUp}>
                      <AchievementCard badge={a} />
                    </motion.div>
                  ))}
                </motion.div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
