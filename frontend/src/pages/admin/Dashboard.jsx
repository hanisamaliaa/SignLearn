import { useMemo } from "react";
import { Card, Badge } from "../../components/ui/ui";
import {
  UsersIcon,
  BookIcon,
  ChartIcon,
  TrophyIcon,
  PlusIcon,
  ChevronUpIcon,
} from "../../components/ui/Icons";
import { MOCK_USERS_LIST, RECENT_ACTIVITIES, COURSES } from "../../data/mock";

const STAT_CARDS = [
  {
    label: "Total Pengguna",
    key: "users",
    color: "#4F8EF7",
    soft: "#EAF3FF",
    icon: UsersIcon,
    helper: "pengguna terdaftar",
  },
  {
    label: "Total Kursus",
    key: "courses",
    color: "#FFC857",
    soft: "#FFF7D8",
    icon: BookIcon,
    helper: "semua kursus",
  },
  {
    label: "Total Pelajaran",
    key: "lessons",
    color: "#F2606B",
    soft: "#FFE9EB",
    icon: ChartIcon,
    helper: "materi belajar",
  },
  {
    label: "Kuis Diselesaikan",
    key: "quizzes",
    color: "#4F8EF7",
    soft: "#EAF3FF",
    icon: TrophyIcon,
    helper: "oleh seluruh pengguna",
  },
];

const SUMMARY = [
  { label: "Pengguna Aktif", value: (users) => users, color: "#4F8EF7", soft: "#EAF3FF" },
  { label: "Rata-rata Skor Kuis", value: () => "78%", color: "#FFC857", soft: "#FFF7D8" },
  { label: "Tingkat Penyelesaian", value: () => "64%", color: "#F2606B", soft: "#FFE9EB" },
];

const CATEGORY_PROGRESS = [
  { label: "Alfabet", value: 67, color: "#4F8EF7" },
  { label: "Angka", value: 40, color: "#FFC857" },
  { label: "Sapaan", value: 0, color: "#F2606B" },
  { label: "Keluarga", value: 0, color: "#4F8EF7" },
];

function StatCardKids({ card, value }) {
  const Icon = card.icon;

  return (
    <div className="admin-stat-card group">
      <div
        className="admin-stat-orb"
        style={{ background: card.soft }}
        aria-hidden="true"
      />
      <div className="relative z-10">
        <div
          className="admin-stat-icon"
          style={{ background: card.color }}
        >
          <Icon size={22} strokeWidth={2.2} />
        </div>

        <p className="admin-stat-label">{card.label}</p>
        <p className="admin-stat-value">{value}</p>
        <p className="admin-stat-helper">{card.helper}</p>
      </div>
    </div>
  );
}

function UserAvatar({ initials, index = 0 }) {
  const colors = ["#4F8EF7", "#F2606B", "#FFC857", "#7CCB8A", "#7D6BF2"];
  return (
    <div
      className="admin-avatar"
      style={{ background: colors[index % colors.length] }}
    >
      {initials}
    </div>
  );
}

function ProgressRow({ label, value, color }) {
  return (
    <div className="admin-progress-row">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-[var(--text)]">{label}</span>
        <span className="text-sm font-extrabold" style={{ color }}>
          {value}%
        </span>
      </div>
      <div className="admin-progress-track">
        <div
          className="admin-progress-fill"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  );
}

