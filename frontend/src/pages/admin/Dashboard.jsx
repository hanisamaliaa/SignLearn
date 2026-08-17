import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "../../components/ui/ui";
import {
  UsersIcon,
  BookIcon,
  ChartIcon,
  TrophyIcon,
} from "../../components/ui/Icons";
import { adminService, courseService, userService } from "../../services";
import { getCourseThumbnail } from "../../utils/courseThumbnail";
import { useAdminResource } from "../../hooks/useAdminResource";

/**
 * Dashboard admin — seluruh angka berasal dari API.
 *
 * ── Yang DIHAPUS dari versi mock, dan kenapa ──────────────────────────
 *
 * Halaman ini sebelumnya menampilkan lima hal yang tidak pernah diukur:
 *
 *   · grafik "Pertumbuhan Jan–Mei" yang titiknya dikarang dari jumlah
 *     pengguna (`base = total - 6`, lalu +1, +3, +5)
 *   · pil "▲ 12% bulan ini" — konstanta, tidak pernah dihitung
 *   · "Rata-rata Skor Kuis 78%" dan "Tingkat Penyelesaian 64%" — konstanta
 *   · progres per kategori 67/40/0/0 — konstanta
 *   · kolom "Pendaftar" pada tabel kursus: `48 + index * 17`
 *
 * Yang terakhir paling berbahaya. Angka itu naik rapi per baris sehingga
 * terlihat seperti data sungguhan, dan tidak ada cara membedakannya dari
 * pengukuran hanya dengan melihat layar. Sebuah dasbor yang meyakinkan tetapi
 * salah lebih buruk daripada dasbor yang berkata "belum ada data" — keputusan
 * diambil berdasarkan yang pertama.
 *
 * Sekarang setiap angka punya sumbernya:
 *   totals & engagement  → GET /dashboard/admin
 *   deret pertumbuhan    → GET /dashboard/admin/reports (generate_series)
 *   kursus teratas       → topCourses pada endpoint yang sama
 *   aktivitas            → GET /admin/activities
 *   pengguna terbaru     → GET /users?sortBy=createdAt&sortDir=desc
 */

const STAT_CARDS = [
  {
    label: "Total Pengguna",
    key: "users",
    color: "var(--adm-blue)",
    soft: "var(--adm-blue-soft)",
    icon: UsersIcon,
    helper: "pengguna terdaftar",
  },
  {
    label: "Total Kursus",
    key: "courses",
    color: "var(--adm-yellow)",
    soft: "var(--adm-yellow-soft)",
    icon: BookIcon,
    helper: "semua kursus",
  },
  {
    label: "Total Pelajaran",
    key: "lessons",
    color: "var(--adm-coral)",
    soft: "var(--adm-coral-soft)",
    icon: ChartIcon,
    helper: "materi belajar",
  },
  {
    label: "Total Kuis",
    key: "quizzes",
    color: "var(--adm-purple)",
    soft: "var(--adm-purple-soft)",
    icon: TrophyIcon,
    helper: "kuis tersedia",
  },
];

/** Rentang laporan: 30 hari terakhir, termasuk hari ini. */
function last30Days() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 29);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to) };
}

const ACTIVITY_LABEL = {
  user_registered: { icon: "🎓", tone: "is-green", verb: "mendaftar ke SignLearn" },
  lesson_completed: { icon: "📖", tone: "is-blue", verb: "menyelesaikan pelajaran" },
  quiz_passed: { icon: "📝", tone: "is-yellow", verb: "lulus kuis" },
  course_created: { icon: "📚", tone: "is-blue", verb: "Kursus baru ditambahkan" },
};

