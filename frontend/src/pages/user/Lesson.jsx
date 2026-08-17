import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/app";
import { Card, Button, Badge, Alert } from "../../components/ui/ui";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  LockIcon,
} from "../../components/ui/Icons";
import YouTubeLesson from "../../features/lesson/YouTubeLesson";
import { formatDuration } from "../../features/lesson/youtube";

/**
 * Halaman pelajaran.
 *
 * Isinya sepenuhnya berasal dari database. Versi sebelumnya menampilkan daftar
 * kosakata dan tujuan belajar yang ditulis langsung di berkas ini — semuanya
 * tentang abjad, dan karena itu muncul sama persis pada pelajaran buah maupun
 * transportasi. Untuk aplikasi bahasa isyarat, deskripsi isyarat yang tidak
 * dapat diverifikasi lebih berbahaya daripada halaman yang lebih sepi:
 * mengajarkan isyarat yang keliru lebih buruk daripada tidak mengajarkannya.
 */
export default function Lesson() {
  const { selectedCourse, selectedLessonId, selectLesson, startLesson, completeLesson } =
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
    // Pelajaran berganti berarti durasi dan pesan milik pelajaran sebelumnya
    // tidak lagi berlaku.
    setDuration(null);
    setError("");
    setJustCompleted(false);
  }, [lessonId]);

  // Menonton menandai kursus "sedang dipelajari"; tanpa ini ringkasan di
  // /courses tidak pernah tahu ada kursus yang sudah dibuka.
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

  const goTo = (target) => {
    if (!target) return;
    selectLesson(target.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="lesson-page space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate("/course-detail")}
          className="flex min-h-11 items-center gap-2 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
        >
          <ArrowLeftIcon size={16} />
          Kembali ke {course.title}
        </button>
        <Badge variant="primary">
          Pelajaran {index + 1} dari {lessons.length}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card padding="none" className="overflow-hidden">
            <YouTubeLesson
              videoUrl={lesson.videoUrl}
              title={lesson.title}
              onDurationKnown={setDuration}
              onStarted={markStarted}
              onEnded={markComplete}
            />

            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] p-4">
              <div className="min-w-0">
                <h1 className="truncate font-bold text-[var(--text)]">{lesson.title}</h1>
                <p className="flex items-center gap-1.5 text-xs text-[var(--text-subtle)]">
                  {course.title}
                  {shownDuration && (
                    <>
                      <span aria-hidden="true">•</span>
                      <ClockIcon size={12} />
                      {shownDuration}
                    </>
                  )}
                </p>
              </div>

              {isCompleted ? (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--success,#15A66E)]">
                  <CheckCircleIcon size={16} /> Selesai
                </span>
              ) : (
                <Button size="sm" onClick={markComplete} disabled={saving}>
                  <CheckCircleIcon size={15} />
                  {saving ? "Menyimpan…" : "Tandai selesai"}
                </Button>
              )}
            </div>
          </Card>

          {error && <Alert type="error" message={error} onClose={() => setError("")} />}

          {(lesson.description || course.description) && (
            <Card>
              <h2 className="mb-3 text-base font-bold text-[var(--text)]">
                Tentang pelajaran ini
              </h2>
              {lesson.description && (
                <p className="mb-3 text-sm leading-relaxed text-[var(--text-muted)]">
                  {lesson.description}
                </p>
              )}
              {course.description && (
                <p className="text-sm leading-relaxed text-[var(--text-subtle)]">
                  {course.description}
                </p>
              )}
            </Card>
          )}

          <div className="flex flex-wrap gap-3">
            {prevLesson && (
              <Button variant="outline" size="sm" onClick={() => goTo(prevLesson)}>
                <ArrowLeftIcon size={14} /> Pelajaran sebelumnya
              </Button>
            )}
            {nextLesson && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => goTo(nextLesson)}
                disabled={nextLesson.status === "locked"}
              >
                Pelajaran berikutnya <ArrowRightIcon size={14} />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {lessons.length > 1 && (
            <Card>
              <h2 className="mb-4 font-bold text-[var(--text)]">Navigasi pelajaran</h2>
              <div className="space-y-2">
                {lessons.map((item, i) => {
                  const active = item.id === lesson.id;
                  const locked = item.status === "locked";
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => !locked && goTo(item)}
                      disabled={locked}
                      aria-current={active ? "true" : undefined}
                      className={`flex w-full min-h-11 items-center gap-3 rounded-xl p-2.5 text-left text-sm transition-colors ${
                        active
                          ? "bg-[var(--primary-light)]"
                          : locked
                            ? "cursor-not-allowed opacity-50"
                            : "hover:bg-[var(--surface-3)]"
                      }`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-3)] text-xs font-semibold text-[var(--text-muted)]">
                        {item.status === "completed" ? <CheckIconMark /> : i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[var(--text)]">
                        {item.title}
                      </span>
                      {locked && <LockIcon size={14} className="text-[var(--text-subtle)]" />}
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}

function CheckIconMark() {
  return <CheckCircleIcon size={14} className="text-[var(--success,#15A66E)]" />;
}
