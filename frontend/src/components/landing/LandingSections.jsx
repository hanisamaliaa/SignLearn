import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ActivityIcon, AlphabetBlocksIcon, ArrowRightIcon, BookIcon,
  CalculatorIcon, ChartIcon, CheckCircleIcon, ChevronDownIcon,
  EmotionIcon, FireIcon, GreetingIcon, HandSignIcon, LockIcon,
  PawIcon, PlayIcon, ShieldIcon, StarIcon, TrophyIcon,
  UtensilsIcon, UsersIcon,
} from "../ui/Icons";
import { usePointerMotion } from "../../hooks/usePointerMotion";
import { useInView, useReducedMotion } from "../../hooks/useLandingMotion";
import { CloudLarge, CloudMedium, CloudSmall } from "./LandingClouds";
import { Reveal } from "./LandingMotion";
import BisindoTranslator from "./BisindoTranslator";
import heroImage from "../../assets/characters/signlearn-kids-hero-v2.webp";

const TOPICS = [
  { title: "Abjad", lessons: 6, progress: 65, status: "Sedang dipelajari", icon: AlphabetBlocksIcon, tone: "alphabet" },
  { title: "Hewan", lessons: 5, progress: 0, status: "Belum dimulai", icon: PawIcon, tone: "animal" },
  { title: "Keluarga", lessons: 4, progress: 0, status: "Belum dimulai", icon: UsersIcon, tone: "family" },
  { title: "Angka", lessons: 5, progress: 100, status: "Selesai", icon: CalculatorIcon, tone: "number" },
  { title: "Makanan", lessons: 5, progress: 20, status: "Sedang dipelajari", icon: UtensilsIcon, tone: "food" },
  { title: "Emosi", lessons: 4, progress: 0, status: "Belum dimulai", icon: EmotionIcon, tone: "emotion" },
  { title: "Aktivitas", lessons: 6, progress: 0, status: "Terkunci", icon: ActivityIcon, tone: "activity" },
  { title: "Sapaan", lessons: 4, progress: 0, status: "Terkunci", icon: GreetingIcon, tone: "greeting" },
];

const STEPS = [
  { title: "Pilih & Pelajari", text: "Mulai dari topik yang kamu suka, lalu amati setiap gerakan BISINDO.", icon: BookIcon, tone: "blue" },
  { title: "Bermain & Berlatih", text: "Tirukan gerakan dan kuatkan ingatan lewat aktivitas yang menyenangkan.", icon: PlayIcon, tone: "yellow" },
  { title: "Lihat Progres", text: "Rayakan setiap kemajuan dan lanjutkan petualangan belajarmu.", icon: ChartIcon, tone: "mint" },
];

const BENEFITS = [
  { title: "Belajar Sambil Bermain", text: "Belajar BISINDO melalui aktivitas dan permainan yang membuat proses belajar terasa menyenangkan.", icon: PlayIcon, tone: "blue", label: "Seru" },
  { title: "Cerdas & Kreatif", text: "Melatih kemampuan visual, komunikasi, dan rasa ingin tahu anak.", icon: StarIcon, tone: "yellow", label: "Kreatif" },
  { title: "Aman & Nyaman", text: "Pengalaman belajar yang dirancang sederhana, ramah anak, dan mudah digunakan.", icon: ShieldIcon, tone: "mint", label: "Ramah anak" },
  { title: "Membangun Empati", text: "Membantu anak memahami cara berkomunikasi yang lebih inklusif sejak dini.", icon: UsersIcon, tone: "pink", label: "Inklusif" },
];

function Heading({ eyebrow, title, text, id }) {
  return <div className="kids-heading"><p className="kids-eyebrow">{eyebrow}</p><h2 id={id}>{title}</h2>{text && <p>{text}</p>}</div>;
}

const premiumEase = [0.22, 1, 0.36, 1];

