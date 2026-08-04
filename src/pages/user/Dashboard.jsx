import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/app";
import {
  Card,
  Button,
  ProgressBar,
  Badge,
  StatCard,
} from "../../components/ui/ui";
import { RECENT_ACTIVITIES } from "../../data/mock";
import {
  BookIcon,
  TrophyIcon,
  FireIcon,
  ArrowRightIcon,
  PlayIcon,
  CheckCircleIcon,
  LockIcon,
} from "../../components/ui/Icons";

const PROFILE_LABEL = {
  parent: "Orang Tua dengan Anak Tunarungu",
  deaf: "Penyandang Tunarungu",
  general: "Pelajar Umum",
};

export default function UserDashboard() {
  const {
    currentUser,
    setSelectedCourse,
    setSelectedLesson,
    courses,
    quizHistory,
  } = useApp();
  const navigate = useNavigate();

  const COURSES = courses;
  const QUIZ_HISTORY = quizHistory;

  const currentCourse = COURSES[0];
  const currentLesson = currentCourse?.lessons?.find(
    (l) => l.status === "current",
  );
  const completedCourses = COURSES.filter(
    (c) => c.completedLessons === c.totalLessons,
  );
  const passedQuizzes = QUIZ_HISTORY.filter((q) => q.passed);
  const avgScore = passedQuizzes.length
    ? Math.round(
        passedQuizzes.reduce((sum, q) => sum + q.score, 0) /
          passedQuizzes.length,
      )
    : 0;
  const recentActivities = RECENT_ACTIVITIES.slice(0, 4);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero */}
      <div className="bg-gradient-to-r from-[#4F8EF7] to-[#6C63FF] rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 flex items-center opacity-10">
          <div className="text-9xl">🤟</div>
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="primary"
              className="bg-[var(--surface)]/20 text-white text-xs"
            >
              {currentUser?.profileType
                ? PROFILE_LABEL[currentUser.profileType]
                : "Pelajar"}
            </Badge>
          </div>
          <h1 className="text-2xl font-extrabold mb-1">
            Halo, {currentUser?.name?.split(" ")[0]}! 👋
          </h1>
          <p className="text-white/80 text-sm mb-5">
            Selamat datang kembali. Lanjutkan pelajaran Anda hari ini!
          </p>
          {currentLesson && (
            <Button
              variant="secondary"
              className="bg-[var(--surface)] text-[var(--primary)] hover:bg-[#F0F7FF] shadow-md"
              onClick={() => {
                setSelectedCourse(currentCourse.id);
                setSelectedLesson(currentLesson.id);
                navigate("/lesson");
              }}
            >
              <PlayIcon size={16} />
              Lanjutkan: {currentLesson.title}
              <ArrowRightIcon size={16} />
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Kursus Aktif"
          value={
            COURSES.filter(
              (c) => !c.isLocked && c.completedLessons < c.totalLessons,
            ).length
          }
          icon={<BookIcon size={20} />}
          color="#4F8EF7"
          trend={{ value: 0, label: "kursus" }}
        />
        <StatCard
          label="Pelajaran Selesai"
          value={COURSES.reduce((s, c) => s + c.completedLessons, 0)}
          icon={<CheckCircleIcon size={20} />}
          color="#2ECC71"
          trend={{ value: 3, label: "minggu ini" }}
        />
        <StatCard
          label="Rata-rata Kuis"
          value={`${avgScore}%`}
          icon={<TrophyIcon size={20} />}
          color="#F4B400"
          trend={{ value: 5, label: "vs minggu lalu" }}
        />
        <StatCard
          label="Streak Belajar"
          value="7 hari"
          icon={<FireIcon size={20} />}
          color="#E74C3C"
          trend={{ value: 2, label: "hari baru" }}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--text)]">
                  Kursus Saat Ini
                </h2>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">
                  {currentCourse.title}
                </p>
              </div>
              <Badge variant="primary">{currentCourse.level}</Badge>
            </div>
            <div className="bg-[var(--surface-2)] rounded-xl overflow-hidden mb-4">
              <img
                src={currentCourse.thumbnail}
                alt={currentCourse.title}
                className="w-full h-36 object-cover"
              />
            </div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-[var(--text-muted)]">Progress</span>
              <span className="font-semibold text-[var(--text)]">
                {currentCourse.completedLessons}/{currentCourse.totalLessons}{" "}
                pelajaran
              </span>
            </div>
            <ProgressBar
              value={currentCourse.completedLessons}
              max={currentCourse.totalLessons}
              showLabel
            />
            <div className="mt-4 space-y-2">
              {currentCourse.lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    lesson.status === "current"
                      ? "bg-[var(--primary-light)] border border-[#4F8EF7]/30"
                      : lesson.status === "completed"
                        ? "bg-[var(--surface-2)]"
                        : "bg-[var(--surface-2)] opacity-60"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      lesson.status === "completed"
                        ? "bg-[#2ECC71] text-white"
                        : lesson.status === "current"
                          ? "bg-[#4F8EF7] text-white"
                          : "bg-[#E2E8F0] text-[var(--text-subtle)]"
                    }`}
                  >
                    {lesson.status === "completed" ? (
                      <CheckCircleIcon size={14} />
                    ) : lesson.status === "current" ? (
                      <PlayIcon size={10} />
                    ) : (
                      <LockIcon size={12} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        lesson.status === "locked"
                          ? "text-[var(--text-subtle)]"
                          : "text-[var(--text)]"
                      }`}
                    >
                      {lesson.title}
                    </p>
                    <p className="text-xs text-[var(--text-subtle)]">
                      {lesson.duration}
                    </p>
                  </div>
                  {lesson.status === "current" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedCourse(currentCourse.id);
                        setSelectedLesson(lesson.id);
                        navigate("/lesson");
                      }}
                    >
                      Mulai
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[var(--text)]">
                Semua Kursus
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/courses")}
              >
                Lihat Semua <ArrowRightIcon size={14} />
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {COURSES.slice(0, 4).map((course) => (
                <div
                  key={course.id}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    course.isLocked
                      ? "border-[var(--border)] opacity-60"
                      : "border-[var(--border)] hover:border-[#4F8EF7] hover:shadow-sm"
                  }`}
                  onClick={() => {
                    if (!course.isLocked) {
                      setSelectedCourse(course.id);
                      navigate("/course-detail");
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-[var(--surface-3)] rounded-xl overflow-hidden flex-shrink-0">
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text)] truncate">
                        {course.title}
                      </p>
                      <p className="text-xs text-[var(--text-subtle)]">
                        {course.totalLessons} pelajaran
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {course.isLocked ? (
                          <div className="flex items-center gap-1 text-[var(--text-subtle)]">
                            <LockIcon size={12} />
                            <span className="text-xs">Terkunci</span>
                          </div>
                        ) : (
                          <ProgressBar
                            value={course.completedLessons}
                            max={course.totalLessons}
                            className="flex-1"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <Card>
            <h2 className="text-base font-bold text-[var(--text)] mb-4">
              Riwayat Kuis Terbaru
            </h2>
            <div className="space-y-3">
              {QUIZ_HISTORY.slice(0, 5).map((q) => (
                <div key={q.id} className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      q.passed
                        ? "bg-[var(--success-light)] text-[#2ECC71]"
                        : "bg-[var(--danger-light)] text-[#E74C3C]"
                    }`}
                  >
                    {q.score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--text)] truncate">
                      {q.lesson}
                    </p>
                    <p className="text-xs text-[var(--text-subtle)]">
                      {q.date}
                    </p>
                  </div>
                  <Badge variant={q.passed ? "success" : "danger"}>
                    {q.passed ? "Lulus" : "Gagal"}
                  </Badge>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              fullWidth
              className="mt-3"
              onClick={() => navigate("/progress")}
            >
              Lihat Semua Riwayat
            </Button>
          </Card>

          <Card>
            <h2 className="text-base font-bold text-[var(--text)] mb-4">
              Aktivitas Terbaru
            </h2>
            <div className="space-y-3">
              {recentActivities.map((act) => (
                <div key={act.id} className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 mt-0.5 ${
                      act.type === "quiz"
                        ? "bg-[var(--warning-light)]"
                        : act.type === "lesson"
                          ? "bg-[var(--primary-light)]"
                          : "bg-[var(--success-light)]"
                    }`}
                  >
                    {act.type === "quiz"
                      ? "📝"
                      : act.type === "lesson"
                        ? "📖"
                        : "🎓"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--text)] leading-relaxed">
                      {act.action}
                    </p>
                    <p className="text-xs text-[var(--text-subtle)] mt-0.5">
                      {act.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-[#FF6B6B] to-[#E74C3C] text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/80">Streak Belajar</p>
                <p className="text-3xl font-extrabold mt-1">7 🔥</p>
                <p className="text-xs text-white/70 mt-1">
                  Hari berturut-turut
                </p>
              </div>
              <div className="text-5xl opacity-30">🔥</div>
            </div>
            <div className="flex gap-1 mt-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-1.5 bg-[var(--surface)]/60 rounded-full"
                />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
