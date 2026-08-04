import {
  ArrowRightIcon,
  BookIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  FileIcon,
  PlayIcon,
  SettingsIcon,
  UserIcon,
  UsersIcon,
  VideoIcon,
} from "../ui/Icons";
import heroImage from "../../assets/bisindo-learning-hero.webp";
import { Reveal } from "./LandingMotion";
import { useCountUp, useInView } from "../../hooks/useLandingMotion";

const TRUST_ITEMS = [
  { label: "Video dengan subtitle", detail: "Subtitle tersedia pada materi video." },
  { label: "Belajar sesuai ritme", detail: "Pelajari ulang materi kapan saja." },
  { label: "Progres tersimpan", detail: "Progres tersimpan secara otomatis." },
];

const STATISTICS = [
  { value: 8, label: "Kategori pembelajaran", detail: "Kategori materi utama.", icon: BookIcon },
  { value: 38, label: "Materi terstruktur", detail: "Pelajaran yang disusun bertahap.", icon: FileIcon },
  { value: 70, label: "Nilai minimum kuis", detail: "KKM untuk membuka pelajaran berikutnya.", icon: CheckCircleIcon },
  { value: "Tersimpan", label: "Progres per akun", detail: "Progres tersimpan pada akun pengguna.", icon: UserIcon },
];

const AUDIENCES = [
  {
    title: "Orang Tua",
    description:
      "Pelajari BISINDO untuk membangun komunikasi sehari-hari yang lebih dekat bersama anak.",
    icon: UsersIcon,
  },
  {
    title: "Pelajar Tuli",
    description:
      "Perkuat kosakata dan keterampilan BISINDO melalui materi visual yang dapat diulang.",
    icon: UserIcon,
  },
  {
    title: "Teman Dengar dan Pelajar Umum",
    description:
      "Mulai berkomunikasi dengan lebih inklusif melalui jalur belajar yang jelas dan bertahap.",
    icon: BookIcon,
  },
];

const LEARNING_STEPS = [
  { title: "Pilih kursus", description: "Mulai dari topik yang paling relevan.", icon: BookIcon },
  { title: "Tonton video BISINDO", description: "Amati gerakan dengan bingkai visual yang jelas.", icon: VideoIcon },
  { title: "Lakukan latihan visual", description: "Ulangi materi dan praktikkan gerakannya.", icon: UserIcon },
  { title: "Kerjakan kuis", description: "Periksa pemahaman setelah setiap pelajaran.", icon: CheckCircleIcon },
  { title: "Buka pelajaran berikutnya", description: "Lanjutkan setelah mencapai nilai minimum 70.", icon: ArrowRightIcon },
];

const ACCESSIBILITY_FEATURES = [
  {
    title: "Subtitle video",
    description: "Dialog dan informasi audio didampingi teks pada materi video.",
    demo: "CC  Halo, selamat belajar",
    icon: VideoIcon,
  },
  {
    title: "Transkrip materi",
    description: "Pokok materi dan posisi gerakan tersedia dalam panduan teks yang dapat dibaca ulang.",
    demo: "Contoh tampilan · Transkrip",
    icon: FileIcon,
  },
  {
    title: "Kontrol kecepatan",
    description: "Kecepatan pemutaran ditampilkan secara eksplisit agar pengguna dapat mengikuti ritmenya.",
    demo: "Contoh tampilan · 0.75×  1×  1.25×",
    icon: SettingsIcon,
  },
  {
    title: "Navigasi keyboard",
    description: "Tautan dan kontrol dapat dijangkau tanpa perangkat penunjuk.",
    demo: "Contoh tampilan · Tab  →  Enter",
    icon: UserIcon,
  },
  {
    title: "Fokus yang terlihat",
    description: "Indikator fokus berkontras tinggi membantu menunjukkan posisi navigasi saat ini.",
    demo: "Contoh tampilan · Fokus aktif",
    icon: CheckCircleIcon,
  },
  {
    title: "Dukungan reduced motion",
    description: "Animasi dikurangi ketika preferensi sistem meminta gerakan yang lebih sedikit.",
    demo: "Contoh tampilan · Gerakan dikurangi",
    icon: ClockIcon,
  },
];

