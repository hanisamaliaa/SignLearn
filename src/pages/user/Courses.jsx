import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/app";
import { Card, Button, Badge, ProgressBar } from "../../components/ui/ui";
import {
  LockIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  SearchIcon,
} from "../../components/ui/Icons";

const LEVELS = ["Semua", "Pemula", "Menengah", "Lanjutan"];

export default function Courses() {
  const { setSelectedCourse, courses } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Semua");

  const COURSES = courses;

  const SUMMARY = [
    {
      label: "Kursus Tersedia",
      value: COURSES.filter((c) => !c.isLocked).length,
      color: "#4F8EF7",
    },
    {
      label: "Sedang Dipelajari",
      value: COURSES.filter(
        (c) =>
          !c.isLocked &&
          c.completedLessons > 0 &&
          c.completedLessons < c.totalLessons,
      ).length,
      color: "#F4B400",
    },
    {
      label: "Kursus Selesai",
      value: COURSES.filter((c) => c.completedLessons === c.totalLessons)
        .length,
      color: "#2ECC71",
    },
  ];

  const filtered = COURSES.filter((c) => {
    const matchSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "Semua" || c.level === filter;
    return matchSearch && matchFilter;
  });

  const unlocked = filtered.filter((c) => !c.isLocked);
  const locked = filtered.filter((c) => c.isLocked);

  function getProgress(course) {
    if (course.totalLessons === 0) return 0;
    return Math.round((course.completedLessons / course.totalLessons) * 100);
  }

  function getStatusInfo(course) {
    if (course.isLocked) {
      return {
        label: "Terkunci",
        variant: "muted",
        icon: <LockIcon size={12} />,
      };
    }
    if (course.completedLessons === course.totalLessons) {
      return {
        label: "Selesai",
        variant: "success",
        icon: <CheckCircleIcon size={12} />,
      };
    }
    if (course.completedLessons > 0) {
      return { label: "Sedang Berjalan", variant: "primary", icon: null };
    }
    return { label: "Belum Mulai", variant: "outline", icon: null };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[var(--text)]">
          Katalog Kursus
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          Pelajari Bahasa Isyarat Indonesia (BISINDO) secara terstruktur
        </p>
      </div>

      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <SearchIcon
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]"
            />
            <input
              type="text"
              placeholder="Cari kursus atau kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] outline-none focus:border-[#4F8EF7] focus:ring-2 focus:ring-[#4F8EF7]/20 bg-[var(--surface)]"
            />
          </div>
          <div className="flex gap-2">
            {LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => setFilter(l)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filter === l
                    ? "bg-[#4F8EF7] text-white"
                    : "bg-[var(--surface-3)] text-[var(--text-muted)] hover:bg-[#E2E8F0]"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        {SUMMARY.map((s) => (
          <div
            key={s.label}
            className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-center"
          >
            <p className="text-2xl font-extrabold" style={{ color: s.color }}>
              {s.value}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {unlocked.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-[var(--text)] mb-4">
            Kursus Tersedia
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {unlocked.map((course) => {
              const status = getStatusInfo(course);
              const pct = getProgress(course);
              return (
                <Card
                  key={course.id}
                  hover
                  padding="none"
                  className="overflow-hidden"
                >
                  <div className="relative">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-44 object-cover"
                    />
                    <div className="absolute top-3 left-3">
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
                    </div>
                    {course.completedLessons === course.totalLessons &&
                      course.totalLessons > 0 && (
                        <div className="absolute top-3 right-3 w-8 h-8 bg-[#2ECC71] rounded-full flex items-center justify-center">
                          <CheckCircleIcon size={16} className="text-white" />
                        </div>
                      )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-1.5">
                      <h3 className="font-bold text-[var(--text)]">
                        {course.title}
                      </h3>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mb-3 line-clamp-2">
                      {course.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-[var(--text-subtle)] mb-3">
                      <span>📖 {course.totalLessons} pelajaran</span>
                      <span>⏱ {course.estimatedHours} jam</span>
                    </div>
                    {pct > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-[var(--text-muted)]">
                            Progress
                          </span>
                          <span className="font-medium text-[var(--text)]">
                            {pct}%
                          </span>
                        </div>
                        <ProgressBar value={pct} max={100} />
                      </div>
                    )}
                    <Button
                      fullWidth
                      variant={pct > 0 ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => {
                        setSelectedCourse(course.id);
                        navigate("/course-detail");
                      }}
                    >
                      {pct === 100
                        ? "Lihat Detail"
                        : pct > 0
                          ? "Lanjutkan Belajar"
                          : "Mulai Kursus"}
                      <ArrowRightIcon size={14} />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {locked.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-bold text-[var(--text)]">
              Kursus Terkunci
            </h2>
            <div className="flex items-center gap-1.5 bg-[var(--warning-light)] text-[#E6A800] text-xs px-2.5 py-1 rounded-full font-medium">
              <LockIcon size={11} />
              Selesaikan kursus sebelumnya untuk membuka
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {locked.map((course) => (
              <Card
                key={course.id}
                padding="none"
                className="overflow-hidden opacity-70"
              >
                <div className="relative">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-44 object-cover grayscale"
                  />
                  <div className="absolute inset-0 bg-[#1A2332]/40 flex items-center justify-center">
                    <div className="w-12 h-12 bg-[var(--surface)]/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <LockIcon size={22} className="text-white" />
                    </div>
                  </div>
                  <div className="absolute top-3 left-3">
                    <Badge variant="muted">{course.level}</Badge>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-[var(--text)] mb-1">
                    {course.title}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mb-3 line-clamp-2">
                    {course.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-[var(--text-subtle)] mb-3">
                    <span>📖 {course.totalLessons} pelajaran</span>
                    <span>⏱ {course.estimatedHours} jam</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-[var(--surface-2)] rounded-xl">
                    <LockIcon size={14} className="text-[var(--text-subtle)]" />
                    <span className="text-xs text-[var(--text-muted)]">
                      Selesaikan kursus sebelumnya untuk membuka
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-[var(--text)] font-semibold">
            Kursus tidak ditemukan
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Coba kata kunci lain atau ubah filter
          </p>
        </div>
      )}
    </div>
  );
}
