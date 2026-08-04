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

const COURSE_INFO = [
  { label: "Kategori", value: "" },
  { label: "Level", value: "" },
  { label: "Total Pelajaran", value: "" },
  { label: "Durasi Estimasi", value: "" },
  { label: "Nilai KKM", value: "70 / 100" },
  { label: "Tipe Konten", value: "Video + Kuis" },
];

export default function CourseDetail() {
  const { selectedCourse, setSelectedLesson } = useApp();
  const navigate = useNavigate();

  const course = selectedCourse || {
    lessons: [],
    totalLessons: 0,
    completedLessons: 0,
  };
  const pct = course.totalLessons
    ? Math.round((course.completedLessons / course.totalLessons) * 100)
    : 0;

  function statusBg(status) {
    if (status === "completed") return "bg-[#2ECC71]";
    if (status === "current") return "bg-[#4F8EF7]";
    return "bg-[#E2E8F0]";
  }

  const currentLesson = course.lessons.find((l) => l.status === "current");

  return (
    <div className="space-y-6 animate-fade-in">
      <button
        onClick={() => navigate("/courses")}
        className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
      >
        <ArrowLeftIcon size={16} />
        Kembali ke Katalog Kursus
      </button>

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1A2332] to-[#2D3748] rounded-2xl overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          <div className="lg:w-2/5 relative">
            <img
              src={course.thumbnail}
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
            </div>
            <h1 className="text-3xl font-extrabold mb-3">{course.title}</h1>
            <p className="text-white/70 text-sm leading-relaxed mb-5">
              {course.description}
            </p>
            <div className="flex flex-wrap gap-5 mb-5 text-sm text-white/70">
              <div className="flex items-center gap-1.5">
                <BookIcon size={15} /> {course.totalLessons} Pelajaran
              </div>
              <div className="flex items-center gap-1.5">
                <ClockIcon size={15} /> {course.estimatedHours} Jam Estimasi
              </div>
              <div className="flex items-center gap-1.5">
                <span>📊</span> Nilai KKM: 70
              </div>
            </div>
            <div className="mb-2">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-white/70">Progress Keseluruhan</span>
                <span className="font-semibold">
                  {course.completedLessons}/{course.totalLessons} selesai ({pct}
                  %)
                </span>
              </div>
              <div className="h-2 bg-[var(--surface)]/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#4F8EF7] rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Lessons */}
        <div className="lg:col-span-2">
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
                  <div
                    key={lesson.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                      lesson.status === "current"
                        ? "border-[#4F8EF7] bg-[var(--primary-light)]"
                        : lesson.status === "completed"
                          ? "border-[var(--border)] bg-[var(--surface-2)] hover:border-[#2ECC71]/40"
                          : "border-[var(--border)] bg-[var(--surface)] opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${statusBg(
                        lesson.status,
                      )} ${lesson.status === "locked" ? "text-[var(--text-subtle)]" : "text-white"}`}
                    >
                      {lesson.status === "locked" ? (
                        <LockIcon size={15} />
                      ) : lesson.status === "completed" ? (
                        <CheckCircleIcon size={16} />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-[var(--text-subtle)]">
                          Pelajaran {idx + 1}
                        </span>
                        {lesson.status === "completed" && (
                          <Badge variant="success">Selesai</Badge>
                        )}
                        {lesson.status === "current" && (
                          <Badge variant="primary">Aktif</Badge>
                        )}
                        {lesson.status === "locked" && (
                          <Badge variant="muted">Terkunci</Badge>
                        )}
                      </div>
                      <p
                        className={`font-semibold truncate ${
                          lesson.status === "locked"
                            ? "text-[var(--text-subtle)]"
                            : "text-[var(--text)]"
                        }`}
                      >
                        {lesson.title}
                      </p>
                      <p className="text-xs text-[var(--text-subtle)] flex items-center gap-1 mt-0.5">
                        <ClockIcon size={11} /> {lesson.duration}
                        {lesson.status === "locked" && (
                          <span className="ml-2">
                            • Selesaikan pelajaran sebelumnya
                          </span>
                        )}
                      </p>
                    </div>
                    {lesson.status === "current" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedLesson(lesson.id);
                          navigate("/lesson");
                        }}
                      >
                        <PlayIcon size={13} /> Mulai
                      </Button>
                    )}
                    {lesson.status === "completed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedLesson(lesson.id);
                          navigate("/lesson");
                        }}
                      >
                        Ulangi
                      </Button>
                    )}
                    {lesson.status === "locked" && (
                      <div className="text-[var(--text-subtle)]">
                        <LockIcon size={16} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <h3 className="font-bold text-[var(--text)] mb-4">
              Informasi Kursus
            </h3>
            <div className="space-y-3">
              {COURSE_INFO.map((info) => {
                const value =
                  info.label === "Kategori"
                    ? course.category
                    : info.label === "Level"
                      ? course.level
                      : info.label === "Total Pelajaran"
                        ? `${course.totalLessons} pelajaran`
                        : info.label === "Durasi Estimasi"
                          ? `${course.estimatedHours} jam`
                          : info.value;
                return (
                  <div
                    key={info.label}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-[var(--text-muted)]">
                      {info.label}
                    </span>
                    <span className="font-medium text-[var(--text)]">
                      {value}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="bg-[var(--warning-light)] border-[#F4B400]/30">
            <div className="flex items-start gap-3">
              <span className="text-xl">📌</span>
              <div>
                <p className="font-semibold text-[#7A5A00] text-sm mb-1">
                  Aturan Belajar
                </p>
                <p className="text-xs text-[#9A7300] leading-relaxed">
                  Anda harus menyelesaikan setiap pelajaran dan lulus kuis
                  (nilai ≥70) sebelum dapat mengakses pelajaran berikutnya.
                  Pelajaran tidak dapat dilewati.
                </p>
              </div>
            </div>
          </Card>

          {currentLesson && (
            <Button
              fullWidth
              size="lg"
              onClick={() => {
                setSelectedLesson(currentLesson.id);
                navigate("/lesson");
              }}
            >
              <PlayIcon size={16} /> Lanjutkan Belajar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