function QuickActionCard({ href, tone, title, description, icon: Icon, delay, reducedMotion }) {
  const pointerMotion = usePointerMotion();

  return (
    <motion.a
      ref={pointerMotion.ref}
      href={href}
      className={`kids-hero-shortcut kids-shortcut-${tone}`}
      initial={reducedMotion ? false : { opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: reducedMotion ? 0.15 : 0.55, delay: reducedMotion ? 0 : delay, ease: premiumEase }}
      {...pointerMotion.pointerProps}
    >
      <span className="kids-shortcut-spotlight" aria-hidden="true" />
      <span className="kids-shortcut-icon" aria-hidden="true"><Icon size={24} /></span>
      <span className="kids-shortcut-copy"><strong>{title}</strong><small>{description}</small></span>
      <ArrowRightIcon className="kids-shortcut-arrow" size={18} />
    </motion.a>
  );
}

export function KidsHero({ onStart, onTrySign }) {
  const reducedMotion = useReducedMotion();
  const illustrationMotion = usePointerMotion({ maxShift: 6, maxRotate: 2 });
  const primaryMotion = usePointerMotion({ maxShift: 3 });
  const [activeRegion, setActiveRegion] = useState(null);
  const [scrollCueVisible, setScrollCueVisible] = useState(true);

  useEffect(() => {
    const updateScrollCue = () => setScrollCueVisible(window.scrollY < 100);
    updateScrollCue();
    window.addEventListener("scroll", updateScrollCue, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollCue);
  }, []);

  const entrance = (delay, distance = 22) => ({
    initial: reducedMotion ? false : { opacity: 0, y: distance, filter: "blur(7px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { duration: reducedMotion ? 0.15 : 0.62, delay: reducedMotion ? 0 : delay, ease: premiumEase },
  });

  const setRegion = (region) => setActiveRegion(region);

  return (
    <section className="kids-hero" aria-labelledby="kids-hero-title">
      <div className="kids-hero-background" aria-hidden="true">
        <CloudLarge className="kids-cloud-1" />
        <CloudMedium className="kids-cloud-2" />
        <CloudSmall className="kids-cloud-3" />
        <div className="kids-hero-landscape">
          <div className="kids-playground-hill kids-playground-hill-1" />
          <div className="kids-playground-hill kids-playground-hill-2" />
          <div className="kids-playground-hill kids-playground-hill-3" />
          <div className="kids-playground-flower kids-flower-1" />
          <div className="kids-playground-flower kids-flower-2" />
          <div className="kids-playground-flower kids-flower-3" />
          <div className="kids-playground-flower kids-flower-4" />
          <div className="kids-playground-flower kids-flower-5" />
        </div>
      </div>
      <div className="kids-container kids-hero-grid">
        <div className="kids-hero-copy">
          <motion.p className="kids-hero-eyebrow" {...entrance(0.1, 16)}><span aria-hidden="true">👋</span> Ruang belajar BISINDO anak</motion.p>
          <h1 id="kids-hero-title" className="kids-hero-title">
            <motion.span className="kids-hero-line" {...entrance(0.18)}>Belajar BISINDO</motion.span>
            <motion.span className="kids-hero-line kids-hero-line-accent" {...entrance(0.28)}>Dengan Menyenangkan!</motion.span>
          </h1>
          <motion.p className="kids-hero-subtitle" {...entrance(0.43)}>
            Belajar Bahasa Isyarat Indonesia melalui aktivitas interaktif, permainan, dan pembelajaran visual yang menyenangkan untuk anak-anak.
          </motion.p>
          <motion.div className="kids-hero-actions" {...entrance(0.52, 16)}>
            <button ref={primaryMotion.ref} type="button" className="kids-button kids-button-yellow kids-hero-cta" onClick={onStart} {...primaryMotion.pointerProps}>
              <span className="kids-button-shine" aria-hidden="true" />
              Mulai Belajar <ArrowRightIcon size={18} />
            </button>
            <button type="button" className="kids-button kids-button-secondary kids-hero-secondary" onClick={onTrySign}>
              <PlayIcon size={16} /> Lihat Materi
            </button>
          </motion.div>
        </div>
        <motion.div
          className="kids-hero-visual"
          initial={reducedMotion ? false : { opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0.15 : 0.72, delay: reducedMotion ? 0 : 0.25, ease: premiumEase }}
        >
          <div className="kids-hero-float">
            <div ref={illustrationMotion.ref} className="kids-hero-image-shell" {...illustrationMotion.pointerProps}>
              <img src={heroImage} alt="Dua anak Indonesia dan maskot belajar gerakan tangan BISINDO bersama" width="1456" height="1118" fetchPriority="high" decoding="async" />
              <span className="kids-visual-glare" aria-hidden="true" />
              <span className={`kids-focus-region kids-focus-expression ${activeRegion === "expression" ? "is-active" : ""}`} aria-hidden="true" />
              <span className={`kids-focus-region kids-focus-hands ${activeRegion === "hands" ? "is-active" : ""}`} aria-hidden="true" />
              <button
                type="button"
                className={`kids-gesture-note kids-gesture-note-top ${activeRegion === "expression" ? "is-active" : ""}`}
                aria-pressed={activeRegion === "expression"}
                onPointerEnter={(event) => event.pointerType === "mouse" && setRegion("expression")}
                onPointerLeave={(event) => event.pointerType === "mouse" && setRegion(null)}
                onFocus={() => setRegion("expression")}
                onBlur={() => setRegion(null)}
                onClick={() => setRegion("expression")}
              >
                Ekspresi <span className="kids-gesture-tooltip">Ekspresi wajah membantu menyampaikan makna.</span>
              </button>
              <button
                type="button"
                className={`kids-gesture-note kids-gesture-note-bottom ${activeRegion === "hands" ? "is-active" : ""}`}
                aria-pressed={activeRegion === "hands"}
                onPointerEnter={(event) => event.pointerType === "mouse" && setRegion("hands")}
                onPointerLeave={(event) => event.pointerType === "mouse" && setRegion(null)}
                onFocus={() => setRegion("hands")}
                onBlur={() => setRegion(null)}
                onClick={() => setRegion("hands")}
              >
                Gerakan tangan <span className="kids-gesture-tooltip">Perhatikan bentuk dan arah gerakan tangan.</span>
              </button>
            </div>
          </div>
          <p className="kids-hero-visual-caption"><span className="kids-status-check"><CheckCircleIcon size={18} /></span> Tangan dan ekspresi terlihat jelas</p>
        </motion.div>
        <div className="kids-quick-actions" aria-label="Akses cepat">
          <QuickActionCard href="#cara-belajar" tone="game" title="Game Seru" description="Belajar sambil bermain" icon={PlayIcon} delay={0.62} reducedMotion={reducedMotion} />
          <QuickActionCard href="#progres" tone="progress" title="Progres Saya" description="Lihat pencapaianmu" icon={ChartIcon} delay={0.7} reducedMotion={reducedMotion} />
        </div>
      </div>
      <a className={`kids-scroll-cue ${scrollCueVisible ? "" : "is-hidden"}`} href="#demo-gerakan" aria-label="Jelajahi materi berikutnya">
        <span>Jelajahi</span><ChevronDownIcon size={18} />
      </a>
    </section>
  );
}

export function SignDemoSection() {
  return <BisindoTranslator />;
}

function TopicCard({ topic, onStart }) {
  const pointerMotion = usePointerMotion({ maxShift: 1, maxRotate: 0.5 });
  const Icon = topic.icon;
  const locked = topic.status === "Terkunci";
  const actionLabel = topic.status === "Selesai" ? "Pelajari lagi" : topic.status === "Sedang dipelajari" ? "Lanjutkan" : "Mulai belajar";

  return (
    <article ref={pointerMotion.ref} className={`kids-topic-card tone-${topic.tone} ${locked ? "is-locked" : ""}`} {...pointerMotion.pointerProps}>
      <span className="kids-card-spotlight" aria-hidden="true" />
      <div className="kids-topic-visual" aria-hidden="true"><span className="kids-topic-icon"><Icon size={38} /></span></div>
      <div className="kids-topic-copy"><h3>{topic.title}</h3><p>{topic.lessons} pelajaran singkat</p></div>
      <span className="kids-topic-status">{locked && <LockIcon size={13} />} {topic.status}</span>
      {topic.progress > 0 && <div className="kids-topic-progress" role="progressbar" aria-label={`Progres ${topic.title}`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={topic.progress}><span style={{ width: `${topic.progress}%` }} /></div>}
      {locked ? <span className="kids-topic-locked-note">Selesaikan topik sebelumnya</span> : <button type="button" className="kids-card-action" onClick={onStart} aria-label={`Belajar topik ${topic.title}`}>{actionLabel} <ArrowRightIcon size={16} /></button>}
    </article>
  );
}

export function TopicSection({ onStart }) {
  return <section id="topik" className="kids-section kids-topics-section" aria-labelledby="topic-title"><div className="kids-topic-decor" aria-hidden="true"><i /><i /><i /></div><div className="kids-container"><Reveal><Heading eyebrow="Petualangan belajarmu" id="topic-title" title="Yuk, Pilih Topik Belajarmu!" text="Mulai dari topik yang kamu suka dan belajar BISINDO dengan cara yang seru." /></Reveal><div className="kids-topic-grid">{TOPICS.map((topic, index) => <Reveal key={topic.title} delay={index * 70}><TopicCard topic={topic} onStart={onStart} /></Reveal>)}</div></div></section>;
}

export function LearningJourneySection() {
  const reducedMotion = useReducedMotion();
  const { ref, inView } = useInView({ threshold: 0.18 });
  return <section ref={ref} id="cara-belajar" className="kids-section kids-journey-section" aria-labelledby="journey-title"><div className="kids-container"><Reveal><Heading eyebrow="Tiga langkah mudah" id="journey-title" title="Bagaimana Cara Belajarnya?" text="Cukup tiga langkah untuk mulai belajar BISINDO bersama SignLearn Kids." /></Reveal><ol className={`kids-journey ${inView ? "is-visible" : ""}`}>{STEPS.map((step, index) => { const Icon = step.icon; return <motion.li key={step.title} className={`tone-${step.tone}`} initial={reducedMotion ? false : { opacity: 0.42, y: 24, scale: 0.97 }} animate={inView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0.42, y: 24, scale: 0.97 }} transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : index * 0.22, ease: premiumEase }}><span className="kids-journey-number">{String(index + 1).padStart(2, "0")}</span><span className="kids-journey-icon" aria-hidden="true"><Icon size={31} /></span><h3>{step.title}</h3><p>{step.text}</p><span className="kids-step-personality" aria-hidden="true">{index === 0 ? <><i /><i /><i /></> : index === 1 ? <PlayIcon size={14} /> : <><i /><i /><i /></>}</span></motion.li>; })}</ol></div></section>;
}

