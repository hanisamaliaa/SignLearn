import { useState } from "react";
import { Card, Toggle, Button, Alert, FloatingShapes } from "../../components/ui/ui";
import {
  BellIcon,
  EyeIcon,
} from "../../components/ui/Icons";
import { useTheme } from "../../context/ThemeContext";
import { useSettings } from "../../context/SettingsContext";

const THEMES = [
  { id: "light", label: "Terang", icon: "☀️" },
  { id: "dark", label: "Gelap", icon: "🌙" },
];

const NOTIFICATION_ITEMS = [
  {
    key: "quizReminder",
    label: "Pengingat Kuis",
    desc: "Ingatkan jika ada kuis yang tertunda",
  },
  {
    key: "streakReminder",
    label: "Pengingat Streak",
    desc: "Notifikasi harian untuk menjaga streak",
  },
  {
    key: "newContent",
    label: "Konten Baru",
    desc: "Beritahu saat ada pelajaran baru tersedia",
  },
  {
    key: "weeklyReport",
    label: "Laporan Mingguan",
    desc: "Ringkasan progress belajar setiap minggu",
  },
];

export default function Settings() {
  const {
    theme,
    setTheme,
    fontSize,
    setFontSize,
    minFontSize,
    maxFontSize,
    highContrast,
    reducedMotion,
    setHighContrast,
    setReducedMotion,
  } = useTheme();
  const {
    language,
    setLanguage,
    notifications,
    setNotification,
    t,
  } = useSettings();
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    await new Promise((r) => setTimeout(r, 500));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <FloatingShapes count={2} />

      <div>
        <p className="mb-1 text-sm font-bold text-[#2e86bf]">PENGATURAN</p>
        <h1 className="text-2xl font-extrabold text-[var(--text)]">
          {t("settings.title")}
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          {t("settings.subtitle")}
        </p>
      </div>

      {saved && (
        <Alert
          type="success"
          message={t("settings.saved")}
          onClose={() => setSaved(false)}
        />
      )}

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] lg:grid-cols-2 gap-6">
        {/* Appearance */}
        <Card className="settings-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-[var(--primary-light)] rounded-xl flex items-center justify-center text-[var(--primary)]">
              <EyeIcon size={18} />
            </div>
            <div>
              <h2 className="font-bold text-[var(--text)]">
                {t("settings.appearance")}
              </h2>
              <p className="text-xs text-[var(--text-subtle)]">
                {t("settings.appearance.desc")}
              </p>
            </div>
          </div>
          <div className="space-y-5">
            <div>
              <label
                id="theme-label"
                className="text-sm font-medium text-[var(--text)] mb-3 block"
              >
                {t("settings.theme")}
              </label>
              <div
                className="grid grid-cols-2 gap-2"
                role="radiogroup"
                aria-labelledby="theme-label"
              >
                {THEMES.map((th) => (
                  <button
                    key={th.id}
                    role="radio"
                    aria-checked={theme === th.id}
                    onClick={() => setTheme(th.id)}
                    className={`settings-theme-btn p-3 rounded-xl border-2 text-center transition-all ${
                      theme === th.id
                        ? "border-[#4F8EF7] bg-[var(--primary-light)]"
                        : "border-[var(--border)] hover:border-[#4F8EF7]/40"
                    }`}
                  >
                    <div className="text-xl mb-1">{th.icon}</div>
                    <p
                      className={`text-xs font-medium ${
                        theme === th.id
                          ? "text-[var(--primary)]"
                          : "text-[var(--text-muted)]"
                      }`}
                    >
                      {th.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label
                htmlFor="language-select"
                className="text-sm font-medium text-[var(--text)] mb-2 block"
              >
                {t("settings.language")}
              </label>
              <select
                id="language-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#4F8EF7] focus:ring-2 focus:ring-[#4F8EF7]/20"
              >
                <option value="id">Bahasa Indonesia</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="font-size-range"
                className="text-sm font-medium text-[var(--text)] mb-2 block"
              >
                {t("settings.fontSize")}: {fontSize}px
              </label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--text-subtle)]">
                  {t("settings.fontSize.small")}
                </span>
                <input
                  id="font-size-range"
                  type="range"
                  min={minFontSize}
                  max={maxFontSize}
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                  className="flex-1 accent-[#4F8EF7]"
                />
                <span className="text-xs text-[var(--text-subtle)]">
                  {t("settings.fontSize.large")}
                </span>
              </div>
            </div>
            <div className="space-y-3 border-t border-[var(--border-light)] pt-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-[var(--text)]">Kontras tinggi</p>
                  <p className="text-xs leading-5 text-[var(--text-subtle)]">
                    Membuat teks dan batas elemen lebih mudah dibedakan.
                  </p>
                </div>
                <Toggle
                  checked={highContrast}
                  onChange={setHighContrast}
                  ariaLabel="Kontras tinggi"
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-[var(--text)]">Kurangi animasi</p>
                  <p className="text-xs leading-5 text-[var(--text-subtle)]">
                    Mengurangi gerakan dan transisi agar lebih nyaman.
                  </p>
                </div>
                <Toggle
                  checked={reducedMotion}
                  onChange={setReducedMotion}
                  ariaLabel="Kurangi animasi"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card className="settings-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-[var(--warning-light)] rounded-xl flex items-center justify-center text-[#F4B400]">
              <BellIcon size={18} />
            </div>
            <div>
              <h2 className="font-bold text-[var(--text)]">
                {t("settings.notifications")}
              </h2>
              <p className="text-xs text-[var(--text-subtle)]">
                {t("settings.notifications.desc")}
              </p>
            </div>
          </div>
          <div className="space-y-4">
            {NOTIFICATION_ITEMS.map((item) => (
              <div
                key={item.key}
                className="settings-notification-item flex min-w-0 flex-wrap items-center justify-between gap-3 py-2 border-b border-[var(--border-light)] last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">
                    {item.label}
                  </p>
                  <p className="text-xs text-[var(--text-subtle)]">
                    {item.desc}
                  </p>
                </div>
                <Toggle
                  checked={notifications[item.key]}
                  onChange={(v) => setNotification(item.key, v)}
                  ariaLabel={item.label}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button size="lg" onClick={handleSave}>
          {t("settings.save")}
        </Button>
      </div>
    </div>
  );
}