function GrowthChart({ totalUsers }) {
  const points = useMemo(() => {
    const base = Math.max(2, totalUsers - 6);
    return [base, base + 1, base + 3, base + 5, totalUsers + 2];
  }, [totalUsers]);

  const max = Math.max(...points) + 2;
  const min = Math.max(0, Math.min(...points) - 2);
  const width = 640;
  const height = 230;
  const padX = 18;
  const padY = 18;
  const step = (width - padX * 2) / (points.length - 1);
  const range = Math.max(1, max - min);

  const coords = points.map((point, index) => ({
    x: padX + step * index,
    y: height - padY - ((point - min) / range) * (height - padY * 2),
  }));

  const line = coords.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `${coords[0].x},${height - padY} ${line} ${coords.at(-1).x},${height - padY}`;

  return (
    <div className="admin-chart-wrap">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[230px]"
        role="img"
        aria-label="Grafik pertumbuhan pengguna dari Januari sampai Mei"
      >
        {[45, 95, 145, 195].map((y) => (
          <line
            key={y}
            x1="18"
            x2="622"
            y1={y}
            y2={y}
            stroke="#E7EEF6"
            strokeWidth="1"
          />
        ))}

        <polygon points={area} fill="#DDEAFF" opacity="0.9" />
        <polyline
          points={line}
          fill="none"
          stroke="#4F8EF7"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {coords.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r="6"
              fill="#FFC857"
              stroke="#4F8EF7"
              strokeWidth="3"
            />
          </g>
        ))}
      </svg>

      <div className="admin-chart-labels">
        {["Jan", "Feb", "Mar", "Apr", "Mei"].map((month) => (
          <span key={month}>{month}</span>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const activeUsers = MOCK_USERS_LIST.filter(
    (user) => user.status === "active",
  ).length;
  const totalLessons = COURSES.reduce((sum, course) => sum + course.totalLessons, 0);

  const statValues = {
    users: MOCK_USERS_LIST.length,
    courses: COURSES.length,
    lessons: totalLessons,
    quizzes: "142",
  };

  return (
    <div className="admin-dashboard space-y-6">
      <section className="admin-dashboard-hero">
        <div>
          <p className="admin-eyebrow">SignLearn Administration</p>
          <h2 className="admin-welcome-title">
            Selamat Datang, Admin! 
          </h2>
        </div>

      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {STAT_CARDS.map((card) => (
          <StatCardKids
            key={card.key}
            card={card}
            value={statValues[card.key]}
          />
        ))}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SUMMARY.map((item) => {
          const value =
            item.label === "Pengguna Aktif"
              ? item.value(activeUsers)
              : item.value();

          return (
            <div
              key={item.label}
              className="admin-mini-card"
              style={{ "--mini-soft": item.soft, "--mini-color": item.color }}
            >
              <div className="admin-mini-dot" />
              <div>
                <p className="admin-mini-value">{value}</p>
                <p className="admin-mini-label">{item.label}</p>
                {item.label === "Pengguna Aktif" && (
                  <p className="admin-mini-helper">
                    dari {MOCK_USERS_LIST.length} pengguna
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.55fr_1fr] gap-6">
        <div className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <h3>Pertumbuhan Pengguna</h3>
              <p>Pengguna baru bergabung tiap bulan</p>
            </div>
            <span className="admin-trend-pill">
              <ChevronUpIcon size={14} />
              12% bulan ini
            </span>
          </div>
          <GrowthChart totalUsers={MOCK_USERS_LIST.length} />
        </div>

        <div className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <h3>Tingkat Penyelesaian</h3>
              <p>Per kategori kursus</p>
            </div>
          </div>
          <div className="space-y-5 pt-2">
            {CATEGORY_PROGRESS.map((item) => (
              <ProgressRow key={item.label} {...item} />
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <h3>Pengguna Terbaru</h3>
              <p>Aktivitas pendaftar terbaru di SignLearn</p>
            </div>
            <span className="admin-count-pill">
              {MOCK_USERS_LIST.length} total
            </span>
          </div>

          <div className="space-y-2">
            {MOCK_USERS_LIST.slice(0, 5).map((user, index) => (
              <div key={user.id} className="admin-list-row">
                <UserAvatar initials={user.avatar} index={index} />
                <div className="flex-1 min-w-0">
                  <p className="admin-list-title truncate">{user.name}</p>
                  <p className="admin-list-subtitle truncate">
                    {user.profile} · {user.joinDate}
                  </p>
                </div>
                <Badge
                  variant={user.status === "active" ? "success" : "muted"}
                  className="admin-status-badge"
                >
                  {user.status === "active" ? "Aktif" : "Nonaktif"}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <h3>Aktivitas Terbaru</h3>
              <p>Perkembangan belajar pengguna</p>
            </div>
          </div>

          <div className="space-y-2">
            {RECENT_ACTIVITIES.map((activity) => (
              <div key={activity.id} className="admin-activity-row">
                <div
                  className={`admin-activity-icon ${
                    activity.type === "quiz"
                      ? "is-yellow"
                      : activity.type === "lesson"
                        ? "is-blue"
                        : "is-green"
                  }`}
                >
                  {activity.type === "quiz"
                    ? "📝"
                    : activity.type === "lesson"
                      ? "📖"
                      : "🎓"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="admin-list-title">{activity.user}</p>
                  <p className="admin-list-subtitle leading-relaxed">
                    {activity.action}
                  </p>
                  <p className="admin-activity-time">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="admin-panel overflow-hidden">
        <div className="admin-panel-heading px-1">
          <div>
            <h3>Ringkasan Kursus</h3>
            <p>Performa dan perkembangan setiap kursus</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                {[
                  "Kursus",
                  "Kategori",
                  "Level",
                  "Pelajaran",
                  "Pendaftar",
                  "Penyelesaian",
                ].map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COURSES.map((course, index) => {
                const completion =
                  course.totalLessons > 0
                    ? Math.round(
                        (course.completedLessons / course.totalLessons) * 100,
                      )
                    : 0;
                const enrollment = 48 + index * 17;

                return (
                  <tr key={course.id}>
                    <td>
                      <div className="flex items-center gap-3 min-w-[220px]">
                        <img
                          src={course.thumbnail}
                          alt=""
                          className="admin-course-thumb"
                        />
                        <span className="admin-table-title">{course.title}</span>
                      </div>
                    </td>
                    <td>{course.category}</td>
                    <td>
                      <Badge
                        variant={
                          course.level === "Pemula"
                            ? "success"
                            : course.level === "Menengah"
                              ? "warning"
                              : "primary"
                        }
                        className="admin-level-badge"
                      >
                        {course.level}
                      </Badge>
                    </td>
                    <td>{course.totalLessons}</td>
                    <td>{enrollment}</td>
                    <td>
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="admin-table-progress">
                          <span
                            style={{
                              width: `${completion}%`,
                              background:
                                completion >= 60 ? "#4F8EF7" : "#FFC857",
                            }}
                          />
                        </div>
                        <strong>{completion}%</strong>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
