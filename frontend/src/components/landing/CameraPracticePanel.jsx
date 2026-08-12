import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CameraIcon, CheckCircleIcon, HandSignIcon, RefreshIcon } from "../ui/Icons";

function CameraProgress({ cameraState, hasResult }) {
  const step = hasResult ? 3 : cameraState === "active" ? 2 : 1;
  return (
    <div className="kids-practice-progress" role="progressbar" aria-label="Progres latihan kamera" aria-valuemin="1" aria-valuemax="3" aria-valuenow={step} aria-valuetext={`Langkah ${step} dari 3`}>
      <div><span>Langkah {step} dari 3</span><strong>{Math.round((step / 3) * 100)}%</strong></div>
      <div className="kids-practice-progress-track"><span style={{ transform: `scaleX(${step / 3})` }} /></div>
    </div>
  );
}

function CameraSetupState({ state, onStart }) {
  const loading = state === "requesting";
  const denied = state === "denied";
  const failed = state === "error";
  const unsupported = state === "unsupported";
  const problem = denied || failed || unsupported;
  return (
    <div className={`kids-camera-permission ${problem ? "is-problem" : ""}`} role={problem ? "alert" : "status"}>
      <span className={loading ? "is-loading" : ""} aria-hidden="true">
        {problem ? <RefreshIcon size={38} /> : <CameraIcon size={42} />}
      </span>
      {loading ? (
        <>
          <h4>Menyiapkan kamera...</h4>
          <p>Sebentar ya, kami sedang membuka area latihanmu.</p>
          <span className="kids-camera-loader" aria-hidden="true"><i /><i /><i /></span>
        </>
      ) : problem ? (
        <>
          <h4>{unsupported ? "Kamera belum didukung" : "Ups, kamera belum bisa digunakan"}</h4>
          <p>{denied ? "Izinkan akses kamera dari pengaturan browser, lalu coba lagi." : unsupported ? "Coba gunakan browser atau perangkat lain yang memiliki kamera." : "Periksa kameramu, lalu yuk coba sekali lagi."}</p>
          {!unsupported && <button type="button" className="kids-translator-primary" onClick={onStart}><RefreshIcon size={18} /> Coba Lagi</button>}
        </>
      ) : (
        <>
          <h4>Kamera belum aktif</h4>
          <p>Kamera digunakan untuk membaca gerakan tanganmu secara langsung.</p>
          <button type="button" className="kids-translator-primary" onClick={onStart}><CameraIcon size={18} /> Aktifkan Kamera</button>
          <small><span aria-hidden="true">🔒</span> Kamu tetap memegang kendali kamera</small>
        </>
      )}
    </div>
  );
}

function getDetectionFeedback(recognition) {
  const state = recognition.debugInfo?.state;
  if (recognition.status === "error") return { tone: "error", text: "Pembaca gerakan sedang terputus" };
  if (state === "DETECTING") return { tone: "reading", text: "Mencocokkan gerakanmu..." };
  if (state === "LOW_CONFIDENCE" || state === "UNKNOWN") return { tone: "retry", text: "Sedikit lagi — coba perjelas posisi tangan" };
  if (state === "WAIT_FOR_RELEASE") return { tone: "saved", text: "Huruf tersimpan — lanjutkan gerakan berikutnya" };
  if (recognition.debugInfo?.handDetected) return { tone: "reading", text: "Tangan ditemukan — tahan sebentar" };
  return { tone: "idle", text: "Arahkan tangan ke area panduan" };
}

export default function CameraPracticePanel({ camera, recognition, reducedMotion }) {
  const [celebration, setCelebration] = useState(null);
  const previousLength = useRef(recognition.characters.length);
  const active = camera.state === "active";
  const feedback = getDetectionFeedback(recognition);

  useEffect(() => {
    const currentLength = recognition.characters.length;
    const character = recognition.characters.at(-1);
    if (currentLength > previousLength.current && character && character !== " ") {
      setCelebration(character);
      const timer = window.setTimeout(() => setCelebration(null), 1600);
      previousLength.current = currentLength;
      return () => window.clearTimeout(timer);
    }
    previousLength.current = currentLength;
    return undefined;
  }, [recognition.characters]);

  const retryConnection = async () => {
    camera.stop();
    await camera.start();
  };

  return (
    <article className={`kids-translator-card kids-camera-panel ${celebration ? "is-success" : ""}`} aria-labelledby="camera-practice-title">
      <header>
        <div>
          <span className="kids-translator-card-icon" aria-hidden="true"><CameraIcon size={22} /></span>
          <div><span className="kids-card-kicker">Latihan langsung</span><h3 id="camera-practice-title">Sekarang Giliran Kamu!</h3><p>Posisikan tanganmu di area kamera dan tunjukkan satu huruf BISINDO.</p></div>
        </div>
        {active && <span className="kids-camera-active"><i /> Kamera aktif</span>}
      </header>
      <CameraProgress cameraState={camera.state} hasResult={recognition.characters.length > 0} />
      <div className={`kids-camera-viewport ${active ? "is-active" : ""}`}>
        <video ref={camera.videoRef} muted playsInline aria-label="Pratinjau kamera langsung" />
        {!active && <CameraSetupState state={camera.state} onStart={camera.start} />}
        {active && (
          <>
            <div className="kids-hand-guide" aria-hidden="true"><HandSignIcon size={76} /></div>
            {feedback.tone === "reading" && <span className="kids-camera-scan" aria-hidden="true" />}
            <div className={`kids-detection-status is-${feedback.tone}`} role="status" aria-live="polite"><i /> {feedback.text}</div>
          </>
        )}
        <AnimatePresence>
          {celebration && (
            <motion.div className="kids-camera-success" role="status" aria-live="assertive" initial={reducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <span className="kids-success-check" aria-hidden="true"><CheckCircleIcon size={34} /></span>
              <strong>Hebat! Huruf {celebration} dikenali!</strong>
              <small>Kamu bisa lanjut ke huruf berikutnya.</small>
              {!reducedMotion && <span className="kids-mini-confetti" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <i key={index} />)}</span>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {active && (
        <div className="kids-camera-controls">
          <p>{recognition.status === "error" ? "Koneksi pembaca gerakan terhenti. Yuk sambungkan kembali." : "Jaga tangan tetap terlihat dan gunakan pencahayaan yang cukup."}</p>
          <div>
            {recognition.status === "error" && <button type="button" className="kids-control-button" onClick={retryConnection}><RefreshIcon size={16} /> Coba Lagi</button>}
            <button type="button" className="kids-control-button" onClick={camera.stop}>Matikan Kamera</button>
          </div>
        </div>
      )}
    </article>
  );
}
