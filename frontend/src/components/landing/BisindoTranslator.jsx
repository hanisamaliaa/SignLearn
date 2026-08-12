import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CameraIcon,
  ChevronDownIcon,
  GridIcon,
  HandSignIcon,
  PlayIcon,
  RefreshIcon,
  TrashIcon,
} from "../ui/Icons";
import { useInView, useReducedMotion } from "../../hooks/useLandingMotion";
import { useBisindoRecognition } from "../../hooks/useBisindoRecognition";
import TranslationResult from "./TranslationResult";

// These words come from the original SignLearn demo. The repository does not
// currently include playable sign assets, so suggestions only populate input.
const EXISTING_DEMO_WORDS = ["Halo", "Terima kasih", "Maaf", "Tolong", "Teman"];
const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25];
const SIGN_LIBRARY = new Map();

function lookupSigns(value) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const signs = words.map((word) => SIGN_LIBRARY.get(word.toLocaleLowerCase("id-ID")));
  if (!words.length || signs.some((sign) => !sign)) throw new Error("unavailable");
  return signs;
}

function TranslatorHeader({ inView, reducedMotion }) {
  const reveal = (delay) => ({
    initial: reducedMotion ? false : { opacity: 0, y: 18 },
    animate: inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 },
    transition: { duration: reducedMotion ? 0 : 0.52, delay: reducedMotion ? 0 : delay, ease: [0.22, 1, 0.36, 1] },
  });
  return (
    <header className="kids-translator-header">
      <motion.p className="kids-translator-eyebrow" {...reveal(0)}>Dua cara untuk berkomunikasi</motion.p>
      <motion.h2 id="demo-title" {...reveal(0.06)}>Penerjemah BISINDO</motion.h2>
      <motion.p {...reveal(0.12)}>Ubah kata menjadi gerakan BISINDO atau gunakan kamera untuk mengenali bahasa isyarat secara real-time.</motion.p>
    </header>
  );
}

function TranslationModeSwitch({ mode, onChange, inView, reducedMotion }) {
  return (
    <motion.div className="kids-mode-switch" role="tablist" aria-label="Pilih mode penerjemah" initial={reducedMotion ? false : { opacity: 0, y: 14 }} animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }} transition={{ duration: reducedMotion ? 0 : 0.46, delay: reducedMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "text"}
        className={mode === "text" ? "is-active" : ""}
        onClick={() => onChange("text")}
      >
        {mode === "text" && <motion.span layoutId="kids-mode-active-pill" className="kids-mode-active-pill" transition={{ duration: reducedMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }} />}
        <GridIcon size={19} />
        <span>Teks <span aria-hidden="true">→</span> BISINDO</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "camera"}
        className={mode === "camera" ? "is-active" : ""}
        onClick={() => onChange("camera")}
      >
        {mode === "camera" && <motion.span layoutId="kids-mode-active-pill" className="kids-mode-active-pill" transition={{ duration: reducedMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }} />}
        <CameraIcon size={19} />
        <span>Kamera <span aria-hidden="true">→</span> Teks</span>
      </button>
    </motion.div>
  );
}

function TranslationInputCard({ value, onChange, onTranslate, onClear, inputRef }) {
  return (
    <form className="kids-translator-card kids-translation-input" onSubmit={onTranslate}>
      <div className="kids-translator-card-heading">
        <span className="kids-translator-card-icon" aria-hidden="true"><GridIcon size={22} /></span>
        <div>
          <h3>Apa yang ingin kamu katakan?</h3>
          <p>Ketik kata atau kalimat pendek di bawah ini.</p>
        </div>
      </div>

      <div className="kids-translator-field">
        <label htmlFor="bisindo-text-input">Kata atau kalimat</label>
        <textarea
          ref={inputRef}
          id="bisindo-text-input"
          value={value}
          maxLength={140}
          rows={4}
          placeholder="Ketik di sini..."
          onChange={(event) => onChange(event.target.value)}
        />
        <div className="kids-translator-field-meta">
          <span>{value.length}/140</span>
          <button type="button" onClick={onClear} disabled={!value}>
            <TrashIcon size={15} /> Bersihkan
          </button>
        </div>
      </div>

      <button type="submit" className="kids-translator-primary" disabled={!value.trim()}>
        Terjemahkan ke BISINDO <ArrowRightIcon size={18} />
      </button>

      <div className="kids-suggestions" aria-labelledby="translator-suggestions">
        <p id="translator-suggestions" tabIndex="-1">Coba kata populer</p>
        <div>
          {EXISTING_DEMO_WORDS.map((word) => (
            <button type="button" key={word} className={value.trim().toLocaleLowerCase("id-ID") === word.toLocaleLowerCase("id-ID") ? "is-selected" : ""} onClick={() => onChange(word)}>{word}</button>
          ))}
        </div>
      </div>
    </form>
  );
}

