import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/app";
import { SignLearnAvatar } from "../../components/common/SignLearnAvatar";
import {
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
  const { currentUser, setSelectedCourse, setSelectedLesson, courses, quizHistory } = useApp();
  const navigate = useNavigate();
  const [showAllLessons, setShowAllLessons] = useState(false);
  const [activeDay, setActiveDay] = useState(3);

  const COURSES = courses || [];
  const QUIZ_HISTORY = quizHistory || [];
  const currentCourse = COURSES.find((course) => !course.isLocked) || COURSES[0];
  const currentLesson = currentCourse?.lessons?.find((lesson) => lesson.status === "current");
  const passedQuizzes = QUIZ_HISTORY.filter((quiz) => quiz.passed);
  const avgScore = passedQuizzes.length
    ? Math.round(passedQuizzes.reduce((sum, quiz) => sum + quiz.score, 0) / passedQuizzes.length)
    : 0;
  const completedLessons = COURSES.reduce((sum, course) => sum + course.completedLessons, 0);
  const totalLessons = COURSES.reduce((sum, course) => sum + course.totalLessons, 0);
  const overallPct = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const activeCourses = COURSES.filter((course) => !course.isLocked && course.completedLessons < course.totalLessons).length;
  const firstName = currentUser?.name?.split(" ")[0] || "Teman";

  const visibleLessons = useMemo(
    () => (showAllLessons ? currentCourse?.lessons || [] : (currentCourse?.lessons || []).slice(0, 5)),
    [currentCourse, showAllLessons],
  );

  const continueLearning = () => {
    if (!currentCourse || !currentLesson) return;
    setSelectedCourse(currentCourse.id);
    setSelectedLesson(currentLesson.id);
    navigate("/lesson");
  };

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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
        <UserStatCard label="Kursus Aktif" value={activeCourses} helper="sedang kamu pelajari" icon={<BookIcon size={21} />} tone="blue" />
        <UserStatCard label="Pelajaran Selesai" value={completedLessons} helper={`dari ${totalLessons} pelajaran`} icon={<CheckCircleIcon size={21} />} tone="green" />
        <UserStatCard label="Rata-rata Kuis" value={`${avgScore}%`} helper="pertahankan semangat" icon={<TrophyIcon size={21} />} tone="yellow" />
        <UserStatCard label="Streak Belajar" value="7 hari" helper="jangan putus hari ini" icon={<FireIcon size={21} />} tone="coral" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <section className="user-panel">
          <div className="user-panel-heading">
            <div><h3>Aktivitas Minggu Ini</h3><p>Klik harinya untuk melihat semangat belajarmu.</p></div>
            <span className="user-panel-icon"><ChartIcon size={18} /></span>
          </div>
          <div className="user-activity-chart" aria-label="Grafik aktivitas belajar minggu ini">
            {WEEK.map((item, index) => {
              const active = activeDay === index;
              return (
                <button key={item.day} type="button" className={`user-bar-column ${active ? "is-active" : ""}`} onClick={() => setActiveDay(index)} aria-pressed={active}>
                  <span className="user-bar-value">{item.lessons} pelajaran</span>
                  <span className="user-bar-area"><span style={{ height: `${item.value}%` }} /></span>
                  <span className="user-bar-day">{item.day}</span>
                </button>
              );
            })}
          </div>
          <div className="user-activity-summary">
            <span><strong>{WEEK[activeDay].day}</strong> kamu belajar <strong>{WEEK[activeDay].lessons} pelajaran</strong>.</span>
            <button type="button" onClick={() => navigate("/progress")}>Lihat progress <ArrowRightIcon size={14} /></button>
          </div>
        </section>

        <section className="user-panel user-quiz-panel">
          <div className="user-panel-heading"><div><h3>Distribusi Nilai Kuis</h3><p>Ringkasan hasil kuis kamu.</p></div><span className="user-panel-icon yellow"><TrophyIcon size={18} /></span></div>
          {[
            ["90 - 100", QUIZ_HISTORY.filter((q) => q.score >= 90).length, "green"],
            ["70 - 89", QUIZ_HISTORY.filter((q) => q.score >= 70 && q.score < 90).length, "blue"],
            ["50 - 69", QUIZ_HISTORY.filter((q) => q.score >= 50 && q.score < 70).length, "yellow"],
            ["< 50", QUIZ_HISTORY.filter((q) => q.score < 50).length, "coral"],
          ].map(([label, count, tone]) => (
            <div className="user-progress-row" key={label}>
              <div><span>{label}</span><strong>{count}</strong></div>
              <div className="user-progress-track"><span className={tone} style={{ width: `${Math.min(100, count * 20)}%` }} /></div>
            </div>
          ))}
        </section>
      </div>

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

          <section className="user-panel user-streak-panel">
            <div className="user-streak-top"><div><p>Streak belajar</p><strong>7 hari</strong><span>Hebat! Pertahankan sampai besok.</span></div><div className="user-streak-icon"><FireIcon size={27} /></div></div>
            <div className="user-streak-days">{Array.from({ length: 7 }).map((_, index) => <span key={index} title={`Hari ${index + 1} aktif`} />)}</div>
          </section>
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
