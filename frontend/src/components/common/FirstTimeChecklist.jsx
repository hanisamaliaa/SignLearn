import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

const STORAGE_PREFIX = "signlearn:guided-tour:v2:";

const STEPS = [
  {
    target: "sidebar",
    title: "Navigasi utama",
    description:
      "Semua fitur utama SignLearn bisa kamu akses dari sini, mulai dari kursus, progress belajar, hingga berbagai fitur pendukung.",
  },
  {
    target: "course-progress",
    title: "Kursus dan Progress Belajar",
    description:
      "Mulai belajar dari berbagai kursus BISINDO, lalu pantau perkembangan belajarmu melalui progress belajar.",
  },
  {
    target: "nav-tools",
    title: "Penerjemah dan Kamus BISINDO",
    description:
      "Butuh bantuan saat belajar? Gunakan Penerjemah atau cari kata melalui Kamus BISINDO.",
  },
  {
    target: "nav-premium",
    title: "Jadi Premium dan Quiz",
    description:
      "Sudah siap menguji kemampuanmu? Fitur Quiz dapat digunakan oleh pengguna Premium untuk mengasah pemahaman setelah belajar.",
  },
  {
    target: "nav-account",
    title: "Profil dan Pengaturan",
    description:
      "Kamu juga bisa mengelola profil dan menyesuaikan pengaturan akunmu di sini.",
  },
];

const OPENING_TITLE = "Selamat Datang di SignLearn";
const OPENING_DESCRIPTION =
  "Yuk, kenalan sebentar dengan fitur-fitur yang bisa membantu perjalanan belajarmu di SignLearn.";

function isNewLearner(summary, quizHistory) {
  if (!summary) return false;

  // `coursesStarted` is intentionally NOT used here. The backend counts a
  // course as started as soon as the user has lesson_progress for that
  // course, while a newly registered user can already have courses available
  // or assigned. The tour should disappear only after real learning activity
  // begins (watching a lesson), a lesson is completed, or a quiz is attempted.
  return (
    Number(summary.lessonsCompleted ?? 0) === 0 &&
    Number(summary.quizzesPassed ?? 0) === 0 &&
    !summary.lastActivityAt &&
    (quizHistory?.length ?? 0) === 0
  );
}

function getStoredState(key) {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    const step = Number(parsed.step);
    return {
      status: parsed.status === "completed" || parsed.status === "skipped" ? parsed.status : "in-progress",
      step: Number.isInteger(step) && step >= 0 && step < STEPS.length ? step : 0,
    };
  } catch {
    return null;
  }
}

