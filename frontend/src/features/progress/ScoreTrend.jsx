/**
 * Grafik peningkatan nilai kuis.
 *
 * Digambar sebagai SVG polos, bukan lewat pustaka chart: yang dibutuhkan hanya
 * satu garis dan beberapa titik, dan menambah ratusan kilobyte ke bundel demi
 * itu tidak sepadan bagi aplikasi yang dipakai di ponsel dengan jaringan
 * seadanya.
 *
 * Sumbu X sengaja memakai URUTAN percobaan, bukan tanggal. Tiga kuis yang
 * dikerjakan dalam satu menit akan menumpuk di satu titik pada sumbu waktu dan
 * menyembunyikan justru hal yang ingin dilihat: apakah nilainya membaik.
 */
export default function ScoreTrend({ points, passingScore = 70, height = 160 }) {
  const data = (points ?? []).filter((p) => Number.isFinite(Number(p.score)));

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--text-subtle)]">
        Belum ada percobaan kuis. Grafik muncul setelah kamu mengerjakan kuis pertama.
      </p>
    );
  }

  const width = 640;
  const padding = { top: 14, right: 14, bottom: 26, left: 32 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  // Satu titik tidak punya jarak; ditaruh di tengah agar tidak menempel tepi.
  const x = (i) =>
    padding.left + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (score) => padding.top + plotH - (Math.min(100, Math.max(0, score)) / 100) * plotH;

  const line = data.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.score)}`).join(" ");
  const passY = y(passingScore);

  const first = data[0].score;
  const last = data.at(-1).score;
  const delta = last - first;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-2xl font-extrabold text-[var(--text)]">{last}</span>
        <span className="text-sm text-[var(--text-muted)]">nilai terakhir</span>
        {data.length > 1 && (
          <span
            className={`text-sm font-semibold ${
              delta > 0 ? "text-[#2ECC71]" : delta < 0 ? "text-[#E74C3C]" : "text-[var(--text-subtle)]"
            }`}
          >
            {delta > 0 ? "▲" : delta < 0 ? "▼" : "•"} {delta > 0 ? "+" : ""}
            {delta} sejak percobaan pertama
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Grafik nilai kuis dari ${data.length} percobaan, nilai terakhir ${last} dari 100`}
      >
        {[0, 50, 100].map((tick) => (
          <g key={tick}>
            <line
              x1={padding.left} x2={width - padding.right}
              y1={y(tick)} y2={y(tick)}
              stroke="var(--border)" strokeWidth="1"
            />
            <text
              x={padding.left - 8} y={y(tick) + 4}
              textAnchor="end" fontSize="11" fill="var(--text-subtle)"
            >
              {tick}
            </text>
          </g>
        ))}

        {/* Ambang lulus, supaya tiap titik langsung terbaca lulus atau tidak. */}
        <line
          x1={padding.left} x2={width - padding.right}
          y1={passY} y2={passY}
          stroke="#F4B400" strokeWidth="1.5" strokeDasharray="5 4"
        />
        <text x={width - padding.right} y={passY - 6} textAnchor="end" fontSize="10" fill="#F4B400">
          KKM {passingScore}
        </text>

        <path d={line} fill="none" stroke="#4F8EF7" strokeWidth="2.5"
              strokeLinejoin="round" strokeLinecap="round" />

        {data.map((p, i) => (
          <circle
            key={p.resultId ?? i}
            cx={x(i)} cy={y(p.score)} r="4.5"
            fill={p.passed ? "#2ECC71" : "#E74C3C"}
            stroke="var(--surface)" strokeWidth="2"
          >
            <title>
              {`${p.courseTitle ?? ""} — ${p.score}/100${p.passed ? " (lulus)" : ""}`}
            </title>
          </circle>
        ))}
      </svg>

      <p className="mt-1 text-center text-xs text-[var(--text-subtle)]">
        {data.length} percobaan, dari yang terlama ke terbaru
      </p>
    </div>
  );
}
