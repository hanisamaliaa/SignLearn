import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRightIcon,
  CameraIcon,
  GridIcon,
  HandSignIcon,
  MicIcon,
  TrashIcon,
} from "../ui/Icons";
import { useInView, useReducedMotion } from "../../hooks/useLandingMotion";
import { useCameraStream } from "../../hooks/useCameraStream";
import { useBisindoRecognition } from "../../hooks/useBisindoRecognition";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import TranslationResult from "./TranslationResult";
import TranslatorIntro from "./TranslatorIntro";
import CameraPracticePanel from "./CameraPracticePanel";
import SpelledPhrase from "./SpelledPhrase";
import { MAX_PHRASE_LENGTH, describeSkipped, spellPhrase } from "../../features/bisindo/spelling";
import { translationService } from "../../services";

const EXISTING_DEMO_WORDS = ["Halo", "Terima kasih", "Aku mau makan", "Nama saya", "Teman"];

function TranslationModeSwitch({ mode, onChange, inView, reducedMotion }) {
  const handleKeyDown = (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const nextMode = mode === "text" ? "camera" : "text";
    onChange(nextMode);
    event.currentTarget.parentElement?.querySelector(`[data-mode="${nextMode}"]`)?.focus();
  };
  return (
    <motion.div className="kids-mode-switch" role="tablist" aria-label="Pilih mode penerjemah" initial={reducedMotion ? false : { opacity: 0, y: 14 }} animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }} transition={{ duration: reducedMotion ? 0 : 0.46, delay: reducedMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}>
      <button
        type="button"
        role="tab"
        id="translator-tab-text"
        data-mode="text"
        aria-controls="translator-panel-text"
        aria-selected={mode === "text"}
        tabIndex={mode === "text" ? 0 : -1}
        className={mode === "text" ? "is-active" : ""}
        onClick={() => onChange("text")}
        onKeyDown={handleKeyDown}
      >
        {mode === "text" && <motion.span layoutId="kids-mode-active-pill" className="kids-mode-active-pill" transition={{ duration: reducedMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }} />}
        <GridIcon size={19} />
        <span>Teks <span aria-hidden="true">→</span> BISINDO</span>
      </button>
      <button
        type="button"
        role="tab"
        id="translator-tab-camera"
        data-mode="camera"
        aria-controls="translator-panel-camera"
        aria-selected={mode === "camera"}
        tabIndex={mode === "camera" ? 0 : -1}
        className={mode === "camera" ? "is-active" : ""}
        onClick={() => onChange("camera")}
        onKeyDown={handleKeyDown}
      >
        {mode === "camera" && <motion.span layoutId="kids-mode-active-pill" className="kids-mode-active-pill" transition={{ duration: reducedMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }} />}
        <CameraIcon size={19} />
        <span>Kamera <span aria-hidden="true">→</span> Teks</span>
      </button>
    </motion.div>
  );
}

