import { useEffect, useMemo, useState } from "react";
import { Card, Badge, ProgressBar, StatCard, FloatingShapes, AnimatedCounter } from "../../components/ui/ui";
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

const BADGE_ICONS = {
  FIRST_LESSON: "\u{1F31F}",
  TEN_LESSONS: "\u{1F4DA}",
  FIRST_QUIZ: "\u2705",
  PERFECT_SCORE: "\u{1F4AF}",
  COURSE_COMPLETE: "\u{1F393}",
};

export default function Progress() {
  const { courses, quizHistory, badges, stats } = useApp();

  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

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
    return () => {
      cancelled = true;
    };
  }, []);
  const [activeTab, setActiveTab] = useState("overview");
  const [hoveredDay, setHoveredDay] = useState(null);
  const [hoveredScore, setHoveredScore] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [hoveredBadge, setHoveredBadge] = useState(null);

  const COURSES = courses ?? [];
  const QUIZ_HISTORY = quizHistory ?? [];
  const AVAILABLE_COURSES = COURSES.filter((course) => !course.isLocked);

  const totalLessons = AVAILABLE_COURSES.reduce(
    (s, c) => s + (c.totalLessons ?? 0),
    0,
  );
  const completedLessons = AVAILABLE_COURSES.reduce(
    (s, c) => s + (c.completedLessons ?? 0),
    0,
  );
  const avgScore = history?.summary?.averageBestScore ?? 0;

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

  const overallPct = totalLessons
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;

  const activeCourses = AVAILABLE_COURSES.filter(
    (c) => (c.completedLessons ?? 0) < (c.totalLessons ?? 0),
  ).length;

  const encouragement = completedLessons < 4
    ? {
        title: "Baru dimulai!",
        copy: "Setiap pelajaran adalah satu langkah kecil menuju makin jago.",
      }
    : completedLessons < 8
      ? {
          title: "Meningkat Pesat!",
          copy: "Progress-mu sudah mulai terlihat. Pertahankan semangat belajarmu!",
        }
      : {
          title: "Luar biasa!",
          copy: "Kamu sudah melangkah jauh. Siap menaklukkan level berikutnya?",
        };

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

  const tabClass = (isActive) =>
    `min-h-11 min-w-0 flex-auto px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive
        ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm scale-[1.01]"
        : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50"
    }`;

  return (
    <div className="space-y-6 animate-fade-in">
      <FloatingShapes count={3} />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[var(--text)]">
          Progress Belajar
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          Pantau perkembangan belajar BISINDO kamu
        </p>
      </div>

      {/* Hero Progress */}
      <Card interactive className="progress-hero-card relative overflow-hidden border-[#c9dceb] bg-[#fffdf3] group">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#ffe8a6]/70 transition-transform duration-500 group-hover:scale-125" />
        <div className="absolute -bottom-16 left-8 h-32 w-32 rounded-full bg-[#dff3ff] transition-transform duration-500 group-hover:scale-125" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="transition-transform duration-300 group-hover:-translate-y-0.5">
            <p className="mb-1 text-sm font-bold text-[#2e86bf]">Progress belajar</p>
            <h2 className="text-3xl font-extrabold text-[#123e63] sm:text-4xl">
              {encouragement.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#536777]">
              {encouragement.copy} {completedLessons} dari {totalLessons} pelajaran selesai.
            </p>
          </div>
          <div className="w-full lg:max-w-xl">
            <div className="mb-2 flex items-center justify-between text-sm font-extrabold text-[#214e72]">
              <span>Progress keseluruhan</span>
              <span className="transition-transform duration-200 group-hover:scale-110"><AnimatedCounter value={overallPct} suffix="%" /></span>
            </div>
            <div
              className="h-4 overflow-hidden rounded-full bg-white shadow-inner"
              role="progressbar"
              aria-label="Progress keseluruhan"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={overallPct}
            >
              <div
                className="h-full rounded-full bg-[#2e86bf] transition-[width] duration-700 ease-out"
                style={{ width: `${overallPct}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-xs font-semibold text-[#71889a]">
              <span>Mulai</span>
              <span>Target 100%</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="transition-transform duration-200 hover:-translate-y-1 animate-slide-up" style={{ animationDelay: "0ms" }}>
          <StatCard interactive label="Kursus Aktif" value={<AnimatedCounter value={activeCourses} />} icon={<ChartIcon size={20} />} color="var(--chart-blue)" />
        </div>
        <div className="transition-transform duration-200 hover:-translate-y-1 animate-slide-up" style={{ animationDelay: "60ms" }}>
          <StatCard interactive label="Kuis Terbaru" value={<AnimatedCounter value={QUIZ_HISTORY.length} />} icon={<TrophyIcon size={20} />} color="var(--chart-yellow)" />
        </div>
        <div className="transition-transform duration-200 hover:-translate-y-1 animate-slide-up" style={{ animationDelay: "120ms" }}>
          <StatCard interactive label="Rata-rata Skor" value={<><AnimatedCounter value={avgScore} suffix="%" /></>} icon={<StarIcon size={20} />} color="var(--chart-green)" />
        </div>
        <div className="transition-transform duration-200 hover:-translate-y-1 animate-slide-up" style={{ animationDelay: "180ms" }}>
          <StatCard interactive label="Streak Belajar" value={<><AnimatedCounter value={stats?.streakDays ?? 0} /> <span className="text-sm">hari</span></>} icon={<FireIcon size={20} />} color="var(--chart-red)" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex w-full min-w-0 flex-wrap gap-1 p-1 bg-[var(--surface-3)] rounded-xl">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            aria-selected={activeTab === tab.id}
            role="tab"
            className={tabClass(activeTab === tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] lg:grid-cols-2 gap-5">
          <Card interactive className="overflow-visible">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="font-bold text-[var(--text)]">Aktivitas Minggu Ini</h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">Kursus yang diakses dalam 7 hari terakhir</p>
              </div>
              <span className="rounded-full bg-[var(--surface-3)] px-2.5 py-1 text-xs font-bold text-[var(--text-muted)]">
                {weekActivity.reduce((a, d) => a + d.count, 0)} sesi
              </span>
            </div>
            <div className="weekly-activity-chart flex min-w-0 items-end justify-between gap-2 h-40">
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
                        <div className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#123e63] px-2.5 py-1.5 text-[11px] font-bold text-white shadow-lg">
                          {weekActivity[i].count} {weekActivity[i].count === 1 ? "akses" : "akses"}
                        </div>
                      )}
                      <div
                        className={`w-full max-w-12 rounded-lg transition-all duration-300 ease-out ${isHovered ? "scale-x-110 brightness-105" : ""}`}
                        style={{
                          height: `${weekActivity[i].percent}%`,
                          background: weekActivity[i].count > 0 ? "var(--chart-blue)" : "var(--primary-light)",
                          opacity: isHovered ? 1 : 0.9,
                        }}
                      />
                    </div>
                    <span className={`text-xs font-medium transition-all duration-200 ${isToday ? "text-[var(--primary)] font-extrabold" : "text-[var(--text-subtle)]"} ${isHovered ? "scale-110" : ""}`}>
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3 text-sm">
              <span className="font-bold text-[var(--text)]">{weekActivity.filter((d) => d.count > 0).length} hari aktif</span>
            </div>
          </Card>

          <Card interactive>
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
                        className={`h-full rounded-full transition-all duration-500 ease-out ${isHovered ? "brightness-105" : ""}`}
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
        </div>
      )}

      {/* Courses Tab */}
      {activeTab === "courses" && (
        <div className="space-y-4">
          {AVAILABLE_COURSES.length === 0 ? (
            <Card interactive className="text-center py-10 text-sm text-[var(--text-muted)]">Belum ada kursus yang tersedia.</Card>
          ) : AVAILABLE_COURSES.map((course) => {
            const isSelected = selectedCourse === course.id;
            const isComplete = course.completedLessons === course.totalLessons;
            return (
              <Card
                interactive
                key={course.id}
                className={`cursor-pointer transition-all duration-300 ${isSelected ? "ring-2 ring-[var(--primary)]/25 shadow-md" : ""}`}
                onClick={() => setSelectedCourse(isSelected ? null : course.id)}
              >
                <div className="flex items-start gap-4">
                  <div className="relative flex-shrink-0">
                    <img src={course.thumbnail} alt={course.title} className="w-16 h-16 rounded-xl object-cover transition-transform duration-300 hover:scale-105" />
                    {isComplete && <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#2ECC71] text-xs font-bold text-white shadow">✓</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <h3 className="font-bold text-[var(--text)] truncate">{course.title}</h3>
                      <Badge variant={isComplete ? "success" : "primary"}>{isComplete ? "Selesai" : "Berlangsung"}</Badge>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mb-2">{course.completedLessons} dari {course.totalLessons} pelajaran selesai</p>
                    <ProgressBar value={course.completedLessons} max={course.totalLessons} showLabel />
                    <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-subtle)]">
                      <span>{isSelected ? "Klik untuk menutup detail" : "Klik untuk melihat detail"}</span>
                      <span className={`transition-transform duration-300 ${isSelected ? "rotate-180" : ""}`}>⌄</span>
                    </div>
                    {isSelected && (
                      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-3 text-xs">
                        <div className="rounded-lg bg-[var(--surface-2)] p-3"><span className="block text-[var(--text-subtle)]">Selesai</span><strong className="text-[var(--text)]">{course.completedLessons}</strong></div>
                        <div className="rounded-lg bg-[var(--surface-2)] p-3"><span className="block text-[var(--text-subtle)]">Total lesson</span><strong className="text-[var(--text)]">{course.totalLessons}</strong></div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quizzes Tab */}
      {activeTab === "quizzes" && (
        <div className="space-y-5">
          <Card>
            <h2 className="mb-1 font-bold text-[var(--text)]">Peningkatan nilai kuis</h2>
            <p className="mb-4 text-xs text-[var(--text-muted)]">
              Setiap titik adalah satu percobaan, dari yang terlama ke terbaru.
            </p>
            <ScoreTrend points={history?.trend} />
          </Card>

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
              <p className="py-6 text-center text-sm text-[#E74C3C]">{historyError}</p>
            ) : historyLoading ? (
              <p className="py-6 text-center text-sm text-[var(--text-muted)]">
                Memuat riwayat…
              </p>
            ) : (
              <QuizHistory quizzes={history?.quizzes} />
            )}
          </Card>
        </div>
      )}

      {/* Achievements Tab */}
      {activeTab === "achievements" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map((a) => {
            const isHovered = hoveredBadge === a.code;
            return (
              <Card
                interactive
                key={a.code}
                className={`transition-all duration-300 ${!a.earned ? "opacity-50" : ""} ${isHovered ? "-translate-y-1 shadow-md" : ""}`}
                onMouseEnter={() => setHoveredBadge(a.code)}
                onMouseLeave={() => setHoveredBadge(null)}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 transition-transform duration-300 ${isHovered ? "scale-110 rotate-2" : ""} ${a.earned ? "bg-[var(--warning-light)]" : "bg-[var(--surface-3)]"}`}>
                    {BADGE_ICONS[a.code] ?? "\u{1F3C5}"}
                  </div>
                  <div>
                    <p className="font-bold text-[var(--text)] text-sm">{a.title}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{a.description}</p>
                    {a.earned ? (
                      <p className="text-xs text-[#2ECC71] mt-1 font-medium">✓ Diperoleh</p>
                    ) : (
                      <p className="text-xs text-[var(--text-subtle)] mt-1">Belum diperoleh</p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
