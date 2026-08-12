import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/app";
import { Card, Button, Badge } from "../../components/ui/ui";
import {
  ArrowLeftIcon,
  PlayIcon,
  RefreshIcon,
  ArrowRightIcon,
} from "../../components/ui/Icons";

const VOCAB = [
  {
    sign: "A",
    description:
      "Tangan menggenggam dengan jempol di sisi luar, mengarah ke samping.",
    usage: 'Digunakan untuk mengeja huruf "A"',
  },
  {
    sign: "B",
    description:
      "Empat jari lurus ke atas, jempol ditekuk ke dalam telapak tangan.",
    usage: 'Digunakan untuk mengeja huruf "B"',
  },
  {
    sign: "C",
    description: "Tangan membentuk huruf C latin dengan jari-jari melengkung.",
    usage: 'Digunakan untuk mengeja huruf "C"',
  },
  {
    sign: "D",
    description:
      "Telunjuk lurus ke atas, ibu jari menyentuh ujung jari tengah membentuk lingkaran.",
    usage: 'Digunakan untuk mengeja huruf "D"',
  },
];

const TABS = [
  { id: "video", label: "📖 Materi" },
  { id: "vocab", label: "✋ Kosakata" },
  { id: "notes", label: "📝 Catatan" },
];

const GOALS = [
  "Mampu membuat isyarat tangan yang akurat untuk setiap huruf",
  "Memahami perbedaan antara isyarat yang mirip",
  "Dapat menggunakan isyarat ini dalam konteks mengeja kata",
  "Meningkatkan kefasihan dan kecepatan isyarat",
];

