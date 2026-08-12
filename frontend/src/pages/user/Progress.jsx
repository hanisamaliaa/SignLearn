import { useState } from "react";
import { Card, Badge, ProgressBar, StatCard } from "../../components/ui/ui";
import { ACHIEVEMENTS } from "../../data/mock";
import { useApp } from "../../context/app";
import {
  TrophyIcon,
  ChartIcon,
  FireIcon,
  StarIcon,
} from "../../components/ui/Icons";

const TABS = [
  { id: "overview", label: "Ringkasan" },
  { id: "courses", label: "Kursus" },
  { id: "quizzes", label: "Kuis" },
  { id: "achievements", label: "Pencapaian" },
];

const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const WEEK_HEIGHTS = [60, 80, 40, 100, 75, 90, 55];
const SCORE_DISTRIBUTION = [
  { range: "90 – 100", color: "#2ECC71" },
  { range: "70 – 89", color: "#4F8EF7" },
  { range: "50 – 69", color: "#F4B400" },
  { range: "< 50", color: "#E74C3C" },
];

export default function Progress() {
  const { courses, quizHistory } = useApp();
  const [activeTab, setActiveTab] = useState("overview");

  const COURSES = courses;
  const QUIZ_HISTORY = quizHistory;

  const totalLessons = COURSES.reduce((s, c) => s + c.totalLessons, 0);
  const completedLessons = COURSES.reduce((s, c) => s + c.completedLessons, 0);
  const avgScore = QUIZ_HISTORY.length
    ? Math.round(
        QUIZ_HISTORY.reduce((s, q) => s + q.score, 0) / QUIZ_HISTORY.length,
      )
    : 0;
  const overallPct = totalLessons
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[var(--text)]">
          Progress Belajar
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          Pantau perkembangan belajar BISINDO Anda
        </p>
      </div>

      {/* Overall progress */}
      <Card className="relative overflow-hidden border-[#c9dceb] bg-[#fffdf3]">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#ffe8a6]/70" />
        <div className="absolute -bottom-16 left-8 h-32 w-32 rounded-full bg-[#dff3ff]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-1 text-sm font-bold text-[#2e86bf]">Progress belajar</p>
            <h2 className="text-3xl font-extrabold text-[#123e63] sm:text-4xl">
              Meningkat pesat! 
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#536777]">
              {completedLessons} dari {totalLessons} pelajaran selesai. Tinggal sedikit lagi menuju target berikutnya.
            </p>
          </div>
          <div className="w-full lg:max-w-xl">
            <div className="mb-2 flex items-center justify-between text-sm font-extrabold text-[#214e72]">
              <span>Progress keseluruhan</span>
              <span>{overallPct}%</span>
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
                className="h-full rounded-full bg-[#2e86bf] transition-[width] duration-700"
                style={{ width: `${overallPct}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-xs font-semibold text-[#71889a]">
              <span>Mulai</span>
              <span>Level berikutnya</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Kursus Aktif"
          value={COURSES.filter((c) => !c.isLocked).length}
          icon={<ChartIcon size={20} />}
          color="#4F8EF7"
        />
        <StatCard
          label="Kuis Selesai"
          value={QUIZ_HISTORY.length}
          icon={<TrophyIcon size={20} />}
          color="#F4B400"
        />
        <StatCard
          label="Rata-rata Skor"
          value={`${avgScore}%`}
          icon={<StarIcon size={20} />}
          color="#2ECC71"
        />
        <StatCard
          label="Streak Belajar"
          value="7 hari"
          icon={<FireIcon size={20} />}
          color="#E74C3C"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--surface-3)] rounded-xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid lg:grid-cols-2 gap-5">
          <Card>
            <h2 className="font-bold text-[var(--text)] mb-4">
              Aktivitas Minggu Ini
            </h2>
            <div className="flex items-end justify-between gap-2 h-32">
              {DAYS.map((day, i) => {
                const isToday = i === 3;
                return (
                  <div
                    key={day}
                    className="flex flex-col items-center gap-1 flex-1"
                  >
                    <div className="w-full rounded-t-lg flex-1 flex items-end">
                      <div
                        className="w-full rounded-lg transition-all"
                        style={{
                          height: `${WEEK_HEIGHTS[i]}%`,
                          background: isToday ? "#4F8EF7" : "#EAF3FF",
                        }}
                      />
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        isToday
                          ? "text-[var(--primary)]"
                          : "text-[var(--text-subtle)]"
                      }`}
                    >
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-[var(--text-muted)]">
                Total sesi minggu ini
              </span>
              <span className="font-bold text-[var(--text)]">7 sesi</span>
            </div>
          </Card>

          <Card>
            <h2 className="font-bold text-[var(--text)] mb-4">
              Distribusi Nilai Kuis
            </h2>
            <div className="space-y-3">
              {SCORE_DISTRIBUTION.map((d) => {
                const count = QUIZ_HISTORY.filter((q) => {
                  if (d.range === "90 – 100") return q.score >= 90;
                  if (d.range === "70 – 89")
                    return q.score >= 70 && q.score < 90;
                  if (d.range === "50 – 69")
                    return q.score >= 50 && q.score < 70;
                  return q.score < 50;
                }).length;
                return (
                  <div
                    key={d.range}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="w-16 text-[var(--text-muted)] text-xs">
                      {d.range}
                    </span>
                    <div className="flex-1 h-5 bg-[var(--surface-3)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(count / QUIZ_HISTORY.length) * 100}%`,
                          background: d.color,
                        }}
                      />
                    </div>
                    <span className="w-6 text-[var(--text-subtle)] text-xs text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "courses" && (
        <div className="space-y-4">
          {COURSES.filter((c) => !c.isLocked).map((course) => (
            <Card key={course.id}>
              <div className="flex items-start gap-4">
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-[var(--text)]">
                      {course.title}
                    </h3>
                    <Badge
                      variant={
                        course.completedLessons === course.totalLessons
                          ? "success"
                          : "primary"
                      }
                    >
                      {course.completedLessons === course.totalLessons
                        ? "Selesai"
                        : "Berlangsung"}
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mb-2">
                    {course.completedLessons} dari {course.totalLessons}{" "}
                    pelajaran selesai
                  </p>
                  <ProgressBar
                    value={course.completedLessons}
                    max={course.totalLessons}
                    showLabel
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "quizzes" && (
        <Card>
          <h2 className="font-bold text-[var(--text)] mb-4">
            Riwayat Kuis Lengkap
          </h2>
          <div className="space-y-3">
            {QUIZ_HISTORY.map((q) => (
              <div
                key={q.id}
                className="flex items-center gap-4 p-4 bg-[var(--surface-2)] rounded-xl border border-[var(--border)]"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0 ${
                    q.passed
                      ? "bg-[var(--success-light)] text-[#2ECC71]"
                      : "bg-[var(--danger-light)] text-[#E74C3C]"
                  }`}
                >
                  {q.score}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[var(--text)]">
                    {q.lesson}
                  </p>
                  <p className="text-xs text-[var(--text-subtle)]">
                    {q.course} · {q.date}
                  </p>
                </div>
                <Badge variant={q.passed ? "success" : "danger"}>
                  {q.passed ? "✓ Lulus" : "✕ Tidak Lulus"}
                </Badge>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-[var(--border)] flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">
              Rata-rata skor keseluruhan
            </span>
            <span className="text-xl font-extrabold text-[var(--primary)]">
              {avgScore}
            </span>
          </div>
        </Card>
      )}

      {activeTab === "achievements" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACHIEVEMENTS.map((a) => (
            <Card key={a.id} className={!a.earned ? "opacity-50" : ""}>
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${
                    a.earned
                      ? "bg-[var(--warning-light)]"
                      : "bg-[var(--surface-3)]"
                  }`}
                >
                  {a.icon}
                </div>
                <div>
                  <p className="font-bold text-[var(--text)] text-sm">
                    {a.title}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {a.description}
                  </p>
                  {a.earned && a.date && (
                    <p className="text-xs text-[#2ECC71] mt-1">
                      ✓ Diperoleh {a.date}
                    </p>
                  )}
                  {!a.earned && (
                    <p className="text-xs text-[var(--text-subtle)] mt-1">
                      Belum diperoleh
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
