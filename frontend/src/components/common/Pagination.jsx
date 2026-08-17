import { useMemo } from "react";

function buildPageRange(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = [];
  pages.push(1);

  if (current > 3) {
    pages.push("...");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("...");
  }

  if (total > 1) {
    pages.push(total);
  }

  return pages;
}

/**
 * Accessible pagination control matching the courses design system.
 *
 * Desktop:  ← Sebelumnya   1  2  3  ...  Berikutnya →
 * Mobile:   ←   2 / 5   →
 */
export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}) {
  const pages = useMemo(
    () => buildPageRange(currentPage, totalPages),
    [currentPage, totalPages],
  );

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  if (totalPages <= 1) return null;

  return (
    <nav
      className={`courses-pagination ${className}`}
      aria-label="Navigasi halaman kursus"
    >
      {/* Mobile compact view */}
      <div className="courses-pagination-mobile">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrev}
          className="courses-pagination-btn courses-pagination-nav"
          aria-label="Halaman sebelumnya"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="courses-pagination-mobile-info" aria-current="page">
          {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNext}
          className="courses-pagination-btn courses-pagination-nav"
          aria-label="Halaman berikutnya"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Desktop full view */}
      <div className="courses-pagination-desktop">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrev}
          className="courses-pagination-btn courses-pagination-nav"
          aria-label="Halaman sebelumnya"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Sebelumnya</span>
        </button>

        <div className="courses-pagination-pages" role="list">
          {pages.map((page, i) =>
            page === "..." ? (
              <span key={`ellipsis-${i}`} className="courses-pagination-ellipsis" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                className={`courses-pagination-btn courses-pagination-page ${
                  page === currentPage ? "is-active" : ""
                }`}
                aria-current={page === currentPage ? "page" : undefined}
                aria-label={`Halaman ${page}`}
              >
                {page}
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNext}
          className="courses-pagination-btn courses-pagination-nav"
          aria-label="Halaman berikutnya"
        >
          <span>Berikutnya</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