function SectionHeading({
  eyebrow,
  title,
  description,
  headingId,
  align = "center",
}) {
  const alignment = align === "left" ? "text-left" : "mx-auto text-center";
  return (
    <div className={`max-w-2xl ${alignment}`}>
      <p className="landing-eyebrow">{eyebrow}</p>
      <h2 id={headingId} className="mt-3 text-3xl font-bold tracking-tight text-[var(--color-text-900)] sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base leading-7 text-[var(--color-text-600)] sm:text-lg">
          {description}
        </p>
      )}
    </div>
  );
}

export function HeroSection({ onRegister, onLearnMore }) {
  return (
    <section id="tentang" className="landing-hero" aria-labelledby="hero-title">
      <div className="hero-grid-pattern" aria-hidden="true" />
      <div className="hero-glow hero-glow-one" aria-hidden="true" />
      <div className="hero-glow hero-glow-two" aria-hidden="true" />
      <div className="landing-container relative grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14">
        <div className="hero-copy">
          <p className="landing-eyebrow hero-enter hero-enter-1">Pembelajaran BISINDO yang visual dan inklusif</p>
          <h1 id="hero-title" className="hero-enter hero-enter-2 mt-5 max-w-3xl text-[clamp(2.35rem,5vw,3.75rem)] font-extrabold leading-[1.08] tracking-[-0.035em] text-[var(--color-text-900)]">
            Belajar <span className="hero-highlight">BISINDO</span> untuk komunikasi yang lebih dekat.
          </h1>
          <p className="hero-enter hero-enter-3 mt-6 max-w-2xl text-[1.0625rem] leading-8 text-[var(--color-text-600)] sm:text-lg">
            Pelajari Bahasa Isyarat Indonesia melalui video singkat, latihan
            visual, dan kuis terstruktur yang dapat dipelajari sesuai ritme Anda.
          </p>
          <div className="hero-enter hero-enter-4 mt-8 flex flex-col gap-3 min-[420px]:flex-row">
            <button type="button" className="landing-button landing-button-primary hero-primary-cta" onClick={onRegister}>
              Mulai Belajar Gratis <span className="cta-arrow" aria-hidden="true"><ArrowRightIcon size={17} /></span>
            </button>
            <button type="button" className="landing-button landing-button-secondary hero-secondary-cta" onClick={onLearnMore}>
              <span className="cta-play" aria-hidden="true"><PlayIcon size={12} /></span>
              Lihat Cara Belajar
            </button>
          </div>
          <ul className="hero-enter hero-enter-5 mt-8 grid gap-3 text-sm font-medium text-slate-700 sm:grid-cols-3" aria-label="Keunggulan SignLearn">
            {TRUST_ITEMS.map((item) => (
              <li key={item.label} className="trust-chip" tabIndex="0" title={item.detail}>
                <span className="trust-chip-icon" aria-hidden="true">
                  <CheckIcon size={14} strokeWidth={2.5} />
                </span>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div id="kursus" className="hero-media-wrap hero-enter hero-enter-6 relative mx-auto w-full max-w-[580px]">
          <div className="hero-media-card">
            <div className="group relative aspect-[16/10] overflow-hidden bg-slate-100">
              <img
                src={heroImage}
                alt="Pelajar mempraktikkan gerakan tangan saat mengikuti materi BISINDO melalui laptop"
                width="1586"
                height="992"
                className="hero-media-image h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-transparent px-5 pb-5 pt-20 text-white">
                <button type="button" className="hero-play-button" onClick={onLearnMore} aria-label="Jelajahi cara belajar SignLearn">
                  <PlayIcon size={14} />
                </button>
                <div>
                  <p className="text-sm font-semibold">Pratinjau pembelajaran visual</p>
                  <p className="mt-1 text-sm text-slate-200">Gerakan terlihat jelas dalam bingkai video</p>
                </div>
              </div>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <div className="media-status">
                <span className="media-status-icon" aria-hidden="true"><CheckCircleIcon size={18} /></span>
                <span>Subtitle tersedia</span>
              </div>
              <div className="media-status media-progress-status">
                <span className="media-status-icon" aria-hidden="true"><BookIcon size={18} /></span>
                <div className="min-w-0 flex-1">
                  <span>6 dari 10 pelajaran</span>
                  <div className="media-progress-track" role="progressbar" aria-label="Progres pelajaran" aria-valuemin="0" aria-valuemax="10" aria-valuenow="6">
                    <span className="media-progress-fill" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <a className="hero-scroll-indicator" href="#product-statistics" aria-label="Jelajahi informasi cara belajar">
        <span>Jelajahi cara belajar</span><span aria-hidden="true">↓</span>
      </a>
    </section>
  );
}

function StatisticItem({ stat, active }) {
  const numeric = typeof stat.value === "number";
  const count = useCountUp(numeric ? stat.value : 0, active);
  const Icon = stat.icon;
  return (
    <div className="stat-item">
      <span className="stat-icon" aria-hidden="true"><Icon size={20} /></span>
      <dt className="mt-4 text-sm font-semibold leading-5 text-[var(--color-text-600)]">{stat.label}</dt>
      <dd className="mt-2 text-3xl font-bold tracking-tight text-[var(--color-primary-800)]">
        {numeric ? count : stat.value}
      </dd>
      <p className="mt-2 text-sm leading-6 text-slate-600">{stat.detail}</p>
    </div>
  );
}

export function ProductStatistics() {
  const { ref, inView } = useInView();
  return (
    <section id="product-statistics" ref={ref} className="product-statistics pb-8 sm:pb-12" aria-label="Informasi produk terverifikasi">
      <div className="landing-container">
        <dl className="stats-card grid grid-cols-2 lg:grid-cols-4">
          {STATISTICS.map((stat) => (
            <StatisticItem key={stat.label} stat={stat} active={inView} />
          ))}
        </dl>
      </div>
    </section>
  );
}

export function AudienceSection() {
  return (
    <section className="landing-section" aria-labelledby="audience-title">
      <div className="landing-container">
        <Reveal>
          <SectionHeading headingId="audience-title" eyebrow="Untuk siapa SignLearn" title="Belajar untuk komunikasi yang lebih inklusif" />
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {AUDIENCES.map(({ title, description, icon: Icon }, index) => (
            <Reveal key={title} delay={index * 90}>
              <article className="landing-card interactive-card h-full">
                <span className="landing-feature-icon" aria-hidden="true"><Icon size={24} /></span>
                <h3 className="mt-5 text-xl font-bold text-slate-900">{title}</h3>
                <p className="mt-3 leading-7 text-[var(--color-text-600)]">{description}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LearningStepsSection() {
  const { ref, inView } = useInView();
  return (
    <section id="cara-belajar" ref={ref} className={`landing-section bg-white ${inView ? "timeline-visible" : ""}`} aria-labelledby="steps-title">
      <div className="landing-container">
        <Reveal>
          <SectionHeading
            headingId="steps-title"
            eyebrow="Alur pembelajaran"
            title="Belajar secara bertahap"
            description="Setiap tahap memiliki tujuan yang jelas. Selesaikan kuis dengan nilai minimum 70 untuk membuka pelajaran berikutnya."
          />
        </Reveal>
        <ol className="learning-timeline mt-12">
          {LEARNING_STEPS.map(({ title, description, icon: Icon }, index) => (
            <Reveal key={title} delay={index * 90} as="li" className="landing-step">
              <span className="landing-step-number">{index + 1}</span>
              <span className="landing-step-icon" aria-hidden="true"><Icon size={19} /></span>
              <div>
                <h3 className="font-bold leading-6 text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function AccessibilitySection() {
  return (
    <section id="aksesibilitas" className="landing-section" aria-labelledby="accessibility-title">
      <div className="landing-container grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <Reveal>
          <SectionHeading
            headingId="accessibility-title"
            eyebrow="Aksesibilitas"
            title="Dirancang untuk pengalaman belajar yang lebih aksesibel"
            description="Contoh antarmuka berikut menunjukkan bagaimana informasi visual, teks, dan interaksi yang konsisten mendukung pengalaman belajar yang lebih mudah dinavigasi."
            align="left"
          />
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2">
          {ACCESSIBILITY_FEATURES.map(({ title, description, demo, icon: Icon }, index) => (
            <Reveal key={title} delay={(index % 2) * 80}>
              <article className="landing-card interactive-card h-full p-5 sm:p-6">
                <span className="landing-feature-icon" aria-hidden="true"><Icon size={22} /></span>
                <h3 className="mt-4 text-base font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-600)]">{description}</p>
                <div className="access-demo" aria-label={demo}>{demo}</div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