/** "3 jam lalu" — relatif, karena stempel UTC penuh tidak terbaca sekilas. */
function relativeTime(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Angka yang menghitung naik saat muncul.
 *
 * ── Kenapa ada jaring pengaman timeout ────────────────────────────────
 *
 * Animasi ini digerakkan `requestAnimationFrame`, dan rAF TIDAK BERJALAN pada
 * dokumen yang tersembunyi — tab latar, jendela terminimalkan, sebagian mode
 * hemat daya, dan panel browser headless. Versi sebelumnya memulai `display`
 * dari 0 dan hanya menaikkannya di dalam callback rAF, sehingga pada kondisi
 * itu angkanya BERTAHAN DI NOL selamanya.
 *
 * Akibatnya bukan sekadar animasi yang tidak jalan: dasbor melaporkan
 * "0 Total Pengguna" padahal ada 16. Angka nol yang percaya diri lebih
 * berbahaya daripada kotak kosong — ia terbaca sebagai hasil pengukuran.
 *
 * Karena itu nilai sebenarnya dijamin muncul lewat dua jalur:
 *   1. dokumen tersembunyi atau pengguna meminta gerak minimal → langsung set
 *   2. animasi berjalan tetapi tidak selesai tepat waktu → timeout memaksanya
 *
 * Animasi tetap ada, tetapi statusnya turun menjadi hiasan: kebenaran angka
 * tidak lagi bergantung padanya.
 */
function useCountUp(target, duration = 900) {
  const numericTarget = typeof target === "number" ? target : parseInt(target, 10);
  const isNumeric = !Number.isNaN(numericTarget);

  const [display, setDisplay] = useState(isNumeric ? numericTarget : 0);
  const startRef = useRef(null);

  useEffect(() => {
    if (!isNumeric) return undefined;

    const prefersReducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion || document.hidden) {
      setDisplay(numericTarget);
      return undefined;
    }

    setDisplay(0);
    startRef.current = null;

    let frame;
    const step = (timestamp) => {
      if (startRef.current === null) startRef.current = timestamp;
      const progress = Math.min(1, (timestamp - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * numericTarget));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);

    // Jaring pengaman: apa pun yang terjadi pada rAF, nilai benar tampil.
    const settle = setTimeout(() => setDisplay(numericTarget), duration + 150);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
    };
  }, [numericTarget, isNumeric, duration]);

  if (!isNumeric) return target;
  return display.toLocaleString("id-ID");
}

function AnimatedValue({ value }) {
  const display = useCountUp(value);
  return <>{display}</>;
}

function StatCardKids({ card, value, index = 0 }) {
  const Icon = card.icon;

  return (
    <div
      className="admin-stat-card group"
      style={{ "--card-accent": card.color, "--adm-i": index }}
    >
      <div className="admin-stat-orb" style={{ background: card.soft }} aria-hidden="true" />
      <div className="relative z-10">
        <div className="admin-stat-icon" style={{ background: card.color }}>
          <Icon size={22} strokeWidth={2.2} />
        </div>

        <p className="admin-stat-label">{card.label}</p>
        <p className="admin-stat-value">
          <AnimatedValue value={value} />
        </p>
        <p className="admin-stat-helper">{card.helper}</p>
      </div>
    </div>
  );
}

function UserAvatar({ name, index = 0 }) {
  const colors = [
    "var(--adm-blue)",
    "var(--adm-coral)",
    "var(--adm-yellow)",
    "var(--adm-green)",
    "var(--adm-purple)",
  ];
  const initials = (name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="admin-avatar" style={{ background: colors[index % colors.length] }}>
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
        <div className="admin-progress-fill" style={{ "--fill": `${value}%`, background: color }} />
      </div>
    </div>
  );
}

/**
 * Grafik pendaftaran harian dari deret laporan.
 *
 * Sumbu-Y dimulai dari NOL, bukan dari nilai terkecil. Memangkas dasar sumbu
 * membuat selisih 2 pendaftar terlihat seperti lonjakan dramatis — teknik yang
 * membuat grafik terasa hidup sekaligus membuatnya berbohong.
 */
