import { useEffect, useId, useState } from "react";
import { XIcon } from "../ui/Icons";

export default function AccessibilityMenu({ open, onClose }) {
  const titleId = useId();
  const [settings, setSettings] = useState({ largeText: false, contrast: false, motion: false, subtitles: true, focus: false });
  const [speed, setSpeed] = useState("1×");

  useEffect(() => {
    document.documentElement.classList.toggle("kids-large-text", settings.largeText);
    document.documentElement.classList.toggle("kids-high-contrast", settings.contrast);
    document.documentElement.classList.toggle("kids-reduce-motion", settings.motion);
    document.documentElement.classList.toggle("kids-focus-mode", settings.focus);
  }, [settings]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, open]);

  if (!open) return null;
  const toggles = [
    ["largeText", "Perbesar teks"], ["contrast", "Kontras tinggi"],
    ["motion", "Kurangi animasi"], ["subtitles", "Aktifkan subtitle"],
    ["focus", "Mode fokus"],
  ];
  return <div className="kids-a11y-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="kids-a11y-panel" role="dialog" aria-modal="true" aria-labelledby={titleId}><div className="flex items-center justify-between gap-4"><div><p className="kids-eyebrow">Sesuaikan tampilan</p><h2 id={titleId}>Aksesibilitas</h2></div><button type="button" className="kids-icon-button" onClick={onClose} aria-label="Tutup pengaturan aksesibilitas"><XIcon size={20} /></button></div><div className="mt-6 space-y-3">{toggles.map(([key, label]) => <label key={key} className="kids-toggle-row"><span>{label}</span><input type="checkbox" checked={settings[key]} onChange={(event) => setSettings((current) => ({ ...current, [key]: event.target.checked }))} /><span className="kids-switch" aria-hidden="true" /></label>)}</div><label className="mt-5 block font-bold text-[#0F2450]" htmlFor="default-speed">Kecepatan video default</label><select id="default-speed" className="kids-select" value={speed} onChange={(event) => setSpeed(event.target.value)}><option>0.5×</option><option>0.75×</option><option>1×</option></select><button type="button" className="kids-button kids-button-primary mt-6 w-full" onClick={onClose}>Simpan Pengaturan</button></section></div>;
}
