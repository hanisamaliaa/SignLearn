import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/app";
import { Card, Button, Alert } from "../../components/ui/ui";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  LockIcon,
  PlayIcon,
} from "../../components/ui/Icons";
import YouTubeLesson from "../../features/lesson/YouTubeLesson";
import { formatDuration } from "../../features/lesson/youtube";

export default function Lesson() {
  const { selectedCourse, selectedLessonId, selectLesson, startLesson, completeLesson, isPremium } =
    useApp();
  const navigate = useNavigate();

  const [duration, setDuration] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [justCompleted, setJustCompleted] = useState(false);

  const course = selectedCourse || { lessons: [] };
  const lessons = course.lessons ?? [];
  const lesson =
    lessons.find((l) => l.id === selectedLessonId) ||
    lessons.find((l) => l.status === "current") ||
    lessons[0];

  const lessonId = lesson?.id;
  useEffect(() => {
    setDuration(null);
    setError("");
    setJustCompleted(false);
  }, [lessonId]);

  const markStarted = useCallback(() => {
    if (lessonId) startLesson(lessonId);
  }, [lessonId, startLesson]);

  const markComplete = useCallback(async () => {
    if (!lessonId || saving) return;
    setSaving(true);
    setError("");
    const result = await completeLesson(lessonId);
    setSaving(false);
    if (result?.success) setJustCompleted(true);
    else setError(result?.message || "Progres gagal disimpan. Coba lagi.");
  }, [lessonId, saving, completeLesson]);

  if (!lesson) {
    navigate("/course-detail");
    return null;
  }

  const index = lessons.findIndex((l) => l.id === lesson.id);
  const prevLesson = index > 0 ? lessons[index - 1] : null;
  const nextLesson = index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : null;
  const isCompleted = justCompleted || lesson.status === "completed";
  const shownDuration = formatDuration(duration) ?? lesson.duration ?? null;

  const completedCount = lessons.filter((l) => l.status === "completed" || l.id === lessonId && isCompleted).length;
  const totalLessons = lessons.length;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const courseQuiz = course.quizzes?.[0] ?? null;
  const allLessonsDone = totalLessons > 0 && lessons.every((l) => l.status === "completed" || l.id === lessonId && isCompleted);

  const goTo = (target) => {
    if (!target) return;
    selectLesson(target.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="lesson-page animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="lesson-header">
        <div className="lesson-header-top">
          <button
            onClick={() => navigate("/course-detail")}
            className="lesson-back-link"
          >
            <ArrowLeftIcon size={16} />
            <span>Kembali ke {course.title}</span>
          </button>
          <span className="lesson-counter">
            Pelajaran {index + 1} dari {totalLessons}
          </span>
        </div>

        <div className="lesson-header-info">
          <h1 className="lesson-course-title">{course.title}</h1>
          <h2 className="lesson-title">{lesson.title}</h2>
          {course.description && (
            <p className="lesson-subtitle">{course.description}</p>
          )}
        </div>

        {totalLessons > 1 && (
          <div className="lesson-progress-bar-wrap">
            <div className="lesson-progress-bar-track">
              <div
                className="lesson-progress-bar-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="lesson-progress-bar-label">{progressPct}% selesai</span>
          </div>
        )}
      </header>

      {/* ── Workspace grid ──────────────────────────────────────────────── */}
      <div className="lesson-workspace">
        {/* ── Main content ──────────────────────────────────────────────── */}
        <div className="lesson-main">
          {/* Video card */}
          <Card padding="none" className="lesson-video-card">
            <YouTubeLesson
              videoUrl={lesson.videoUrl}
              title={lesson.title}
              onDurationKnown={setDuration}
              onStarted={markStarted}
              onEnded={markComplete}
            />

            <div className="lesson-video-meta">
              <div className="lesson-video-info">
                <h3 className="lesson-video-title">{lesson.title}</h3>
                <p className="lesson-video-sub">
                  {course.title}
                  {shownDuration && (
                    <>
                      <span aria-hidden="true"> · </span>
                      <ClockIcon size={12} />
                      {' '}{shownDuration}
                    </>
                  )}
                </p>
              </div>

              {isCompleted ? (
                <div className="lesson-completion-badge">
                  <CheckCircleIcon size={16} />
                  <span>Pelajaran selesai</span>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={markComplete}
                  disabled={saving}
                  className="lesson-complete-btn"
                >
                  <CheckCircleIcon size={15} />
                  {saving ? "Menyimpan…" : "Tandai selesai"}
                </Button>
              )}
            </div>
          </Card>

          {error && (
            <Alert type="error" message={error} onClose={() => setError("")} />
          )}

          {/* Completion celebration */}
          {isCompleted && (
            <div className="lesson-completion-msg animate-fade-in">
              <CheckCircleIcon size={18} className="text-[var(--success,#15A66E)]" />
              <p>Bagus! Kamu sudah menyelesaikan pelajaran ini.</p>
            </div>
          )}

          {/* About lesson */}
          {(lesson.description || course.description) && (
            <Card className="lesson-about-card">
              <h2 className="lesson-section-title">Tentang pelajaran ini</h2>
              {lesson.description && (
                <p className="lesson-about-text">
                  {lesson.description}
                </p>
              )}
              {course.description && lesson.description && course.description !== lesson.description && (
                <p className="lesson-about-text lesson-about-secondary">
                  {course.description}
                </p>
              )}
            </Card>
          )}

          {/* Bottom navigation */}
          <div className="lesson-nav-row">
            {prevLesson ? (
              <Button variant="outline" size="sm" onClick={() => goTo(prevLesson)}>
                <ArrowLeftIcon size={14} /> Pelajaran sebelumnya
              </Button>
            ) : <div />}
            {nextLesson ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => goTo(nextLesson)}
                disabled={nextLesson.status === "locked"}
              >
                Pelajaran berikutnya <ArrowRightIcon size={14} />
              </Button>
            ) : allLessonsDone && courseQuiz ? (
              <Button
                size="sm"
                onClick={() => {
                  if (!isPremium) {
                    navigate("/course-detail");
                    return;
                  }
                  selectLesson(null);
                  navigate("/quiz");
                }}
              >
                {isPremium ? "Mulai Quiz" : "🔒 Quiz Premium"} <ArrowRightIcon size={14} />
              </Button>
            ) : null}
          </div>
        </div>

        {/* ── Companion panel ─────────────────────────────────────────── */}
        <aside className="lesson-companion">
          {/* Course progress */}
          <Card className="lesson-companion-card">
            <h2 className="lesson-companion-title">Progres Kursus</h2>
            <div className="lesson-companion-progress">
              <div className="lesson-companion-progress-track">
                <div
                  className="lesson-companion-progress-fill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="lesson-companion-progress-text">
                {completedCount} dari {totalLessons} pelajaran · {progressPct}%
              </span>
            </div>

            {/* Lesson list */}
            {totalLessons > 1 && (
              <nav className="lesson-companion-list" aria-label="Daftar pelajaran">
                {lessons.map((item) => {
                  const active = item.id === lesson.id;
                  const completed = item.status === "completed" || (item.id === lessonId && isCompleted);
                  const locked = item.status === "locked";
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => !locked && goTo(item)}
                      disabled={locked}
                      aria-current={active ? "step" : undefined}
                      className={`lesson-companion-item ${active ? "is-active" : ""} ${completed ? "is-completed" : ""} ${locked ? "is-locked" : ""}`}
                    >
                      <span className="lesson-companion-dot">
                        {completed ? (
                          <CheckCircleIcon size={14} />
                        ) : active ? (
                          <span className="lesson-companion-dot-active" />
                        ) : locked ? (
                          <LockIcon size={12} />
                        ) : (
                          <span className="lesson-companion-dot-empty" />
                        )}
                      </span>
                      <span className="lesson-companion-label">{item.title}</span>
                    </button>
                  );
                })}

                {/* Quiz entry */}
                {courseQuiz && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isPremium) return;
                      selectLesson(null);
                      navigate("/quiz");
                    }}
                    disabled={!isPremium && !allLessonsDone}
                    className={`lesson-companion-item ${allLessonsDone ? "is-active" : ""} ${!isPremium && allLessonsDone ? "is-locked" : ""}`}
                  >
                    <span className="lesson-companion-dot">
                      {allLessonsDone && isPremium ? (
                        <PlayIcon size={12} />
                      ) : (
                        <LockIcon size={12} />
                      )}
                    </span>
                    <span className="lesson-companion-label">
                      Quiz Akhir
                      {!isPremium && allLessonsDone && <span className="lesson-companion-badge">Premium</span>}
                    </span>
                  </button>
                )}
              </nav>
            )}
          </Card>

          {/* Next step CTA */}
          <Card className="lesson-companion-card lesson-next-card">
            {isCompleted ? (
              <>
                <p className="lesson-next-label">Langkah berikutnya</p>
                {nextLesson ? (
                  <Button fullWidth size="sm" onClick={() => goTo(nextLesson)}>
                    Lanjut ke pelajaran berikutnya <ArrowRightIcon size={14} />
                  </Button>
                ) : allLessonsDone && courseQuiz ? (
                  <Button fullWidth size="sm" onClick={() => {
                    if (!isPremium) { navigate("/course-detail"); return; }
                    selectLesson(null);
                    navigate("/quiz");
                  }}>
                    {isPremium ? "Mulai Quiz" : "🔒 Quiz Premium"}
                  </Button>
                ) : (
                  <p className="lesson-next-done">Semua pelajaran selesai!</p>
                )}
              </>
            ) : (
              <>
                <p className="lesson-next-label">Setelah menonton</p>
                <p className="lesson-next-hint">Tandai pelajaran ini selesai untuk melanjutkan ke pelajaran berikutnya.</p>
              </>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
