import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/app";
import { SignLearnAvatar } from "../../components/common/SignLearnAvatar";
import {
  Card,
  StatCard,
} from "../../components/ui/ui";
import {
  BookIcon,
  TrophyIcon,
  FireIcon,
  ArrowRightIcon,
  ChartIcon,
  CheckCircleIcon,
  LockIcon,
  PlayIcon,
  StarIcon,
} from "../../components/ui/Icons";

const WEEK = [
  { day: "Sen", value: 34, lessons: 1 },
  { day: "Sel", value: 48, lessons: 2 },
  { day: "Rab", value: 67, lessons: 3 },
  { day: "Kam", value: 82, lessons: 4 },
  { day: "Jum", value: 55, lessons: 2 },
  { day: "Sab", value: 28, lessons: 1 },
  { day: "Min", value: 18, lessons: 1 },
];

const PROFILE_LABEL = {
  parent: "Orang Tua",
  deaf: "Pelajar Tunarungu",
  general: "Pelajar Umum",
};

export default function UserDashboard() {
  const {
    currentUser,
    setSelectedCourse,
    setSelectedLesson,
    courses,
    quizHistory,
    stats,
    dashboard,
  } = useApp();

  const navigate = useNavigate();

  const [showAllLessons, setShowAllLessons] = useState(false);
  const [activeDay, setActiveDay] = useState(3);

  const COURSES = courses ?? [];
  const QUIZ_HISTORY = quizHistory ?? [];

  /**
   * Kursus yang sedang dilanjutkan.
   * Tetap menggunakan data continueLearning dari server/context.
   */
  const resume = dashboard?.continueLearning ?? null;

  const currentCourse =
    COURSES.find((course) => course.id === resume?.courseId) ??
    COURSES[0] ??
    null;

  const currentLesson = resume
    ? {
        id: resume.lessonId,
        title: resume.lessonTitle,
      }
    : null;

  /**
   * Data progress keseluruhan.
   */
  const AVAILABLE_COURSES = COURSES.filter((course) => !course.isLocked);

  const completedLessons = AVAILABLE_COURSES.reduce(
    (total, course) => total + (course.completedLessons ?? 0),
    0
  );

  const totalLessons = AVAILABLE_COURSES.reduce(
    (total, course) => total + (course.totalLessons ?? 0),
    0
  );

  const overallPct = totalLessons
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;

  // Apresiasi berubah mengikuti jumlah pelajaran yang benar-benar selesai.
  // Ini murni presentasi frontend; tidak mengubah data atau backend.
  const encouragement = completedLessons < 4
    ? {
        title: "Yuk mulai petualangan!",
        copy: "Setiap pelajaran adalah satu langkah kecil menuju makin jago.",
      }
    : completedLessons < 8
      ? {
          title: "Wow, kamu hebat!",
          copy: "Progress-mu sudah mulai terlihat. Pertahankan semangat belajarmu!",
        }
      : {
          title: "Luar biasa, kamu makin jago!",
          copy: "Kamu sudah melangkah jauh. Siap menaklukkan level berikutnya?",
        };

  const activeCourses = COURSES.filter(
    (course) =>
      !course.isLocked &&
      (course.completedLessons ?? 0) < (course.totalLessons ?? 0)
  ).length;

  const firstName =
    currentUser?.name?.split(" ")?.[0] ??
    currentUser?.username ??
    "Kamu";

  /**
   * Quiz statistics.
   */
  const passedQuizzes = QUIZ_HISTORY.filter((quiz) => quiz.passed);

  const avgScore = passedQuizzes.length
    ? Math.round(
        passedQuizzes.reduce(
          (sum, quiz) => sum + (quiz.score ?? 0),
          0
        ) / passedQuizzes.length
      )
    : 0;

  /**
   * Fungsi untuk melanjutkan pelajaran dari data server.
   */
  const continueLearning = async () => {
    if (!resume) return;

    await setSelectedCourse(resume.courseId);
    setSelectedLesson(resume.lessonId);
    navigate("/lesson");
  };

  /**
   * Daftar lesson untuk course yang sedang aktif.
   *
   * Tidak mengubah data backend.
   * Hanya mengambil data lessons yang sudah tersedia di currentCourse.
   */
  const lessons = currentCourse?.lessons ?? [];

  const visibleLessons = showAllLessons
    ? lessons
    : lessons.slice(0, 5);

  return (
    <div className="user-dashboard space-y-6 animate-fade-in">

      {/* ================= HERO ================= */}
      <section className="user-dashboard-hero">
        <div>
          <p className="user-eyebrow">
            SIGNLEARN • AREA BELAJAR
          </p>

          <h1 className="user-welcome-title">
            Hai, {firstName}! 
          </h1>

          <p className="user-welcome-copy">
            Siap belajar bahasa isyarat hari ini?
          </p>
        </div>

        <button
          type="button"
          className="user-goal-pill"
          onClick={() => navigate("/progress")}
        >
          <span className="user-goal-star">★</span>

          <span>
            <strong>Target harian</strong>
            <small>3 / 4 pelajaran</small>
          </span>
        </button>
      </section>

      {/* ================= WELCOME ================= */}
      <section className="user-welcome-card">
        <div className="user-welcome-decoration user-welcome-decoration-one" />
        <div className="user-welcome-decoration user-welcome-decoration-two" />

        <div className="user-welcome-card-content">

          <div className="user-welcome-avatar-wrap">
            <SignLearnAvatar
              id={currentUser?.profile?.avatar}
              size="xl"
            />

            <span className="user-welcome-avatar-badge">
              ★
            </span>
          </div>

          <div className="min-w-0 flex-1">

            <div className="user-chip-row">
              <span className="user-chip">
                {PROFILE_LABEL[currentUser?.profileType] ||
                  "Pelajar"}
              </span>

              <span className="user-chip user-chip-green">
                <StarIcon size={13} />
                {avgScore}% rata-rata kuis
              </span>
            </div>

            <h2>{encouragement.title}</h2>

            <p>
              {encouragement.copy} Kamu sudah menyelesaikan{" "}
              <strong>
                {completedLessons} dari {totalLessons}
              </strong>{" "}
              pelajaran.
            </p>

            <div
              className="user-level-progress"
              role="progressbar"
              aria-label="Progress belajar keseluruhan"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={overallPct}
            >
              <div className="user-level-progress-top">
                <span>Progress belajar</span>
                <strong>{overallPct}%</strong>
              </div>

              <div className="user-level-track">
                <div
                  style={{
                    width: `${overallPct}%`,
                  }}
                />
              </div>

              <div className="user-level-labels">
                <span>
                  Level{" "}
                  {Math.max(
                    1,
                    Math.ceil(overallPct / 25)
                  )}
                </span>

                <span>
                  {Math.min(
                    100,
                    overallPct + 25
                  )}
                  % menuju level berikutnya
                </span>
              </div>
            </div>
          </div>

          {currentLesson && (
            <div className="user-hero-action">
              <button
                type="button"
                className="user-primary-button"
                onClick={continueLearning}
              >
                <span className="user-button-icon">
                  <PlayIcon size={15} />
                </span>

                Lanjutkan belajar

                <ArrowRightIcon size={16} />
              </button>

              <span>
                Berikutnya: {currentLesson.title}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ================= STATS ================= */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
        <StatCard
          label="Kursus Aktif"
          value={activeCourses}
          icon={<BookIcon size={20} />}
          color="#4F8EF7"
        />

        <StatCard
          label="Pelajaran Selesai"
          value={completedLessons}
          icon={<CheckCircleIcon size={20} />}
          color="#2ECC71"
        />

        <StatCard
          label="Rata-rata Kuis"
          value={`${avgScore}%`}
          icon={<TrophyIcon size={20} />}
          color="#F4B400"
        />

        <StatCard
          label="Streak Belajar"
          value={`${stats?.streakDays ?? 0} hari`}
          icon={<FireIcon size={20} />}
          color="#E74C3C"
        />
      </div>

      {/* ================= ACTIVITY + QUIZ ================= */}
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">

        <section className="user-panel">
          <div className="user-panel-heading">
            <div>
              <h3>Aktivitas Minggu Ini</h3>
              <p>
                Klik harinya untuk melihat semangat belajarmu.
              </p>
            </div>

            <span className="user-panel-icon">
              <ChartIcon size={18} />
            </span>
          </div>

          <div
            className="user-activity-chart"
            aria-label="Grafik aktivitas belajar minggu ini"
          >
            {WEEK.map((item, index) => {
              const active = activeDay === index;

              return (
                <button
                  key={item.day}
                  type="button"
                  className={`user-bar-column ${
                    active ? "is-active" : ""
                  }`}
                  onClick={() => setActiveDay(index)}
                  aria-pressed={active}
                >
                  <span className="user-bar-value">
                    {item.lessons} pelajaran
                  </span>

                  <span className="user-bar-area">
                    <span
                      style={{
                        height: `${item.value}%`,
                      }}
                    />
                  </span>

                  <span className="user-bar-day">
                    {item.day}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="user-activity-summary">
            <span>
              <strong>
                {WEEK[activeDay].day}
              </strong>{" "}
              kamu belajar{" "}
              <strong>
                {WEEK[activeDay].lessons} pelajaran
              </strong>
              .
            </span>

            <button
              type="button"
              onClick={() => navigate("/progress")}
            >
              Lihat progress
              <ArrowRightIcon size={14} />
            </button>
          </div>
        </section>

        <section className="user-panel user-quiz-panel">
          <div className="user-panel-heading">
            <div>
              <h3>Distribusi Nilai Kuis</h3>
              <p>Ringkasan hasil kuis kamu.</p>
            </div>

            <span className="user-panel-icon yellow">
              <TrophyIcon size={18} />
            </span>
          </div>

          {[
            [
              "90 - 100",
              QUIZ_HISTORY.filter(
                (quiz) => quiz.score >= 90
              ).length,
              "green",
            ],
            [
              "70 - 89",
              QUIZ_HISTORY.filter(
                (quiz) =>
                  quiz.score >= 70 &&
                  quiz.score < 90
              ).length,
              "blue",
            ],
            [
              "50 - 69",
              QUIZ_HISTORY.filter(
                (quiz) =>
                  quiz.score >= 50 &&
                  quiz.score < 70
              ).length,
              "yellow",
            ],
            [
              "< 50",
              QUIZ_HISTORY.filter(
                (quiz) => quiz.score < 50
              ).length,
              "coral",
            ],
          ].map(([label, count, tone]) => (
            <div
              className="user-progress-row"
              key={label}
            >
              <div>
                <span>{label}</span>
                <strong>{count}</strong>
              </div>

              <div className="user-progress-track">
                <span
                  className={tone}
                  style={{
                    width: `${Math.min(
                      100,
                      count * 20
                    )}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </section>
      </div>

      {/* ================= COURSE + QUIZ HISTORY ================= */}
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">

        {/* CURRENT COURSE */}
        {currentCourse && (
          <section className="user-panel user-course-panel">

            <div className="user-panel-heading">
              <div>
                <p className="user-section-kicker">
                  SEDANG DIPELAJARI
                </p>

                <h3>{currentCourse.title}</h3>

                <p>
                  Pelan-pelan tidak apa-apa, yang penting
                  terus jalan.
                </p>
              </div>

              <span className="user-level-pill">
                {currentCourse.level}
              </span>
            </div>

            <div className="user-course-summary">
              {currentCourse.thumbnail && (
                <img
                  src={currentCourse.thumbnail}
                  alt=""
                />
              )}

              <div className="min-w-0 flex-1">

                <div className="user-course-meta">
                  <span>Progress kursus</span>

                  <strong>
                    {currentCourse.completedLessons ?? 0}/
                    {currentCourse.totalLessons ?? 0}
                  </strong>
                </div>

                <div className="user-course-track">
                  <span
                    style={{
                      width: `${
                        currentCourse.totalLessons
                          ? ((currentCourse.completedLessons ?? 0) /
                              currentCourse.totalLessons) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    await setSelectedCourse(currentCourse.id);
                    navigate("/course-detail");
                  }}
                  className="user-text-button"
                >
                  Lihat detail kursus
                  <ArrowRightIcon size={14} />
                </button>
              </div>
            </div>

            {visibleLessons.length > 0 && (
              <div className="user-lesson-list">
                {visibleLessons.map((lesson, index) => {

                  const isCurrent =
                    resume?.lessonId === lesson.id;

                  const isCompleted =
                    lesson.completed === true ||
                    lesson.isCompleted === true ||
                    lesson.status === "completed";

                  const status = isCompleted
                    ? "completed"
                    : isCurrent
                      ? "current"
                      : "locked";

                  return (
                    <div
                      key={lesson.id ?? index}
                      className={`user-lesson-row ${
                        status === "current"
                          ? "is-current"
                          : ""
                      }`}
                    >
                      <span
                        className={`user-lesson-status ${status}`}
                      >
                        {status === "completed" ? (
                          <CheckCircleIcon size={15} />
                        ) : status === "current" ? (
                          <PlayIcon size={11} />
                        ) : (
                          <LockIcon size={13} />
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p>
                          {lesson.title ??
                            lesson.name ??
                            `Pelajaran ${index + 1}`}
                        </p>

                        <span>
                          {lesson.duration ?? ""}
                        </span>
                      </div>

                      {status === "current" && (
                        <button
                          type="button"
                          className="user-small-button"
                          onClick={continueLearning}
                        >
                          Mulai
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {(currentCourse.lessons?.length ?? 0) > 5 && (
              <button
                type="button"
                className="user-show-more"
                onClick={() =>
                  setShowAllLessons(
                    (value) => !value
                  )
                }
              >
                {showAllLessons
                  ? "Tampilkan lebih sedikit"
                  : "Lihat semua pelajaran"}
              </button>
            )}
          </section>
        )}

        {/* QUIZ HISTORY + STREAK */}
        <div className="space-y-5">

          <section className="user-panel">
            <div className="user-panel-heading">
              <div>
                <h3>Riwayat Kuis Terbaru</h3>
                <p>
                  Nilai terbaikmu layak dirayakan 🎉
                </p>
              </div>

              <span className="user-count-pill">
                {QUIZ_HISTORY.length} kuis
              </span>
            </div>

            <div className="space-y-2">
              {QUIZ_HISTORY.slice(0, 5).map(
                (quiz, index) => (
                  <div
                    key={quiz.id ?? quiz.quizId ?? index}
                    className="user-list-row"
                  >
                    <span
                      className={`user-score ${
                        quiz.passed
                          ? "passed"
                          : "failed"
                      }`}
                    >
                      {quiz.score ?? 0}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p>
                        {quiz.lesson ??
                          quiz.quizTitle ??
                          "Kuis"}
                      </p>

                      <span>
                        {quiz.date ??
                          (quiz.takenAt
                            ? new Date(
                                quiz.takenAt
                              ).toLocaleDateString(
                                "id-ID",
                                {
                                  day: "numeric",
                                  month: "short",
                                }
                              )
                            : "")}
                      </span>
                    </div>

                    <span
                      className={`user-result-badge ${
                        quiz.passed
                          ? "passed"
                          : "failed"
                      }`}
                    >
                      {quiz.passed
                        ? "Lulus"
                        : "Ulangi"}
                    </span>
                  </div>
                )
              )}
            </div>

            <button
              type="button"
              className="user-full-button"
              onClick={() => navigate("/progress")}
            >
              Lihat semua riwayat
              <ArrowRightIcon size={14} />
            </button>
          </section>

          <Card className="bg-gradient-to-br from-[#FF6B6B] to-[#E74C3C] text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/80">
                  Streak Belajar
                </p>

                <p className="text-3xl font-extrabold mt-1">
                  {stats?.streakDays ?? 0} 🔥
                </p>

                <p className="text-xs text-white/70 mt-1">
                  Hari berturut-turut
                </p>
              </div>

              <div className="text-5xl opacity-30">
                🔥
              </div>
            </div>

            <div className="flex gap-1 mt-3">
              {Array.from({ length: 7 }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="flex-1 h-1.5 bg-[var(--surface)]/60 rounded-full"
                  />
                )
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ================= ALL COURSES ================= */}
      <section className="user-panel">
        <div className="user-panel-heading">
          <div>
            <h3>Semua Kursus</h3>

            <p>
              Pilih petualangan belajar yang ingin kamu
              lanjutkan.
            </p>
          </div>

          <button
            type="button"
            className="user-text-button"
            onClick={() => navigate("/courses")}
          >
            Lihat semua
            <ArrowRightIcon size={14} />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COURSES.slice(0, 4).map((course) => (
            <button
              key={course.id}
              type="button"
              disabled={course.isLocked}
              onClick={async () => {
                if (!course.isLocked) {
                  await setSelectedCourse(course.id);
                  navigate("/course-detail");
                }
              }}
              className={`user-mini-course ${
                course.isLocked
                  ? "is-locked"
                  : ""
              }`}
            >
              <div className="user-mini-course-image">
                <img
                  src={course.thumbnail}
                  alt=""
                />

                {!course.isLocked && (
                  <span>▶</span>
                )}
              </div>

              <div className="user-mini-course-body">
                <strong>{course.title}</strong>

                <span>
                  {course.totalLessons ?? 0} pelajaran
                </span>

                {course.isLocked ? (
                  <em>
                    <LockIcon size={12} />
                    Terkunci
                  </em>
                ) : (
                  <div className="user-mini-track">
                    <span
                      style={{
                        width: `${
                          course.totalLessons
                            ? ((course.completedLessons ?? 0) /
                                course.totalLessons) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
