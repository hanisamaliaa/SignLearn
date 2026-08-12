import { motion } from "framer-motion";
import { ArrowLeftIcon, CameraIcon, CheckCircleIcon, HandSignIcon } from "../ui/Icons";
import mascotImage from "../../assets/characters/signlearn-login-mascot.webp";

const STEPS = [
  { icon: CameraIcon, title: "Aktifkan kamera", text: "Izinkan kamera agar tanganmu terlihat." },
  { icon: HandSignIcon, title: "Tunjukkan isyarat", text: "Posisikan tangan di dalam area panduan." },
  { icon: CheckCircleIcon, title: "Lihat hasilnya", text: "Huruf yang dikenali langsung menjadi teks." },
];

export default function TranslatorIntro({ inView, reducedMotion }) {
  const reveal = (delay, x = 0) => ({
    initial: reducedMotion ? false : { opacity: 0, x, y: x ? 0 : 16 },
    animate: inView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, x, y: x ? 0 : 16 },
    transition: { duration: reducedMotion ? 0 : 0.48, delay: reducedMotion ? 0 : delay, ease: [0.22, 1, 0.36, 1] },
  });

  return (
    <div className="kids-demo-intro">
      <motion.a className="kids-demo-back" href="#topik" {...reveal(0)}>
        <ArrowLeftIcon size={17} /> Kembali ke materi
      </motion.a>
      <div className="kids-demo-intro-grid">
        <motion.header className="kids-translator-header" {...reveal(0.05, -18)}>
          <p className="kids-translator-eyebrow">Penerjemah interaktif BISINDO</p>
          <h2 id="demo-title">Yuk, Coba Gerakannya! <span aria-hidden="true">👋</span></h2>
          <p>Gunakan kamera untuk mengenali isyarat BISINDO secara real-time, atau ubah tulisan menjadi contoh gerakan.</p>
          <div className="kids-demo-trust" aria-label="Informasi penggunaan kamera">
            <span><i aria-hidden="true" /> Kamera hanya aktif setelah kamu mengizinkannya</span>
            <span><i aria-hidden="true" /> Frame dipakai untuk pengenalan langsung</span>
          </div>
        </motion.header>
        <motion.div className="kids-demo-mascot" aria-hidden="true" {...reveal(0.12, 18)}>
          <span className="kids-demo-mascot-bubble">Aku siap membantu!</span>
          <img src={mascotImage} alt="" width="1254" height="1254" loading="lazy" decoding="async" />
        </motion.div>
      </div>
      <motion.ol className="kids-demo-steps" aria-label="Cara menggunakan kamera BISINDO" {...reveal(0.18)}>
        {STEPS.map(({ icon: Icon, title, text }, index) => (
          <li key={title}>
            <span className="kids-demo-step-number">{index + 1}</span>
            <span className="kids-demo-step-icon" aria-hidden="true"><Icon size={20} /></span>
            <span><strong>{title}</strong><small>{text}</small></span>
          </li>
        ))}
      </motion.ol>
    </div>
  );
}