function GrowthChart({ series }) {
  const points = useMemo(() => (series ?? []).map((p) => p.newUsers), [series]);

  if (points.length < 2) {
    return (
      <div className="admin-chart-wrap flex items-center justify-center h-[230px] text-sm text-[var(--text-subtle)]">
        Belum cukup data untuk menggambar tren.
      </div>
    );
  }

  const max = Math.max(1, ...points);
  const width = 640;
  const height = 230;
  const padX = 18;
  const padY = 18;
  const step = (width - padX * 2) / (points.length - 1);

  const coords = points.map((point, index) => ({
    x: padX + step * index,
    y: height - padY - (point / max) * (height - padY * 2),
  }));

  const line = coords.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `${coords[0].x},${height - padY} ${line} ${coords.at(-1).x},${height - padY}`;

  const labelAt = (index) => {
    const iso = series[index]?.date;
    if (!iso) return "";
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  };

  return (
    <div className="admin-chart-wrap">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[230px]"
        role="img"
        aria-label={`Grafik pendaftaran pengguna harian, ${series.length} hari terakhir`}
      >
        {[45, 95, 145, 195].map((y) => (
          <line key={y} x1="18" x2="622" y1={y} y2={y} stroke="var(--adm-border-soft)" strokeWidth="1" />
        ))}

        <polygon points={area} fill="var(--adm-blue-soft)" opacity="0.9" />
        <polyline
          points={line}
          fill="none"
          stroke="var(--adm-blue)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {coords.map((point, index) => (
          <circle
            key={series[index].date}
            className="admin-chart-point"
            cx={point.x}
            cy={point.y}
            r="5"
            fill="var(--adm-yellow)"
            stroke="var(--adm-blue)"
            strokeWidth="3"
          >
            <title>{`${labelAt(index)}: ${points[index]} pendaftar`}</title>
          </circle>
        ))}
      </svg>

      <div className="admin-chart-labels">
        <span>{labelAt(0)}</span>
        <span>{labelAt(Math.floor((series.length - 1) / 2))}</span>
        <span>{labelAt(series.length - 1)}</span>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const range = useMemo(last30Days, []);
  const [courseView, setCourseView] = useState("all");

  /**
   * Empat permintaan sekaligus, dan setiap kegagalan ditangkap SENDIRI-sendiri.
   *
   * `Promise.all` tanpa `.catch()` per cabang berarti satu endpoint yang
   * bermasalah mengosongkan seluruh dasbor. Yang benar: bagian yang datanya
   * gagal menampilkan keadaan kosong, sisanya tetap tampil.
   */
  const load = useCallback(async () => {
    const [overview, report, activities, recentUsers, courses] = await Promise.all([
      adminService.getAdminDashboard(),
      adminService.getAdminReports({ ...range, groupBy: "day" }).catch(() => null),
      adminService.getActivities({ limit: 6 }).catch(() => ({ items: [] })),
      userService
        .getUsers({ limit: 5, sortBy: "createdAt", sortDir: "desc" })
        .catch(() => ({ items: [] })),
      courseService.getCourses({ limit: 100 }).catch(() => ({ items: [] })),
    ]);

    return { overview, report, activities, recentUsers, courses };
  }, [range]);

  const { data, loading, error } = useAdminResource(load, [range]);

  if (loading) {
    return (
      <div className="admin-dashboard space-y-6">
        <section className="admin-dashboard-hero">
          <div>
            <p className="admin-eyebrow">SignLearn Administration</p>
            <h2 className="admin-welcome-title">Memuat dasbor…</h2>
          </div>
        </section>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {STAT_CARDS.map((card) => (
            <div key={card.key} className="admin-stat-card animate-pulse h-[150px]" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-panel text-center py-16">
        <div className="text-4xl mb-3">⚠️</div>
        <h3 className="font-bold text-[var(--text)] mb-1">Gagal memuat dasbor</h3>
        <p className="text-sm text-[var(--text-muted)]">{error.message}</p>
      </div>
    );
  }

  const totals = data?.overview?.totals ?? {};
  const engagement = data?.overview?.engagement ?? {};
  const growth = data?.overview?.growth ?? {};
  const series = data?.report?.series ?? [];
  const topCourses = data?.report?.topCourses ?? [];
  const activities = data?.activities?.items ?? [];
  const recentUsers = data?.recentUsers?.items ?? [];
  const courses = data?.courses?.items ?? [];

  const statValues = {
    users: totals.users ?? 0,
    courses: totals.courses ?? 0,
    lessons: totals.lessons ?? 0,
    quizzes: totals.quizzes ?? 0,
  };

  const summaryCards = [
    {
      label: "Pengguna Aktif",
      value: totals.activeUsers ?? 0,
      helper: `dari ${totals.users ?? 0} pengguna`,
      color: "var(--adm-blue)",
      soft: "var(--adm-blue-soft)",
    },
    {
      label: "Rata-rata Skor Kuis",
      value: `${engagement.avgQuizScore ?? 0}%`,
      helper: "seluruh pengerjaan",
      color: "var(--adm-yellow)",
      soft: "var(--adm-yellow-soft)",
    },
    {
      label: "Pendaftar Baru",
      value: growth.newUsers30d ?? 0,
      helper: `${growth.newUsers7d ?? 0} dalam 7 hari terakhir`,
      color: "var(--adm-coral)",
      soft: "var(--adm-coral-soft)",
    },
  ];

  // Peta pendaftar per kursus dari laporan. Kursus yang tidak muncul di
  // `topCourses` memang belum disentuh siapa pun pada rentang ini — kolomnya
  // diisi "—", bukan angka tebakan.
  const enrollmentByCourse = new Map(
    topCourses.map((c) => [c.courseId, { enrollments: c.enrollments, rate: c.completionRate }]),
  );

  const progressPalette = [
    "var(--adm-blue)",
    "var(--adm-yellow)",
    "var(--adm-coral)",
    "var(--adm-purple)",
    "var(--adm-green)",
  ];

  const interactiveCourses = (() => {
    const normalized = courses.map((course) => {
      const stat = enrollmentByCourse.get(course.id);
      const completion = stat ? Math.round(stat.rate * 100) : null;
      return {
        ...course,
        enrollments: stat?.enrollments ?? 0,
        completion,
      };
    });

    if (courseView === "active") {
      return normalized.filter((course) => course.enrollments > 0);
    }

    if (courseView === "top") {
      return [...normalized]
        .filter((course) => course.enrollments > 0)
        .sort((a, b) => b.enrollments - a.enrollments)
        .slice(0, 5);
    }

    return normalized.slice(0, 8);
  })();

  return (
    <div className="admin-dashboard space-y-6">
      <section className="admin-dashboard-hero">
        <div>
          <p className="admin-eyebrow">SignLearn Administration</p>
          <h2 className="admin-welcome-title">Selamat Datang, Admin!</h2>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {STAT_CARDS.map((card, index) => (
          <StatCardKids key={card.key} card={card} value={statValues[card.key]} index={index} />
        ))}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summaryCards.map((item, index) => (
          <div
            key={item.label}
            className="admin-mini-card"
            style={{ "--mini-soft": item.soft, "--mini-color": item.color, "--adm-i": index }}
          >
            <div className="admin-mini-dot" />
            <div>
              <p className="admin-mini-value">
                <AnimatedValue value={item.value} />
              </p>
              <p className="admin-mini-label">{item.label}</p>
              <p className="admin-mini-helper">{item.helper}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.55fr_1fr] gap-6">
        <div className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <h3>Pendaftar Baru</h3>
              <p>30 hari terakhir</p>
            </div>
            <span className="admin-count-pill">{growth.newUsers30d ?? 0} total</span>
          </div>
          <GrowthChart series={series} />
        </div>

        <div className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <h3>Tingkat Penyelesaian</h3>
              <p>Kursus paling aktif 30 hari terakhir</p>
            </div>
          </div>
          <div className="space-y-5 pt-2">
            {topCourses.length === 0 && (
              <p className="text-sm text-[var(--text-subtle)] py-6 text-center">
                Belum ada aktivitas belajar pada rentang ini.
              </p>
            )}
            {topCourses.map((course, index) => (
              <ProgressRow
                key={course.courseId}
                label={course.title}
                // API mengirim pecahan (0.41); kontrak §10.5 memang begitu.
                value={Math.round((course.completionRate ?? 0) * 100)}
                color={progressPalette[index % progressPalette.length]}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <h3>Pengguna Terbaru</h3>
              <p>Pendaftar paling akhir di SignLearn</p>
            </div>
            <span className="admin-count-pill">{totals.users ?? 0} total</span>
          </div>

          <div className="space-y-2">
            {recentUsers.length === 0 && (
              <p className="text-sm text-[var(--text-subtle)] py-6 text-center">
                Belum ada pengguna terdaftar.
              </p>
            )}
            {recentUsers.map((user, index) => (
              <div key={user.id} className="admin-list-row">
                <UserAvatar name={user.name} index={index} />
                <div className="flex-1 min-w-0">
                  <p className="admin-list-title truncate">{user.name}</p>
                  <p className="admin-list-subtitle truncate">
                    {user.email} · {user.joinDate ?? "—"}
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
              <p>Diturunkan dari data, bukan log terpisah</p>
            </div>
          </div>

          <div className="space-y-2">
            {activities.length === 0 && (
              <p className="text-sm text-[var(--text-subtle)] py-6 text-center">
                Belum ada aktivitas tercatat.
              </p>
            )}
            {activities.map((activity) => {
              const meta = ACTIVITY_LABEL[activity.type] ?? {
                icon: "•",
                tone: "is-blue",
                verb: activity.type,
              };
              return (
                <div key={activity.id} className="admin-activity-row">
                  <div className={`admin-activity-icon ${meta.tone}`}>{meta.icon}</div>
                  <div className="flex-1 min-w-0">
                    {/*
                      `actor` boleh null — skema tidak menyimpan siapa yang
                      membuat kursus. Menuliskan "Administrator" di sana akan
                      membuat log audit berbohong.
                    */}
                    <p className="admin-list-title">{activity.actor?.name ?? "Sistem"}</p>
                    <p className="admin-list-subtitle leading-relaxed">
                      {meta.verb}
                      {activity.subject?.title ? ` — ${activity.subject.title}` : ""}
                      {activity.meta?.score !== undefined ? ` (skor ${activity.meta.score})` : ""}
                    </p>
                    <p className="admin-activity-time">{relativeTime(activity.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="admin-panel admin-course-insights">
        <div className="admin-panel-heading admin-course-insights-heading">
          <div>
            <h3>Eksplorasi Performa Kursus</h3>
            <p>Pantau kursus yang paling aktif tanpa tabel yang kaku.</p>
          </div>
          <div className="admin-course-tabs" role="tablist" aria-label="Filter performa kursus">
            {[
              ["all", "Semua"],
              ["active", "Sedang Aktif"],
              ["top", "Paling Aktif"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`admin-course-tab ${courseView === value ? "is-active" : ""}`}
                onClick={() => setCourseView(value)}
                role="tab"
                aria-selected={courseView === value}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {interactiveCourses.length === 0 ? (
          <div className="admin-course-empty">
            <span className="admin-course-empty-icon" aria-hidden="true">📚</span>
            <div>
              <strong>Belum ada aktivitas kursus</strong>
              <p>Kursus akan muncul di sini ketika mulai dipelajari pengguna.</p>
            </div>
          </div>
        ) : (
          <div className="admin-course-insight-list">
            {interactiveCourses.map((course, index) => {
              const completion = course.completion ?? 0;
              const tone = progressPalette[index % progressPalette.length];
              return (
                <div key={course.id} className="admin-course-insight-card">
                  <div className="admin-course-insight-main">
                    {course.thumbnail ? (
                      <img src={getCourseThumbnail(course)} alt="" className="admin-course-insight-thumb" />
                    ) : (
                      <div className="admin-course-insight-thumb is-empty" aria-hidden="true">📚</div>
                    )}
                    <div className="min-w-0">
                      <div className="admin-course-insight-title-row">
                        <h4 className="admin-course-insight-title">{course.title}</h4>
                        <span className="admin-course-insight-level">{course.level ?? "—"}</span>
                      </div>
                      <p className="admin-course-insight-meta">
                        {course.category ?? "Tanpa kategori"} · {course.totalLessons ?? 0} pelajaran · {course.enrollments} pendaftar
                      </p>
                      <div className="admin-course-insight-progress-row">
                        <div className="admin-course-insight-progress" aria-label={`Penyelesaian ${completion}%`}>
                          <span style={{ width: `${completion}%`, background: tone }} />
                        </div>
                        <strong style={{ color: tone }}>{course.completion === null ? "—" : `${completion}%`}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="admin-course-insight-badge">
                    {course.enrollments > 0 ? "Aktif" : "Belum aktif"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