function PlayerEmptyState() {
  return (
    <div className="kids-player-state kids-player-empty">
      <span className="kids-player-hand" aria-hidden="true"><HandSignIcon size={62} /></span>
      <h4>Gerakan BISINDO akan tampil di sini</h4>
      <p>Ketik kata lalu tekan Terjemahkan.</p>
    </div>
  );
}

function PlayerLoadingState() {
  return (
    <div className="kids-player-state" role="status">
      <span className="kids-loading-hand" aria-hidden="true"><HandSignIcon size={54} /></span>
      <h4>Menyiapkan gerakan BISINDO...</h4>
      <span className="kids-loading-dots" aria-hidden="true"><i /><i /><i /></span>
    </div>
  );
}

function PlayerErrorState({ onRetry, onShowSuggestions }) {
  return (
    <div className="kids-player-state kids-player-error" role="status">
      <span className="kids-player-hand" aria-hidden="true"><HandSignIcon size={58} /></span>
      <h4>Kata belum tersedia.</h4>
      <p>Yuk coba kata lain.</p>
      <div>
        <button type="button" className="kids-control-button" onClick={onRetry}>Coba Lagi</button>
        <button type="button" className="kids-control-button" onClick={onShowSuggestions}>Lihat kata tersedia</button>
      </div>
    </div>
  );
}

function SignPlayer({ status, query, signs, onRetry, onShowSuggestions }) {
  const reducedMotion = useReducedMotion();
  const videoRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const currentSign = signs[currentIndex];

  useEffect(() => {
    setCurrentIndex(0);
    setPlaying(false);
  }, [signs]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed, currentSign]);

  const play = async () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      await videoRef.current.play();
      setPlaying(true);
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  };

  const replay = async () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    await videoRef.current.play();
    setPlaying(true);
  };

  return (
    <article className="kids-translator-card kids-sign-player" aria-labelledby="bisindo-player-title">
      <header>
        <div><span className="kids-live-label">BISINDO</span><h3 id="bisindo-player-title">Pemutar gerakan</h3></div>
        <span className="kids-current-query">Kata: <strong>{query || "—"}</strong></span>
      </header>

      <div className="kids-sign-viewport">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={status} className="kids-player-state-transition" initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? undefined : { opacity: 0, y: -6 }} transition={{ duration: reducedMotion ? 0 : 0.22 }}>
          {status === "idle" && <PlayerEmptyState />}
          {status === "loading" && <PlayerLoadingState />}
          {status === "error" && <PlayerErrorState onRetry={onRetry} onShowSuggestions={onShowSuggestions} />}
          {status === "success" && currentSign && (
          <motion.div key={currentSign.src} className="kids-sign-media" initial={reducedMotion ? false : { opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }}>
            {currentSign.type === "video" ? (
              <video ref={videoRef} src={currentSign.src} playsInline onEnded={() => setPlaying(false)} />
            ) : (
              <img src={currentSign.src} alt={`Gerakan BISINDO untuk ${currentSign.word}`} />
            )}
          </motion.div>
          )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="kids-player-details">
        <div>
          <span>Sedang diperagakan</span>
          <motion.strong key={currentSign?.word || query || "empty"} initial={reducedMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>{currentSign?.word || query || "Belum ada kata"}</motion.strong>
          <small>{signs.length ? `Gerakan ${currentIndex + 1} dari ${signs.length}` : "Pilih kata untuk memulai"}</small>
        </div>
        {signs.length > 1 && (
          <div className="kids-word-sequence" aria-label="Urutan kata">
            {signs.map((sign, index) => <button type="button" key={`${sign.word}-${index}`} className={index === currentIndex ? "is-active" : ""} onClick={() => setCurrentIndex(index)}>{sign.word}</button>)}
          </div>
        )}
        <div className="kids-player-actions">
          <button type="button" className="kids-control-button" onClick={replay} disabled={!currentSign || currentSign.type !== "video"}><RefreshIcon size={17} /> Ulangi</button>
          <button type="button" className="kids-control-button kids-control-primary" onClick={play} disabled={!currentSign || currentSign.type !== "video"}><PlayIcon size={16} /> {playing ? "Jeda" : "Mainkan"}</button>
          <label className="kids-speed-control">Kecepatan<span className="sr-only"> pemutaran</span><select value={speed} onChange={(event) => setSpeed(Number(event.target.value))} disabled={!currentSign || currentSign.type !== "video"}>{PLAYBACK_SPEEDS.map((item) => <option key={item} value={item}>{item}×</option>)}</select><ChevronDownIcon size={15} aria-hidden="true" /></label>
          {signs.length > 1 && <><button type="button" className="kids-icon-control" aria-label="Gerakan sebelumnya" disabled={currentIndex === 0} onClick={() => setCurrentIndex((index) => index - 1)}><ArrowLeftIcon size={18} /></button><button type="button" className="kids-icon-control" aria-label="Gerakan berikutnya" disabled={currentIndex === signs.length - 1} onClick={() => setCurrentIndex((index) => index + 1)}><ArrowRightIcon size={18} /></button></>}
        </div>
      </div>
    </article>
  );
}