function BenefitCard({ item }) {
  const pointerMotion = usePointerMotion({ maxShift: 1, maxRotate: 0.4 });
  const Icon = item.icon;
  return <article ref={pointerMotion.ref} className={`kids-benefit-card tone-${item.tone}`} {...pointerMotion.pointerProps}><span className="kids-card-spotlight" aria-hidden="true" /><div className="kids-benefit-visual" aria-hidden="true"><i /><i /><span><Icon size={34} /></span></div><span className="kids-benefit-label">{item.label}</span><h3>{item.title}</h3><p>{item.text}</p></article>;
}

export function BenefitsSection() {
  return <section className="kids-section kids-benefits-section" aria-labelledby="benefits-title"><div className="kids-container"><Reveal><Heading eyebrow="Belajar dengan nyaman" id="benefits-title" title="Kenapa Belajar di SignLearn Kids?" text="Belajar bahasa isyarat bisa tetap seru, aman, dan mudah dipahami." /></Reveal><div className="kids-benefits-grid">{BENEFITS.map((item, index) => <Reveal key={item.title} delay={index * 80}><BenefitCard item={item} /></Reveal>)}</div></div></section>;
}

export function ProgressPreviewSection({ onProgress }) {
  return <section id="progres" className="kids-section kids-progress-section" aria-labelledby="progress-title"><div className="kids-container"><div className="kids-progress-card"><Reveal><div><p className="kids-eyebrow">Progres contoh</p><h2 id="progress-title">Setiap Langkah Layak Dirayakan</h2><p className="mt-3 text-[#5C6B76]">Kemajuan kecil membantu anak membangun kebiasaan belajar yang percaya diri.</p><div className="kids-progress-stats"><div><FireIcon /><strong>5 hari</strong><span>berturut-turut</span></div><div><CheckCircleIcon /><strong>7 dari 12</strong><span>pelajaran selesai</span></div><div><StarIcon filled /><strong>120</strong><span>bintang terkumpul</span></div></div><p className="kids-level"><TrophyIcon /> Level: <strong>Penjelajah Isyarat</strong></p><div className="kids-badge-progress" role="progressbar" aria-label="Progres menuju badge berikutnya" aria-valuemin="0" aria-valuemax="100" aria-valuenow="70"><span /></div><button type="button" className="kids-button kids-button-primary mt-6" onClick={onProgress}>Lihat Progres Saya</button></div></Reveal><div className="kids-mascot-celebrate" aria-label="Finn merayakan progres belajar"><StarIcon size={44} filled /><strong>Hebat!</strong><span>Finn bangga padamu</span></div></div></div></section>;
}

