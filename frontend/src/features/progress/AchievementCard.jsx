import { Card } from "../../components/ui/ui";
import { TrophyIcon, StarIcon, CheckCircleIcon, BookIcon } from "../../components/ui/Icons";

const BADGE_ICONS = {
  FIRST_LESSON: <StarIcon size={20} />,
  TEN_LESSONS: <BookIcon size={20} />,
  FIRST_QUIZ: <CheckCircleIcon size={20} />,
  PERFECT_SCORE: <TrophyIcon size={20} />,
  COURSE_COMPLETE: <TrophyIcon size={20} />,
};

const BADGE_COLORS = {
  FIRST_LESSON: "var(--chart-yellow)",
  TEN_LESSONS: "var(--chart-blue)",
  FIRST_QUIZ: "var(--chart-green)",
  PERFECT_SCORE: "var(--chart-red)",
  COURSE_COMPLETE: "var(--primary)",
};

export default function AchievementCard({ badge, style }) {
  const earned = badge.earned;
  const icon = BADGE_ICONS[badge.code] ?? <TrophyIcon size={20} />;
  const color = BADGE_COLORS[badge.code] ?? "var(--primary)";

  return (
    <Card
      hover={earned}
      className={`achievement-card ${earned ? "achievement-card--earned" : "achievement-card--locked"}`}
      style={style}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-300"
          style={{
            background: earned
              ? `color-mix(in srgb, ${color} 12%, transparent)`
              : "var(--surface-3)",
            color: earned ? color : "var(--text-subtle)",
          }}
          aria-hidden="true"
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`font-bold text-sm ${earned ? "text-[var(--text)]" : "text-[var(--text-muted)]"}`}>
            {badge.title}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
            {badge.description}
          </p>
          {earned ? (
            <span className="inline-flex items-center gap-1 text-xs text-[var(--success)] mt-1.5 font-medium">
              <CheckCircleIcon size={12} /> Diperoleh
            </span>
          ) : (
            <span className="text-xs text-[var(--text-subtle)] mt-1.5 block">Belum terbuka</span>
          )}
        </div>
      </div>
    </Card>
  );
}
