import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../components/ui/ui";
import { CameraIcon, CheckCircleIcon, RefreshIcon, AlertCircleIcon } from "../../components/ui/Icons";
import { useCameraStream } from "../../hooks/useCameraStream";
import { useBisindoRecognition } from "../../hooks/useBisindoRecognition";
import {
  advanceSpell,
  createSpellState,
  expectedLetter,
  spellCells,
  spellMistakes,
} from "./spellTracker";

/**
 * Soal kuis yang dijawab dengan memperagakan abjad BISINDO di depan kamera.
 *
 * Model pengenal hanya menguasai 26 huruf statis, sehingga soal ini menguji
 * MENGEJA — bukan isyarat kata yang diajarkan video pelajaran. Perintahnya
 * dibuat eksplisit supaya aplikasi tidak menjanjikan penilaian yang tidak
 * mampu dilakukannya.
 *
 * Kemajuan dilacak per huruf dan huruf yang keliru tidak pernah memundurkan
 * progres; aturannya ada di `spellTracker.js` beserta pengujiannya.
 */
export default function SpellCameraQuestion({ target, onAnswerChange }) {
  const camera = useCameraStream();
  const active = camera.state === "active";
  const recognition = useBisindoRecognition({ active, videoRef: camera.videoRef });

  const [spell, setSpell] = useState(() => createSpellState(target));
  const consumedRef = useRef(0);

  // Target berganti berarti soal berganti; buang progres soal sebelumnya.
  useEffect(() => {
    setSpell(createSpellState(target));
    consumedRef.current = recognition.characters.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  /**
   * Huruf baru dikonsumsi berdasarkan indeks, bukan dengan mengosongkan buffer
   * pengenalan. Menyentuh buffer itu akan mereset stabilizer di tengah
   * peragaan dan membuang bukti yang sedang ia kumpulkan.
   */
  useEffect(() => {
    const characters = recognition.characters;
    if (characters.length <= consumedRef.current) {
      consumedRef.current = Math.min(consumedRef.current, characters.length);
      return;
    }
    const fresh = characters.slice(consumedRef.current);
    consumedRef.current = characters.length;
    setSpell((current) => fresh.reduce(advanceSpell, current));
  }, [recognition.characters]);

  const done = spell.done;
  useEffect(() => {
    onAnswerChange?.(done ? spell.target : "", spellMistakes(spell));
  }, [done, spell, onAnswerChange]);

  // Kamera tidak lagi diperlukan setelah kata selesai dieja.
  useEffect(() => {
    if (done) camera.stop();
  }, [done, camera]);

  const cells = useMemo(() => spellCells(spell), [spell]);
  const waitingFor = expectedLetter(spell);

  return (
    <div className="space-y-5">
      <LetterTrack cells={cells} done={done} />

      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#1A2332]">
        <video
          ref={camera.videoRef}
          playsInline
          muted
          className={`absolute inset-0 h-full w-full -scale-x-100 object-cover ${active ? "" : "invisible"}`}
        />

        {!active && (
          <CameraGate
            state={camera.state}
            done={done}
            onStart={camera.start}
          />
        )}

        {active && waitingFor && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-10">
            <p className="text-sm text-white/85">
              Peragakan huruf{" "}
              <strong className="text-lg font-bold text-white">{waitingFor}</strong>
            </p>
            <p className="text-xs text-white/60">
              {recognition.status === "error"
                ? "Layanan pengenal terputus"
                : spell.outcome === "wrong"
                  ? `Terbaca "${spell.wrongLetter}" — coba lagi`
                  : "Tahan pose sejenak"}
            </p>
          </div>
        )}
      </div>

      {recognition.error && (
        <p className="flex items-start gap-2 text-xs leading-relaxed text-[#E74C3C]">
          <AlertCircleIcon size={14} className="mt-0.5 shrink-0" />
          {recognition.error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--text-subtle)]">
          {done
            ? "Jawaban tersimpan. Lanjutkan atau kumpulkan kuis."
            : "Soal boleh dilewati; nilainya 0, tetapi kuis tetap dapat dikumpulkan."}
        </p>
        {active && !done && (
          <Button variant="outline" size="sm" onClick={camera.stop}>
            <RefreshIcon size={14} /> Matikan kamera
          </Button>
        )}
      </div>
    </div>
  );
}

function LetterTrack({ cells, done }) {
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2"
      role="status"
      aria-label={
        done
          ? "Seluruh huruf berhasil diperagakan"
          : `Menunggu huruf ${cells.find((c) => c.status === "current")?.char ?? ""}`
      }
    >
      {cells.map((cell, index) =>
        cell.isSpace ? (
          <span key={index} className="w-4" aria-hidden="true" />
        ) : (
          <span
            key={index}
            className={`flex h-12 w-11 items-center justify-center rounded-xl border-2 text-lg font-extrabold transition-colors duration-200 ${
              cell.status === "done"
                ? "border-[#2ECC71] bg-[var(--success-light)] text-[#2ECC71]"
                : cell.status === "current"
                  ? "border-[#4F8EF7] bg-[var(--primary-light)] text-[var(--primary)]"
                  : "border-[var(--border)] bg-[var(--surface-3)] text-[var(--text-subtle)]"
            }`}
          >
            {cell.char}
          </span>
        ),
      )}
    </div>
  );
}

function CameraGate({ state, done, onStart }) {
  if (done) {
    return (
      <Overlay tone="success">
        <CheckCircleIcon size={34} />
        <p className="text-sm font-semibold">Kata berhasil dieja</p>
        <p className="text-xs text-white/70">Kamera dimatikan otomatis.</p>
      </Overlay>
    );
  }

  if (state === "requesting") {
    return (
      <Overlay>
        <CameraIcon size={34} />
        <p className="text-sm font-semibold">Menyiapkan kamera…</p>
      </Overlay>
    );
  }

  // Izin ditolak tidak boleh mengunci peserta dari kursus; pesan menjelaskan
  // cara memulihkannya, dan soal tetap bisa dilewati dari tombol di bawah.
  if (state === "denied" || state === "error" || state === "unsupported") {
    const message =
      state === "denied"
        ? "Izinkan akses kamera lewat ikon gembok di bilah alamat, lalu coba lagi."
        : state === "unsupported"
          ? "Browser ini tidak menyediakan akses kamera. Coba browser atau perangkat lain."
          : "Kamera tidak dapat dibuka. Periksa apakah aplikasi lain sedang memakainya.";
    return (
      <Overlay tone="problem">
        <AlertCircleIcon size={32} />
        <p className="text-sm font-semibold">Kamera belum bisa digunakan</p>
        <p className="max-w-sm text-xs leading-relaxed text-white/70">{message}</p>
        {state !== "unsupported" && (
          <button
            type="button"
            onClick={onStart}
            className="mt-1 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/15 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/25"
          >
            <RefreshIcon size={15} /> Coba lagi
          </button>
        )}
      </Overlay>
    );
  }

  return (
    <Overlay>
      <CameraIcon size={34} />
      <p className="text-sm font-semibold">Aktifkan kamera untuk menjawab</p>
      <p className="max-w-sm text-xs leading-relaxed text-white/70">
        Pastikan kedua tangan terlihat utuh dan ruangan cukup terang.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-1 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        <CameraIcon size={15} /> Aktifkan kamera
      </button>
    </Overlay>
  );
}

function Overlay({ children, tone = "neutral" }) {
  const accent =
    tone === "success" ? "text-[#2ECC71]" : tone === "problem" ? "text-[#F4B400]" : "text-white/80";
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-white">
      <span className={accent}>{children[0]}</span>
      {children.slice(1)}
    </div>
  );
}