export default function Lesson() {
  const { selectedCourse, selectedLessonId } = useApp();
  const navigate = useNavigate();
  const [playing, setPlaying] = useState(false);
  const [tab, setTab] = useState("video");

  const course = selectedCourse || { lessons: [] };
  const lesson =
    course.lessons.find((l) => l.id === selectedLessonId) ||
    course.lessons.find((l) => l.status === "current") ||
    course.lessons[0];
  if (!lesson) {
    navigate("/course-detail");
    return null;
  }
  const lessonIdx = course.lessons.findIndex((l) => l.id === lesson.id);
  const prevLesson = lessonIdx > 0 ? course.lessons[lessonIdx - 1] : null;

  return (
    <div className="lesson-page space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/course-detail")}
          className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          <ArrowLeftIcon size={16} />
          Kembali ke {course.title}
        </button>
        <Badge variant="primary">
          Pelajaran {lessonIdx + 1} dari {course.lessons.length}
        </Badge>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">
          <Card padding="none" className="overflow-hidden">
            <button
              type="button"
              aria-pressed={playing}
              aria-label={playing ? `Jeda ${lesson.title}` : `Putar ${lesson.title}`}
              className="relative w-full aspect-video bg-[#1A2332] flex items-center justify-center cursor-pointer group text-left"
              onClick={() => setPlaying(!playing)}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#1A2332]/60 to-transparent" />
              {!playing ? (
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-[var(--surface)]/10 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-[var(--surface)]/20 transition-colors border-2 border-white/30">
                    <PlayIcon size={28} className="text-white ml-1" />
                  </div>
                  <p className="text-white/80 text-sm font-medium">
                    {lesson.title}
                  </p>
                </div>
              ) : (
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <div className="w-20 h-20 rounded-full bg-[#4F8EF7]/20 flex items-center justify-center">
                    <div className="flex gap-1.5">
                      <div
                        className="w-2.5 bg-[var(--surface)] rounded-full animate-bounce"
                        style={{ height: "32px", animationDelay: "0s" }}
                      />
                      <div
                        className="w-2.5 bg-[var(--surface)] rounded-full animate-bounce"
                        style={{ height: "32px", animationDelay: "0.15s" }}
                      />
                      <div
                        className="w-2.5 bg-[var(--surface)] rounded-full animate-bounce"
                        style={{ height: "32px", animationDelay: "0.3s" }}
                      />
                    </div>
                  </div>
                  <p className="text-white/80 text-sm">Sedang diputar...</p>
                </div>
              )}
              <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3">
                <div className="flex-1 h-1 bg-[var(--surface)]/20 rounded-full">
                  <div
                    className={`h-full bg-[#4F8EF7] rounded-full transition-all duration-1000 ${
                      playing ? "w-[35%]" : "w-0"
                    }`}
                  />
                </div>
                <span className="text-white/60 text-xs">{lesson.duration}</span>
              </div>
            </button>
            <div className="p-4 flex items-center justify-between border-t border-[var(--border)]">
              <div>
                <h2 className="font-bold text-[var(--text)]">{lesson.title}</h2>
                <p className="text-xs text-[var(--text-subtle)]">
                  {course.title} • {lesson.duration}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPlaying(false)}
                >
                  <RefreshIcon size={15} /> Ulang
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex gap-1 p-1 bg-[var(--surface-3)] rounded-xl mb-4">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    tab === t.id
                      ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "video" && (
              <div className="prose max-w-none">
                <h3 className="text-base font-bold text-[var(--text)] mb-3">
                  Tentang Pelajaran Ini
                </h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
                  Dalam pelajaran ini, Anda akan mempelajari cara membuat
                  isyarat tangan untuk huruf-huruf awal dalam alfabet BISINDO.
                  Setiap huruf memiliki posisi tangan yang unik dan perlu
                  dipraktikkan berulang kali untuk dikuasai.
                </p>
                <h3 className="text-base font-bold text-[var(--text)] mb-3">
                  Tujuan Pembelajaran
                </h3>
                <ul className="space-y-2">
                  {GOALS.map((goal, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-[var(--text-muted)]"
                    >
                      <span className="w-5 h-5 bg-[var(--primary-light)] text-[var(--primary)] rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {goal}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 p-4 bg-[var(--primary-light)] rounded-xl">
                  <p className="text-sm font-semibold text-[var(--primary)] mb-1">
                    💡 Tips Belajar
                  </p>
                  <p className="text-sm text-[var(--primary)]/80">
                    Latih setiap isyarat di depan cermin untuk memastikan posisi
                    tangan Anda benar. Praktik 5-10 menit setiap hari lebih
                    efektif daripada sesi panjang yang jarang.
                  </p>
                </div>
              </div>
            )}

            {tab === "vocab" && (
              <div>
                <h3 className="text-base font-bold text-[var(--text)] mb-4">
                  Kosakata Isyarat
                </h3>
                <div className="space-y-4">
                  {VOCAB.map((v, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-4 p-4 bg-[var(--surface-2)] rounded-xl border border-[var(--border)]"
                    >
                      <div className="w-12 h-12 bg-[#4F8EF7] rounded-xl flex items-center justify-center text-white text-xl font-extrabold flex-shrink-0">
                        {v.sign}
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--text)] mb-1">
                          Huruf "{v.sign}"
                        </p>
                        <p className="text-sm text-[var(--text-muted)] mb-1">
                          {v.description}
                        </p>
                        <p className="text-xs text-[var(--text-subtle)] italic">
                          {v.usage}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "notes" && (
              <div>
                <h3 className="text-base font-bold text-[var(--text)] mb-3">
                  Catatan Pelajaran
                </h3>
                <textarea
                  className="w-full h-40 p-3 rounded-xl border border-[var(--border)] text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] outline-none focus:border-[#4F8EF7] focus:ring-2 focus:ring-[#4F8EF7]/20 resize-none"
                  placeholder="Tulis catatan Anda di sini..."
                />
                <Button size="sm" className="mt-2">
                  Simpan Catatan
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <h3 className="font-bold text-[var(--text)] mb-4">
              Navigasi Pelajaran
            </h3>
            <div className="space-y-2">
              {course.lessons.map((l, i) => (
                <div
                  key={l.id}
                  className={`flex items-center gap-3 p-2.5 rounded-xl text-sm ${
                    l.id === lesson.id
                      ? "bg-[var(--primary-light)]"
                      : l.status === "locked"
                        ? "opacity-50"
                        : "hover:bg-[var(--surface-2)]"
                  } transition-colors`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      l.status === "completed"
                        ? "bg-[#2ECC71] text-white"
                        : l.id === lesson.id
                          ? "bg-[#4F8EF7] text-white"
                          : "bg-[#E2E8F0] text-[var(--text-subtle)]"
                    }`}
                  >
                    {l.status === "completed" ? "✓" : i + 1}
                  </div>
                  <span
                    className={`flex-1 truncate text-xs ${
                      l.id === lesson.id
                        ? "text-[var(--primary)] font-semibold"
                        : l.status === "locked"
                          ? "text-[var(--text-subtle)]"
                          : "text-[var(--text)]"
                    }`}
                  >
                    {l.title}
                  </span>
                  {l.status === "locked" && (
                    <span className="text-[var(--text-subtle)]">🔒</span>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-bold text-[var(--text)] mb-3">
              Gambar Isyarat
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {["A", "B", "C", "D"].map((letter) => (
                <div
                  key={letter}
                  className="aspect-square bg-gradient-to-br from-[#EAF3FF] to-[#D4E9FF] rounded-xl flex items-center justify-center"
                >
                  <span className="text-4xl font-extrabold text-[var(--primary)] opacity-80">
                    {letter}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-2 border-[#4F8EF7] bg-[var(--primary-light)]">
            <div className="text-center">
              <div className="text-3xl mb-2">📝</div>
              <h3 className="font-bold text-[var(--text)] mb-1">
                Siap untuk Kuis?
              </h3>
              <p className="text-xs text-[var(--text-muted)] mb-4">
                Selesaikan video terlebih dahulu, lalu ikuti kuis untuk membuka
                pelajaran berikutnya. Nilai minimum: 70.
              </p>
              <Button fullWidth onClick={() => navigate("/quiz")}>
                Mulai Kuis <ArrowRightIcon size={14} />
              </Button>
            </div>
          </Card>

          {prevLesson && (
            <Button variant="outline" fullWidth size="sm">
              <ArrowLeftIcon size={14} /> Pelajaran Sebelumnya
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
