import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlayIcon, RefreshIcon } from "../ui/Icons";
import { letterImage } from "../../features/bisindo/alphabetImages";
import { describeSkipped } from "../../features/bisindo/spelling";

/**
 * Menampilkan kalimat sebagai deretan isyarat abjad BISINDO.
 *
 * Tata letaknya mengikuti acuan yang diminta: kata dipisahkan jarak yang jelas,
 * hurufnya mengalir dan membungkus seperti teks biasa. Jarak antar kata sengaja
 * dibuat jauh lebih lebar daripada jarak antar huruf — tanpa itu "AKU MAU"
 * terbaca sebagai satu kata sepanjang enam huruf.
 *
 * ── Peragaan ──────────────────────────────────────────────────────────
 *
 * Menyorot satu huruf pada satu waktu. Seluruh kalimat tetap terlihat selama
 * peragaan berjalan, bukan diganti satu gambar besar: anak perlu tahu sudah
 * sampai mana dan masih berapa lagi. Sorotan memakai indeks datar melintasi
 * semua kata, sehingga jeda antar kata jatuh dengan sendirinya di tempat yang
 * benar.
 */

const SPEEDS = [
  { label: "Pelan", ms: 1100 },
  { label: "Sedang", ms: 750 },
  { label: "Cepat", ms: 450 },
];

export default function SpelledPhrase({ spelled, reducedMotion }) {
  const [cursor, setCursor] = useState(-1);
  const [speedIndex, setSpeedIndex] = useState(1);
  const timerRef = useRef(null);

  // Indeks datar memberi setiap huruf satu nomor urut melintasi seluruh kata,
  // sehingga peragaan tidak perlu tahu apa pun tentang batas kata.
  const flat = useMemo(
    () => spelled.words.flatMap((word, wordIndex) =>
      word.letters.map((char) => ({ char, wordIndex })),
    ),
    [spelled],
  );

  const stop = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    setCursor(-1);
  }, []);

  // Peragaan dihentikan setiap kali kalimatnya berubah. Tanpa ini, sorotan
  // dari kalimat sebelumnya terus berjalan melewati akhir kalimat yang baru.
  useEffect(() => { stop(); }, [spelled, stop]);
  useEffect(() => stop, [stop]);

  const playing = cursor >= 0;

  const play = () => {
    if (playing) { stop(); return; }
    if (!flat.length) return;

    setCursor(0);
    timerRef.current = setInterval(() => {
      setCursor((current) => {
        if (current + 1 >= flat.length) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          return -1;
        }
        return current + 1;
      });
    }, SPEEDS[speedIndex].ms);
  };

  const changeSpeed = (index) => {
    setSpeedIndex(index);
    if (playing) stop();
  };

  const note = describeSkipped(spelled.skipped);
  let flatIndex = -1;

  return (
    <div className="kids-spell-result">
      <div className="kids-spell-words" aria-label="Ejaan BISINDO">
        {spelled.words.map((word, wordIndex) => (
          <div className="kids-spell-word" key={`${word.text}-${wordIndex}`}>
            <div className="kids-spell-letters">
              {word.letters.map((char, letterIndex) => {
                flatIndex += 1;
                const isCurrent = flatIndex === cursor;
                return (
                  <figure
                    key={`${char}-${letterIndex}`}
                    className={`kids-spell-letter${isCurrent ? " is-current" : ""}`}
                  >
                    <img
                      src={letterImage(char)}
                      alt={`Isyarat BISINDO huruf ${char}`}
                      loading="lazy"
                      draggable="false"
                    />
                    <figcaption aria-hidden="true">{char}</figcaption>
                  </figure>
                );
              })}
            </div>
            <span className="kids-spell-word-label">{word.text}</span>
          </div>
        ))}
      </div>

      {/* Kalimat utuh untuk pembaca layar. Deretan gambar di atas akan terbaca
          sebagai puluhan potongan terpisah; ini menyampaikan maksudnya sekali. */}
      <p className="sr-only" role="status">
        {spelled.words.map((word) => `${word.text}: ${word.letters.join(", ")}`).join(". ")}
      </p>

      {note && <p className="kids-spell-note">{note}</p>}

      <div className="kids-spell-controls">
        <button
          type="button"
          className="kids-control-button kids-control-primary"
          onClick={play}
          disabled={!flat.length}
        >
          {playing ? <RefreshIcon size={16} /> : <PlayIcon size={16} />}
          {playing ? "Hentikan" : "Peragakan"}
        </button>

        <div className="kids-spell-speeds" role="group" aria-label="Kecepatan peragaan">
          {SPEEDS.map((speed, index) => (
            <button
              type="button"
              key={speed.label}
              className={index === speedIndex ? "is-active" : ""}
              aria-pressed={index === speedIndex}
              onClick={() => changeSpeed(index)}
            >
              {speed.label}
            </button>
          ))}
        </div>

        <span className="kids-spell-count">
          {spelled.letterCount} huruf
          {spelled.words.length > 1 ? ` · ${spelled.words.length} kata` : ""}
          {playing && !reducedMotion ? ` · huruf ke-${cursor + 1}` : ""}
        </span>
      </div>
    </div>
  );
}
