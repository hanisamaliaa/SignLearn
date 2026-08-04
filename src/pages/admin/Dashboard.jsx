import { Card, Badge, StatCard } from "../../components/ui/ui";
import {
  UsersIcon,
  BookIcon,
  ChartIcon,
  TrophyIcon,
} from "../../components/ui/Icons";
import { MOCK_USERS_LIST, RECENT_ACTIVITIES, COURSES } from "../../data/mock";

const SUMMARY = [
  { label: "Pengguna Aktif", value: "", total: null, color: "#2ECC71" },
  { label: "Rata-rata Skor Kuis", value: "78%", total: null, color: "#4F8EF7" },
  {
    label: "Tingkat Penyelesaian",
    value: "64%",
    total: null,
    color: "#F4B400",
  },
];

const TABLE_COLS = [
  "Kursus",
  "Kategori",
  "Level",
  "Pelajaran",
  "Pendaftar",
  "Penyelesaian",
];

export default function AdminDashboard() {
  const activeUsers = MOCK_USERS_LIST.filter(
    (u) => u.status === "active",
  ).length;
  const totalLessons = COURSES.reduce((s, c) => s + c.totalLessons, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[var(--text)]">
          Dashboard Admin
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          Selamat datang di panel administrasi SignLearn
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Pengguna"
          value={MOCK_USERS_LIST.length}
          icon={<UsersIcon size={20} />}
          color="#4F8EF7"
          trend={{ value: 12, label: "bulan ini" }}
        />
        <StatCard
          label="Total Kursus"
          value={COURSES.length}
          icon={<BookIcon size={20} />}
          color="#2ECC71"
        />
        <StatCard
          label="Total Pelajaran"
          value={totalLessons}
          icon={<ChartIcon size={20} />}
          color="#F4B400"
        />
        <StatCard
          label="Kuis Diselesaikan"
          value="142"
          icon={<TrophyIcon size={20} />}
          color="#6C63FF"
          trend={{ value: 8, label: "minggu ini" }}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {SUMMARY.map((s) => {
          const value = s.label === "Pengguna Aktif" ? activeUsers : s.value;
          return (
            <Card key={s.label} className="text-center">
              <p className="text-2xl font-extrabold" style={{ color: s.color }}>
                {value}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{s.label}</p>
              {s.label === "Pengguna Aktif" && (
                <p className="text-xs text-[var(--text-subtle)] mt-0.5">
                  dari {MOCK_USERS_LIST.length} pengguna
                </p>
              )}
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[var(--text)]">Pengguna Terbaru</h2>
            <Badge variant="primary">{MOCK_USERS_LIST.length} total</Badge>
          </div>
          <div className="space-y-3">
            {MOCK_USERS_LIST.slice(0, 5).map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-3 hover:bg-[var(--surface-2)] rounded-xl transition-colors"
              >
                <div className="w-9 h-9 bg-[#4F8EF7] rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {user.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text)] truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-[var(--text-subtle)]">
                    {user.profile} · {user.joinDate}
                  </p>
                </div>
                <Badge variant={user.status === "active" ? "success" : "muted"}>
                  {user.status === "active" ? "Aktif" : "Nonaktif"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[var(--text)]">Aktivitas Terbaru</h2>
          </div>
          <div className="space-y-3">
            {RECENT_ACTIVITIES.map((act) => (
              <div
                key={act.id}
                className="flex items-start gap-3 p-3 hover:bg-[var(--surface-2)] rounded-xl transition-colors"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${
                    act.type === "quiz"
                      ? "bg-[var(--warning-light)]"
                      : act.type === "lesson"
                        ? "bg-[var(--primary-light)]"
                        : "bg-[var(--success-light)]"
                  }`}
                >
                  {act.type === "quiz"
                    ? "📝"
                    : act.type === "lesson"
                      ? "📖"
                      : "🎓"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[var(--text)]">
                    {act.user}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    {act.action}
                  </p>
                  <p className="text-xs text-[var(--text-subtle)] mt-0.5">{act.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="font-bold text-[var(--text)] mb-4">Ringkasan Kursus</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {TABLE_COLS.map((col) => (
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
              {COURSES.map((course) => (
                <tr
                  key={course.id}
                  className="border-b border-[var(--border-light)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-8 h-8 rounded-lg object-cover"
                      />
                      <span className="text-sm font-medium text-[var(--text)]">
                        {course.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-[var(--text-muted)]">
                    {course.category}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge
                      variant={
                        course.level === "Pemula"
                          ? "success"
                          : course.level === "Menengah"
                            ? "warning"
                            : "primary"
                      }
                    >
                      {course.level}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-[var(--text-muted)]">
                    {course.totalLessons}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-[var(--text-muted)]">
                    {Math.floor(Math.random() * 200 + 50)}
                  </td>
                  <td className="px-4 py-3.5 text-sm font-medium text-[var(--primary)]">
                    {course.totalLessons > 0
                      ? `${Math.round((course.completedLessons / course.totalLessons) * 100)}%`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
