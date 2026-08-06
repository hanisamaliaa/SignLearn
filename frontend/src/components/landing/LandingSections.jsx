import { useRef, useState } from "react";
import {
  ArrowRightIcon, BellIcon, BookIcon, ChartIcon, CheckCircleIcon,
  CheckIcon, EyeIcon, FireIcon, GridIcon, LockIcon,
  PlayIcon, RefreshIcon, StarIcon, TrophyIcon, UserIcon, UsersIcon,
} from "../ui/Icons";
import { Reveal } from "./LandingMotion";
import heroImage from "../../assets/characters/signlearn-kids-hero.webp";

const TOPICS = [
  { title: "Alfabet", lessons: 6, progress: 65, status: "Sedang dipelajari", icon: BookIcon, tone: "blue" },
  { title: "Angka", lessons: 5, progress: 100, status: "Selesai", icon: TrophyIcon, tone: "green" },
  { title: "Keluarga", lessons: 4, progress: 0, status: "Belum dimulai", icon: UsersIcon, tone: "pink" },
  { title: "Hewan", lessons: 5, progress: 0, status: "Belum dimulai", icon: UserIcon, tone: "yellow" },
  { title: "Makanan", lessons: 5, progress: 20, status: "Sedang dipelajari", icon: GridIcon, tone: "coral" },
  { title: "Perasaan", lessons: 4, progress: 0, status: "Belum dimulai", icon: StarIcon, tone: "lavender" },
  { title: "Aktivitas", lessons: 6, progress: 0, status: "Terkunci", icon: LockIcon, tone: "mint" },
  { title: "Sapaan", lessons: 4, progress: 0, status: "Terkunci", icon: BellIcon, tone: "blue" },
];

const STEPS = [
  { title: "Lihat", text: "Perhatikan gerakan tangan dan ekspresi wajah.", icon: EyeIcon },
  { title: "Tirukan", text: "Ikuti gerakan secara perlahan dari depan.", icon: UserIcon },
  { title: "Latihan", text: "Jawab kuis dan permainan singkat.", icon: GridIcon },
  { title: "Lihat Progres", text: "Kumpulkan bintang dan buka materi berikutnya.", icon: ChartIcon },
];

const BENEFITS = [
  { title: "Belajar Sambil Bermain", text: "Pelajaran singkat, permainan interaktif, dan reward membuat anak tetap termotivasi.", icon: TrophyIcon, tone: "yellow" },
  { title: "Gerakan Mudah Dilihat", text: "Tangan, wajah, dan posisi tubuh ditampilkan dengan jelas untuk membantu proses belajar.", icon: EyeIcon, tone: "blue" },
  { title: "Aman dan Ramah Anak", text: "Navigasi sederhana, konten sesuai usia, dan pengalaman belajar tanpa iklan.", icon: CheckCircleIcon, tone: "mint" },
  { title: "Membangun Komunikasi dan Empati", text: "Anak belajar berkomunikasi sekaligus memahami pentingnya lingkungan yang inklusif.", icon: UsersIcon, tone: "pink" },
];

function Heading({ eyebrow, title, text, id }) {
  return <div className="kids-heading"><p className="kids-eyebrow">{eyebrow}</p><h2 id={id}>{title}</h2>{text && <p>{text}</p>}</div>;
}

export function KidsHero({ onStart, onTrySign }) {
  return (
    <section className="kids-hero" aria-labelledby="kids-hero-title">
      <div className="kids-cloud cloud-one" aria-hidden="true" /><div className="kids-cloud cloud-two" aria-hidden="true" />
      <div className="kids-container relative grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="kids-hero-copy">
          <p className="kids-eyebrow">Belajar • Berlatih • Berkomunikasi</p>
          <h1 id="kids-hero-title">Belajar BISINDO Jadi <span>Lebih Menyenangkan</span></h1>
          <p className="kids-hero-text">Tonton gerakan dengan jelas, ikuti latihan interaktif, dan kumpulkan bintang bersama karakter SignLearn.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" className="kids-button kids-button-primary kids-button-large" onClick={onStart}>Mulai Pelajaran Pertama <ArrowRightIcon size={18} /></button>
            <button type="button" className="kids-button kids-button-secondary kids-button-large" onClick={onTrySign}><PlayIcon size={15} /> Coba Gerakan “Halo”</button>
          </div>
          <ul className="kids-reassurance" aria-label="Keunggulan SignLearn Kids">
            {["Ramah anak", "Tanpa iklan", "Materi bertahap"].map((item) => <li key={item}><CheckIcon size={15} />{item}</li>)}
          </ul>
        </div>
        <div className="kids-hero-art">
          <img src={heroImage} width="1450" height="1086" alt="Lia dan Noah berlatih gerakan tangan bersama Finn, maskot SignLearn Kids" />
          <span className="kids-float-card float-star" aria-hidden="true"><StarIcon size={20} filled /> +1 bintang</span>
          <span className="kids-float-card float-sign" aria-hidden="true"><CheckCircleIcon size={20} /> Gerakan hebat!</span>
        </div>
      </div>
    </section>
  );
}