export default function FirstTimeChecklist({ userId, summary, quizHistory = [] }) {
  const navigate = useNavigate();
  const storageKey = `${STORAGE_PREFIX}${userId ?? "unknown"}`;
  const eligible = useMemo(
    () => isNewLearner(summary, quizHistory),
    [summary, quizHistory],
  );

  const [tourState, setTourState] = useState(() => getStoredState(storageKey));
  const [stepIndex, setStepIndex] = useState(() => getStoredState(storageKey)?.step ?? 0);
  const [rects, setRects] = useState([]);
  const [opening, setOpening] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [showClosingModal, setShowClosingModal] = useState(false);

  const shouldShow = eligible && Boolean(userId);

  useEffect(() => {
    const stored = getStoredState(storageKey);
    setTourState(stored);
    setStepIndex(stored?.step ?? 0);
    setOpening(Boolean(shouldShow && !stored));
    setTourActive(Boolean(shouldShow && stored?.status === "in-progress"));
  }, [storageKey, shouldShow]);

  const persist = (status, step = stepIndex) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ status, step }),
    );
    setTourState({ status, step });
  };

  const startTour = () => {
    setOpening(false);
    setTourActive(true);
    setShowClosingModal(false);
    persist("in-progress", 0);
    setStepIndex(0);
  };

  const finishTour = () => {
    setOpening(false);
    setTourActive(false);
    persist("completed", STEPS.length - 1);
    setShowClosingModal(true);
  };

  const skipTour = () => {
    setOpening(false);
    setTourActive(false);
    persist("skipped", stepIndex);
    setShowClosingModal(false);
  };

  const goToStep = (nextIndex) => {
    const safeIndex = Math.max(0, Math.min(nextIndex, STEPS.length - 1));
    setStepIndex(safeIndex);
    persist("in-progress", safeIndex);
  };

  const handleNext = () => {
    if (stepIndex === STEPS.length - 1) {
      finishTour();
      return;
    }
    goToStep(stepIndex + 1);
  };

  useEffect(() => {
    if (!tourActive || !shouldShow) return undefined;

    let frameId = 0;
    let resizeTimer = 0;

    const getTargets = () => {
      const selector = `[data-tour-target="${STEPS[stepIndex].target}"]`;
      return Array.from(document.querySelectorAll(selector));
    };

    const updatePosition = () => {
      const targets = getTargets();
      const nextRects = targets
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            top: rect.top,
            left: rect.left,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
          };
        })
        .filter((rect) => rect.width > 0 && rect.height > 0);

      setRects(nextRects);
    };

    const revealTarget = () => {
      const targets = getTargets();
      if (!targets.length) {
        updatePosition();
        return;
      }

      const first = targets[0];
      const rect = first.getBoundingClientRect();
      const sidebarTarget = STEPS[stepIndex].target === "sidebar";
      const hiddenSidebar = sidebarTarget && rect.width < 48;

      if (hiddenSidebar) {
        const toggle = document.querySelector(".user-sidebar-reopen, .user-sidebar-menu-button");
        if (toggle instanceof HTMLElement) {
          toggle.click();
          window.setTimeout(() => {
            const visibleTarget = getTargets()[0];
            visibleTarget?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            updatePosition();
          }, 260);
          return;
        }
      }

      const targetRects = targets.map((element) => element.getBoundingClientRect());
      const minTop = Math.min(...targetRects.map((item) => item.top));
      const maxBottom = Math.max(...targetRects.map((item) => item.bottom));
      if (minTop < 92 || maxBottom > window.innerHeight - 72) {
        first.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      }
      updatePosition();
    };

    revealTarget();
    frameId = window.requestAnimationFrame(updatePosition);

    const onViewportChange = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updatePosition);
    };
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(revealTarget, 80);
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onViewportChange, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [stepIndex, shouldShow, tourActive]);

  useEffect(() => {
    if (!tourActive) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        skipTour();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [tourActive, stepIndex]);

  useEffect(() => {
    if (!tourActive) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [tourActive]);

  if (!shouldShow || tourState?.status === "skipped" || (tourState?.status === "completed" && !showClosingModal)) {
    return null;
  }

  const step = STEPS[stepIndex];

  const spotlight = rects.length
    ? {
        top: Math.min(...rects.map((rect) => rect.top)) - 7,
        left: Math.min(...rects.map((rect) => rect.left)) - 7,
        right: Math.max(...rects.map((rect) => rect.right)) + 7,
        bottom: Math.max(...rects.map((rect) => rect.bottom)) + 7,
      }
    : null;

  const tooltipPlacement = spotlight
    ? spotlight.bottom + 18 + 190 <= window.innerHeight
      ? "below"
      : "above"
    : "center";

  const tooltipStyle = spotlight
    ? {
        top:
          tooltipPlacement === "below"
            ? spotlight.bottom + 18
            : Math.max(18, spotlight.top - 190),
        left: Math.min(
          Math.max(18, spotlight.left),
          Math.max(18, window.innerWidth - 418),
        ),
      }
    : {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };

  return createPortal(
    <div className="guided-tour-layer" role="dialog" aria-modal="true" aria-labelledby="guided-tour-title">
      <div className="guided-tour-backdrop" aria-hidden="true" />

      {spotlight && (
        <div
          className="guided-tour-spotlight"
          aria-hidden="true"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.right - spotlight.left,
            height: spotlight.bottom - spotlight.top,
          }}
        />
      )}

      {opening && (
        <div className="guided-tour-modal">
          <div className="guided-tour-modal-kicker">PANDUAN SINGKAT</div>
          <h2 id="guided-tour-title">{OPENING_TITLE}</h2>
          <p>{OPENING_DESCRIPTION}</p>
          <div className="guided-tour-modal-actions">
            <button type="button" className="guided-tour-secondary" onClick={skipTour}>
              Lewati
            </button>
            <button type="button" className="guided-tour-primary" onClick={startTour}>
              Mulai Tour
            </button>
          </div>
        </div>
      )}

      {tourActive && !opening && (
        <div className={`guided-tour-tooltip is-${tooltipPlacement}`} style={tooltipStyle}>
          <div className="guided-tour-tooltip-topline">
            <span>{stepIndex + 1} dari {STEPS.length}</span>
            <button type="button" className="guided-tour-skip" onClick={skipTour}>
              Lewati Tour
            </button>
          </div>
          <h2 id="guided-tour-title">{step.title}</h2>
          <p>{step.description}</p>
          <div className="guided-tour-tooltip-footer">
            <button
              type="button"
              className="guided-tour-secondary"
              onClick={() => goToStep(stepIndex - 1)}
              disabled={stepIndex === 0}
            >
              Kembali
            </button>
            <button type="button" className="guided-tour-primary" onClick={handleNext}>
              {stepIndex === STEPS.length - 1 ? "Selesai" : "Lanjut"}
            </button>
          </div>
        </div>
      )}

      {showClosingModal && (
        <div className="guided-tour-modal guided-tour-closing-modal">
          <div className="guided-tour-modal-kicker">SELESAI</div>
          <h2 id="guided-tour-title">Panduan untuk Orang Tua</h2>
          <p>Ingin tahu bagaimana orang tua dapat mendampingi perjalanan belajar di SignLearn? Lihat Panduan Orang Tua untuk mengetahui lebih lanjut.</p>
          <div className="guided-tour-modal-actions">
            <button
              type="button"
              className="guided-tour-secondary"
              onClick={() => setShowClosingModal(false)}
            >
              Nanti Saja
            </button>
            <button
              type="button"
              className="guided-tour-primary"
              onClick={() => {
                setShowClosingModal(false);
                navigate("/parent-guide");
              }}
            >
              Lihat Panduan Orang Tua
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
