import { useCallback, useEffect, useRef, useState } from "react";
import { PlayIcon, AlertCircleIcon, ArrowRightIcon, ClockIcon, RefreshIcon } from "../../components/ui/Icons";
import {
  THUMBNAIL_QUALITY_CHAIN,
  parseYouTubeId,
  thumbnailUrl,
  watchUrl,
  formatDuration,
} from "./youtube";
import { EMBED_BLOCKED_CODES, loadYouTubeApi } from "./youtubeApi";

/**
 * Pemutar video pelajaran.
 *
 * Halaman dibuka dengan sampul video saja, bukan player. Sebuah embed YouTube
 * membawa ratusan kilobyte skrip dan cookie pelacak untuk setiap pelajaran
 * yang hanya dilihat sekilas; menundanya sampai pemelajar benar-benar menekan
 * putar membuat daftar pelajaran tetap ringan dan tidak menitipkan cookie
 * kepada orang yang belum meminta apa pun.
 *
 * Setelah ditekan, player asli dimuat lewat IFrame API supaya kita menerima
 * kejadian `ENDED` dan dapat menandai pelajaran selesai tanpa menebak.
 *
 * Tiga jalur mundur, karena ini bergantung pada pihak ketiga yang bisa gagal:
 *   · skrip API tidak selesai dimuat  -> <iframe> biasa, penyelesaian manual
 *   · pemilik video mematikan embed   -> tautan tonton di YouTube
 *   · sampul maxres tidak ada         -> turun ke sddefault, lalu hqdefault
 */