export function SignDemoSection() {
  const playerRef = useRef(null);
  const [word, setWord] = useState("Halo");
  const [speed, setSpeed] = useState("1×");
  const [playing, setPlaying] = useState(false);
  return (
    <section id="demo-gerakan" className="kids-section kids-demo-section" aria-labelledby="demo-title">
      <div className="kids-container">
        <Reveal><Heading eyebrow="Belajar langsung" id="demo-title" title="Coba Satu Gerakan BISINDO" text="Lihat gerakannya, pelajari artinya, lalu praktikkan secara perlahan." /></Reveal>
        <div className="mt-10 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <Reveal className="kids-demo-copy">
            <span className="kids-badge">Gerakan hari ini</span><h3>{word}</h3>
            <p>Gerakan sapaan sederhana untuk memulai percakapan dengan ramah. Perhatikan posisi tangan dan ekspresi wajah.</p>
            <ol className="kids-demo-steps">{["Perhatikan tangan", "Lihat ekspresi wajah", "Tirukan perlahan"].map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}</ol>
            <div><p className="font-bold text-[#0F2450]">Pilih kata:</p><div className="mt-3 flex flex-wrap gap-2">{["Halo", "Terima kasih", "Maaf", "Tolong", "Teman"].map((item) => <button type="button" key={item} className={`kids-word-chip ${word === item ? "is-active" : ""}`} onClick={() => setWord(item)}>{item}</button>)}</div></div>
          </Reveal>
          <Reveal delay={100} className="kids-player-card">
            <div ref={playerRef} className="kids-player-screen">
              <img src={heroImage} alt="Contoh karakter memperagakan gerakan dengan tangan dan wajah terlihat jelas" />
              <button type="button" className="kids-player-play" aria-label={playing ? "Jeda contoh gerakan" : `Mainkan contoh gerakan ${word}`} onClick={() => setPlaying((value) => !value)}>{playing ? <span aria-hidden="true">Ⅱ</span> : <PlayIcon size={26} />}</button>
              <span className="kids-player-word">{word}</span>
              <div className="kids-player-progress" role="progressbar" aria-label="Progres contoh gerakan" aria-valuemin="0" aria-valuemax="100" aria-valuenow={playing ? 45 : 0}><span className={playing ? "is-playing" : ""} /></div>
            </div>
            <div className="kids-player-controls">
              <fieldset><legend>Kecepatan</legend><div className="flex gap-2">{["0.5×", "0.75×", "1×"].map((item) => <button type="button" key={item} className={`kids-speed ${speed === item ? "is-active" : ""}`} onClick={() => setSpeed(item)} aria-pressed={speed === item}>{item}</button>)}</div></fieldset>
              <button type="button" className="kids-button kids-button-primary" onClick={() => setPlaying(true)}><PlayIcon size={14} /> Mainkan</button>
              <button type="button" className="kids-button kids-button-tertiary" onClick={() => setPlaying(false)}><RefreshIcon size={16} /> Ulangi</button>
              <button type="button" className="kids-button kids-button-tertiary" onClick={() => playerRef.current?.requestFullscreen?.()}>Layar penuh</button>
            </div>
            <p className="kids-caption"><strong>Deskripsi gerakan:</strong> Angkat tangan dengan nyaman, arahkan telapak ke depan, dan gunakan ekspresi ramah. Contoh ini tidak memerlukan suara.</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function TopicSection({ onStart }) {
  return <section id="topik" className="kids-section" aria-labelledby="topic-title"><div className="kids-container"><Reveal><Heading eyebrow="Materi pilihan" id="topic-title" title="Pilih Topik yang Ingin Dipelajari" text="Mulai dari topik sederhana dan buka pelajaran baru sedikit demi sedikit." /></Reveal><div className="kids-topic-grid">{TOPICS.map((topic, index) => { const Icon = topic.icon; const locked = topic.status === "Terkunci"; return <Reveal key={topic.title} delay={(index % 4) * 60}><article className={`kids-topic-card tone-${topic.tone} ${locked ? "is-locked" : ""}`} tabIndex={locked ? undefined : 0}><span className="kids-topic-icon" aria-hidden="true"><Icon size={25} /></span><div><h3>{topic.title}</h3><p>{topic.lessons} pelajaran</p></div><span className="kids-topic-status">{locked && <LockIcon size={13} />} {topic.status}</span><div className="kids-topic-progress" role="progressbar" aria-label={`Progres ${topic.title}`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={topic.progress}><span style={{ width: `${topic.progress}%` }} /></div>{topic.status === "Sedang dipelajari" && <button type="button" className="kids-card-action" onClick={onStart}>Lanjutkan <ArrowRightIcon size={15} /></button>}</article></Reveal>; })}</div></div></section>;
}

export function LearningJourneySection() {
  return <section id="cara-belajar" className="kids-section kids-journey-section" aria-labelledby="journey-title"><div className="kids-container"><Reveal><Heading eyebrow="Empat langkah mudah" id="journey-title" title="Cara Belajar di SignLearn" /></Reveal><ol className="kids-journey">{STEPS.map((step, index) => { const Icon = step.icon; return <Reveal key={step.title} as="li" delay={index * 80}><span className="kids-journey-number">{index + 1}</span><span className="kids-journey-icon"><Icon size={25} /></span><h3>{step.title}</h3><p>{step.text}</p></Reveal>; })}</ol></div></section>;
}

export function BenefitsSection() {
  return <section className="kids-section" aria-labelledby="benefits-title"><div className="kids-container"><Reveal><Heading eyebrow="Belajar dengan nyaman" id="benefits-title" title="Kenapa Memilih SignLearn Kids?" /></Reveal><div className="kids-benefits-grid">{BENEFITS.map((item, index) => { const Icon = item.icon; return <Reveal key={item.title} delay={index * 70}><article className={`kids-benefit-card tone-${item.tone}`}><span><Icon size={27} /></span><h3>{item.title}</h3><p>{item.text}</p></article></Reveal>; })}</div></div></section>;
}

export function ProgressPreviewSection({ onProgress }) {
  return <section id="progres" className="kids-section kids-progress-section" aria-labelledby="progress-title"><div className="kids-container"><div className="kids-progress-card"><Reveal><div><p className="kids-eyebrow">Progres contoh</p><h2 id="progress-title">Setiap Langkah Layak Dirayakan</h2><p className="mt-3 text-[#5C6B76]">Kemajuan kecil membantu anak membangun kebiasaan belajar yang percaya diri.</p><div className="kids-progress-stats"><div><FireIcon /><strong>5 hari</strong><span>berturut-turut</span></div><div><CheckCircleIcon /><strong>7 dari 12</strong><span>pelajaran selesai</span></div><div><StarIcon filled /><strong>120</strong><span>bintang terkumpul</span></div></div><p className="kids-level"><TrophyIcon /> Level: <strong>Penjelajah Isyarat</strong></p><div className="kids-badge-progress" role="progressbar" aria-label="Progres menuju badge berikutnya" aria-valuemin="0" aria-valuemax="100" aria-valuenow="70"><span /></div><button type="button" className="kids-button kids-button-primary mt-6" onClick={onProgress}>Lihat Progres Saya</button></div></Reveal><div className="kids-mascot-celebrate" aria-label="Finn merayakan progres belajar"><StarIcon size={44} filled /><strong>Hebat!</strong><span>Finn bangga padamu</span></div></div></div></section>;
}

export function ParentTrustSection({ onGuide }) {
  return <section id="orang-tua" className="kids-section kids-parent-section" aria-labelledby="parent-title"><div className="kids-container grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center"><Reveal><Heading eyebrow="Untuk orang tua" id="parent-title" title="Dirancang untuk Anak, Dipercaya oleh Orang Tua" text="Pengalaman belajar yang sederhana membantu orang tua mendampingi tanpa mengambil alih proses belajar anak." /></Reveal><Reveal delay={90} className="kids-trust-panel"><ul>{["Pengalaman belajar tanpa iklan", "Materi disusun secara bertahap", "Pengaturan aksesibilitas yang mudah digunakan"].map((item) => <li key={item}><CheckCircleIcon size={20} />{item}</li>)}</ul><button type="button" className="kids-button kids-button-secondary mt-5" onClick={onGuide}>Lihat Panduan Orang Tua</button></Reveal></div></section>;
}

export function FinalKidsCTA({ onStart, onExplore }) {
  return <section className="kids-section pt-0" aria-labelledby="final-title"><div className="kids-container"><Reveal className="kids-final-cta"><div className="kids-mini-mascot" aria-hidden="true"><StarIcon size={30} filled /></div><div><h2 id="final-title">Siap Belajar Berkomunikasi dengan Tangan?</h2><p>Mulai pelajaran BISINDO pertama dan temukan cara baru untuk belajar, berekspresi, dan terhubung.</p><div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><button type="button" className="kids-button kids-button-primary kids-button-large" onClick={onStart}>Mulai Belajar Gratis</button><button type="button" className="kids-button kids-button-secondary kids-button-large" onClick={onExplore}>Jelajahi Materi</button></div></div></Reveal></div></section>;
}
