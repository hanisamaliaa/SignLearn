import { createContext, useCallback, useContext, useMemo } from "react";
import { useApp } from "./app";

// "id" adalah satu-satunya bahasa yang didukung.
const DEFAULT_SETTINGS = {
  language: "id",
  notifications: {
    quizReminder: true,
    streakReminder: true,
    newContent: true,
    weeklyReport: false,
    email: true,
  },
  privacy: {
    showProgress: true,
    showAchievements: true,
  },
  security: {
    twoFactor: false,
    loginAlerts: true,
  },
};

// Bahasa Indonesia adalah satu-satunya bahasa yang didukung aplikasi ini.
// (Pilihan "en" sebelumnya dihapus karena terjemahannya belum lengkap dan
// tampil campur-campur di UI.)
const MESSAGES = {
  id: {
    "settings.title": "Pengaturan",
    "settings.subtitle": "Sesuaikan aplikasi sesuai preferensi Anda",
    "settings.saved": "Pengaturan berhasil disimpan!",
    "settings.appearance": "Tampilan",
    "settings.appearance.desc": "Tema dan bahasa antarmuka",
    "settings.theme": "Tema",
    "settings.theme.light": "Terang",
    "settings.theme.dark": "Gelap",
    "settings.theme.system": "Sistem",
    "settings.language": "Bahasa",
    "settings.fontSize": "Ukuran Font",
    "settings.fontSize.small": "Kecil",
    "settings.fontSize.large": "Besar",
    "settings.notifications": "Notifikasi",
    "settings.notifications.desc": "Kelola preferensi notifikasi Anda",
    "settings.privacy": "Privasi",
    "settings.privacy.desc": "Kontrol informasi yang Anda bagikan",
    "settings.security": "Keamanan Akun",
    "settings.security.desc": "Lindungi akun Anda",
    "settings.save": "Simpan Semua Pengaturan",
  },
};

function sanitizeSettings(raw) {
  if (!raw || typeof raw !== "object") return DEFAULT_SETTINGS;
  return {
    language: "id",
    notifications: {
      ...DEFAULT_SETTINGS.notifications,
      ...raw.notifications,
    },
    privacy: {
      ...DEFAULT_SETTINGS.privacy,
      ...raw.privacy,
    },
    security: {
      ...DEFAULT_SETTINGS.security,
      ...raw.security,
    },
  };
}

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const { currentUser, updateUserSettings } = useApp();

  // Per-user settings from the current user object.
  const settings = sanitizeSettings(currentUser?.settings);

  const persist = useCallback(
    (next) => {
      updateUserSettings({ ...currentUser?.settings, ...next });
    },
    [currentUser, updateUserSettings],
  );

  const setLanguage = useCallback(() => {
    // Hanya "id" yang didukung; dipertahankan agar pemanggil lama tidak error.
    persist({ language: "id" });
  }, [persist]);

  const setNotification = useCallback(
    (key, value) => {
      persist({
        notifications: { ...settings.notifications, [key]: Boolean(value) },
      });
    },
    [persist, settings.notifications],
  );

  const setPrivacy = useCallback(
    (key, value) => {
      persist({
        privacy: { ...settings.privacy, [key]: Boolean(value) },
      });
    },
    [persist, settings.privacy],
  );

  const setSecurity = useCallback(
    (key, value) => {
      persist({
        security: { ...settings.security, [key]: Boolean(value) },
      });
    },
    [persist, settings.security],
  );

  const resetSettings = useCallback(() => {
    persist(DEFAULT_SETTINGS);
  }, [persist]);

  const t = useCallback(
    (key) => MESSAGES[settings.language]?.[key] ?? key,
    [settings.language],
  );

  const value = useMemo(
    () => ({
      language: settings.language,
      notifications: settings.notifications,
      privacy: settings.privacy,
      security: settings.security,
      setLanguage,
      setNotification,
      setPrivacy,
      setSecurity,
      resetSettings,
      t,
    }),
    [
      settings,
      setLanguage,
      setNotification,
      setPrivacy,
      setSecurity,
      resetSettings,
      t,
    ],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
