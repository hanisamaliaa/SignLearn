import { useEffect, useRef } from "react";
import { CheckCircleIcon } from "../ui/Icons";

export default function TranslationResult({ recognition }) {
  const resultRef = useRef(null);
  const text = recognition.characters.join("");

  useEffect(() => {
    const resultElement = resultRef.current;
    if (resultElement) resultElement.scrollTop = resultElement.scrollHeight;
  }, [text]);

  const copy = async () => {
    if (text) await navigator.clipboard?.writeText(text);
  };

  return (
    <aside className="kids-translator-card kids-recognition-result" aria-labelledby="recognition-title">
      <header><span className="kids-translator-card-icon" aria-hidden="true"><CheckCircleIcon size={22} /></span><div><h3 id="recognition-title">Hasil terjemahan</h3><p>Gerakan yang dikenali akan menjadi teks.</p></div></header>
      <div ref={resultRef} className={`kids-detected-copy ${text ? "has-result" : ""}`} aria-live="polite">
        <span>Kalimatmu</span>
        <strong className="kids-result-text">{text || "Belum ada gerakan dikenali"}</strong>
      </div>
      <div className="kids-result-actions">
        <button type="button" className="kids-control-button" onClick={copy} disabled={!text}>Salin</button>
        <button type="button" className="kids-control-button" onClick={recognition.addSpace} disabled={!text || text.endsWith(" ")}>Tambah spasi</button>
        <button type="button" className="kids-control-button" onClick={recognition.clear} disabled={!text}>Bersihkan</button>
      </div>
      <div className="kids-recognition-history">
        <h4>Terakhir dikenali</h4>
        {recognition.characters.length ? <ol>{recognition.characters.filter((character) => character !== " ").slice(-6).map((character, index) => <li key={`${character}-${index}`}>{character}</li>)}</ol> : <p>Riwayat gerakan akan tampil di sini.</p>}
      </div>
      <div className="kids-recognition-recovery">
        <span>Kurang tepat?</span>
        <button type="button" onClick={recognition.removeLast} disabled={!text}>Hapus karakter terakhir</button>
      </div>
      {recognition.debugEnabled && recognition.debugInfo && (
        <dl className="kids-recognition-debug">
          <div><dt>Raw prediction</dt><dd>{recognition.debugInfo.rawPrediction || "—"}</dd></div>
          <div><dt>Hand detected</dt><dd>{recognition.debugInfo.handDetected ? "yes" : "no"}</dd></div>
          <div><dt>Top-1 confidence</dt><dd>{Math.round(recognition.debugInfo.top1Confidence * 100)}%</dd></div>
          <div><dt>Top-2 confidence</dt><dd>{Math.round(recognition.debugInfo.top2Confidence * 100)}%</dd></div>
          <div><dt>Smoothed prediction</dt><dd>{recognition.debugInfo.smoothedPrediction || "—"}</dd></div>
          <div><dt>Smoothed confidence</dt><dd>{Math.round(recognition.debugInfo.smoothedConfidence * 100)}%</dd></div>
          <div><dt>Majority candidate</dt><dd>{recognition.debugInfo.stableLabel || "—"}</dd></div>
          <div><dt>Aggregated confidence</dt><dd>{Math.round(recognition.debugInfo.confidence * 100)}%</dd></div>
          <div><dt>Aggregated margin</dt><dd>{recognition.debugInfo.margin.toFixed(3)}</dd></div>
          <div><dt>Stable votes</dt><dd>{recognition.debugInfo.stableFrames}</dd></div>
          <div><dt>Stable duration</dt><dd>{Math.round(recognition.debugInfo.stableDuration)} ms</dd></div>
          <div><dt>State</dt><dd>{recognition.debugInfo.currentState}</dd></div>
          <div><dt>Rejection reason</dt><dd>{recognition.debugInfo.rejectionReason || "ACCEPTED"}</dd></div>
          <div className="kids-debug-ranking"><dt>Top predictions</dt><dd>{recognition.debugInfo.topPredictions.length ? recognition.debugInfo.topPredictions.map(({ label, confidence }) => `${label} ${Math.round(confidence * 100)}%`).join(" · ") : "—"}</dd></div>
        </dl>
      )}
    </aside>
  );
}