function TextToSignMode({ reducedMotion }) {
  const inputRef = useRef(null);
  const [value, setValue] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("idle");
  const [signs, setSigns] = useState([]);

  const translate = async (event) => {
    event?.preventDefault();
    const nextQuery = value.trim();
    if (!nextQuery) return;
    setQuery(nextQuery);
    setStatus("loading");
    try {
      await Promise.resolve();
      setSigns(lookupSigns(nextQuery));
      setStatus("success");
    } catch {
      setSigns([]);
      setStatus("error");
    }
  };

  const clear = () => {
    setValue("");
    setQuery("");
    setSigns([]);
    setStatus("idle");
    inputRef.current?.focus();
  };

  return (
    <div className="kids-text-mode">
      <motion.div className="kids-workspace-motion-item" initial={reducedMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.4, delay: reducedMotion ? 0 : 0.05 }}><TranslationInputCard value={value} onChange={setValue} onTranslate={translate} onClear={clear} inputRef={inputRef} /></motion.div>
      <motion.div className="kids-workspace-motion-item" initial={reducedMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.4, delay: reducedMotion ? 0 : 0.12 }}><SignPlayer status={status} query={query} signs={signs} onRetry={() => inputRef.current?.focus()} onShowSuggestions={() => document.getElementById("translator-suggestions")?.focus()} /></motion.div>
    </div>
  );
}

function useCameraSession() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const requestRef = useRef(0);
  const [state, setState] = useState("idle");

  const stop = useCallback(() => {
    requestRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setState("idle");
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("unsupported");
      return;
    }
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      if (requestRef.current !== requestId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState("active");
    } catch (error) {
      setState(error?.name === "NotAllowedError" ? "denied" : "error");
    }
  }, []);

  useEffect(() => stop, [stop]);
  return { videoRef, state, start, stop };
}

