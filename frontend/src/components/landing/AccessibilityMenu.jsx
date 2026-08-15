import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "../ui/Icons";
import { useAccessibility } from "../../context/AccessibilityContext";

const TEXT_SIZES = [
  { value: "normal", label: "Normal", hint: "100%" },
  { value: "large", label: "Besar", hint: "Sekitar 120%" },
  { value: "extra-large", label: "Sangat Besar", hint: "Sekitar 140%" },
];

export default function AccessibilityMenu({ open, onClose }) {
  const titleId = useId();
  const textSizeLegendId = useId();
  const panelRef = useRef(null);
  const restoreFocusRef = useRef(null);
  const [resetMessage, setResetMessage] = useState("");
  const {
    textSize,
    highContrast,
    reduceMotion,
    subtitles,
    focusMode,
    theme,
    setTextSize,
    setHighContrast,
    setReduceMotion,
    setSubtitles,
    setFocusMode,
    setTheme,
    resetAccessibility,
  } = useAccessibility();

  useEffect(() => {
    if (!open) return undefined;
    restoreFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => [...(panelRef.current?.querySelectorAll(
      "button, input, select, [href], [tabindex]:not([tabindex='-1'])",
    ) ?? [])].filter((element) => !element.disabled);
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    requestAnimationFrame(() => focusable()[0]?.focus());
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      const previousTrigger = restoreFocusRef.current;
      if (previousTrigger?.getClientRects?.().length) previousTrigger.focus();
      else {
        [...document.querySelectorAll('[aria-label="Buka pengaturan aksesibilitas"], .kids-menu-toggle')]
          .find((element) => element.getClientRects().length)?.focus();
      }
    };
  }, [onClose, open]);

  if (!open) return null;

  const toggles = [
    { label: "Kontras tinggi", checked: highContrast, onChange: setHighContrast },
    { label: "Kurangi animasi", checked: reduceMotion, onChange: setReduceMotion },
    { label: "Tampilkan subtitle", checked: subtitles, onChange: setSubtitles },
    { label: "Mode fokus", checked: focusMode, onChange: setFocusMode },
  ];

  return createPortal(
    <div
      className="kids-a11y-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={panelRef}
        className="kids-a11y-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="kids-a11y-heading">
          <div>
            <p className="kids-eyebrow">Sesuaikan pengalamanmu</p>
            <h2 id={titleId}>Aksesibilitas</h2>
            <p>Perubahan langsung diterapkan dan tersimpan otomatis.</p>
          </div>
          <button
            type="button"
            className="kids-icon-button"
            onClick={onClose}
            aria-label="Tutup pengaturan aksesibilitas"
          >
            <XIcon size={20} />
          </button>
        </div>

        <fieldset className="kids-text-size-fieldset" aria-labelledby={textSizeLegendId}>
          <legend id={textSizeLegendId}>Ukuran teks</legend>
          <div className="kids-text-size-options">
            {TEXT_SIZES.map((option) => (
              <label key={option.value} className="kids-text-size-option">
                <input
                  type="radio"
                  name="accessibility-text-size"
                  value={option.value}
                  checked={textSize === option.value}
                  onChange={() => setTextSize(option.value)}
                />
                <span><strong>{option.label}</strong><small>{option.hint}</small></span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="kids-a11y-toggles">
          <fieldset className="kids-theme-options">
            <legend>Tampilan</legend>
            <label><input type="radio" name="a11y-theme" checked={theme === "light"} onChange={() => setTheme("light")} /><span>☀️ Terang</span></label>
            <label><input type="radio" name="a11y-theme" checked={theme === "dark"} onChange={() => setTheme("dark")} /><span>🌙 Gelap</span></label>
          </fieldset>
          {toggles.map((toggle) => (
            <label key={toggle.label} className="kids-toggle-row">
              <span>{toggle.label}</span>
              <input
                type="checkbox"
                checked={toggle.checked}
                onChange={(event) => toggle.onChange(event.target.checked)}
              />
              <span className="kids-switch" aria-hidden="true" />
            </label>
          ))}
        </div>

        <div className="kids-a11y-footer">
          <button type="button" className="kids-reset-button" onClick={() => { resetAccessibility(); setResetMessage("Pengaturan default dipulihkan"); window.setTimeout(() => setResetMessage(""), 2500); }}>
            Kembalikan ke default
          </button>
          <span role="status" aria-live="polite">{resetMessage || "Tersimpan otomatis"}</span>
        </div>
      </section>
    </div>,
    document.body,
  );
}
