import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/app";
import { Button, FloatingShapes } from "../../components/ui/ui";
import {
  StarIcon,
  ArrowRightIcon,
  RefreshIcon,
  BookIcon,
} from "../../components/ui/Icons";

const PASS_METRICS = [
  { label: "Nilai Anda", value: "", color: "var(--chart-green)" },
  { label: "Nilai KKM", value: "70", color: "var(--chart-blue)" },
  { label: "Status", value: "Lulus", color: "var(--chart-green)" },
];

const FAIL_METRICS = [
  { label: "Nilai Anda", value: "", color: "var(--chart-red)" },
  { label: "Nilai KKM", value: "70", color: "var(--chart-blue)" },
  { label: "Selisih", value: "", color: "var(--chart-red)" },
];

const TIPS = [
  "Tonton ulang video dengan lebih cermat",
  "Pelajari kosakata isyarat di tab Kosakata",
  "Praktikkan isyarat di depan cermin",
  "Fokus pada bagian yang masih membingungkan",
];

const PASS_MESSAGES = [
  "Kamu hebat! 🌟",
  "Luar biasa! Kamu juara! 🏆",
  "Nilai yang membanggakan! ⭐",
];

const FAIL_MESSAGES = [
  "Hampir benar, coba lagi! 💪",
  "Kamu pasti bisa lebih baik! 🌱",
  "Terus semangat ya! 🔥",
];