function CameraPanel({ camera, recognition }) {
  const active = camera.state === "active";
  const detectionState = recognition.debugInfo?.state;
  const detectionText = recognition.status === "error"
    ? "Layanan AI tidak terhubung"
    : detectionState === "COMMITTED"
      ? "Gerakan dikenali ✓"
      : detectionState === "DETECTING"
        ? "Tangan ditemukan — sedang membaca..."
        : detectionState === "WAIT_FOR_RELEASE"
          ? "Huruf tersimpan — lanjutkan gerakan berikutnya"
          : detectionState === "LOW_CONFIDENCE" || detectionState === "UNKNOWN"
            ? "Coba perjelas posisi tangan"
            : "Arahkan tangan ke area panduan";

  return (
    <article className="kids-translator-card kids-camera-panel">
      <header>
        <div><span className="kids-translator-card-icon" aria-hidden="true"><CameraIcon size={22} /></span><div><h3>Kamera BISINDO</h3><p>Pastikan tangan terlihat jelas di kamera.</p></div></div>
        {active && <span className="kids-camera-active"><i /> Kamera aktif</span>}
      </header>
      <div className={`kids-camera-viewport ${active ? "is-active" : ""}`}>
        <video ref={camera.videoRef} muted playsInline aria-label="Pratinjau kamera langsung" />
        {!active && (
          <div className="kids-camera-permission">
            <span aria-hidden="true"><CameraIcon size={44} /></span>
            <h4>Gunakan kamera untuk mengenali gerakan BISINDO</h4>
            <p>Kamera hanya aktif setelah kamu memberikan izin.</p>
            <button type="button" className="kids-translator-primary" onClick={camera.start} disabled={camera.state === "requesting"}>
              <CameraIcon size={18} /> {camera.state === "requesting" ? "Meminta izin..." : "Aktifkan Kamera"}
            </button>
            {camera.state === "denied" && <p className="kids-camera-message" role="alert">Izin kamera belum diberikan. Kamu bisa mengizinkannya dari pengaturan browser lalu mencoba lagi.</p>}
            {camera.state === "unsupported" && <p className="kids-camera-message" role="alert">Kamera belum didukung di perangkat ini.</p>}
            {camera.state === "error" && <p className="kids-camera-message" role="alert">Kamera belum dapat digunakan. Yuk coba lagi.</p>}
          </div>
        )}
        {active && <><div className="kids-hand-guide" aria-hidden="true"><span /></div><div className={`kids-detection-status ${recognition.status === "error" ? "is-error" : ""}`}><i /> {detectionText}</div></>}
      </div>
      {active && <div className="kids-camera-controls"><p>{recognition.error || "Tahan sebentar hingga huruf dikenali. Kamu bisa langsung berganti huruf; beri jeda singkat hanya untuk mengulang huruf yang sama."}</p><button type="button" className="kids-control-button" onClick={camera.stop}>Matikan Kamera</button></div>}
    </article>
  );
}

function CameraToTextMode({ camera, reducedMotion }) {
  const recognition = useBisindoRecognition({
    active: camera.state === "active",
    videoRef: camera.videoRef,
  });

  return <div className="kids-camera-mode"><motion.div className="kids-workspace-motion-item" initial={reducedMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.4, delay: reducedMotion ? 0 : 0.05 }}><CameraPanel camera={camera} recognition={recognition} /></motion.div><motion.div className="kids-workspace-motion-item" initial={reducedMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.4, delay: reducedMotion ? 0 : 0.12 }}><TranslationResult recognition={recognition} /></motion.div></div>;
}

export default function BisindoTranslator() {
  const reducedMotion = useReducedMotion();
  const { ref, inView } = useInView({ rootMargin: "0px 0px -10%", threshold: 0.18 });
  const [mode, setMode] = useState("text");
  const camera = useCameraSession();

  const changeMode = (nextMode) => {
    if (nextMode !== "camera") camera.stop();
    setMode(nextMode);
  };

  return (
    <section ref={ref} id="demo-gerakan" className="kids-section kids-demo-section kids-translator-section" aria-labelledby="demo-title">
      <div className="kids-translator-decor" aria-hidden="true"><span /><span /></div>
      <div className="kids-container kids-translator-container">
        <TranslatorHeader inView={inView} reducedMotion={reducedMotion} />
        <TranslationModeSwitch mode={mode} onChange={changeMode} inView={inView} reducedMotion={reducedMotion} />
        <AnimatePresence mode="wait" initial={false}><motion.div
          key={mode}
          className="kids-mode-stage"
          initial={reducedMotion ? false : { opacity: 0, y: 10, scale: 0.995 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -8, scale: 0.995 }}
          transition={{ duration: reducedMotion ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
        >
          {mode === "text" ? <TextToSignMode reducedMotion={reducedMotion} /> : <CameraToTextMode camera={camera} reducedMotion={reducedMotion} />}
        </motion.div></AnimatePresence>
      </div>
    </section>
  );
}
