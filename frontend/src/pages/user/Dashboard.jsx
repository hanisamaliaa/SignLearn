import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/app";
import { SignLearnAvatar } from "../../components/common/SignLearnAvatar";
import {
  Card,
  Button,
  ProgressBar,
  Badge,
  StatCard,
} from "../../components/ui/ui";
import {
  BookIcon,
  TrophyIcon,
  FireIcon,
  ArrowRightIcon,
  BookIcon,
  ChartIcon,
  CheckCircleIcon,
  FireIcon,
  LockIcon,
  PlayIcon,
  StarIcon,
  TrophyIcon,
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

  const COURSES = courses;
  const QUIZ_HISTORY = quizHistory;

  /**
   * Kursus yang ditampilkan di kartu "Kursus Saat Ini".
   *
   * Diambil dari `continueLearning` milik server, bukan `courses[0]`. Server
   * memprioritaskan kursus yang paling baru disentuh — tanpa itu, pengguna
   * yang sedang di kursus ketiga terus dilempar kembali ke kursus pertama.
   */
  const resume = dashboard?.continueLearning ?? null;
  const currentCourse =
    COURSES.find((c) => c.id === resume?.courseId) ?? COURSES[0] ?? null;
  // `continueLearning` memakai lessonId/lessonTitle; UI di bawah membaca id/title.
  const currentLesson = resume
    ? { id: resume.lessonId, title: resume.lessonTitle }
    : null;

  const passedQuizzes = QUIZ_HISTORY.filter((q) => q.passed);
  const avgScore = passedQuizzes.length
    ? Math.round(passedQuizzes.reduce((sum, quiz) => sum + quiz.score, 0) / passedQuizzes.length)
    : 0;

  /**
   * Aktivitas terbaru pengguna INI, bukan feed global.
   *
   * Sebelumnya memakai `RECENT_ACTIVITIES` dari mock — daftar berisi nama
   * orang lain yang tampil di dashboard pribadi setiap pengguna.
   */
  const recentActivities = QUIZ_HISTORY.slice(0, 4).map((q) => ({
    id: q.quizId,
    user: currentUser?.name ?? "Anda",
    action: `${q.passed ? "Lulus" : "Mengerjakan"} kuis "${q.quizTitle}" dengan skor ${q.score}`,
    time: new Date(q.takenAt).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    }),
    type: "quiz",
  }));

  return (
    <div className="user-dashboard space-y-6 animate-fade-in">
      <section className="user-dashboard-hero">
        <div>
          <p className="user-eyebrow">SIGNLEARN • AREA BELAJAR</p>
          <h1 className="user-welcome-title">Hai, {firstName}! 👋</h1>
          <p className="user-welcome-copy">Siap belajar bahasa isyarat hari ini?</p>
        </div>
        <button type="button" className="user-goal-pill" onClick={() => navigate("/progress")}>
          <span className="user-goal-star">★</span>
          <span><strong>Target harian</strong><small>3 / 4 pelajaran</small></span>
        </button>
      </section>

      <section className="user-welcome-card">
        <div className="user-welcome-decoration user-welcome-decoration-one" />
        <div className="user-welcome-decoration user-welcome-decoration-two" />
        <div className="user-welcome-card-content">
          <div className="user-welcome-avatar-wrap">
            <SignLearnAvatar id={currentUser?.profile?.avatar} size="xl" />
            <span className="user-welcome-avatar-badge">★</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="user-chip-row">
              <span className="user-chip">{PROFILE_LABEL[currentUser?.profileType] || "Pelajar"}</span>
              <span className="user-chip user-chip-green"><StarIcon size={13} /> {avgScore}% rata-rata kuis</span>
            </div>
            <h2>Wow, kamu hebat!</h2>
            <p>Kamu sudah menyelesaikan <strong>{completedLessons} dari {totalLessons}</strong> pelajaran. Teruskan perjalananmu sampai level berikutnya.</p>
            <div className="user-level-progress" role="progressbar" aria-label="Progress belajar keseluruhan" aria-valuemin={0} aria-valuemax={100} aria-valuenow={overallPct}>
              <div className="user-level-progress-top"><span>Progress belajar</span><strong>{overallPct}%</strong></div>
              <div className="user-level-track"><div style={{ width: `${overallPct}%` }} /></div>
              <div className="user-level-labels"><span>Level {Math.max(1, Math.ceil(overallPct / 25))}</span><span>{Math.min(100, overallPct + 25)}% menuju level berikutnya</span></div>
            </div>
          </div>
          {currentLesson && (
            <div className="user-hero-action">
              <button type="button" className="user-primary-button" onClick={continueLearning}>
                <span className="user-button-icon"><PlayIcon size={15} /></span>
                Lanjutkan belajar
                <ArrowRightIcon size={16} />
              </button>
              <span>Berikutnya: {currentLesson.title}</span>
            </div>
          )}
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Kursus Aktif"
          value={
            COURSES.filter(
              (c) => !c.isLocked && c.completedLessons < c.totalLessons,
            ).length
          }
          icon={<BookIcon size={20} />}
          color="#4F8EF7"
        />
        <StatCard
          label="Pelajaran Selesai"
          value={COURSES.reduce((s, c) => s + c.completedLessons, 0)}
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">
          {currentCourse && (
          <Card>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--text)]">
                  Kursus Saat Ini
                </h2>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">
                  {currentCourse.title}
                </p>
              </div>
              <Badge variant="primary">{currentCourse.level}</Badge>
            </div>
            {currentCourse.thumbnail && (
              <div className="bg-[var(--surface-2)] rounded-xl overflow-hidden mb-4">
                <img
                  src={currentCourse.thumbnail}
                  alt={currentCourse.title}
                  className="w-full h-36 object-cover"
                />
              </div>
            )}
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-[var(--text-muted)]">Progress</span>
              <span className="font-semibold text-[var(--text)]">
                {currentCourse.completedLessons}/{currentCourse.totalLessons}{" "}
                pelajaran
              </span>
            </div>
            <ProgressBar
              value={currentCourse.completedLessons}
              max={currentCourse.totalLessons}
              showLabel
            />

            {resume && resume.courseId === currentCourse.id && (
              <div className="mt-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--primary-light)] border border-[#4F8EF7]/30">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-[#4F8EF7] text-white">
                    <PlayIcon size={10} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-[var(--text)]">
                      {resume.lessonTitle}
                    </p>
                    <p className="text-xs text-[var(--text-subtle)]">
                      Pelajaran berikutnya
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedCourse(resume.courseId);
                      setSelectedLesson(resume.lessonId);
                      navigate("/lesson");
                    }}
                  >
                    Mulai
                  </Button>
                </div>
              </div>
            )}
          </Card>
          )}

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        {currentCourse && (
          <section className="user-panel user-course-panel">
            <div className="user-panel-heading">
              <div><p className="user-section-kicker">SEDANG DIPELAJARI</p><h3>{currentCourse.title}</h3><p>Pelan-pelan tidak apa-apa, yang penting terus jalan.</p></div>
              <span className="user-level-pill">{currentCourse.level}</span>
            </div>
            <div className="user-course-summary">
              <img src={currentCourse.thumbnail} alt="" />
              <div className="min-w-0 flex-1">
                <div className="user-course-meta"><span>Progress kursus</span><strong>{currentCourse.completedLessons}/{currentCourse.totalLessons}</strong></div>
                <div className="user-course-track"><span style={{ width: `${currentCourse.totalLessons ? (currentCourse.completedLessons / currentCourse.totalLessons) * 100 : 0}%` }} /></div>
                <button type="button" onClick={() => { setSelectedCourse(currentCourse.id); navigate("/course-detail"); }} className="user-text-button">Lihat detail kursus <ArrowRightIcon size={14} /></button>
              </div>
            </div>
            <div className="user-lesson-list">
              {visibleLessons.map((lesson) => (
                <div key={lesson.id} className={`user-lesson-row ${lesson.status === "current" ? "is-current" : ""}`}>
                  <span className={`user-lesson-status ${lesson.status}`}>
                    {lesson.status === "completed" ? <CheckCircleIcon size={15} /> : lesson.status === "current" ? <PlayIcon size={11} /> : <LockIcon size={13} />}
                  </span>
                  <div className="min-w-0 flex-1"><p>{lesson.title}</p><span>{lesson.duration}</span></div>
                  {lesson.status === "current" && <button type="button" className="user-small-button" onClick={continueLearning}>Mulai</button>}
                </div>
              ))}
            </div>
            {(currentCourse.lessons?.length || 0) > 5 && (
              <button type="button" className="user-show-more" onClick={() => setShowAllLessons((value) => !value)}>{showAllLessons ? "Tampilkan lebih sedikit" : "Lihat semua pelajaran"}</button>
            )}
          </section>
        )}

        <div className="space-y-5">
          <section className="user-panel">
            <div className="user-panel-heading"><div><h3>Riwayat Kuis Terbaru</h3><p>Nilai terbaikmu layak dirayakan 🎉</p></div><span className="user-count-pill">{QUIZ_HISTORY.length} kuis</span></div>
            <div className="space-y-2">
              {QUIZ_HISTORY.slice(0, 5).map((quiz) => (
                <div key={quiz.id} className="user-list-row">
                  <span className={`user-score ${quiz.passed ? "passed" : "failed"}`}>{quiz.score}</span>
                  <div className="min-w-0 flex-1"><p>{quiz.lesson}</p><span>{quiz.date}</span></div>
                  <span className={`user-result-badge ${quiz.passed ? "passed" : "failed"}`}>{quiz.passed ? "Lulus" : "Ulangi"}</span>
                </div>
              ))}
            </div>
            <button type="button" className="user-full-button" onClick={() => navigate("/progress")}>Lihat semua riwayat <ArrowRightIcon size={14} /></button>
          </section>

          <Card className="bg-gradient-to-br from-[#FF6B6B] to-[#E74C3C] text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/80">Streak Belajar</p>
                <p className="text-3xl font-extrabold mt-1">{stats?.streakDays ?? 0} 🔥</p>
                <p className="text-xs text-white/70 mt-1">
                  Hari berturut-turut
                </p>
              </div>
              <div className="text-5xl opacity-30">🔥</div>
            </div>
            <div className="flex gap-1 mt-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-1.5 bg-[var(--surface)]/60 rounded-full"
                />
              ))}
            </div>
          </Card>
        </div>
      </div>

      <section className="user-panel">
        <div className="user-panel-heading"><div><h3>Semua Kursus</h3><p>Pilih petualangan belajar yang ingin kamu lanjutkan.</p></div><button type="button" className="user-text-button" onClick={() => navigate("/courses")}>Lihat semua <ArrowRightIcon size={14} /></button></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COURSES.slice(0, 4).map((course) => (
            <button key={course.id} type="button" disabled={course.isLocked} onClick={() => { if (!course.isLocked) { setSelectedCourse(course.id); navigate("/course-detail"); } }} className={`user-mini-course ${course.isLocked ? "is-locked" : ""}`}>
              <div className="user-mini-course-image"><img src={course.thumbnail} alt="" />{!course.isLocked && <span>▶</span>}</div>
              <div className="user-mini-course-body"><strong>{course.title}</strong><span>{course.totalLessons} pelajaran</span>{course.isLocked ? <em><LockIcon size={12} /> Terkunci</em> : <div className="user-mini-track"><span style={{ width: `${course.totalLessons ? (course.completedLessons / course.totalLessons) * 100 : 0}%` }} /></div>}</div>
            </button>
          ))}
        </div>
      </section>

    </div>
  );
}

function UserStatCard({ label, value, helper, icon, tone }) {
  return (
    <article className={`user-stat-card ${tone}`}>
      <span className="user-stat-orb" />
      <span className="user-stat-icon">{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{helper}</small>
    </article>
  );
}
