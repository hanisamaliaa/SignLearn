import { useCallback, useMemo, useState } from "react";
import { Card, Badge, Button, Alert } from "../../components/ui/ui";
import { DownloadIcon, ChartIcon } from "../../components/ui/Icons";
import { adminService, userService } from "../../services";
import { useAdminResource, useFlash } from "../../hooks/useAdminResource";

/**
 * Laporan & analitik admin — API Contract §10.4-10.6.
 *
 * ── Yang DIHAPUS dari versi mock ──────────────────────────────────────
 *
 * · Tombol periode ("7 Hari", "30 Hari", …) hanya mengubah teks di bawah
 *   grafik. Tidak satu pun angka di halaman itu berubah ketika ditekan.
 * · Batang "Aktivitas Mingguan" adalah konstanta `[60,80,40,100,75,90,55]`.
 * · "Tingkat Keterlibatan 68%" konstanta.
 * · "Distribusi Nilai Kuis" dihitung dari `QUIZ_HISTORY` di `data/mock.js` —
 *   riwayat satu pengguna fiktif, bukan seluruh platform.
 *
 * Sekarang periode benar-benar menggerakkan rentang `from`/`to` yang dikirim
 * ke server, dan setiap angka punya endpoint asalnya.
 *
 * ── Kenapa distribusi nilai butuh endpoint sendiri ────────────────────
 *
 * `/admin/activities?type=quiz_passed` hanya memuat pengerjaan yang LULUS.
 * Grafik distribusi yang dibangun darinya tidak akan pernah menampilkan satu
 * pun batang merah — laporan yang selalu mengabarkan kabar baik. Karena itu
 * halaman ini memakai `/admin/quiz-results`, yang membaca `quiz_results`
 * apa adanya.
 */

const iso = (d) => d.toISOString().slice(0, 10);

/** Preset periode → rentang tanggal sungguhan. */
const PERIODS = [
  { id: "7d", label: "7 Hari", days: 7 },
  { id: "30d", label: "30 Hari", days: 30 },
  { id: "90d", label: "90 Hari", days: 90 },
  // Rentang laporan dibatasi 365 hari oleh validator (§10.5); "Semua Waktu"
  // yang tak terbatas akan ditolak 422, jadi batasnya dinyatakan jujur.
  { id: "365d", label: "1 Tahun", days: 365 },
];

function rangeFor(days) {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));
  return { from: iso(from), to: iso(to) };
}

const TABS = [
  { id: "overview", label: "Ringkasan" },
  { id: "users", label: "Pengguna" },
  { id: "courses", label: "Kursus" },
  { id: "quizzes", label: "Kuis" },
];

const GROUP_LABEL = { day: "hari", week: "minggu", month: "bulan" };

/**
 * Menyusun CSV dan mengunduhnya di sisi klien.
 *
 * Tidak ada endpoint ekspor di backend, dan membuatnya hanya untuk ini berarti
 * menambah permukaan API demi pekerjaan yang sudah dimiliki browser. Data
 * laporannya sudah ada di memori halaman.
 */