function ScoreRing({ score, color }) {
  return (
    <div className="relative inline-flex items-center justify-center w-32 h-32 mb-3">
      <svg className="absolute" width="128" height="128" viewBox="0 0 128 128">
        <circle
          cx="64"
          cy="64"
          r="56"
          fill="none"
          stroke="#E2E8F0"
          strokeWidth="8"
        />
        <circle
          cx="64"
          cy="64"
          r="56"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 56}`}
          strokeDashoffset={`${2 * Math.PI * 56 * (1 - score / 100)}`}
          transform="rotate(-90 64 64)"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="text-center">
        <p className="text-4xl font-extrabold text-[var(--text)] animate-count-up">{score}</p>
        <p className="text-xs text-[var(--text-muted)]">dari 100</p>
      </div>
    </div>
  );
}

function Stars({ stars }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mb-3">
      {[1, 2, 3].map((s) => (
        <StarIcon
          key={s}
          size={32}
          className={`${s <= stars ? "text-[#F4B400]" : "text-[#E2E8F0]"} transition-all duration-300`}
          style={s <= stars ? { animationDelay: `${s * 200}ms` } : {}}
          filled={s <= stars}
        />
      ))}
    </div>
  );
}

function MetricGrid({ items, score }) {
  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {items.map((s, i) => (
        <div
          key={s.label}
          className="text-center p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--border)] animate-slide-up"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <p className="text-lg font-extrabold" style={{ color: s.color }}>
            {s.label === "Nilai Anda"
              ? score
              : s.label === "Selisih"
                ? 70 - score
                : s.value}
          </p>
          <p className="text-xs text-[var(--text-subtle)] mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

export default function QuizResult() {
  const { quizScore, quizPassed } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (quizScore === null || quizScore === undefined) {
      navigate("/dashboard", { replace: true });
    }
  }, [quizScore, navigate]);

  if (quizScore === null || quizScore === undefined) return null;

  const score = quizScore;
  const passed = quizPassed ?? score >= 70;
  const stars = score >= 90 ? 3 : score >= 70 ? 2 : score >= 50 ? 1 : 0;
  const messages = passed ? PASS_MESSAGES : FAIL_MESSAGES;
  const mascotMessage = messages[Math.floor(Math.random() * messages.length)];

  return (
    <div className="min-h-screen bg-[var(--surface-2)] flex items-center justify-center p-6 relative overflow-hidden">
      <FloatingShapes count={passed ? 8 : 4} />
      <div className="w-full max-w-lg animate-scale-in relative z-10">
        {passed ? (
          /* PASSED */
          <div className="bg-[var(--surface)] rounded-3xl shadow-lg border border-[var(--border)] overflow-hidden">
            <div className="quiz-result-hero-passed p-8 text-center text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 quiz-result-dots" />
              <div className="relative">
                <div className="text-6xl mb-3 animate-bounce-in">🎉</div>
                <h1 className="text-2xl font-extrabold mb-1">
                  Selamat! Kamu Lulus!
                </h1>
                <p className="text-white/80 text-sm">
                  Pelajaran berikutnya telah terbuka untukmu
                </p>
              </div>
            </div>
            <div className="p-8">
              <div className="text-center mb-6">
                <ScoreRing score={score} color="var(--chart-green)" />
                <Stars stars={stars} />
                <p className="text-sm text-[var(--text-muted)] font-medium">
                  {stars === 3
                    ? "Luar Biasa! Nilai sempurna!"
                    : stars === 2
                      ? "Bagus! Pertahankan semangat belajar!"
                      : "Lulus! Terus tingkatkan kemampuanmu!"}
                </p>
                <p className="text-xs text-[var(--text-subtle)] mt-1">{mascotMessage}</p>
              </div>

              <MetricGrid items={PASS_METRICS} score={score} />

              <div className="quiz-result-unlock-card bg-[var(--primary-light)] rounded-xl p-4 mb-6 flex items-center gap-3">
                <div className="text-2xl">🔓</div>
                <div>
                  <p className="font-semibold text-[var(--primary)] text-sm">
                    Pelajaran Berikutnya Terbuka!
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Kamu bisa melanjutkan ke pelajaran berikutnya
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  fullWidth
                  size="lg"
                  onClick={() => navigate("/course-detail")}
                >
                  Lanjut ke Pelajaran Berikutnya <ArrowRightIcon size={16} />
                </Button>
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => navigate("/dashboard")}
                >
                  Kembali ke Dashboard
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* FAILED */
          <div className="bg-[var(--surface)] rounded-3xl shadow-lg border border-[var(--border)] overflow-hidden">
            <div className="quiz-result-hero-failed p-8 text-center text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 quiz-result-dots" />
              <div className="relative">
                <div className="text-6xl mb-3">💪</div>
                <h1 className="text-2xl font-extrabold mb-1">
                  Semangat Terus!
                </h1>
                <p className="text-white/80 text-sm">
                  Kamu bisa mencoba lagi setelah me-review pelajaran
                </p>
              </div>
            </div>
            <div className="p-8">
              <div className="text-center mb-6">
                <ScoreRing score={score} color="var(--chart-red)" />
                <p className="text-sm text-[var(--text-muted)] font-medium">
                  Jangan menyerah! Pelajari kembali materinya dan coba lagi.
                </p>
                <p className="text-xs text-[var(--text-subtle)] mt-1">{mascotMessage}</p>
              </div>

              <MetricGrid items={FAIL_METRICS} score={score} />

              <div className="quiz-result-locked-card bg-[var(--warning-light)] border border-[#F4B400]/30 rounded-xl p-4 mb-5 flex items-start gap-3">
                <div className="text-xl">🔒</div>
                <div>
                  <p className="font-semibold text-[#7A5A00] text-sm">
                    Pelajaran Berikutnya Masih Terkunci
                  </p>
                  <p className="text-xs text-[#9A7300] mt-0.5">
                    Nilai minimum yang dibutuhkan adalah <strong>70</strong>.
                    Pelajari kembali materi pelajaran ini dan coba kuis lagi.
                    Kamu pasti bisa!
                  </p>
                </div>
              </div>

              <div className="quiz-result-tips bg-[var(--primary-light)] rounded-xl p-4 mb-5">
                <p className="text-sm font-semibold text-[var(--primary)] mb-2">
                  💡 Tips untuk Mencoba Lagi:
                </p>
                <ul className="space-y-1 text-xs text-[var(--primary)]/80">
                  {TIPS.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <Button
                  fullWidth
                  size="lg"
                  variant="secondary"
                  onClick={() => navigate("/lesson")}
                >
                  <BookIcon size={16} /> Review Pelajaran Kembali
                </Button>
                <Button fullWidth onClick={() => navigate("/quiz")}>
                  <RefreshIcon size={16} /> Coba Kuis Lagi
                </Button>
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => navigate("/dashboard")}
                >
                  Kembali ke Dashboard
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
