import { Card, Badge, AnimatedCounter } from "../../components/ui/ui";
import { CheckCircleIcon, ArrowRightIcon } from "../../components/ui/Icons";

export default function CourseProgressCard({ course, onSelectCourse, style }) {
  const isComplete = (course.completedLessons ?? 0) === (course.totalLessons ?? 0) && (course.totalLessons ?? 0) > 0;
  const pct = course.totalLessons
    ? Math.round(((course.completedLessons ?? 0) / course.totalLessons) * 100)
    : 0;

  return (
    <Card
      hover
      className={`progress-course-card group/card ${isComplete ? "progress-course-card--complete" : "progress-course-card--active"}`}
      onClick={() => onSelectCourse?.(course.id)}
      style={style}
    >
      <div className="flex items-start gap-4">
        {/* Thumbnail */}
        <div className="relative flex-shrink-0">
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover transition-transform duration-300 group-hover/card:scale-105"
            loading="lazy"
          />
          {isComplete && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--success)] text-white shadow-sm" aria-label="Selesai">
              <CheckCircleIcon size={12} />
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-bold text-[var(--text)] truncate">{course.title}</h3>
          </div>

          <div className="flex items-center gap-2 mb-2">
            {isComplete ? (
              <Badge variant="success" size="sm">Selesai</Badge>
            ) : (course.completedLessons ?? 0) > 0 ? (
              <Badge variant="primary" size="sm">Berlangsung</Badge>
            ) : (
              <Badge variant="muted" size="sm">Belum dimulai</Badge>
            )}
            <span className="text-xs text-[var(--text-subtle)]">
              {course.completedLessons ?? 0} dari {course.totalLessons ?? 0} pelajaran
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-2">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1 h-2 bg-[var(--surface-3)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${isComplete ? "bg-[var(--success)]" : "bg-[var(--primary)]"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="flex-none text-xs font-bold text-[var(--text-muted)] w-9 text-right">
                <AnimatedCounter value={pct} suffix="%" />
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelectCourse?.(course.id); }}
              className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
            >
              Lihat detail
            </button>
            {!isComplete && (course.completedLessons ?? 0) > 0 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onSelectCourse?.(course.id); }}
                className="inline-flex items-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[var(--primary)]/90 hover:shadow-md active:scale-[0.98]"
              >
                Lanjutkan
                <ArrowRightIcon size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
