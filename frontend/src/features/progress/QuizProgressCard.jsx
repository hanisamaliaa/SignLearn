import { Card, Badge } from "../../components/ui/ui";
import { CheckCircleIcon, ChevronDownIcon, ChevronRightIcon } from "../../components/ui/Icons";

const scoreTone = (score, passing) =>
  score >= passing ? "var(--chart-green)" : score >= passing * 0.6 ? "var(--chart-yellow)" : "var(--chart-red)";

export default function QuizProgressCard({ quiz, onToggle, isOpen, onDetailClick }) {
  const tone = scoreTone(quiz.bestScore, quiz.minPassingScore);

  return (
    <Card className="quiz-progress-card">
      <div className="flex flex-wrap items-center gap-3">
        {/* Score indicator */}
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-extrabold transition-transform duration-200 group-hover:scale-105"
          style={{ background: `color-mix(in srgb, ${tone} 10.2%, transparent)`, color: tone }}
        >
          {quiz.bestScore}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-[var(--text)]">{quiz.quizTitle}</p>
          <p className="truncate text-xs text-[var(--text-subtle)]">Kursus: {quiz.courseTitle}</p>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {quiz.passed && (
            <Badge variant="success" size="sm">
              <CheckCircleIcon size={11} /> Lulus
            </Badge>
          )}
          {quiz.attemptCount > 1 && quiz.improvement !== 0 && (
            <Badge variant={quiz.improvement > 0 ? "primary" : "warning"} size="sm">
              {quiz.improvement > 0 ? "+" : ""}{quiz.improvement} sejak awal
            </Badge>
          )}
          <button
            type="button"
            onClick={() => onToggle(quiz.quizId)}
            aria-expanded={isOpen}
            className="flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-xs font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--primary)]"
          >
            {quiz.attemptCount} percobaan
            {isOpen ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
          </button>
        </div>
      </div>

      {/* Expanded attempts */}
      {isOpen && (
        <ul className="mt-3 border-t border-[var(--border)] pt-3 space-y-1">
          {quiz.attempts.map((attempt) => (
            <li key={attempt.id}>
              <button
                type="button"
                onClick={() => onDetailClick(attempt.id)}
                className="flex w-full min-h-[44px] items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors hover:bg-[var(--surface-2)]"
              >
                <span
                  className="w-9 shrink-0 text-right font-bold"
                  style={{ color: scoreTone(attempt.score, quiz.minPassingScore) }}
                >
                  {attempt.score}
                </span>
                <span className="flex-1 text-[var(--text-muted)] text-xs">
                  {formatWhen(attempt.takenAt)}
                </span>
                {attempt.score === quiz.bestScore && (
                  <span className="text-xs font-semibold text-[var(--primary)]">terbaik</span>
                )}
                <span className="text-xs text-[var(--text-subtle)]">lihat detail</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function formatWhen(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
