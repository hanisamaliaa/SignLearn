import { useState } from "react";
import {
  Card,
  Badge,
  EmptyState,
  ProgressBar,
  StatCard,
} from "../../components/ui/ui";
import { useApp } from "../../context/app";
import {
  TrophyIcon,
  ChartIcon,
  FireIcon,
  StarIcon,
  BookIcon,
} from "../../components/ui/Icons";

const TABS = [
  { id: "overview", label: "Ringkasan" },
  { id: "courses", label: "Kursus" },
  { id: "quizzes", label: "Kuis" },
  { id: "achievements", label: "Pencapaian" },
];

const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const SCORE_DISTRIBUTION = [
  { range: "90 – 100", color: "#2ECC71" },
  { range: "70 – 89", color: "#4F8EF7" },
  { range: "50 – 69", color: "#F4B400" },
  { range: "< 50", color: "#E74C3C" },
];

/**
 * Ikon per badge.
 *
 * Badge sendiri DITURUNKAN server dari progres nyata (code, title,
 * description, earned) - tidak ada tabel badge. Yang tinggal di frontend
 * hanyalah representasi visualnya, karena ikon urusan tampilan, bukan data.
 */
const BADGE_ICONS = {
  FIRST_LESSON: "\u{1F31F}",
  TEN_LESSONS: "\u{1F4DA}",
  FIRST_QUIZ: "\u2705",
  PERFECT_SCORE: "\u{1F4AF}",
  COURSE_COMPLETE: "\u{1F393}",
};

