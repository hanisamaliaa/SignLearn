import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/app";
import { SignLearnAvatar } from "../../components/common/SignLearnAvatar";
import {
  Card,
  StatCard,
  AnimatedCounter,
  FloatingShapes,
  MascotBubble,
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

const PROFILE_LABEL = {
  parent: "Orang Tua",
  deaf: "Pelajar Tunarungu",
  general: "Pelajar Umum",
};

const MASCOT_GREETINGS = [
  "Siap belajar BISINDO hari ini?",
  "Ayo lanjutkan petualangan belajar!",
  "Kamu hebat hari ini!",
];

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
  const [activeDay, setActiveDay] = useState(() => (new Date().getDay() + 6) % 7);

  const COURSES = courses ?? [];
  const QUIZ_HISTORY = quizHistory ?? [];

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

  const avgScore = QUIZ_HISTORY.length
    ? Math.round(
        QUIZ_HISTORY.reduce((sum, quiz) => sum + (Number(quiz.score) || 0), 0) /
          QUIZ_HISTORY.length
      )
    : 0;

  const todayIndex = (new Date().getDay() + 6) % 7;
  const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  const weekActivity = (() => {
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
    return counts.map((count, index) => ({
      day: DAYS[index],
      count,
      percent: count ? Math.max(12, Math.round((count / peak) * 100)) : 4,
    }));
  })();

  const continueLearning = async () => {
    if (!resume) return;
    await setSelectedCourse(resume.courseId);
    setSelectedLesson(resume.lessonId);
    navigate("/lesson");
  };

  const lessons = currentCourse?.lessons ?? [];
  const visibleLessons = showAllLessons ? lessons : lessons.slice(0, 5);

  const mascotGreeting = MASCOT_GREETINGS[completedLessons % MASCOT_GREETINGS.length];

  return (
    <div className="user-dashboard space-y-6 animate-fade-in">
      <FloatingShapes count={5} />

      {/* ================= GREETING HERO ================= */}
      <section className="dashboard-hero-section">
        <div className="dashboard-hero-content">
          <div className="dashboard-hero-mascot">
            <div className="mascot-character">
              <SignLearnAvatar id={currentUser?.avatar} size="xl" />
            </div>
            <MascotBubble message={mascotGreeting} />
          </div>

          <div className="dashboard-hero-text">
            <h1 className="dashboard-greeting">
              Halo, {firstName}!
            </h1>
            <p className="dashboard-subtitle">
              Siap belajar BISINDO hari ini?
            </p>

            <div className="dashboard-hero-chips">
              <span className="user-chip">
                {PROFILE_LABEL[currentUser?.profileType] || "Pelajar"}
              </span>
              {stats?.streakDays > 0 && (
                <span className="user-chip user-chip-fire">
                  🔥 {stats.streakDays} hari streak
                </span>
              )}
              {avgScore > 0 && (
                <span className="user-chip user-chip-green">
                  <StarIcon size={12} /> {avgScore}% rata-rata kuis
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          className="user-goal-pill"
          onClick={() => navigate("/progress")}
          title="Lihat progress belajar"
        >
          <span className="user-goal-star">★</span>
          <span>
            <strong>Progress belajar</strong>
            <small>{overallPct}% dari seluruh pelajaran</small>
          </span>
        </button>
      </section>

      {/* ================= CONTINUE LEARNING ================= */}
      {currentLesson && (
        <section className="dashboard-continue-section">
          <div className="dashboard-section-label">LANJUTKAN BELAJAR</div>
          <Card className="dashboard-continue-card" hover>
            <div className="dashboard-continue-inner">
              {currentCourse?.thumbnail && (
                <div className="dashboard-continue-thumb">
                  <img src={currentCourse.thumbnail} alt="" />
                  <span className="dashboard-continue-play">
                    <PlayIcon size={20} />
                  </span>
                </div>
              )}
              <div className="dashboard-continue-info">
                <h3>{currentCourse?.title}</h3>
                <p className="dashboard-continue-lesson">
                  {currentLesson.title}
                </p>
                <div className="dashboard-continue-progress">
                  <div className="dashboard-progress-bar">
                    <div
                      style={{
                        width: `${currentCourse?.totalLessons
                          ? ((currentCourse.completedLessons ?? 0) / currentCourse.totalLessons) * 100
                          : 0}%`,
                      }}
                    />
                  </div>
                  <span className="dashboard-progress-text">
                    {currentCourse?.completedLessons ?? 0}/{currentCourse?.totalLessons ?? 0} pelajaran
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="dashboard-continue-btn"
                onClick={continueLearning}
              >
                <PlayIcon size={16} />
                Lanjutkan
                <ArrowRightIcon size={14} className="dashboard-continue-arrow" />
              </button>
            </div>
          </Card>
        </section>
      )}

      {/* ================= STATS ================= */}
      <section>
        <div className="dashboard-section-label">STATISTIK BELAJAR</div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
          <div className="dashboard-stat-card animate-slide-up" style={{ animationDelay: "0ms" }}>
            <StatCard
              label="Kursus Aktif"
              value={<AnimatedCounter value={activeCourses} />}
              icon={<BookIcon size={20} />}
              color="#4F8EF7"
            />
          </div>
          <div className="dashboard-stat-card animate-slide-up" style={{ animationDelay: "60ms" }}>
            <StatCard
              label="Pelajaran Selesai"
              value={<AnimatedCounter value={completedLessons} />}
              icon={<CheckCircleIcon size={20} />}
              color="#2ECC71"
            />
          </div>
          <div className="dashboard-stat-card animate-slide-up" style={{ animationDelay: "120ms" }}>
            <StatCard
              label="Rata-rata Kuis"
              value={<AnimatedCounter value={avgScore} suffix="%" />}
              icon={<TrophyIcon size={20} />}
              color="#F4B400"
            />
          </div>
          <div className="dashboard-stat-card animate-slide-up" style={{ animationDelay: "180ms" }}>
            <StatCard
              label="Streak Belajar"
              value={<><AnimatedCounter value={stats?.streakDays ?? 0} /> <span className="text-base">hari</span></>}
              icon={<FireIcon size={20} />}
              color="#E74C3C"
            />
          </div>
        </div>
      </section>

      {/* ================= ENCOURAGEMENT CARD ================= */}
      <section className="dashboard-encouragement-card">
        <div className="dashboard-encouragement-blob dashboard-encouragement-blob-1" />
        <div className="dashboard-encouragement-blob dashboard-encouragement-blob-2" />
        <div className="dashboard-encouragement-inner">
          <div className="dashboard-encouragement-text">
            <p className="dashboard-encouragement-kicker">{encouragement.title}</p>
            <p className="dashboard-encouragement-copy">
              {encouragement.copy} Kamu sudah menyelesaikan{" "}
              <strong>{completedLessons} dari {totalLessons}</strong> pelajaran.
            </p>
          </div>
          <div className="dashboard-encouragement-progress">
            <div className="dashboard-big-progress">
              <div className="dashboard-big-progress-track">
                <div style={{ width: `${overallPct}%` }} />
              </div>
              <div className="dashboard-big-progress-labels">
                <span>Progress belajar</span>
                <strong>{overallPct}%</strong>
              </div>
            </div>
            <div className="dashboard-level-info">
              <span>Level {Math.min(4, Math.floor(overallPct / 25) + 1)}</span>
              <span>
                {overallPct >= 100
                  ? "Level maksimum"
                  : `${Math.max(0, ((Math.floor(overallPct / 25) + 1) * 25) - overallPct)}% menuju level berikutnya`}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= ACTIVITY + QUIZ ================= */}
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <section className="user-panel">
          <div className="user-panel-heading">
            <div>
              <h3>Aktivitas Minggu Ini</h3>
              <p>Klik harinya untuk melihat semangat belajarmu.</p>
            </div>
            <span className="user-panel-icon">
              <ChartIcon size={18} />
            </span>
          </div>

          <div
            className="user-activity-chart"
            aria-label="Grafik aktivitas belajar minggu ini"
          >
            {weekActivity.map((item, index) => {
              const active = activeDay === index;
              return (
                <button
                  key={item.day}
                  type="button"
                  className={`user-bar-column transition-transform duration-200 hover:-translate-y-1 ${active ? "is-active" : ""}`}
                  onClick={() => setActiveDay(index)}
                  aria-pressed={active}
                  title={`${item.day}: ${item.count} kursus diakses`}
                >
                  <span className="user-bar-value">{item.count} kursus</span>
                  <span className="user-bar-area">
                    <span style={{ height: `${item.percent}%` }} />
                  </span>
                  <span className="user-bar-day">{item.day}</span>
                </button>
              );
            })}
          </div>

          <div className="user-activity-summary">
            <span>
              <strong>{weekActivity[activeDay].day}</strong>{" "}
              kamu mengakses <strong>{weekActivity[activeDay].count} kursus</strong>.
            </span>
            <button type="button" onClick={() => navigate("/progress")}>
              Lihat progress
              <ArrowRightIcon size={14} />
            </button>
          </div>
        </section>

        <div className="space-y-5">
          <section className="user-panel user-quiz-panel">
            <div className="user-panel-heading">
              <div>
                <h3>Distribusi Nilai Kuis</h3>
                <p>Berdasarkan kuis terbaru yang tersedia.</p>
              </div>
              <span className="user-panel-icon yellow">
                <TrophyIcon size={18} />
              </span>
            </div>

            {[
              [
                "90 - 100",
                QUIZ_HISTORY.filter((quiz) => quiz.score >= 90).length,
                "green",
              ],
              [
                "70 - 89",
                QUIZ_HISTORY.filter((quiz) => quiz.score >= 70 && quiz.score < 90).length,
                "blue",
              ],
              [
                "50 - 69",
                QUIZ_HISTORY.filter((quiz) => quiz.score >= 50 && quiz.score < 70).length,
                "yellow",
              ],
              [
                "< 50",
                QUIZ_HISTORY.filter((quiz) => quiz.score < 50).length,
                "coral",
              ],
            ].map(([label, count, tone]) => (
              <div className="user-progress-row" key={label}>
                <div>
                  <span>{label}</span>
                  <strong>{count}</strong>
                </div>
                <div className="user-progress-track">
                  <span className={tone} style={{ width: `${Math.min(100, count * 20)}%` }} />
                </div>
              </div>
            ))}
          </section>

          <Card className="dashboard-streak-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/80">Streak Belajar</p>
                <p className="text-3xl font-extrabold mt-1">
                  <AnimatedCounter value={stats?.streakDays ?? 0} /> 🔥
                </p>
                <p className="text-xs text-white/70 mt-1">Hari berturut-turut</p>
              </div>
            </div>
            <div className="flex gap-1 mt-3">
              {Array.from({ length: 7 }).map((_, index) => (
                <div
                  key={index}
                  className={`flex-1 h-1.5 rounded-full ${index < (stats?.streakDays ?? 0) ? "bg-white/80" : "bg-white/30"}`}
                />
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ================= COURSE + QUIZ HISTORY ================= */}
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        {currentCourse && (
          <section className="user-panel user-course-panel">
            <div className="user-panel-heading">
              <div>
                <p className="user-section-kicker">SEDANG DIPELAJARI</p>
                <h3>{currentCourse.title}</h3>
                <p>Pelan-pelan tidak apa-apa, yang penting terus jalan.</p>
              </div>
              <span className="user-level-pill">{currentCourse.level}</span>
            </div>

            <div className="user-course-summary">
              {currentCourse.thumbnail && (
                <img src={currentCourse.thumbnail} alt="" />
              )}
              <div className="min-w-0 flex-1">
                <div className="user-course-meta">
                  <span>Progress kursus</span>
                  <strong>
                    {currentCourse.completedLessons ?? 0}/{currentCourse.totalLessons ?? 0}
                  </strong>
                </div>
                <div className="user-course-track">
                  <span
                    style={{
                      width: `${
                        currentCourse.totalLessons
                          ? ((currentCourse.completedLessons ?? 0) / currentCourse.totalLessons) * 100
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
                  const isCurrent = resume?.lessonId === lesson.id;
                  const isCompleted =
                    lesson.completed === true ||
                    lesson.isCompleted === true ||
                    lesson.status === "completed";

                  const status = isCompleted ? "completed" : isCurrent ? "current" : "locked";

                  return (
                    <div
                      key={lesson.id ?? index}
                      className={`user-lesson-row ${status === "current" ? "is-current" : ""}`}
                    >
                      <span className={`user-lesson-status ${status}`}>
                        {status === "completed" ? (
                          <CheckCircleIcon size={15} />
                        ) : status === "current" ? (
                          <PlayIcon size={11} />
                        ) : (
                          <LockIcon size={13} />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p>{lesson.title ?? lesson.name ?? `Pelajaran ${index + 1}`}</p>
                        <span>{lesson.duration ?? ""}</span>
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
                onClick={() => setShowAllLessons((value) => !value)}
              >
                {showAllLessons ? "Tampilkan lebih sedikit" : "Lihat semua pelajaran"}
              </button>
            )}
          </section>
        )}

        <div className="space-y-5">
          <section className="user-panel">
            <div className="user-panel-heading">
              <div>
                <h3>Riwayat Kuis Terbaru</h3>
                <p>Nilai terbaikmu layak dirayakan</p>
              </div>
              <span className="user-count-pill">{QUIZ_HISTORY.length} kuis</span>
            </div>

            <div className="space-y-2">
              {QUIZ_HISTORY.slice(0, 5).map((quiz, index) => (
                <div key={quiz.id ?? quiz.quizId ?? index} className="user-list-row">
                  <span className={`user-score ${quiz.passed ? "passed" : "failed"}`}>
                    {quiz.score ?? 0}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p>{quiz.lesson ?? quiz.quizTitle ?? "Kuis"}</p>
                    <span>
                      {quiz.date ??
                        (quiz.takenAt
                          ? new Date(quiz.takenAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                            })
                          : "")}
                    </span>
                  </div>
                  <span className={`user-result-badge ${quiz.passed ? "passed" : "failed"}`}>
                    {quiz.passed ? "Lulus" : "Ulangi"}
                  </span>
                </div>
              ))}
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
        </div>
      </div>

      {/* ================= ALL COURSES ================= */}
      <section className="user-panel">
        <div className="user-panel-heading">
          <div>
            <h3>Semua Kursus</h3>
            <p>Pilih petualangan belajar yang ingin kamu lanjutkan.</p>
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
              className={`user-mini-course ${course.isLocked ? "is-locked" : ""}`}
            >
              <div className="user-mini-course-image">
                <img src={course.thumbnail} alt="" />
                {!course.isLocked && <span>▶</span>}
              </div>
              <div className="user-mini-course-body">
                <strong>{course.title}</strong>
                <span>{course.totalLessons ?? 0} pelajaran</span>
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
                            ? ((course.completedLessons ?? 0) / course.totalLessons) * 100
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
