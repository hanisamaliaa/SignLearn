import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/app";
import { Card, Button, Badge } from "../../components/ui/ui";
import {
  ArrowLeftIcon,
  PlayIcon,
  CheckCircleIcon,
  LockIcon,
  ClockIcon,
  BookIcon,
} from "../../components/ui/Icons";
import { formatEstimatedHours } from "../../features/lesson/courseMeta";
import { getCourseThumbnail } from "../../utils/courseThumbnail";
import PremiumModal from "../../components/premium/PremiumModal";

/** Thumbnail dengan fallback untuk halaman detail kursus. */
function CourseThumbnail({ src, alt, className }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`${className} flex items-center justify-center text-5xl bg-[var(--surface-3)]`} aria-hidden="true">
        📚
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}

export default function CourseDetail() {
  const { selectedCourse, setSelectedLesson, isPremium } = useApp();
  const navigate = useNavigate();
  const [premiumOpen, setPremiumOpen] = useState(false);

  const course = selectedCourse || {
    lessons: [],
    totalLessons: 0,
    completedLessons: 0,
    quizzes: [],
  };

  const pct = course.totalLessons
    ? Math.round((course.completedLessons / course.totalLessons) * 100)
    : 0;

  const courseQuiz = course.quizzes?.[0] ?? null;
  const kkm = courseQuiz?.minPassingScore ?? 70;
  const currentLesson = course.lessons.find((l) => l.status === "current");
  const allLessonsCompleted =
    course.lessons.length > 0 &&
    course.lessons.every((l) => l.status === "completed");

  const handleLessonClick = (lesson) => {
    if (lesson.status === "locked") return;
    setSelectedLesson(lesson.id);
    navigate("/lesson");
  };

  const handleQuizClick = () => {
    if (!isPremium) {
      setPremiumOpen(true);
      return;
    }
    setSelectedLesson(null);
    navigate("/quiz");
  };

  const handleCta = () => {
    if (allLessonsCompleted && courseQuiz) {
      handleQuizClick();
    } else if (currentLesson) {
      setSelectedLesson(currentLesson.id);
      navigate("/lesson");
    }
  };

  const ctaLabel = useMemo(() => {
    if (course.isLocked) return null;
    if (allLessonsCompleted && courseQuiz) {
      return isPremium ? "Mulai Quiz Akhir" : "Buka Quiz dengan Premium";
    }
    if (currentLesson) {
      const idx = course.lessons.findIndex((l) => l.id === currentLesson.id);
      return `Lanjutkan Pelajaran ${idx + 1}`;
    }
    if (course.lessons.length > 0) return "Mulai Belajar";
    return null;
  }, [currentLesson, allLessonsCompleted, courseQuiz, isPremium, course.lessons]);

  return (
    <div className="course-detail space-y-6 animate-fade-in">
      <button
        onClick={() => navigate("/courses")}
        className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
      >
        <ArrowLeftIcon size={16} />
        Kembali ke Katalog Kursus
      </button>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="course-hero bg-gradient-to-br from-[#1A2332] to-[#2D3748] rounded-2xl overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          <div className="lg:w-2/5 relative">
            <CourseThumbnail
              src={getCourseThumbnail(course)}
              alt={course.title}
              className="w-full h-56 lg:h-full object-cover opacity-70"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#1A2332]/60" />
          </div>
          <div className="flex-1 p-8 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Badge
                variant="primary"
                className="bg-[#4F8EF7]/20 text-[#93C5FD]"
              >
                {course.category}
              </Badge>
              <Badge
                variant={course.level === "Pemula" ? "success" : "warning"}
              >
                {course.level}
              </Badge>
              {course.isLocked && <Badge variant="muted">🔒 Terkunci</Badge>}
            </div>
            <h1 className="text-3xl font-extrabold mb-3">{course.title}</h1>
            <p className="text-white/70 text-sm leading-relaxed mb-5">
              {course.description}
            </p>
            <div className="flex flex-wrap gap-5 mb-5 text-sm text-white/70">
              <div className="flex items-center gap-1.5">
                <BookIcon size={15} /> {course.totalLessons} Pelajaran
              </div>
              {formatEstimatedHours(course.estimatedHours) && (
                <div className="flex items-center gap-1.5">
                  <ClockIcon size={15} />{" "}
                  {formatEstimatedHours(course.estimatedHours)} estimasi
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span>🎯</span> Nilai KKM: {kkm}
              </div>
            </div>
            {!course.isLocked && (
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-white/70">Progress Belajar</span>
                  <span className="font-semibold">
                    {course.completedLessons}/{course.totalLessons} selesai (
                    {pct}%)
                  </span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#4F8EF7] rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Locked course notice ──────────────────────────────────────── */}
      {course.isLocked && (
        <Card>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-[var(--surface-3)] rounded-full flex items-center justify-center mx-auto mb-4">
              <LockIcon size={28} className="text-[var(--text-muted)]" />
            </div>
            <h3 className="font-bold text-[var(--text)] mb-2">Kursus ini belum tersedia</h3>
            <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
              Kursus ini sedang dalam persiapan. Nantikan pembaruan selanjutnya!
            </p>
            <Button variant="secondary" className="mt-5" onClick={() => navigate("/courses")}>
              <ArrowLeftIcon size={14} /> Kembali ke Katalog
            </Button>
          </div>
        </Card>
      )}

      {/* ── Main grid ────────────────────────────────────────────────── */}
      {!course.isLocked && (
      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Left column: Lessons + Quiz ────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Daftar Pelajaran */}
          <Card>
            <h2 className="text-lg font-bold text-[var(--text)] mb-5">
              Daftar Pelajaran
            </h2>
            {course.lessons.length === 0 ? (
              <div className="text-center py-10">
                <LockIcon
                  size={32}
                  className="text-[var(--text-subtle)] mx-auto mb-3"
                />
                <p className="text-[var(--text-muted)]">
                  Pelajaran akan tersedia setelah kursus dibuka.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {course.lessons.map((lesson, idx) => (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    index={idx}
                    onClick={() => handleLessonClick(lesson)}
                  />
                ))}
              </div>
            )}
          </Card>

          {/* Evaluasi — quiz is a separate section */}
          {courseQuiz && (
            <Card>
              <h2 className="text-lg font-bold text-[var(--text)] mb-2">
                Evaluasi
              </h2>
              <p className="text-sm text-[var(--text-muted)] mb-5">
                Uji kemampuanmu setelah menyelesaikan seluruh materi.
              </p>
              <QuizCard
                quiz={courseQuiz}
                isPremium={isPremium}
                onAction={handleQuizClick}
              />
            </Card>
          )}
        </div>

        {/* ── Right column: Sidebar ──────────────────────────────────── */}
        <div className="space-y-4">
          {/* Informasi Kursus */}
          <Card>
            <h3 className="font-bold text-[var(--text)] mb-4">
              Informasi Kursus
            </h3>
            <div className="space-y-3">
              <InfoRow label="Kategori" value={course.category} />
              <InfoRow label="Level" value={course.level} />
              <InfoRow
                label="Total Pelajaran"
                value={`${course.totalLessons} pelajaran`}
              />
              <InfoRow
                label="Durasi Estimasi"
                value={formatEstimatedHours(course.estimatedHours) ?? "—"}
              />
              <InfoRow label="Nilai KKM" value={`${kkm} / 100`} />
              <InfoRow label="Tipe Konten" value="Video + Kuis + AI Practice" />
            </div>
          </Card>

          {/* Cara Belajar */}
          <Card className="bg-[var(--primary-light)] border-[#4F8EF7]/20">
            <div className="flex items-start gap-3">
              <span className="text-xl">📌</span>
              <div>
                <p className="font-semibold text-[var(--primary)] text-sm mb-2">
                  Cara Belajar
                </p>
                <ul className="space-y-1.5 text-xs text-[var(--text-muted)] leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-[#2ECC71] mt-0.5">✓</span>
                    Video pembelajaran dapat diakses gratis
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#2ECC71] mt-0.5">✓</span>
                    Progress tersimpan otomatis
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#F4B400] mt-0.5">⭐</span>
                    Quiz &amp; latihan AI tersedia untuk Premium
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Context-aware CTA */}
          {ctaLabel && (
            <Button fullWidth size="lg" onClick={handleCta}>
              {allLessonsCompleted && courseQuiz ? (
                isPremium ? "🧠 " : "🔒 "
              ) : (
                <PlayIcon size={16} />
              )}
              {ctaLabel}
            </Button>
          )}
        </div>
      </div>
      )}

      <PremiumModal
        open={premiumOpen}
        onClose={() => setPremiumOpen(false)}
      />
    </div>
  );
}

/* ── Lesson row ──────────────────────────────────────────────────────── */

function LessonRow({ lesson, index, onClick }) {
  const isCompleted = lesson.status === "completed";
  const isCurrent = lesson.status === "current";

  return (
    <div
      className={`course-lesson-row flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
        isCurrent
          ? "border-[#4F8EF7] bg-[var(--primary-light)]"
          : isCompleted
            ? "border-[var(--border)] bg-[var(--surface-2)] hover:border-[#2ECC71]/40"
            : "border-[var(--border)] bg-[var(--surface)] hover:border-[#4F8EF7]/40"
      }`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`Pelajaran ${index + 1}: ${lesson.title}`}
    >
      {/* Number / status indicator */}
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
          isCompleted
            ? "bg-[#2ECC71] text-white"
            : isCurrent
              ? "bg-[#4F8EF7] text-white"
              : "bg-[#E2E8F0] text-[var(--text-muted)]"
        }`}
      >
        {isCompleted ? (
          <CheckCircleIcon size={16} />
        ) : (
          index + 1
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium text-[var(--text-subtle)]">
            Pelajaran {index + 1}
          </span>
          {isCompleted && <Badge variant="success">Selesai</Badge>}
          {isCurrent && (
            <Badge variant="primary">Sedang Dipelajari</Badge>
          )}
        </div>
        <p className="font-semibold truncate text-[var(--text)]">
          {lesson.title}
        </p>
        <p className="text-xs text-[var(--text-subtle)] flex items-center gap-1 mt-0.5">
          <ClockIcon size={11} /> {lesson.duration}
          <span className="mx-1">•</span>
          Video • Gratis
        </p>
      </div>

      {/* Action button */}
      <div className="flex-shrink-0">
        {isCompleted ? (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            Pelajari Lagi
          </Button>
        ) : isCurrent ? (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            <PlayIcon size={13} /> Lanjutkan
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            <PlayIcon size={13} /> Mulai
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── Quiz card (Evaluasi section) ────────────────────────────────────── */

function QuizCard({ quiz, isPremium, onAction }) {
  return (
    <div
      className={`course-quiz-card rounded-xl border-2 p-5 transition-all ${
        isPremium
          ? "border-[#4F8EF7]/30 bg-[var(--primary-light)]"
          : "border-[#F4B400]/30 bg-[var(--warning-light)]"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
            isPremium ? "bg-[#4F8EF7]/10" : "bg-[#F4B400]/10"
          }`}
        >
          🧠
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-[var(--text)] mb-1">
            {quiz.title || "Quiz Akhir"}
          </h3>
          <p className="text-sm text-[var(--text-muted)] mb-3">
            {quiz.totalQuestions ?? 5} soal pilihan + praktik bahasa isyarat
            menggunakan AI Camera
          </p>
          <div className="flex items-center gap-3 mb-4">
            <Badge variant={isPremium ? "primary" : "warning"}>
              {isPremium ? "Premium" : "⭐ Premium"}
            </Badge>
            <span className="text-xs text-[var(--text-subtle)]">
              Nilai minimum: {quiz.minPassingScore ?? 70}
            </span>
          </div>
          {isPremium ? (
            <Button onClick={onAction}>Mulai Quiz</Button>
          ) : (
            <div>
              <p className="text-xs text-[#7A5A00] mb-3">
                🔒 Berlangganan untuk membuka quiz dan latihan AI
              </p>
              <Button variant="secondary" onClick={onAction}>
                Buka dengan Premium
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Info row helper ─────────────────────────────────────────────────── */

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="font-medium text-[var(--text)]">{value}</span>
    </div>
  );
}
