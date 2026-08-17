import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/app";
import { Card, Button, Alert } from "../../components/ui/ui";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
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
          <span className="lesson-course-title">{course.title}</span>
          <h1 className="lesson-title">{lesson.title}</h1>
          {course.description && (
            <p className="lesson-subtitle">{course.description}</p>
          )}
        </div>
      </header>

      {/* ── Video ──────────────────────────────────────────────────────── */}
      <div className="lesson-video-section">
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
              <h2 className="lesson-video-title">{lesson.title}</h2>
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
      </div>

      {/* ── Course Progress ────────────────────────────────────────────── */}
      <Card className="lesson-progress-card">
        <div className="lesson-progress-card-header">
          <h2 className="lesson-progress-card-title">Progres Kursus</h2>
          {isCompleted && (
            <span className="lesson-progress-complete-badge">
              <CheckCircleIcon size={14} />
              {allLessonsDone ? "Kursus selesai" : `${progressPct}%`}
            </span>
          )}
        </div>

        <div className="lesson-progress-card-body">
          <div className="lesson-progress-card-text">
            <span className="lesson-progress-card-stat">
              {completedCount} dari {totalLessons} pelajaran selesai
            </span>
            <span className="lesson-progress-card-pct">{progressPct}%</span>
          </div>
          <div className="lesson-progress-card-track">
            <div
              className="lesson-progress-card-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {allLessonsDone && isCompleted && (
          <p className="lesson-progress-done-msg">
            Hebat! Kursus ini sudah selesai.
          </p>
        )}
      </Card>

      {/* ── Next Step ──────────────────────────────────────────────────── */}
      <Card className="lesson-next-step-card">
        {isCompleted ? (
          <div className="lesson-next-step-content">
            <div className="lesson-next-step-text">
              <h2 className="lesson-next-step-title">Langkah Berikutnya</h2>
              {nextLesson ? (
                <p className="lesson-next-step-desc">
                  Yuk, lanjut ke pelajaran berikutnya untuk terus belajar.
                </p>
              ) : allLessonsDone && courseQuiz ? (
                <p className="lesson-next-step-desc">
                  Pelajaran sudah selesai. Sekarang waktunya mencoba quiz untuk menguji apa yang sudah dipelajari.
                </p>
              ) : (
                <p className="lesson-next-step-desc">
                  Semua pelajaran sudah selesai!
                </p>
              )}
            </div>
            <div className="lesson-next-step-action">
              {nextLesson ? (
                <Button size="sm" onClick={() => goTo(nextLesson)}>
                  Lanjut ke pelajaran berikutnya <ArrowRightIcon size={14} />
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
        ) : (
          <div className="lesson-next-step-content">
            <div className="lesson-next-step-text">
              <h2 className="lesson-next-step-title">Langkah Berikutnya</h2>
              <p className="lesson-next-step-desc">
                Tandai pelajaran ini selesai untuk melanjutkan ke pelajaran berikutnya.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* ── Bottom Navigation ──────────────────────────────────────────── */}
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
  );
}