function downloadCsv(filename, rows) {
  if (rows.length === 0) return;

  const escape = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    // Koma, kutip, dan baris baru harus dibungkus; kutip di dalam digandakan.
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");

  // BOM agar Excel membaca UTF-8 dengan benar — tanpa itu nama ber-aksen dan
  // tanda baca Indonesia tampil rusak, dan orang menyalahkan datanya.
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function StatTile({ label, value, color }) {
  return (
    <Card className="text-center">
      <p className="text-2xl font-extrabold" style={{ color }}>
        {value}
      </p>
      <p className="text-xs text-[var(--text-muted)] mt-0.5">{label}</p>
    </Card>
  );
}

/** Batang aktivitas dari deret laporan — satu batang per bucket. */
function ActivityBars({ series, metric, color }) {
  const points = series ?? [];
  if (points.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-sm text-[var(--text-subtle)]">
        Belum ada data pada rentang ini.
      </div>
    );
  }

  // Skala dari nilai terbesar, dengan lantai 1 supaya deret yang seluruhnya
  // nol tidak menghasilkan pembagian nol dan tinggi batang NaN.
  const max = Math.max(1, ...points.map((p) => p[metric]));

  return (
    <div className="flex items-end justify-between h-32 gap-0.5">
      {points.map((p) => (
        <div key={p.date} className="flex flex-col items-center gap-1 flex-1 h-full">
          <div className="w-full flex-1 flex items-end">
            <div
              className="w-full rounded-t transition-all duration-300"
              style={{
                height: `${Math.max(2, (p[metric] / max) * 100)}%`,
                background: p[metric] > 0 ? color : "var(--surface-3)",
              }}
              title={`${p.date}: ${p[metric]}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminReports() {
  const { flash, show, clear } = useFlash();
  const [periodId, setPeriodId] = useState("30d");
  const [tab, setTab] = useState("overview");

  const period = PERIODS.find((p) => p.id === periodId) ?? PERIODS[1];
  const range = useMemo(() => rangeFor(period.days), [period.days]);

  /**
   * Bucket harian pada rentang panjang menghasilkan 365 batang yang tidak
   * terbaca. Server mendukung `week` dan `month`, jadi satuannya menyesuaikan.
   */
  const groupBy = period.days <= 31 ? "day" : period.days <= 120 ? "week" : "month";

  const load = useCallback(async () => {
    const [overview, report, quizResults, users] = await Promise.all([
      adminService.getAdminDashboard(),
      adminService.getAdminReports({ ...range, groupBy }),
      adminService.getQuizResults({ ...range, limit: 100 }),
      userService
        .getUsers({ limit: 100, sortBy: "createdAt", sortDir: "desc" })
        .catch(() => ({ items: [] })),
    ]);
    return { overview, report, quizResults, users };
  }, [range, groupBy]);

  const { data, loading, error, reload } = useAdminResource(load, [range, groupBy]);

  const totals = data?.overview?.totals ?? {};
  const engagement = data?.overview?.engagement ?? {};
  const series = data?.report?.series ?? [];
  const topCourses = data?.report?.topCourses ?? [];
  const quizSummary = data?.quizResults?.summary ?? null;
  const quizItems = data?.quizResults?.items ?? [];
  const users = data?.users?.items ?? [];

  function handleExport() {
    const builders = {
      overview: () => ({
        name: `signlearn-ringkasan-${range.from}_${range.to}.csv`,
        rows: series.map((s) => ({
          tanggal: s.date,
          pengguna_baru: s.newUsers,
          pelajaran_selesai: s.lessonsCompleted,
          kuis_dikerjakan: s.quizzesTaken,
        })),
      }),
      users: () => ({
        name: `signlearn-pengguna-${iso(new Date())}.csv`,
        rows: users.map((u) => ({
          nama: u.name,
          email: u.email,
          peran: u.role,
          profil: u.profile,
          status: u.status,
          bergabung: u.joinDate ?? "",
        })),
      }),
      courses: () => ({
        name: `signlearn-kursus-${range.from}_${range.to}.csv`,
        rows: topCourses.map((c) => ({
          kursus: c.title,
          pembelajar: c.enrollments,
          tingkat_penyelesaian_persen: Math.round((c.completionRate ?? 0) * 100),
        })),
      }),
      quizzes: () => ({
        name: `signlearn-hasil-kuis-${range.from}_${range.to}.csv`,
        rows: quizItems.map((r) => ({
          waktu: r.takenAt,
          pengguna: r.user.name,
          email: r.user.email,
          kursus: r.course.title,
          kuis: r.quiz.title,
          skor: r.score,
          kkm: r.minPassingScore,
          lulus: r.passed ? "ya" : "tidak",
        })),
      }),
    };

    const { name, rows } = builders[tab]();
    if (rows.length === 0) {
      show("warning", "Tidak ada data untuk diekspor pada rentang ini.");
      return;
    }
    downloadCsv(name, rows);
    show("success", `${rows.length} baris diekspor ke ${name}.`);
  }

  const passRate =
    quizSummary && quizSummary.total > 0
      ? Math.round((quizSummary.passedCount / quizSummary.total) * 100)
      : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--text)]">Laporan & Analitik</h1>
          <p className="text-[var(--text-muted)] mt-0.5">
            {range.from} s.d. {range.to} · dikelompokkan per {GROUP_LABEL[groupBy]}
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={loading}>
          <DownloadIcon size={16} /> Ekspor CSV
        </Button>
      </div>

      {flash && <Alert type={flash.type} message={flash.message} onClose={clear} />}
      {error && <Alert type="danger" message={error.message} onClose={() => reload()} />}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 p-1 bg-[var(--surface-3)] rounded-xl">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriodId(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                periodId === p.id
                  ? "bg-[#4F8EF7] text-white"
                  : "bg-[var(--surface-3)] text-[var(--text-muted)] hover:bg-[#E2E8F0]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <Card>
          <div className="text-center py-12 text-[var(--text-subtle)]">Memuat laporan…</div>
        </Card>
      )}

      {!loading && tab === "overview" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile label="Total Pengguna" value={totals.users ?? 0} color="var(--chart-blue)" />
            <StatTile label="Pengguna Aktif" value={totals.activeUsers ?? 0} color="var(--chart-green)" />
            <StatTile
              label="Rata-rata Skor"
              value={`${quizSummary?.avgScore ?? engagement.avgQuizScore ?? 0}%`}
              color="var(--chart-yellow)"
            />
            <StatTile label="Tingkat Kelulusan" value={`${passRate}%`} color="var(--chart-purple)" />
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-[var(--text)]">Pendaftar Baru</h2>
                <Badge variant="primary">{period.label}</Badge>
              </div>
              <ActivityBars series={series} metric="newUsers" color="var(--chart-blue)" />
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-[var(--text)]">Pelajaran Selesai</h2>
                <Badge variant="success">{period.label}</Badge>
              </div>
              <ActivityBars series={series} metric="lessonsCompleted" color="var(--chart-green)" />
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-[var(--text)]">Kuis Dikerjakan</h2>
                <Badge variant="warning">{period.label}</Badge>
              </div>
              <ActivityBars series={series} metric="quizzesTaken" color="var(--chart-yellow)" />
            </Card>
          </div>

          <Card>
            <h2 className="font-bold text-[var(--text)] mb-1">Distribusi Nilai Kuis</h2>
            <p className="text-xs text-[var(--text-subtle)] mb-4">
              Rentang 90/70 adalah pengelompokan tampilan. Kelulusan sendiri ditentukan
              KKM masing-masing kuis, yang bisa berbeda-beda.
            </p>
            {!quizSummary || quizSummary.total === 0 ? (
              <p className="text-sm text-[var(--text-subtle)] py-6 text-center">
                Belum ada pengerjaan kuis pada rentang ini.
              </p>
            ) : (
              <div className="space-y-3">
                {[
                  { label: "90 – 100", color: "var(--chart-green)", count: quizSummary.bands.high },
                  { label: "70 – 89", color: "var(--chart-blue)", count: quizSummary.bands.mid },
                  { label: "< 70", color: "var(--chart-red)", count: quizSummary.bands.low },
                ].map((d) => (
                  <div key={d.label} className="flex items-center gap-3 text-sm">
                    <span className="w-16 text-[var(--text-muted)] text-xs">{d.label}</span>
                    <div className="flex-1 h-5 bg-[var(--surface-3)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(d.count / quizSummary.total) * 100}%`,
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
            )}
          </Card>
        </>
      )}

      {!loading && tab === "users" && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                  {["Pengguna", "Profil", "Peran", "Status", "Bergabung"].map((col) => (
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
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[var(--border-light)] hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#4F8EF7] rounded-full flex items-center justify-center text-white text-xs font-semibold">
                          {(user.avatar || user.name || "?").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--text)]">{user.name}</p>
                          <p className="text-xs text-[var(--text-subtle)]">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-[var(--text-muted)]">{user.profile}</td>
                    <td className="px-4 py-4">
                      <Badge variant={user.role === "admin" ? "primary" : "muted"}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={user.status === "active" ? "success" : "muted"}>
                        {user.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-xs text-[var(--text-muted)]">
                      {user.joinDate ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <p className="text-center py-12 text-[var(--text-subtle)]">Belum ada pengguna.</p>
            )}
          </div>
        </Card>
      )}

      {!loading && tab === "courses" && (
        <Card padding="none">
          <div className="px-5 pt-5">
            <h2 className="font-bold text-[var(--text)]">Kursus Paling Aktif</h2>
            <p className="text-xs text-[var(--text-subtle)] mb-4">
              Pembelajar dihitung dari yang menyentuh kursus pada rentang ini; penyelesaian
              dihitung dari progres menyeluruh mereka.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                  {["Kursus", "Pembelajar", "Penyelesaian"].map((col) => (
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
                {topCourses.map((c) => {
                  const pct = Math.round((c.completionRate ?? 0) * 100);
                  return (
                    <tr key={c.courseId} className="border-b border-[var(--border-light)]">
                      <td className="px-4 py-4 text-sm font-semibold text-[var(--text)]">
                        {c.title}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--text)]">{c.enrollments}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <div className="flex-1 h-2 bg-[var(--surface-3)] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                background: pct >= 60 ? "var(--chart-green)" : "var(--chart-yellow)",
                              }}
                            />
                          </div>
                          <strong className="text-xs">{pct}%</strong>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {topCourses.length === 0 && (
              <p className="text-center py-12 text-[var(--text-subtle)]">
                Belum ada aktivitas belajar pada rentang ini.
              </p>
            )}
          </div>
        </Card>
      )}

      {!loading && tab === "quizzes" && (
        <Card>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-bold text-[var(--text)]">Riwayat Pengerjaan Kuis</h2>
            {quizSummary && (
              <p className="text-xs text-[var(--text-muted)]">
                {quizSummary.total} pengerjaan · {quizSummary.passedCount} lulus ·
                rata-rata {quizSummary.avgScore}
              </p>
            )}
          </div>

          <div className="space-y-3">
            {quizItems.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-4 p-4 bg-[var(--surface-2)] rounded-xl border border-[var(--border)]"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0 ${
                    r.passed
                      ? "bg-[var(--success-light)] text-[#2ECC71]"
                      : "bg-[var(--danger-light)] text-[#E74C3C]"
                  }`}
                >
                  {r.score}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text)] truncate">
                    {r.user.name} — {r.quiz.title}
                  </p>
                  <p className="text-xs text-[var(--text-subtle)]">
                    {r.course.title} · KKM {r.minPassingScore} ·{" "}
                    {new Date(r.takenAt).toLocaleString("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <Badge variant={r.passed ? "success" : "danger"}>
                  {r.passed ? "Lulus" : "Gagal"}
                </Badge>
              </div>
            ))}

            {quizItems.length === 0 && (
              <p className="text-center py-12 text-[var(--text-subtle)]">
                Belum ada pengerjaan kuis pada rentang ini.
              </p>
            )}
          </div>
        </Card>
      )}

      <div className="flex items-center justify-center py-4 text-[var(--text-subtle)]">
        <ChartIcon size={14} className="mr-2" />
        <span className="text-xs">
          Seluruh angka dihitung server untuk rentang {range.from} — {range.to}
        </span>
      </div>
    </div>
  );
}
