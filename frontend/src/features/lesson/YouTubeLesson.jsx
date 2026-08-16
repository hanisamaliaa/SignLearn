import { useCallback, useEffect, useRef, useState } from "react";
import { PlayIcon, AlertCircleIcon, ArrowRightIcon } from "../../components/ui/Icons";
import {
  FALLBACK_THUMBNAIL_QUALITY,
  parseYouTubeId,
  thumbnailUrl,
  watchUrl,
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
 *   · sampul maxres tidak ada         -> turun ke hqdefault
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

  const [phase, setPhase] = useState("idle"); // idle | loading | playing | iframe | blocked
  const [thumbQuality, setThumbQuality] = useState("maxresdefault");

  // Callback disimpan di ref agar player tidak perlu dibuat ulang hanya karena
  // induknya merender ulang dengan fungsi baru.
  const endedCallback = useRef(onEnded);
  const durationCallback = useRef(onDurationKnown);
  const startedCallback = useRef(onStarted);
  useEffect(() => { endedCallback.current = onEnded; }, [onEnded]);
  useEffect(() => { durationCallback.current = onDurationKnown; }, [onDurationKnown]);
  useEffect(() => { startedCallback.current = onStarted; }, [onStarted]);

  useEffect(() => () => {
    playerRef.current?.destroy?.();
    playerRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (!videoId || phase !== "idle") return;
    setPhase("loading");

    let YT;
    try {
      YT = await loadYouTubeApi();
    } catch {
      // Video tetap harus bisa ditonton walaupun API-nya tidak tersedia.
      // Tanpa API tidak ada kejadian pemutaran, jadi menekan putar itu sendiri
      // yang dihitung sebagai mulai belajar.
      if (!startedRef.current) {
        startedRef.current = true;
        startedCallback.current?.();
      }
      setPhase("iframe");
      return;
    }
    if (!containerRef.current) return;

    playerRef.current = new YT.Player(containerRef.current, {
      videoId,
      playerVars: {
        autoplay: 1,
        rel: 0,              // tidak menawarkan video kanal lain setelah selesai
        modestbranding: 1,
        playsinline: 1,
      },
      events: {
        onReady: (event) => {
          setPhase("playing");
          const duration = event.target?.getDuration?.();
          if (Number.isFinite(duration) && duration > 0) {
            durationCallback.current?.(duration);
          }
        },
        onStateChange: (event) => {
          // Ditandai mulai hanya ketika benar-benar diputar, bukan saat
          // halaman dibuka: membuka lalu langsung pergi bukan belajar.
          if (event.data === YT.PlayerState.PLAYING && !startedRef.current) {
            startedRef.current = true;
            startedCallback.current?.();
          }
          if (event.data !== YT.PlayerState.ENDED || endedRef.current) return;
          // Sekali saja: menonton ulang tidak boleh mengirim penyelesaian
          // berkali-kali ke server.
          endedRef.current = true;
          endedCallback.current?.();
        },
        onError: (event) => {
          if (EMBED_BLOCKED_CODES.has(event.data)) setPhase("blocked");
          else setPhase("iframe");
        },
      },
    });
  }, [videoId, phase]);

  if (!videoId) {
    return (
      <Frame className={className}>
        <Notice
          icon={<AlertCircleIcon size={22} />}
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
          icon={<AlertCircleIcon size={22} />}
          title="Video ini tidak dapat diputar di sini"
          detail="Pemiliknya membatasi pemutaran di situs lain."
          action={
            <a
              href={watchUrl(videoId)}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
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

  if (phase === "loading" || phase === "playing") {
    return (
      <Frame className={className}>
        {/* Wadah ini digantikan seluruhnya oleh <iframe> milik YouTube. */}
        <div ref={containerRef} className="absolute inset-0 h-full w-full" />
        {phase === "loading" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#1A2332]">
            <span className="text-sm text-white/70">Memuat video…</span>
          </div>
        )}
      </Frame>
    );
  }

  return (
    <Frame className={className}>
      <button
        type="button"
        onClick={start}
        aria-label={`Putar video: ${title || "pelajaran"}`}
        className="group absolute inset-0 h-full w-full cursor-pointer"
      >
        <img
          src={thumbnailUrl(videoId, thumbQuality)}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setThumbQuality(FALLBACK_THUMBNAIL_QUALITY)}
        />
        <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/40 bg-white/15 backdrop-blur-sm transition-transform duration-200 group-hover:scale-110 group-hover:bg-white/25">
            <PlayIcon size={28} className="ml-1 text-white" />
          </span>
          {title && (
            <span className="max-w-[85%] text-center text-sm font-medium text-white drop-shadow">
              {title}
            </span>
          )}
        </span>
      </button>
    </Frame>
  );
}

function Frame({ children, className = "" }) {
  return (
    <div className={`relative aspect-video w-full overflow-hidden bg-[#1A2332] ${className}`}>
      {children}
    </div>
  );
}

function Notice({ icon, title, detail, action }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white">
        {icon}
      </span>
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="max-w-md text-xs leading-relaxed text-white/70">{detail}</p>
      {action}
    </div>
  );
}
