import { useState } from "react";
import { Card, Badge, Button } from "../../components/ui/ui";
import { MOCK_USERS_LIST, QUIZ_HISTORY, COURSES } from "../../data/mock";
import { DownloadIcon, ChartIcon } from "../../components/ui/Icons";

const PERIODS = ["Hari Ini", "7 Hari", "30 Hari", "Kuartal Ini", "Semua Waktu"];

export default function AdminReports() {
  const [period, setPeriod] = useState("30 Hari");
  const [reportType, setReportType] = useState("overview");

  const avgScore = Math.round(
    QUIZ_HISTORY.reduce((s, q) => s + q.score, 0) / QUIZ_HISTORY.length,
  );
  const activeUsers = MOCK_USERS_LIST.filter(
    (u) => u.status === "active",
  ).length;

  const reportTabs = [
    { id: "overview", label: "Ringkasan" },
    { id: "users", label: "Pengguna" },
    { id: "courses", label: "Kursus" },
    { id: "quizzes", label: "Kuis" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-[var(--text)]">
            Laporan & Analitik
          </h1>
          <p className="text-[var(--text-muted)] mt-0.5">
            Pantau performa platform SignLearn
          </p>
        </div>
        <Button variant="outline">
          <DownloadIcon size={16} /> Ekspor Laporan
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex w-full min-w-0 flex-wrap gap-1 p-1 bg-[var(--surface-3)] rounded-xl sm:w-auto">
          {reportTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setReportType(t.id)}
              className={`min-h-11 min-w-0 flex-auto px-3 py-2 rounded-lg text-sm font-medium transition-all sm:flex-none sm:px-4 ${
                reportType === t.id
                  ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex w-full min-w-0 flex-wrap gap-2 sm:w-auto">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`min-h-11 min-w-0 flex-auto px-3 py-1.5 rounded-lg text-xs font-medium transition-all sm:flex-none ${
                period === p
                  ? "bg-[#4F8EF7] text-white"
                  : "bg-[var(--surface-3)] text-[var(--text-muted)] hover:bg-[#E2E8F0]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {reportType === "overview" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Total Pengguna",
                value: MOCK_USERS_LIST.length,
                color: "#4F8EF7",
              },
              { label: "Pengguna Aktif", value: activeUsers, color: "#2ECC71" },
              {
                label: "Rata-rata Skor",
                value: `${avgScore}%`,
                color: "#F4B400",
              },
              { label: "Tingkat Keterlibatan", value: "68%", color: "#6C63FF" },
            ].map((s) => (
              <Card key={s.label} className="text-center">
                <p
                  className="text-2xl font-extrabold"
                  style={{ color: s.color }}
                >
                  {s.value}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{s.label}</p>
              </Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-[var(--text)]">Aktivitas Mingguan</h2>
                <Badge variant="primary">{period}</Badge>
              </div>
              <div className="admin-report-weekly-chart flex items-end justify-between h-32 gap-2">
                {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map(
                  (day, i) => (
                    <div
                      key={day}
                      className="flex min-w-0 flex-1 flex-col items-center gap-1"
                    >
                      <div className="w-full rounded-t-lg flex-1 flex items-end">
                        <div
                          className="w-full rounded-lg"
                          style={{
                            height: `${[60, 80, 40, 100, 75, 90, 55][i]}%`,
                            background: i === 3 ? "#4F8EF7" : "#EAF3FF",
                          }}
                        />
                      </div>
                      <span className="text-xs text-[var(--text-subtle)]">{day}</span>
                    </div>
                  ),
                )}
              </div>
            </Card>

            <Card className="lg:col-span-2">
              <h2 className="font-bold text-[var(--text)] mb-4">
                Distribusi Nilai Kuis
              </h2>
              <div className="space-y-3">
                {[90, 80, 70]
                  .map((threshold, i) => {
                    const ranges = [
                      {
                        label: "90 – 100",
                        color: "#2ECC71",
                        count: QUIZ_HISTORY.filter((q) => q.score >= 90).length,
                      },
                      {
                        label: "70 – 89",
                        color: "#4F8EF7",
                        count: QUIZ_HISTORY.filter(
                          (q) => q.score >= 70 && q.score < 90,
                        ).length,
                      },
                      {
                        label: "< 70",
                        color: "#E74C3C",
                        count: QUIZ_HISTORY.filter((q) => q.score < 70).length,
                      },
                    ];
                    return ranges[i];
                  })
                  .map((d) => (
                    <div
                      key={d.label}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span className="w-16 text-[var(--text-muted)] text-xs">
                        {d.label}
                      </span>
                      <div className="flex-1 h-5 bg-[var(--surface-3)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(d.count / QUIZ_HISTORY.length) * 100}%`,
                            background: d.color,
                          }}
                        />
                      </div>
                      <span className="w-6 text-[var(--text-subtle)] text-xs text-right">
                        {d.count}
                      </span>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        </>
      )}

      {reportType === "users" && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                  {[
                    "Pengguna",
                    "Profil",
                    "Status",
                    "Kursus Selesai",
                    "Terakhir Aktif",
                  ].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_USERS_LIST.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[var(--border-light)] hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#4F8EF7] rounded-full flex items-center justify-center text-white text-xs font-semibold">
                          {user.avatar}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--text)]">
                            {user.name}
                          </p>
                          <p className="text-xs text-[var(--text-subtle)]">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-[var(--text-muted)]">
                      {user.profile}
                    </td>
                    <td className="px-4 py-4">
                      <Badge
                        variant={user.status === "active" ? "success" : "muted"}
                      >
                        {user.status === "active" ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--text)]">
                      {user.coursesCompleted}
                    </td>
                    <td className="px-4 py-4 text-xs text-[var(--text-muted)]">
                      {user.lastActive}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {reportType === "courses" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {COURSES.map((course) => (
            <Card key={course.id}>
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-32 object-cover rounded-xl mb-3"
              />
              <h3 className="font-bold text-[var(--text)] text-sm mb-1">
                {course.title}
              </h3>
              <p className="text-xs text-[var(--text-muted)] mb-3">
                {course.totalLessons} pelajaran · {course.level}
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-muted)]">Penyelesaian</span>
                <span className="font-bold text-[var(--primary)]">
                  {course.totalLessons > 0
                    ? `${Math.round((course.completedLessons / course.totalLessons) * 100)}%`
                    : "—"}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {reportType === "quizzes" && (
        <Card>
          <h2 className="font-bold text-[var(--text)] mb-4">
            Riwayat Kuis Pengguna
          </h2>
          <div className="space-y-3">
            {QUIZ_HISTORY.map((q) => (
              <div
                key={q.id}
                className="flex flex-wrap items-center gap-4 p-4 bg-[var(--surface-2)] rounded-xl border border-[var(--border)]"
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
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--text)]">
                    {q.lesson}
                  </p>
                  <p className="text-xs text-[var(--text-subtle)]">
                    {q.course} · {q.date}
                  </p>
                </div>
                <Badge variant={q.passed ? "success" : "danger"}>
                  {q.passed ? "Lulus" : "Gagal"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex items-center justify-center py-4 text-[var(--text-subtle)]">
        <ChartIcon size={14} className="mr-2" />
        <span className="text-xs">
          Data diperbarui berdasarkan periode {period}
        </span>
      </div>
    </div>
  );
}
