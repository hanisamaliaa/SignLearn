import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../../context/app";
import { useDebounce } from "../../hooks/useDebounce";
import { useReducedMotion } from "../../hooks/useLandingMotion";
import { Badge, Button, ProgressBar, FloatingShapes } from "../../components/ui/ui";
import {
  ArrowRightIcon,
  BookIcon,
  CheckCircleIcon,
  LockIcon,
  SearchIcon,
  TrophyIcon,
  XIcon,
} from "../../components/ui/Icons";
import { formatEstimatedHours } from "../../features/lesson/courseMeta";
import { getCourseThumbnail } from "../../utils/courseThumbnail";
import Pagination from "../../components/common/Pagination";

/** Thumbnail dengan fallback untuk kartu kursus user. */
function CourseThumbnail({ src, alt, className }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={className} aria-hidden="true">
        📚
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}

const LEVELS = ["Semua", "Pemula", "Menengah", "Lanjutan"];
const ITEMS_PER_PAGE = 6;
const DEBOUNCE_MS = 350;

export default function Courses() {
  const { setSelectedCourse, courses } = useApp();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef(null);

  // URL-synced state
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [filter, setFilter] = useState(() => searchParams.get("level") ?? "Semua");
  const [currentPage, setCurrentPage] = useState(() => {
    const p = parseInt(searchParams.get("page"), 10);
    return Number.isFinite(p) && p > 0 ? p : 1;
  });

  const debouncedSearch = useDebounce(search, DEBOUNCE_MS);
  const inputRef = useRef(null);

  // Sync state to URL
  const updateParams = useCallback(
    (next) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        if (next.search !== undefined) {
          if (next.search) params.set("search", next.search);
          else params.delete("search");
        }
        if (next.level !== undefined) {
          if (next.level && next.level !== "Semua") params.set("level", next.level);
          else params.delete("level");
        }
        if (next.page !== undefined) {
          if (next.page > 1) params.set("page", String(next.page));
          else params.delete("page");
        }
        return params;
      }, { replace: true });
    },
    [setSearchParams],
  );

  const COURSES = courses || [];

  const summary = useMemo(
    () => [
      {
        label: "Kursus",
        value: COURSES.filter((course) => !course.isLocked).length,
        helper: "tersedia untukmu",
        tone: "pink",
        icon: <BookIcon size={21} />,
      },
      {
        label: "Belajar",
        value: COURSES.filter((course) => course.learningStatus === "in_progress").length,
        helper: "sedang dipelajari",
        tone: "blue",
        icon: <BookIcon size={21} />,
      },
      {
        label: "Selesai",
        value: COURSES.filter((course) => course.learningStatus === "completed").length,
        helper: "kursus selesai",
        tone: "green",
        icon: <TrophyIcon size={21} />,
      },
    ],
    [COURSES],
  );

  // Filter: level → search
  const filtered = useMemo(() => {
    const query = debouncedSearch.trim().toLocaleLowerCase("id-ID");
    return COURSES.filter((course) => {
      const title = String(course?.title ?? "").toLocaleLowerCase("id-ID");
      const category = String(course?.category ?? "").toLocaleLowerCase("id-ID");
      const description = String(course?.description ?? "").toLocaleLowerCase("id-ID");
      const level = String(course?.level ?? "").trim();
      const matchSearch =
        !query ||
        title.includes(query) ||
        category.includes(query) ||
        description.includes(query) ||
        level.toLocaleLowerCase("id-ID").includes(query);
      const matchLevel = filter === "Semua" || level === filter;
      return matchSearch && matchLevel;
    });
  }, [COURSES, debouncedSearch, filter]);

  // Pagination derived from filtered results
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  // Clamp current page if it exceeds total
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedCourses = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, safeCurrentPage]);

  const available = paginatedCourses.filter((course) => !course.isLocked);
  const locked = paginatedCourses.filter((course) => course.isLocked);

  const getProgress = (course) =>
    course.totalLessons
      ? Math.round((course.completedLessons / course.totalLessons) * 100)
      : 0;

  const openCourse = async (course) => {
    if (course.isLocked) return;
    await setSelectedCourse(course.id);
    navigate("/course-detail");
  };

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setCurrentPage(1);
    updateParams({ search: event.target.value, page: 1 });
  };

  const handleClearSearch = () => {
    setSearch("");
    setCurrentPage(1);
    updateParams({ search: "", page: 1 });
    inputRef.current?.focus();
  };

  const handleFilterChange = (level) => {
    setFilter(level);
    setCurrentPage(1);
    updateParams({ level, page: 1 });
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    updateParams({ page });
    sectionRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  const handleReset = () => {
    setSearch("");
    setFilter("Semua");
    setCurrentPage(1);
    updateParams({ search: "", level: "Semua", page: 1 });
    inputRef.current?.focus();
  };

  return (
    <div className="courses-page space-y-7 animate-fade-in">
      <FloatingShapes count={4} />

      {/* Intro Section */}
      <section className="courses-intro">
        <div>
          <p className="courses-kicker">RUANG BELAJARMU</p>
          <h1>Yuk, belajar BISINDO!</h1>
          <p>Pilih materi yang ingin kamu pelajari hari ini.</p>
        </div>
        <div className="courses-intro-progress">
          <span>Progress keseluruhan</span>
          <strong>
            {COURSES.reduce((sum, course) => sum + (course.completedLessons ?? 0), 0)} /{" "}
            {COURSES.reduce((sum, course) => sum + (course.totalLessons ?? 0), 0)} Pelajaran
          </strong>
          <div>
            <span
              style={{
                width: `${(() => {
                  const total = COURSES.reduce((sum, course) => sum + (course.totalLessons ?? 0), 0);
                  const completed = COURSES.reduce((sum, course) => sum + (course.completedLessons ?? 0), 0);
                  return total ? Math.round((completed / total) * 100) : 0;
                })()}%`,
              }}
            />
          </div>
        </div>
      </section>

      {/* Search & Filters */}
      <section className="courses-tools" aria-label="Cari dan filter kursus">
        <label className="courses-search" htmlFor="course-search-input">
          <SearchIcon size={19} aria-hidden="true" />
          <input
            ref={inputRef}
            id="course-search-input"
            value={search}
            onChange={handleSearchChange}
            placeholder="Cari pelajaran..."
            aria-label="Cari pelajaran"
            autoComplete="off"
          />
          {search && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Hapus pencarian"
              className="courses-search-clear"
            >
              <XIcon size={16} aria-hidden="true" />
            </button>
          )}
        </label>
        <div className="courses-filters" role="group" aria-label="Filter tingkat kursus">
          {LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => handleFilterChange(level)}
              className={`courses-filter-btn ${filter === level ? "is-active" : ""}`}
              aria-pressed={filter === level}
            >
              {level}
            </button>
          ))}
        </div>
      </section>

      {/* Summary Cards */}
      <section className="courses-summary-grid" aria-label="Ringkasan kursus">
        {summary.map((item) => (
          <article key={item.label} className={`courses-summary-card ${item.tone}`}>
            <span className="courses-summary-icon">{item.icon}</span>
            <div>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
              <small>{item.helper}</small>
            </div>
          </article>
        ))}
      </section>

      {/* Course Cards */}
      <section ref={sectionRef} className="courses-cards-section">
        <div className="courses-section-heading">
          <div>
            <h2>Pelajaran Untukmu</h2>
            <p>
              {filtered.length} pilihan belajar ditemukan
            </p>
          </div>
          {(search || filter !== "Semua") && (
            <button type="button" onClick={handleReset} className="courses-reset">
              Lihat semua <ArrowRightIcon size={15} />
            </button>
          )}
        </div>

        {filtered.length > 0 ? (
          <>
            {available.length > 0 && (
              <div className="courses-card-grid">
                {available.map((course, i) => {
                  const progress = getProgress(course);
                  const finished = progress === 100;
                  return (
                    <article
                      key={course.id}
                      className="course-kids-card animate-slide-up"
                      style={{ animationDelay: reducedMotion ? undefined : `${i * 60}ms` }}
                      tabIndex={0}
                      onClick={() => openCourse(course)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openCourse(course);
                        }
                      }}
                    >
                      <div className="course-kids-art">
                        <CourseThumbnail
                          src={getCourseThumbnail(course)}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                        <Badge
                          variant={
                            course.level === "Pemula"
                              ? "success"
                              : course.level === "Menengah"
                                ? "warning"
                                : "primary"
                          }
                        >
                          {course.level}
                        </Badge>
                        {finished && (
                          <span className="course-kids-complete">
                            <CheckCircleIcon size={15} />
                          </span>
                        )}
                      </div>
                      <div className="course-kids-body">
                        <h3>{course.title}</h3>
                        <p>{course.description}</p>
                        <div className="course-kids-meta">
                          <span>{course.totalLessons} Pelajaran</span>
                          {formatEstimatedHours(course.estimatedHours) && (
                            <span>{formatEstimatedHours(course.estimatedHours)}</span>
                          )}
                        </div>
                        {progress > 0 && (
                          <div className="course-kids-progress">
                            <ProgressBar value={progress} max={100} />
                            <strong>{progress}%</strong>
                          </div>
                        )}
                        <Button
                          fullWidth
                          variant={progress > 0 ? "primary" : "secondary"}
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            openCourse(course);
                          }}
                        >
                          {finished ? "Lihat Detail" : progress > 0 ? "Lanjutkan" : "Mulai"}
                          <ArrowRightIcon size={14} />
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {available.length === 0 && locked.length > 0 && (
              <div className="courses-card-grid">
                {locked.map((course) => (
                  <article key={course.id} className="course-kids-card is-locked">
                    <div className="course-kids-art">
                      <CourseThumbnail
                        src={getCourseThumbnail(course)}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                      <Badge variant="muted">{course.level}</Badge>
                      <span className="course-lock">
                        <LockIcon size={20} />
                      </span>
                    </div>
                    <div className="course-kids-body">
                      <h3>{course.title}</h3>
                      <p>{course.description}</p>
                      <div className="course-kids-meta">
                        <span>{course.totalLessons} Pelajaran</span>
                        {formatEstimatedHours(course.estimatedHours) && (
                          <span>{formatEstimatedHours(course.estimatedHours)}</span>
                        )}
                      </div>
                      <div className="course-locked-note">
                        <LockIcon size={14} /> Kursus ini belum tersedia
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <Pagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />

            {available.length > 0 && locked.length > 0 && (
              <section className="mt-7">
                <div className="courses-section-heading">
                  <div>
                    <h2>Kursus Terkunci</h2>
                    <p>Kursus ini akan segera tersedia.</p>
                  </div>
                </div>
                <div className="courses-card-grid">
                  {locked.map((course) => (
                    <article key={course.id} className="course-kids-card is-locked">
                      <div className="course-kids-art">
                        <CourseThumbnail
                          src={getCourseThumbnail(course)}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                        <Badge variant="muted">{course.level}</Badge>
                        <span className="course-lock">
                          <LockIcon size={20} />
                        </span>
                      </div>
                      <div className="course-kids-body">
                        <h3>{course.title}</h3>
                        <p>{course.description}</p>
                        <div className="course-kids-meta">
                          <span>{course.totalLessons} Pelajaran</span>
                          {formatEstimatedHours(course.estimatedHours) && (
                            <span>{formatEstimatedHours(course.estimatedHours)}</span>
                          )}
                        </div>
                        <div className="course-locked-note">
                          <LockIcon size={14} /> Kursus ini belum tersedia
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="courses-empty animate-fade-in">
            <div className="courses-empty-icon">
              <SearchIcon size={48} />
            </div>
            <strong>Pelajaran belum ditemukan</strong>
            <span>Coba gunakan kata kunci lain atau ubah tingkat pembelajaran.</span>
            <button
              type="button"
              onClick={handleReset}
              className="courses-empty-reset"
            >
              Reset pencarian
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