function TranslationInputCard({ value, onChange, onTranslate, onClear, inputRef, speech }) {
  return (
    <form className="kids-translator-card kids-translation-input" onSubmit={onTranslate}>
      <div className="kids-translator-card-heading">
        <span className="kids-translator-card-icon" aria-hidden="true"><GridIcon size={22} /></span>
        <div>
          <h3>Apa yang ingin kamu katakan?</h3>
          <p>Ketik kata atau kalimat pendek{speech.supported ? ", atau ucapkan lewat mikrofon" : ""}.</p>
        </div>
      </div>

      <div className="kids-translator-field">
        <label htmlFor="bisindo-text-input">Kata atau kalimat</label>
        <textarea
          ref={inputRef}
          id="bisindo-text-input"
          value={value}
          maxLength={MAX_PHRASE_LENGTH}
          rows={4}
          placeholder="Ketik di sini..."
          onChange={(event) => onChange(event.target.value)}
        />
        <div className="kids-translator-field-meta">
          <span>{value.length}/{MAX_PHRASE_LENGTH}</span>
          <button type="button" onClick={onClear} disabled={!value}>
            <TrashIcon size={15} /> Bersihkan
          </button>
        </div>
      </div>

      {/* Tombol mikrofon HANYA muncul bila perambannya benar-benar mendukung.
          Firefox tidak punya Web Speech API sama sekali; menampilkan tombol
          yang pasti gagal lebih buruk daripada tidak menampilkannya. */}
      {speech.supported && (
        <div className="kids-voice-row">
          <button
            type="button"
            className={`kids-voice-button${speech.listening ? " is-listening" : ""}`}
            onClick={speech.listening ? speech.stop : speech.start}
            aria-pressed={speech.listening}
          >
            <MicIcon size={18} />
            {speech.listening ? "Mendengarkan… ketuk untuk berhenti" : "Ucapkan"}
          </button>
          {speech.listening && (
            <span className="kids-voice-interim" role="status">
              {speech.interim || "Silakan bicara…"}
            </span>
          )}
        </div>
      )}

      {!speech.supported && (
        <p className="kids-voice-unavailable">{speech.unavailableReason}</p>
      )}

      {speech.error && (
        <p className="kids-voice-error" role="alert">
          {speech.error}
          <button type="button" onClick={speech.clearError} aria-label="Tutup pesan">×</button>
        </p>
      )}

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

function SpellEmptyState() {
  return (
    <div className="kids-player-state kids-player-empty">
      <span className="kids-player-hand" aria-hidden="true"><HandSignIcon size={62} /></span>
      <h4>Ejaan BISINDO akan tampil di sini</h4>
      <p>Ketik atau ucapkan kalimat, lalu tekan Terjemahkan.</p>
    </div>
  );
}

function SpellEmptyResult({ note, onRetry }) {
  return (
    <div className="kids-player-state kids-player-error" role="status">
      <span className="kids-player-hand" aria-hidden="true"><HandSignIcon size={58} /></span>
      <h4>Tidak ada huruf untuk dieja.</h4>
      <p>{note || "Coba ketik kata yang memakai huruf A sampai Z."}</p>
      <div>
        <button type="button" className="kids-control-button" onClick={onRetry}>Coba Lagi</button>
      </div>
    </div>
  );
}

/**
 * Panel hasil: kalimat yang dieja huruf per huruf.
 *
 * Menggantikan pemutar video satu-gerakan yang ada sebelumnya. Pemutar itu
 * meminta satu berkas untuk seluruh frasa, sehingga "aku mau makan" hanya bisa
 * berhasil bila ada video berjudul persis itu — yang tidak akan pernah ada.
 * Mengeja per huruf membuat kalimat APA PUN dapat diperagakan dari 26 gambar.
 *
 * `entry` adalah kata Bank Kata yang kebetulan cocok dengan seluruh frasa.
 * Sifatnya tambahan, bukan syarat: ketiadaannya tidak menghalangi ejaan.
 */
function SignPanel({ spelled, query, entry, reducedMotion, onRetry }) {
  const started = Boolean(query);

  return (
    <article className="kids-translator-card kids-sign-player" aria-labelledby="bisindo-player-title">
      <header>
        <div><span className="kids-live-label">BISINDO</span><h3 id="bisindo-player-title">Ejaan isyarat</h3></div>
        <span className="kids-current-query">Kata: <strong>{query || "—"}</strong></span>
      </header>

      <div className="kids-sign-viewport kids-sign-viewport-spell">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={started ? (spelled.isEmpty ? "empty" : query) : "idle"}
            className="kids-player-state-transition"
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: reducedMotion ? 0 : 0.22 }}
          >
            {!started && <SpellEmptyState />}
            {started && spelled.isEmpty && (
              <SpellEmptyResult note={describeSkipped(spelled.skipped)} onRetry={onRetry} />
            )}
            {started && !spelled.isEmpty && (
              <SpelledPhrase spelled={spelled} reducedMotion={reducedMotion} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {entry && (
        <div className="kids-spell-entry">
          <span className="kids-spell-entry-tag">Ada di Bank Kata</span>
          <strong>{entry.word}</strong>
          {entry.description && <p>{entry.description}</p>}
        </div>
      )}
    </article>
  );
}

function TextToSignMode({ reducedMotion }) {
  const inputRef = useRef(null);
  const [value, setValue] = useState("");
  const [query, setQuery] = useState("");
  const [entry, setEntry] = useState(null);
  const lookupSequenceRef = useRef(0);

  // Ejaan dihitung dari `query`, bukan dari `value`. Menghitungnya dari ketikan
  // membuat huruf-huruf melompat mengikuti setiap penekanan tombol; anak tidak
  // sempat membaca apa pun sebelum tampilannya berubah lagi.
  const spelled = useMemo(() => spellPhrase(query), [query]);

  const run = useCallback((text) => {
    const next = text.trim();
    if (!next) return;
    setQuery(next);
    setEntry(null);
    const sequence = ++lookupSequenceRef.current;

    // Pencarian Bank Kata berjalan di belakang dan tidak pernah menghalangi:
    // ejaannya sudah tampil, ini hanya menambah keterangan bila katanya ada.
    // Kegagalan sengaja diabaikan — "tidak ada di kamus" adalah hal biasa.
    translationService.lookupTranslation(next)
      .then((found) => {
        if (lookupSequenceRef.current === sequence) setEntry(found);
      })
      .catch(() => {});
  }, []);

  const speech = useSpeechRecognition({
    onResult: useCallback((text) => {
      setValue(text);
      run(text);
    }, [run]),
  });

  const translate = (event) => {
    event?.preventDefault();
    run(value);
  };

  const clear = () => {
    lookupSequenceRef.current += 1;
    speech.cancel();
    setValue("");
    setQuery("");
    setEntry(null);
    inputRef.current?.focus();
  };

  return (
    <div className="kids-text-mode">
      <motion.div className="kids-workspace-motion-item" initial={reducedMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.4, delay: reducedMotion ? 0 : 0.05 }}>
        <TranslationInputCard value={value} onChange={setValue} onTranslate={translate} onClear={clear} inputRef={inputRef} speech={speech} />
      </motion.div>
      <motion.div className="kids-workspace-motion-item" initial={reducedMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.4, delay: reducedMotion ? 0 : 0.12 }}>
        <SignPanel spelled={spelled} query={query} entry={entry} reducedMotion={reducedMotion} onRetry={() => inputRef.current?.focus()} />
      </motion.div>
    </div>
  );
}
function CameraToTextMode({ camera, reducedMotion }) {
  const recognition = useBisindoRecognition({
    active: camera.state === "active",
    videoRef: camera.videoRef,
  });

  return <div className="kids-camera-mode"><motion.div className="kids-workspace-motion-item" initial={reducedMotion ? false : { opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: reducedMotion ? 0 : 0.44, delay: reducedMotion ? 0 : 0.04 }}><CameraPracticePanel camera={camera} recognition={recognition} reducedMotion={reducedMotion} /></motion.div><motion.div className="kids-workspace-motion-item" initial={reducedMotion ? false : { opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: reducedMotion ? 0 : 0.44, delay: reducedMotion ? 0 : 0.1 }}><TranslationResult recognition={recognition} cameraActive={camera.state === "active"} /></motion.div></div>;
}