export default function YouTubeLesson({
  videoUrl,
  title,
  onStarted,
  onEnded,
  onDurationKnown,
  className = "",
}) {
  const videoId = parseYouTubeId(videoUrl);

  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const endedRef = useRef(false);
  const startedRef = useRef(false);

  const [phase, setPhase] = useState("idle"); // idle | resuming | loading | playing | iframe | blocked
  const [thumbIndex, setThumbIndex] = useState(0);
  const [thumbLoaded, setThumbLoaded] = useState(false);

  // Resume state
  const [resumePosition, setResumePosition] = useState(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const resumeStartTime = useRef(null);

  const currentThumbQuality = THUMBNAIL_QUALITY_CHAIN[thumbIndex] || THUMBNAIL_QUALITY_CHAIN[THUMBNAIL_QUALITY_CHAIN.length - 1];

  // Callback disimpan di ref agar player tidak perlu dibuat ulang hanya karena
  // induknya merender ulang dengan fungsi baru.
  const endedCallback = useRef(onEnded);
  const durationCallback = useRef(onDurationKnown);
  const startedCallback = useRef(onStarted);
  useEffect(() => { endedCallback.current = onEnded; }, [onEnded]);
  useEffect(() => { durationCallback.current = onDurationKnown; }, [onDurationKnown]);
  useEffect(() => { startedCallback.current = onStarted; }, [onStarted]);

  // Check for saved resume position on mount
  useEffect(() => {
    if (!videoId) return;
    try {
      const saved = localStorage.getItem(`yt-resume-${videoId}`);
      if (saved) {
        const position = Number(saved);
        if (Number.isFinite(position) && position > 5) {
          setResumePosition(position);
          setShowResumePrompt(true);
        }
      }
    } catch { /* localStorage unavailable */ }
  }, [videoId]);

  // Save position periodically during playback
  const savePosition = useCallback((position) => {
    if (!videoId || !Number.isFinite(position)) return;
    try {
      localStorage.setItem(`yt-resume-${videoId}`, String(Math.floor(position)));
    } catch { /* localStorage unavailable */ }
  }, [videoId]);

  // Clear saved position on video end
  const clearResume = useCallback(() => {
    if (!videoId) return;
    try {
      localStorage.removeItem(`yt-resume-${videoId}`);
    } catch { /* localStorage unavailable */ }
  }, [videoId]);

  useEffect(() => () => {
    playerRef.current?.destroy?.();
    playerRef.current = null;
  }, []);

  const handleThumbError = useCallback(() => {
    setThumbIndex((prev) => {
      if (prev < THUMBNAIL_QUALITY_CHAIN.length - 1) return prev + 1;
      return prev;
    });
  }, []);

  const start = useCallback(async (startFrom) => {
    if (!videoId || (phase !== "idle" && phase !== "resuming")) return;
    setPhase("loading");
    resumeStartTime.current = startFrom || null;

    let YT;
    try {
      YT = await loadYouTubeApi();
    } catch {
      if (!startedRef.current) {
        startedRef.current = true;
        startedCallback.current?.();
      }
      setPhase("iframe");
      return;
    }
    if (!containerRef.current) return;

    const playerVars = {
      autoplay: 1,
      rel: 0,
      modestbranding: 1,
      playsinline: 1,
    };

    // If resuming, seek to saved position after player loads
    if (startFrom && startFrom > 0) {
      playerVars.start = Math.floor(startFrom);
    }

    playerRef.current = new YT.Player(containerRef.current, {
      videoId,
      playerVars,
      events: {
        onReady: (event) => {
          setPhase("playing");
          const duration = event.target?.getDuration?.();
          if (Number.isFinite(duration) && duration > 0) {
            durationCallback.current?.(duration);
          }
          // If we have a resume position that wasn't handled by start param,
          // seek manually
          if (startFrom && startFrom > 0 && playerVars.start === undefined) {
            event.target.seekTo(startFrom, true);
          }
        },
        onStateChange: (event) => {
          if (event.data === YT.PlayerState.PLAYING && !startedRef.current) {
            startedRef.current = true;
            startedCallback.current?.();
          }
          // Save position while playing
          if (event.data === YT.PlayerState.PLAYING) {
            const intervalId = setInterval(() => {
              const pos = playerRef.current?.getCurrentTime?.();
              if (Number.isFinite(pos)) savePosition(pos);
            }, 5000);
            // Store interval so we can clear it later
            playerRef.current._positionInterval = intervalId;
          } else if (playerRef.current?._positionInterval) {
            clearInterval(playerRef.current._positionInterval);
            playerRef.current._positionInterval = null;
          }
          if (event.data !== YT.PlayerState.ENDED || endedRef.current) return;
          endedRef.current = true;
          clearResume();
          endedCallback.current?.();
        },
        onError: (event) => {
          if (EMBED_BLOCKED_CODES.has(event.data)) setPhase("blocked");
          else setPhase("iframe");
        },
      },
    });
  }, [videoId, phase, savePosition, clearResume]);

  const handleResumeFromSaved = useCallback(() => {
    setShowResumePrompt(false);
    setPhase("resuming");
    start(resumePosition);
  }, [resumePosition, start]);

  const handleStartFromBeginning = useCallback(() => {
    setShowResumePrompt(false);
    setResumePosition(null);
    try { localStorage.removeItem(`yt-resume-${videoId}`); } catch {}
    start(0);
  }, [videoId, start]);

  if (!videoId) {
    return (
      <Frame className={className}>
        <Notice
          icon={<AlertCircleIcon size={24} />}
          title="Video pelajaran belum tersedia"
          detail="Tautan video belum diisi atau formatnya tidak dikenali. Hubungi pengelola kursus."
        />
      </Frame>
    );
  }

  if (phase === "blocked") {
    return (
      <Frame className={className}>
        <Notice
          icon={<AlertCircleIcon size={24} />}
          title="Video ini tidak dapat diputar di sini"
          detail="Pemiliknya membatasi pemutaran di situs lain."
          action={
            <a
              href={watchUrl(videoId)}
              target="_blank"
              rel="noreferrer noopener"
              className="lesson-yt-cta"
            >
              Tonton di YouTube <ArrowRightIcon size={14} />
            </a>
          }
        />
      </Frame>
    );
  }

  if (phase === "iframe") {
    return (
      <Frame className={className}>
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title={title || "Video pelajaran"}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </Frame>
    );
  }

  if (phase === "loading" || phase === "playing" || phase === "resuming") {
    return (
      <Frame className={className}>
        <div ref={containerRef} className="absolute inset-0 h-full w-full" />
        {phase === "loading" && (
          <div className="lesson-yt-loading">
            <div className="lesson-yt-loading-spinner" />
            <span className="text-sm text-white/80 font-medium">Memuat video…</span>
          </div>
        )}
      </Frame>
    );
  }

  // ── Idle: thumbnail + play button ──────────────────────────────────
  const thumbSrc = thumbnailUrl(videoId, currentThumbQuality);

  return (
    <Frame className={className}>
      <button
        type="button"
        onClick={() => start(0)}
        aria-label={`Putar video: ${title || "pelajaran"}`}
        className="lesson-yt-play-area"
      >
        {/* Thumbnail skeleton */}
        {!thumbLoaded && (
          <div className="absolute inset-0 lesson-yt-thumb-skeleton" />
        )}

        {/* Thumbnail image */}
        <img
          src={thumbSrc}
          alt=""
          loading="lazy"
          className={`lesson-yt-thumb ${thumbLoaded ? "is-loaded" : ""}`}
          onError={handleThumbError}
          onLoad={() => setThumbLoaded(true)}
        />

        {/* Gradient overlay */}
        <span className="lesson-yt-gradient" />

        {/* Play button + title */}
        <span className="lesson-yt-overlay">
          <span className="lesson-yt-play-btn">
            <PlayIcon size={32} className="ml-1 text-white" />
          </span>
          {title && (
            <span className="lesson-yt-title">{title}</span>
          )}
        </span>
      </button>

      {/* Resume prompt overlay */}
      {showResumePrompt && resumePosition && (
        <div className="lesson-yt-resume-overlay" role="dialog" aria-label="Lanjutkan dari terakhir ditonton">
          <div className="lesson-yt-resume-card">
            <div className="lesson-yt-resume-icon">
              <ClockIcon size={20} />
            </div>
            <div className="lesson-yt-resume-text">
              <p className="lesson-yt-resume-heading">Lanjutkan dari terakhir kamu belajar?</p>
              <p className="lesson-yt-resume-time">Terakhir ditonton: {formatDuration(resumePosition)}</p>
            </div>
            <div className="lesson-yt-resume-actions">
              <button
                type="button"
                onClick={handleResumeFromSaved}
                className="lesson-yt-resume-btn primary"
              >
                <PlayIcon size={14} className="ml-0.5" />
                Lanjut dari {formatDuration(resumePosition)}
              </button>
              <button
                type="button"
                onClick={handleStartFromBeginning}
                className="lesson-yt-resume-btn secondary"
              >
                <RefreshIcon size={14} />
                Mulai dari awal
              </button>
            </div>
          </div>
        </div>
      )}
    </Frame>
  );
}

function Frame({ children, className = "" }) {
  return (
    <div className={`lesson-yt-frame ${className}`}>
      {children}
    </div>
  );
}

function Notice({ icon, title, detail, action }) {
  return (
    <div className="lesson-yt-notice">
      <span className="lesson-yt-notice-icon">
        {icon}
      </span>
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="max-w-md text-xs leading-relaxed text-white/70">{detail}</p>
      {action}
    </div>
  );
}
