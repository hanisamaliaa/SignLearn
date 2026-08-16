import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/app";
import { Badge, Button, ProgressBar } from "../../components/ui/ui";
import {
  ArrowRightIcon,
  BookIcon,
  CheckCircleIcon,
  LockIcon,
  SearchIcon,
  TrophyIcon,
} from "../../components/ui/Icons";
import { formatEstimatedHours } from "../../features/lesson/courseMeta";

const LEVELS = ["Semua", "Pemula", "Menengah", "Lanjutan"];

export default function Courses() {
  const { setSelectedCourse, courses } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Semua");

  const COURSES = courses || [];

  const summary = useMemo(() => [
    {
      label: "Kursus",
      value: COURSES.filter((course) => !course.isLocked).length,
      helper: "tersedia untukmu",
      tone: "pink",
      icon: <BookIcon size={21} />,
    },
    {
      label: "Belajar",
      // Dibaca dari status yang dihitung server. Rumus lamanya
      // (`completedLessons > 0 && completedLessons < totalLessons`) tidak
      // pernah bisa benar untuk kursus berisi satu pelajaran, sehingga angka
      // ini selalu 0 betapapun banyak video yang sudah dibuka.
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
  ], [COURSES]);

  // Keep filtering compatible with the original course data.
  // Some course records can omit optional text fields, so normalize them
  // before calling toLowerCase(). This prevents the filter buttons from
  // crashing the page when a record is incomplete.
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");

    return COURSES.filter((course) => {
      const title = String(course?.title ?? "").toLocaleLowerCase("id-ID");
      const category = String(course?.category ?? "").toLocaleLowerCase("id-ID");
      const description = String(course?.description ?? "").toLocaleLowerCase("id-ID");
      const level = String(course?.level ?? "").trim();

      const matchSearch =
        !query ||
        title.includes(query) ||
        category.includes(query) ||
        description.includes(query);

      // Preserve the original behavior: a selected level only shows
      // courses that actually belong to that level.
      const matchLevel = filter === "Semua" || level === filter;

      return matchSearch && matchLevel;
    });
  }, [COURSES, search, filter]);

  const available = filtered.filter((course) => !course.isLocked);
  const locked = filtered.filter((course) => course.isLocked);

  const getProgress = (course) => course.totalLessons ? Math.round((course.completedLessons / course.totalLessons) * 100) : 0;

  const openCourse = async (course) => {
    if (course.isLocked) return;
    await setSelectedCourse(course.id);
    navigate("/course-detail");
  };

  return (
    <div className="courses-page space-y-7 animate-fade-in">
      <section className="courses-intro">
        <div>
          <p className="courses-kicker">RUANG BELAJARMU</p>
          <h1>Pilih pembelajaranmu!</h1>
          <p>Temukan kursus BISINDO yang ingin kamu pelajari hari ini.</p>
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
                  const total = COURSES.reduce(
                    (sum, course) => sum + (course.totalLessons ?? 0),
                    0
                  );
                  const completed = COURSES.reduce(
                    (sum, course) => sum + (course.completedLessons ?? 0),
                    0
                  );
                  return total ? Math.round((completed / total) * 100) : 0;
                })()}%`,
              }}
            />
          </div>
        </div>
      </section>

      <section className="courses-tools" aria-label="Cari dan filter kursus">
        <label className="courses-search">
          <SearchIcon size={19} aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari kursus..."
            aria-label="Cari kursus"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} aria-label="Hapus pencarian">×</button>
          )}
        </label>
        <div className="courses-filters" role="group" aria-label="Filter tingkat kursus">
          {LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={(event) => {
                event.preventDefault();
                setFilter(level);
              }}
              className={filter === level ? "is-active" : ""}
              aria-pressed={filter === level}
            >
              {level}
            </button>
          ))}
        </div>
      </section>

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

      <section>
        <div className="courses-section-heading">
          <div>
            <h2>Pelajaran Untukmu</h2>
            <p>{filtered.length} pilihan belajar ditemukan</p>
          </div>
          <button type="button" onClick={() => { setSearch(""); setFilter("Semua"); }} className="courses-reset">Lihat semua <ArrowRightIcon size={15} /></button>
        </div>

        {filtered.length > 0 ? (
          <>
            {available.length > 0 ? (
              <div className="courses-card-grid">
                {available.map((course) => {
                  const progress = getProgress(course);
                  const finished = progress === 100;
                  return (
                    <article
                      key={course.id}
                      className="course-kids-card"
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
                        <img src={course.thumbnail} alt="" />
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
                          {finished
                            ? "Lihat Detail"
                            : progress > 0
                              ? "Lanjutkan"
                              : "Mulai"}
                          <ArrowRightIcon size={14} />
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="courses-card-grid">
                {locked.map((course) => (
                  <article key={course.id} className="course-kids-card is-locked">
                    <div className="course-kids-art">
                      <img src={course.thumbnail} alt="" />
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
                        <LockIcon size={14} /> Selesaikan kursus sebelumnya
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="courses-empty">
            <SearchIcon size={28} />
            <strong>Kursus tidak ditemukan</strong>
            <span>Coba kata kunci lain atau pilih tingkat yang berbeda.</span>
          </div>
        )}

        {available.length > 0 && locked.length > 0 && (
          <section className="mt-7">
            <div className="courses-section-heading">
              <div>
                <h2>Kursus Terkunci</h2>
                <p>Selesaikan kursus sebelumnya untuk membukanya.</p>
              </div>
            </div>
            <div className="courses-card-grid">
              {locked.map((course) => (
                <article key={course.id} className="course-kids-card is-locked">
                  <div className="course-kids-art">
                    <img src={course.thumbnail} alt="" />
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
                      <LockIcon size={14} /> Selesaikan kursus sebelumnya
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>
    </div>
  );
}
