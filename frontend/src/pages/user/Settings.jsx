import { useState } from "react";
import { Card, Toggle, Button, Alert } from "../../components/ui/ui";
import {
  BellIcon,
  ShieldIcon,
  EyeIcon,
  BookIcon,
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
  {
    key: "email",
    label: "Notifikasi Email",
    desc: "Terima notifikasi penting via email",
  },
];

const PRIVACY_ITEMS = [
  {
    key: "showProgress",
    label: "Tampilkan Progress",
    desc: "Izinkan platform menyimpan data progress Anda",
  },
  {
    key: "showAchievements",
    label: "Tampilkan Pencapaian",
    desc: "Tampilkan pencapaian di profil publik",
  },
];

const SECURITY_ITEMS = [
  {
    key: "twoFactor",
    label: "Autentikasi Dua Faktor (2FA)",
    desc: "Tambahkan lapisan keamanan ekstra",
  },
  {
    key: "loginAlerts",
    label: "Peringatan Login",
    desc: "Notifikasi saat ada login dari perangkat baru",
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
    privacy,
    setPrivacy,
    security,
    setSecurity,
    t,
  } = useSettings();
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    await new Promise((r) => setTimeout(r, 500));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-6">
      <div>
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
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-[var(--primary-light)] rounded-xl flex items-center justify-center text-[var(--primary)]">
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
                className="grid grid-cols-1 sm:grid-cols-3 gap-2"
                role="radiogroup"
                aria-labelledby="theme-label"
              >
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    role="radio"
                    aria-checked={theme === t.id}
                    onClick={() => setTheme(t.id)}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      theme === t.id
                        ? "border-[#4F8EF7] bg-[var(--primary-light)]"
                        : "border-[var(--border)] hover:border-[#4F8EF7]/40"
                    }`}
                  >
                    <div className="text-xl mb-1">{t.icon}</div>
                    <p
                      className={`text-xs font-medium ${
                        theme === t.id
                          ? "text-[var(--primary)]"
                          : "text-[var(--text-muted)]"
                      }`}
                    >
                      {t.label}
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
                <option value="en">English</option>
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
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-[var(--warning-light)] rounded-xl flex items-center justify-center text-[#F4B400]">
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
                className="flex min-w-0 flex-wrap items-center justify-between gap-3 py-2 border-b border-[var(--border-light)] last:border-0"
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

        {/* Privacy */}
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-[var(--success-light)] rounded-xl flex items-center justify-center text-[#2ECC71]">
              <BookIcon size={18} />
            </div>
            <div>
              <h2 className="font-bold text-[var(--text)]">
                {t("settings.privacy")}
              </h2>
              <p className="text-xs text-[var(--text-subtle)]">
                {t("settings.privacy.desc")}
              </p>
            </div>
          </div>
          <div className="space-y-4">
            {PRIVACY_ITEMS.map((item) => (
              <div
                key={item.key}
                className="flex min-w-0 flex-wrap items-center justify-between gap-3 py-2 border-b border-[var(--border-light)] last:border-0"
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
                  checked={privacy[item.key]}
                  onChange={(v) => setPrivacy(item.key, v)}
                  ariaLabel={item.label}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Security */}
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-[var(--danger-light)] rounded-xl flex items-center justify-center text-[#E74C3C]">
              <ShieldIcon size={18} />
            </div>
            <div>
              <h2 className="font-bold text-[var(--text)]">
                {t("settings.security")}
              </h2>
              <p className="text-xs text-[var(--text-subtle)]">
                {t("settings.security.desc")}
              </p>
            </div>
          </div>
          <div className="space-y-4">
            {SECURITY_ITEMS.map((item) => (
              <div
                key={item.key}
                className="flex min-w-0 flex-wrap items-center justify-between gap-3 py-2 border-b border-[var(--border-light)] last:border-0"
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
                  checked={security[item.key]}
                  onChange={(v) => setSecurity(item.key, v)}
                  ariaLabel={item.label}
                />
              </div>
            ))}
          </div>
          <div className="mt-5 p-4 bg-[var(--surface-2)] rounded-xl">
            <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">
              Sesi Aktif
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text)]">Chrome · Windows</p>
                <p className="text-xs text-[var(--text-subtle)]">
                  Aktif sekarang · Jakarta, Indonesia
                </p>
              </div>
              <span className="text-xs bg-[var(--success-light)] text-[#2ECC71] px-2 py-0.5 rounded-full font-medium">
                Ini Anda
              </span>
            </div>
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
