import { useEffect, useState } from "react";
import { Badge, Modal } from "../../components/ui/ui";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XIcon,
} from "../../components/ui/Icons";
import * as progressService from "../../services/progressService";

const scoreTone = (score, passing) =>
  score >= passing ? "var(--chart-green)" : score >= passing * 0.6 ? "var(--chart-yellow)" : "var(--chart-red)";

const formatWhen = (iso) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("id-ID", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
};

/**
 * Riwayat kuis, dikelompokkan per kuis.
 *
 * Mengerjakan kuis yang sama tiga kali dulu menghasilkan tiga baris yang
 * tampak seperti tiga kuis berbeda. Sekarang satu entri per kuis: nilai
 * TERTINGGI yang mewakili, dengan percobaan lainnya tetap dapat dibuka.
 *
 * Percobaan lama tidak dihapus — ia satu-satunya bukti bahwa seorang anak
 * membaik dari 40 ke 90.
 */
export default function QuizHistory({ quizzes }) {
  const [expanded, setExpanded] = useState(() => new Set());
  const [detailId, setDetailId] = useState(null);

  if (!quizzes?.length) {
    return (
      <p className="py-8 text-center text-sm text-[var(--text-subtle)]">
        Belum ada kuis yang dikerjakan.
      </p>
    );
  }

  const toggle = (quizId) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(quizId)) next.delete(quizId);
      else next.add(quizId);
      return next;
    });

  return (
    <>
      <div className="space-y-3">
        {quizzes.map((quiz) => {
          const open = expanded.has(quiz.quizId);
          const tone = scoreTone(quiz.bestScore, quiz.minPassingScore);
          return (
            <div
              key={quiz.quizId}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)]"
            >
              <div className="flex flex-wrap items-center gap-3 p-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-extrabold"
                  style={{ background: `color-mix(in srgb, ${tone} 10.2%, transparent)`, color: tone }}
                >
                  {quiz.bestScore}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-[var(--text)]">{quiz.quizTitle}</p>
                  <p className="truncate text-xs text-[var(--text-subtle)]">
                    Kursus: {quiz.courseTitle}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {quiz.passed && (
                    <Badge variant="success">
                      <CheckCircleIcon size={12} /> Lulus
                    </Badge>
                  )}
                  {quiz.attemptCount > 1 && quiz.improvement !== 0 && (
                    <Badge variant={quiz.improvement > 0 ? "primary" : "warning"}>
                      {quiz.improvement > 0 ? "+" : ""}
                      {quiz.improvement} sejak awal
                    </Badge>
                  )}
                  <button
                    type="button"
                    onClick={() => toggle(quiz.quizId)}
                    aria-expanded={open}
                    className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--primary)]"
                  >
                    {quiz.attemptCount} percobaan
                    {open ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
                  </button>
                </div>
              </div>

              {open && (
                <ul className="border-t border-[var(--border)] px-4 py-2">
                  {quiz.attempts.map((attempt) => (
                    <li key={attempt.id}>
                      <button
                        type="button"
                        onClick={() => setDetailId(attempt.id)}
                        className="flex w-full min-h-11 items-center gap-3 rounded-lg px-2 text-left text-sm transition-colors hover:bg-[var(--surface-2)]"
                      >
                        <span
                          className="w-9 shrink-0 text-right font-bold"
                          style={{ color: scoreTone(attempt.score, quiz.minPassingScore) }}
                        >
                          {attempt.score}
                        </span>
                        <span className="flex-1 text-[var(--text-muted)]">
                          {formatWhen(attempt.takenAt)}
                        </span>
                        {attempt.score === quiz.bestScore && (
                          <span className="text-xs font-semibold text-[var(--primary)]">
                            terbaik
                          </span>
                        )}
                        <span className="text-xs text-[var(--text-subtle)]">lihat detail</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <AttemptDetail resultId={detailId} onClose={() => setDetailId(null)} />
    </>
  );
}

/**
 * Detail satu percobaan.
 *
 * Diambil saat dibuka, bukan ikut di daftar: jawaban per soal hanya relevan
 * ketika seseorang benar-benar ingin melihatnya, dan menyertakannya di setiap
 * riwayat berarti mengirim kunci jawaban pada tiap pemuatan halaman.
 */
function AttemptDetail({ resultId, onClose }) {
  const [state, setState] = useState({ status: "idle", data: null, error: "" });

  useEffect(() => {
    if (!resultId) {
      setState({ status: "idle", data: null, error: "" });
      return undefined;
    }

    // Menutup lalu membuka percobaan lain dengan cepat dapat menyelesaikan
    // permintaan dalam urutan terbalik; penanda ini memastikan hanya yang
    // terakhir diminta yang boleh mengisi layar.
    let cancelled = false;
    setState({ status: "loading", data: null, error: "" });

    progressService
      .getQuizResultDetail(resultId)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data, error: "" });
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            status: "error", data: null,
            error: error?.message ?? "Gagal memuat detail percobaan.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [resultId]);

  const close = () => onClose();

  const detail = state.data;
  const correct = detail?.questions.filter((q) => q.isCorrect).length ?? 0;

  return (
    <Modal
      open={Boolean(resultId)}
      onClose={close}
      title={detail ? `${detail.quizTitle}` : "Detail percobaan"}
      size="lg"
    >
      {state.status === "loading" && (
        <p className="py-6 text-center text-sm text-[var(--text-muted)]">Memuat detail…</p>
      )}
      {state.status === "error" && (
        <p className="py-6 text-center text-sm text-[#E74C3C]">{state.error}</p>
      )}

      {detail && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[var(--surface-2)] p-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl text-lg font-extrabold"
              style={{
                background: `${scoreTone(detail.score, detail.minPassingScore)}1A`,
                color: scoreTone(detail.score, detail.minPassingScore),
              }}
            >
              {detail.score}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[var(--text)]">
                {correct} dari {detail.questions.length} soal benar
              </p>
              <p className="text-xs text-[var(--text-subtle)]">
                Kursus: {detail.courseTitle} • {formatWhen(detail.takenAt)} • KKM{" "}
                {detail.minPassingScore}
              </p>
            </div>
            <Badge variant={detail.passed ? "success" : "danger"}>
              {detail.passed ? "Lulus" : "Belum lulus"}
            </Badge>
          </div>

          <ul className="space-y-2">
            {detail.questions.map((q, index) => (
              <li
                key={q.id}
                className={`rounded-xl border p-3 ${
                  q.isCorrect
                    ? "border-[#2ECC71]/40 bg-[var(--success-light)]"
                    : "border-[var(--border)] bg-[var(--surface)]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      q.isCorrect ? "bg-[#2ECC71] text-white" : "bg-[var(--surface-3)] text-[var(--text-muted)]"
                    }`}
                  >
                    {q.isCorrect ? "✓" : index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[var(--text)]">{q.question}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Jawaban benar: <strong>{q.correctAnswer ?? "—"}</strong>
                      {!q.isCorrect && (
                        <>
                          {" · "}Jawabanmu:{" "}
                          <strong>{q.answered ? q.givenAnswer : "dilewati"}</strong>
                        </>
                      )}
                    </p>
                    {q.mistakes && Object.keys(q.mistakes).length > 0 && (
                      <p className="mt-1 text-xs text-[var(--text-subtle)]">
                        Huruf yang sempat keliru:{" "}
                        {Object.entries(q.mistakes)
                          .sort((a, b) => b[1] - a[1])
                          .map(([letter, count]) => `${letter} (${count}x)`)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={close}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--surface-3)] text-sm font-semibold text-[var(--text)] transition-colors hover:bg-[var(--border)]"
          >
            <XIcon size={15} /> Tutup
          </button>
        </div>
      )}
    </Modal>
  );
}
