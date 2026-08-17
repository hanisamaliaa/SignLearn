import { Card, AnimatedCounter } from "../../components/ui/ui";
import { BookIcon } from "../../components/ui/Icons";

const encouragements = [
  { min: 0, max: 3, title: "Baru dimulai!", copy: "Setiap pelajaran adalah satu langkah kecil menuju makin jago." },
  { min: 4, max: 7, title: "Meningkat Pesat!", copy: "Progress-mu sudah mulai terlihat. Pertahankan semangat belajarmu!" },
  { min: 8, max: Infinity, title: "Luar biasa!", copy: "Kamu sudah melangkah jauh. Siap menaklukkan level berikutnya?" },
];

export default function ProgressHero({ completedLessons, totalLessons, overallPct }) {
  const enc = encouragements.find((e) => completedLessons >= e.min && completedLessons <= e.max) ?? encouragements[2];

  return (
    <Card className="progress-hero-card relative overflow-hidden group">
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#ffe8a6]/50 transition-transform duration-500 group-hover:scale-125" aria-hidden="true" />
      <div className="absolute -bottom-12 left-6 h-28 w-28 rounded-full bg-[#dff3ff]/60 transition-transform duration-500 group-hover:scale-125" aria-hidden="true" />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1 transition-transform duration-300 group-hover:-translate-y-0.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary-light)] text-[var(--primary)]">
              <BookIcon size={14} />
            </span>
            <p className="text-sm font-bold text-[var(--primary)]">Perjalanan belajarmu</p>
          </div>
          <h2 className="text-2xl font-extrabold text-[var(--text)] sm:text-3xl">
            {enc.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)] max-w-lg">
            {enc.copy}
          </p>
        </div>

        <div className="w-full lg:max-w-md flex-shrink-0">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--text-muted)]">
              {completedLessons} dari {totalLessons} pelajaran selesai
            </span>
            <span className="text-sm font-extrabold text-[var(--primary)]">
              <AnimatedCounter value={overallPct} suffix="%" />
            </span>
          </div>
          <div
            className="h-3.5 overflow-hidden rounded-full bg-[var(--surface-3)] shadow-inner"
            role="progressbar"
            aria-label="Progress keseluruhan belajar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={overallPct}
          >
            <div
              className="h-full rounded-full progress-bar-fill transition-[width] duration-700 ease-out"
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-xs font-medium text-[var(--text-subtle)]">
            <span>Mulai</span>
            <span>{overallPct >= 100 ? "Selesai!" : "Terus lanjut!"}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