export default function BisindoTranslator({ embedded = false, defaultMode = "camera" }) {
  const reducedMotion = useReducedMotion();
  const { ref, inView } = useInView({ rootMargin: "0px 0px -10%", threshold: 0.18 });
  const [mode, setMode] = useState(defaultMode);
  const camera = useCameraStream();

  const changeMode = (nextMode) => {
    if (nextMode !== "camera") camera.stop();
    setMode(nextMode);
  };

  return (
    <section
      ref={ref}
      id={embedded ? undefined : "demo-gerakan"}
      className={`${embedded ? "" : "kids-section "}kids-demo-section kids-translator-section${embedded ? " is-embedded" : ""}`}
      aria-labelledby={embedded ? "user-translator-title" : "demo-title"}
    >
      {!embedded && <div className="kids-translator-decor" aria-hidden="true"><span /><span /></div>}
      <div className="kids-container kids-translator-container">
        {!embedded && <TranslatorIntro inView={inView} reducedMotion={reducedMotion} />}
        <TranslationModeSwitch mode={mode} onChange={changeMode} inView={inView} reducedMotion={reducedMotion} />
        <AnimatePresence mode="wait" initial={false}><motion.div
          key={mode}
          id={`translator-panel-${mode}`}
          role="tabpanel"
          aria-labelledby={`translator-tab-${mode}`}
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
