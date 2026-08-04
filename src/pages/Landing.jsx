import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/ui";
import {
  CheckIcon,
  ArrowRightIcon,
  StarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "../components/ui/Icons";
import { TESTIMONIALS } from "../data/mock";

const FEATURES = [
  {
    icon: "🎥",
    title: "Video Isyarat HD",
    desc: "Setiap gerakan direkam dengan kualitas tinggi dari berbagai sudut pandang.",
  },
  {
    icon: "🧠",
    title: "Kuis Interaktif",
    desc: "Uji pemahaman Anda setelah setiap pelajaran dengan kuis yang adaptif.",
  },
  {
    icon: "📈",
    title: "Progres Terstruktur",
    desc: "Belajar secara berurutan dengan sistem penguncian kursus yang terstruktur.",
  },
  {
    icon: "♿",
    title: "Aksesibilitas Pertama",
    desc: "Dirancang untuk komunitas tuli dan pendukung mereka sejak awal.",
  },
  {
    icon: "🔔",
    title: "Pengingat Belajar",
    desc: "Jaga konsistensi belajar dengan notifikasi pengingat harian.",
  },
  {
    icon: "🏆",
    title: "Pencapaian & Streak",
    desc: "Tetap termotivasi dengan sistem pencapaian dan streak belajar.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Daftar Akun",
    desc: "Buat akun gratis dan pilih profil belajar yang sesuai dengan kebutuhan Anda.",
  },
  {
    step: "02",
    title: "Pilih Kursus",
    desc: "Mulai dari Alfabet BISINDO atau pilih topik yang paling relevan.",
  },
  {
    step: "03",
    title: "Tonton & Pelajari",
    desc: "Ikuti video interaktif dengan panduan isyarat yang jelas dan terstruktur.",
  },
  {
    step: "04",
    title: "Ikuti Kuis",
    desc: "Selesaikan kuis di akhir setiap pelajaran untuk membuka pelajaran berikutnya.",
  },
];

const CATEGORIES = [
  { name: "Alfabet", count: 6, emoji: "🔤", color: "#4F8EF7", bg: "#EAF3FF" },
  { name: "Angka", count: 5, emoji: "🔢", color: "#2ECC71", bg: "#E9FBF2" },
  { name: "Sapaan", count: 4, emoji: "👋", color: "#F4B400", bg: "#FFF9E6" },
  { name: "Keluarga", count: 4, emoji: "👨‍👩‍👧", color: "#9B59B6", bg: "#F3E9FF" },
  { name: "Warna", count: 3, emoji: "🎨", color: "#E74C3C", bg: "#FEECEB" },
  { name: "Makanan", count: 5, emoji: "🍜", color: "#E67E22", bg: "#FEF3E2" },
  { name: "Hewan", count: 5, emoji: "🦁", color: "#1ABC9C", bg: "#E8FAF5" },
  { name: "Kegiatan", count: 6, emoji: "🏃", color: "#3498DB", bg: "#EBF5FC" },
];

const FAQS = [
  {
    q: "Apakah SignLearn gratis?",
    a: "SignLearn menyediakan akses gratis untuk seluruh kursus dasar BISINDO. Kami percaya bahwa komunikasi adalah hak semua orang.",
  },
  {
    q: "Apakah saya perlu pengalaman sebelumnya?",
    a: "Tidak perlu! SignLearn dirancang untuk pemula yang sama sekali belum mengenal bahasa isyarat.",
  },
  {
    q: "Berapa lama waktu yang dibutuhkan untuk belajar?",
    a: "Dengan belajar 15-30 menit per hari, Anda bisa menguasai dasar-dasar BISINDO dalam 2-3 bulan.",
  },
  {
    q: "Apakah kursus bisa diakses di perangkat mobile?",
    a: "Ya, SignLearn dapat diakses melalui browser di semua perangkat, termasuk ponsel dan tablet.",
  },
  {
    q: "Apa itu skor KKM 70?",
    a: "Setiap kuis memiliki nilai minimum kelulusan (KKM) 70. Jika belum mencapai 70, Anda dapat mengulang kuis setelah me-review pelajaran.",
  },
];

const STATS = [
  { value: "2.400+", label: "Pelajar Aktif" },
  { value: "8", label: "Kategori Kursus" },
  { value: "38", label: "Total Pelajaran" },
  { value: "95%", label: "Tingkat Kepuasan" },
];

const WHY_US = [
  {
    icon: "👪",
    title: "Untuk Orang Tua",
    desc: "Pelajari BISINDO untuk berkomunikasi lebih dekat dengan anak Anda yang tunarungu.",
  },
  {
    icon: "🤟",
    title: "Untuk Penyandang Tunarungu",
    desc: "Tingkatkan kemampuan komunikasi BISINDO Anda secara mandiri.",
  },
  {
    icon: "🌟",
    title: "Untuk Pelajar Umum",
    desc: "Pelajari bahasa isyarat dan berkontribusi pada inklusivitas masyarakat.",
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="min-h-screen bg-[var(--surface)] font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[var(--surface)]/90 backdrop-blur-md border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#4F8EF7] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-xl font-bold text-[var(--text)]">
              SignLearn
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--text-muted)]">
            <a href="#features" className="text-white transition-colors">
              Fitur
            </a>
            <a href="#how" className="text-white transition-colors">
              Cara Kerja
            </a>
            <a href="#categories" className="text-white transition-colors">
              Kategori
            </a>
            <a href="#testimonials" className="text-white transition-colors">
              Testimoni
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
              onClick={() => navigate("/login")}
            >
              Masuk
            </Button>
            <Button size="sm" onClick={() => navigate("/register")}>
              Daftar Gratis
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#F0F7FF] via-white to-[#EAF3FF] pt-20 pb-24">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, #4F8EF720 0%, transparent 50%), radial-gradient(circle at 80% 20%, #6C63FF15 0%, transparent 40%)",
          }}
        />
        <div className="max-w-6xl mx-auto px-6 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 bg-[var(--primary-light)] text-white px-4 py-1.5 rounded-full text-sm font-medium mb-6">
                <span>🤟</span> Platform BISINDO #1 di Indonesia
              </div>
              <h1
                className="text-5xl lg:text-6xl font-extrabold leading-tight mb-6"
                style={{ color: "var(--hero-title)" }}
              >
                Belajar{" "}
                <span className="text-[var(--primary)] relative">
                  Bahasa Isyarat
                  <svg
                    className="absolute -bottom-1 left-0 w-full"
                    height="6"
                    viewBox="0 0 300 6"
                  >
                    <path
                      d="M0 5 Q150 0 300 5"
                      stroke="#4F8EF7"
                      strokeWidth="2.5"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>{" "}
                Indonesia dengan Mudah
              </h1>
              <p className="text-lg text-[var(--text-muted)] mb-8 leading-relaxed">
                SignLearn membantu orang tua, penyandang tunarungu, dan pelajar
                umum menguasai BISINDO melalui kursus video interaktif dan kuis
                terstruktur.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button
                  size="lg"
                  onClick={() => navigate("/register")}
                  className="shadow-lg shadow-[#4F8EF7]/30"
                >
                  Mulai Belajar BISINDO <ArrowRightIcon size={18} />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="text-white"
                  onClick={() => navigate("/login")}
                >
                  Sudah Punya Akun
                </Button>
              </div>
              <div className="flex items-center gap-6 text-sm text-[var(--text-muted)]">
                {["100% Gratis", "Tanpa Kartu Kredit", "8 Kategori Kursus"].map(
                  (item) => (
                    <div key={item} className="flex items-center gap-1.5">
                      <CheckIcon size={14} className="text-[#2ECC71]" />
                      {item}
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="relative w-full aspect-square max-w-sm mx-auto">
                <img
                  src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=500&h=500&fit=crop&auto=format"
                  alt="Pembelajaran BISINDO"
                  className="w-full h-full object-cover rounded-3xl shadow-2xl"
                />
                <div
                  className="absolute -left-8 top-8 bg-[var(--surface)] rounded-2xl p-3.5 shadow-xl border border-[var(--border)] animate-fade-in"
                  style={{ animationDelay: "0.3s" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[var(--success-light)] rounded-xl flex items-center justify-center text-xl">
                      🏆
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-subtle)]">
                        Pencapaian
                      </p>
                      <p className="text-sm font-bold text-[var(--text)]">
                        Kuis Sempurna!
                      </p>
                    </div>
                  </div>
                </div>
                <div
                  className="absolute -right-8 bottom-16 bg-[var(--surface)] rounded-2xl p-3.5 shadow-xl border border-[var(--border)] animate-fade-in"
                  style={{ animationDelay: "0.5s" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[var(--primary-light)] rounded-xl flex items-center justify-center text-xl">
                      🔥
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-subtle)]">
                        Streak Belajar
                      </p>
                      <p className="text-sm font-bold text-[var(--text)]">
                        7 Hari
                      </p>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-4 left-8 bg-[var(--surface)] rounded-2xl p-3 shadow-xl border border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <StarIcon
                          key={s}
                          size={14}
                          className="text-[#F4B400]"
                          filled
                        />
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-[var(--text)] ml-1">
                      4.9 / 5
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    dari 2.400+ pelajar
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-[#4F8EF7] py-10">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s) => (
            <div key={s.label} className="text-center text-white">
              <p className="text-3xl font-extrabold">{s.value}</p>
              <p className="text-sm text-white/70 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why us */}
      <section className="py-20 bg-[var(--surface)]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <img
                src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=450&fit=crop&auto=format"
                alt="Komunitas pelajar BISINDO"
                className="w-full rounded-3xl shadow-xl"
              />
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--primary)] mb-3">
                Mengapa SignLearn?
              </div>
              <h2 className="text-4xl font-extrabold text-[var(--text)] mb-6">
                Platform yang Dirancang untuk Semua Orang
              </h2>
              <p className="text-[var(--text-muted)] mb-8 leading-relaxed">
                SignLearn hadir untuk menjembatani komunikasi antara komunitas
                tuli dan masyarakat umum melalui pembelajaran BISINDO yang
                terstruktur dan accessible.
              </p>
              <div className="space-y-5">
                {WHY_US.map((b) => (
                  <div key={b.title} className="flex items-start gap-4">
                    <div className="w-11 h-11 bg-[var(--primary-light)] rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                      {b.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--text)]">
                        {b.title}
                      </h3>
                      <p className="text-sm text-[var(--text-muted)] mt-0.5">
                        {b.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 bg-[var(--surface-2)]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-sm font-semibold text-[var(--primary)] mb-3">
              Cara Kerja
            </div>
            <h2 className="text-4xl font-extrabold text-[var(--text)]">
              Mulai Belajar dalam 4 Langkah
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="relative">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[calc(100%-8px)] w-full h-0.5 bg-[#E2E8F0] z-0" />
                )}
                <div className="relative z-10 bg-[var(--surface)] rounded-2xl p-6 shadow-sm border border-[var(--border)] text-center hover:shadow-md transition-shadow">
                  <div className="w-14 h-14 bg-[#4F8EF7] rounded-2xl flex items-center justify-center text-white text-xl font-extrabold mx-auto mb-4">
                    {step.step}
                  </div>
                  <h3 className="font-bold text-[var(--text)] mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="py-20 bg-[var(--surface)]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-sm font-semibold text-[var(--primary)] mb-3">
              Kategori Belajar
            </div>
            <h2 className="text-4xl font-extrabold text-[var(--text)]">
              8 Topik Kursus BISINDO
            </h2>
            <p className="text-[var(--text-muted)] mt-3 max-w-xl mx-auto">
              Dari alfabet dasar hingga percakapan sehari-hari, kami siapkan
              materi lengkap untuk Anda.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                onClick={() => navigate("/register")}
                className="p-5 rounded-2xl border border-[var(--border)] hover:border-[#4F8EF7] hover:shadow-md transition-all duration-200 text-left group bg-[var(--surface)]"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3"
                  style={{ background: cat.bg }}
                >
                  {cat.emoji}
                </div>
                <p className="font-semibold text-[var(--text)] text-sm">
                  {cat.name}
                </p>
                <p className="text-xs text-[var(--text-subtle)] mt-0.5">
                  {cat.count} pelajaran
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-[var(--surface-2)]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-sm font-semibold text-[var(--primary)] mb-3">
              Fitur Unggulan
            </div>
            <h2 className="text-4xl font-extrabold text-[var(--text)]">
              Semua yang Anda Butuhkan
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-[var(--surface)] p-6 rounded-2xl shadow-sm border border-[var(--border)] hover:shadow-md transition-shadow"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-[var(--text)] mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--text-muted)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-[var(--surface)]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-sm font-semibold text-[var(--primary)] mb-3">
              Testimoni
            </div>
            <h2 className="text-4xl font-extrabold text-[var(--text)]">
              Kata Mereka Tentang SignLearn
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.id}
                className="bg-[var(--surface-2)] p-5 rounded-2xl border border-[var(--border)]"
              >
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <StarIcon
                      key={i}
                      size={14}
                      className="text-[#F4B400]"
                      filled
                    />
                  ))}
                </div>
                <p className="text-sm text-[var(--text-muted)] mb-4 leading-relaxed">
                  "{t.text}"
                </p>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-[#4F8EF7] rounded-full flex items-center justify-center text-white text-xs font-semibold">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)]">
                      {t.name}
                    </p>
                    <p className="text-xs text-[var(--text-subtle)]">
                      {t.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-[var(--surface-2)]">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-sm font-semibold text-[var(--primary)] mb-3">
              FAQ
            </div>
            <h2 className="text-4xl font-extrabold text-[var(--text)]">
              Pertanyaan Umum
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-medium text-[var(--text)]">
                    {faq.q}
                  </span>
                  {openFaq === i ? (
                    <ChevronUpIcon
                      size={18}
                      className="text-[var(--primary)] flex-shrink-0"
                    />
                  ) : (
                    <ChevronDownIcon
                      size={18}
                      className="text-[var(--text-subtle)] flex-shrink-0"
                    />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4 text-sm text-[var(--text-muted)] leading-relaxed border-t border-[var(--border-light)] pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-[#4F8EF7] to-[#3A7DE0]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="text-5xl mb-6">🤟</div>
          <h2 className="text-4xl font-extrabold text-white mb-4">
            Mulai Belajar BISINDO Hari Ini
          </h2>
          <p className="text-white/80 text-lg mb-8">
            Bergabung dengan lebih dari 2.400 pelajar yang sudah memulai
            perjalanan mereka bersama SignLearn.
          </p>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => navigate("/register")}
            className="bg-[var(--surface)] text-[var(--primary)] hover:bg-[#F0F7FF] shadow-xl"
          >
            Daftar Sekarang — Gratis! <ArrowRightIcon size={18} />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1A2332] text-white py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-[#4F8EF7] rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-sm">S</span>
                </div>
                <span className="text-xl font-bold">SignLearn</span>
              </div>
              <p className="text-white/60 text-sm leading-relaxed max-w-xs">
                Platform belajar Bahasa Isyarat Indonesia (BISINDO) yang
                inklusif, terstruktur, dan accessible untuk semua.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-4 text-sm">Navigasi</p>
              <div className="space-y-2 text-sm text-white/60">
                {["Beranda", "Kursus", "Tentang", "Kontak"].map((l) => (
                  <p
                    key={l}
                    className="hover:text-white cursor-pointer transition-colors"
                  >
                    {l}
                  </p>
                ))}
              </div>
            </div>
            <div>
              <p className="font-semibold mb-4 text-sm">Akun</p>
              <div className="space-y-2 text-sm text-white/60">
                <p
                  onClick={() => navigate("/login")}
                  className="hover:text-white cursor-pointer transition-colors"
                >
                  Masuk
                </p>
                <p
                  onClick={() => navigate("/register")}
                  className="hover:text-white cursor-pointer transition-colors"
                >
                  Daftar
                </p>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/40">
            <p>© 2025 SignLearn. Hak cipta dilindungi.</p>
            <p>Dibuat dengan ❤️ untuk komunitas tuli Indonesia</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
