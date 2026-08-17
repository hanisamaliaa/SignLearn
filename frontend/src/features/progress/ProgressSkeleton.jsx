export function ProgressHeroSkeleton() {
  return (
    <div className="skeleton-card p-6 animate-pulse">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1 space-y-3">
          <div className="h-4 w-32 rounded-lg bg-[var(--surface-3)]" />
          <div className="h-8 w-48 rounded-lg bg-[var(--surface-3)]" />
          <div className="h-4 w-64 rounded-lg bg-[var(--surface-3)]" />
        </div>
        <div className="w-full lg:max-w-md space-y-2">
          <div className="flex justify-between">
            <div className="h-4 w-40 rounded-lg bg-[var(--surface-3)]" />
            <div className="h-4 w-10 rounded-lg bg-[var(--surface-3)]" />
          </div>
          <div className="h-3.5 rounded-full bg-[var(--surface-3)]" />
        </div>
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="skeleton-card p-6 animate-pulse">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-20 rounded-lg bg-[var(--surface-3)]" />
              <div className="h-7 w-14 rounded-lg bg-[var(--surface-3)]" />
            </div>
            <div className="w-11 h-11 rounded-xl bg-[var(--surface-3)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="skeleton-card p-6 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-xl bg-[var(--surface-3)] flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-5 w-40 rounded-lg bg-[var(--surface-3)]" />
          <div className="h-3.5 w-24 rounded-lg bg-[var(--surface-3)]" />
          <div className="h-2 rounded-full bg-[var(--surface-3)]" />
          <div className="flex justify-between">
            <div className="h-3.5 w-20 rounded-lg bg-[var(--surface-3)]" />
            <div className="h-3.5 w-12 rounded-lg bg-[var(--surface-3)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TabContentSkeleton({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <CourseCardSkeleton key={i} />
      ))}
    </div>
  );
}