export function ParentTrustSection({ onGuide }) {
  return <section id="orang-tua" className="kids-section kids-parent-section" aria-labelledby="parent-title"><div className="kids-container grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center"><Reveal><Heading eyebrow="Untuk orang tua" id="parent-title" title="Dirancang untuk Anak, Dipercaya oleh Orang Tua" text="Pengalaman belajar yang sederhana membantu orang tua mendampingi tanpa mengambil alih proses belajar anak." /></Reveal><Reveal delay={90} className="kids-trust-panel"><ul>{["Pengalaman belajar tanpa iklan", "Materi disusun secara bertahap", "Pengaturan aksesibilitas yang mudah digunakan"].map((item) => <li key={item}><CheckCircleIcon size={20} />{item}</li>)}</ul><button type="button" className="kids-button kids-button-secondary mt-5" onClick={onGuide}>Lihat Panduan Orang Tua</button></Reveal></div></section>;
}

export function FinalKidsCTA({ onStart, onExplore }) {
  const buttonMotion = usePointerMotion({ maxShift: 3 });
  return <section className="kids-section kids-cta-section" aria-labelledby="final-title"><div className="kids-container"><Reveal className="kids-final-cta"><div className="kids-mini-mascot" aria-hidden="true"><span><HandSignIcon size={54} /></span><StarIcon size={25} filled /></div><div><p className="kids-eyebrow">Mulai petualanganmu</p><h2 id="final-title">Siap Belajar BISINDO?</h2><p>Mulai belajar, bermain, dan berkomunikasi dengan cara yang lebih menyenangkan.</p><div className="kids-cta-actions"><button ref={buttonMotion.ref} type="button" className="kids-button kids-button-primary kids-button-large" onClick={onStart} {...buttonMotion.pointerProps}>Mulai Belajar <ArrowRightIcon size={18} /></button><button type="button" className="kids-button kids-button-secondary kids-button-large" onClick={onExplore}>Coba Penerjemah</button></div></div></Reveal></div></section>;
}