export default function Progress() {
  const { courses, quizHistory, badges, stats } = useApp();
  const [activeTab, setActiveTab] = useState("overview");

  const COURSES = courses ?? [];
  const QUIZ_HISTORY = quizHistory ?? [];
  const BADGES = badges ?? [];
  const activeCourses = COURSES.filter((course) => !course.isLocked);

  const totalLessons = COURSES.reduce((s, c) => s + c.totalLessons, 0);
  const completedLessons = COURSES.reduce((s, c) => s + c.completedLessons, 0);
  const avgScore = QUIZ_HISTORY.length
    ? Math.round(
        QUIZ_HISTORY.reduce((s, q) => s + q.score, 0) / QUIZ_HISTORY.length,
      )
    : 0;
  /**
   * Aktivitas 7 hari terakhir, diturunkan dari tanggal pengerjaan kuis.
   *
   * Sebelumnya tingginya adalah larik konstan `WEEK_HEIGHTS` — grafik yang
   * terlihat meyakinkan tetapi identik bagi pengguna yang baru mendaftar lima
   * detik lalu maupun yang sudah belajar berbulan-bulan.
   */
  const todayIndex = (new Date().getDay() + 6) % 7; // Senin = 0
  const weekActivity = (() => {
    const counts = Array(7).fill(0);
    const now = new Date();
    for (const q of QUIZ_HISTORY) {
      const diffDays = Math.floor((now - new Date(q.takenAt)) / 86400000);
      if (diffDays >= 0 && diffDays < 7) {
        counts[(todayIndex - diffDays + 7) % 7] += 1;
      }
    }
    const peak = Math.max(1, ...counts);
    return counts.map((count) => ({
      count,
      percent: Math.max(6, Math.round((count / peak) * 100)),
    }));
  })();

  const overallPct = totalLessons
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;

  return (
    <div className="progress-page space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[var(--text)]">
          Progress Belajar
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          Pantau perkembangan belajar BISINDO Anda
        </p>
      </div>

      {/* Overall progress */}
      <Card className="progress-hero relative overflow-hidden">
        <div className="progress-hero-orb is-yellow" aria-hidden="true" />
        <div className="progress-hero-orb is-blue" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="progress-hero-kicker mb-1 text-sm font-bold">Progress belajar</p>
            <h2 className="progress-hero-title text-3xl font-extrabold sm:text-4xl">
              Meningkat pesat! 
            </h2>
            <p className="progress-hero-copy mt-2 text-sm leading-6">
              {completedLessons} dari {totalLessons} pelajaran selesai. Tinggal sedikit lagi menuju target berikutnya.
            </p>
          </div>
          <div className="w-full lg:max-w-xl">
            <div className="progress-hero-label mb-2 flex items-center justify-between text-sm font-extrabold">
              <span>Progress keseluruhan</span>
              <span>{overallPct}%</span>
            </div>
            <div
              className="progress-hero-track h-4 overflow-hidden rounded-full shadow-inner"
              role="progressbar"
              aria-label="Progress keseluruhan"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={overallPct}
            >
              <div
                className="progress-hero-fill h-full rounded-full transition-[width] duration-700"
                style={{ width: `${overallPct}%` }}
              />
            </div>
            <div className="progress-hero-scale mt-1 flex justify-between text-xs font-semibold">
              <span>Mulai</span>
              <span>Level berikutnya</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Kursus Aktif"
          value={activeCourses.length}
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
          value={`${stats?.streakDays ?? 0} hari`}
          icon={<FireIcon size={20} />}
          color="#E74C3C"
        />
      </div>

      {/* Tabs */}
      <div className="progress-tabs flex w-full min-w-0 flex-wrap gap-1 p-1 rounded-xl" role="tablist" aria-label="Bagian progress belajar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-11 min-w-0 flex-auto px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] lg:grid-cols-2 gap-5">
          <Card>
            <h2 className="font-bold text-[var(--text)] mb-4">
              Aktivitas Minggu Ini
            </h2>
            <div className="weekly-activity-chart flex min-w-0 items-end justify-between gap-2 h-32">
              {DAYS.map((day, i) => {
                const isToday = i === todayIndex;
                return (
                  <div
                    key={day}
                    className="min-w-0 flex flex-col items-center gap-1 flex-1"
                  >
                    <div className="w-full rounded-t-lg flex-1 flex items-end">
                      <div
                        className="w-full rounded-lg transition-all"
                        style={{
                          height: `${weekActivity[i].percent}%`,
                          background:
                            weekActivity[i].count > 0 ? "var(--primary)" : "var(--chart-empty)",
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
              <span className="font-bold text-[var(--text)]">
                {weekActivity.reduce((a, d) => a + d.count, 0)} sesi
              </span>
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
                          width: `${QUIZ_HISTORY.length ? (count / QUIZ_HISTORY.length) * 100 : 0}%`,
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
          {activeCourses.map((course) => (
            <Card key={course.id}>
              <div className="flex items-start gap-4">
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt=""
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                  />
                ) : (
                  <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--surface-3)] text-[var(--primary)]" aria-hidden="true">
                    <BookIcon size={25} />
                  </span>
                )}
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
          {activeCourses.length === 0 && (
            <Card>
              <EmptyState
                icon={<BookIcon size={28} />}
                title="Belum ada kursus aktif"
                description="Pilih kursus pertamamu untuk mulai mengisi progress belajar."
              />
            </Card>
          )}
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
            {QUIZ_HISTORY.length === 0 && (
              <EmptyState
                icon={<TrophyIcon size={28} />}
                title="Belum ada riwayat kuis"
                description="Selesaikan kuis pertamamu, lalu hasilnya akan muncul di sini."
              />
            )}
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
          {BADGES.map((a) => (
            <Card key={a.code} className={!a.earned ? "opacity-50" : ""}>
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${
                    a.earned
                      ? "bg-[var(--warning-light)]"
                      : "bg-[var(--surface-3)]"
                  }`}
                >
                  {BADGE_ICONS[a.code] ?? "\u{1F3C5}"}
                </div>
                <div>
                  <p className="font-bold text-[var(--text)] text-sm">
                    {a.title}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {a.description}
                  </p>
                  {a.earned && (
                    <p className="text-xs text-[#2ECC71] mt-1">✓ Diperoleh</p>
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
          {BADGES.length === 0 && (
            <Card className="sm:col-span-2 lg:col-span-3">
              <EmptyState
                icon={<StarIcon size={28} />}
                title="Pencapaian sedang disiapkan"
                description="Terus belajar dan badge pertamamu akan tampil di sini."
              />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
