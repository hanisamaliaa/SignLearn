import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BellIcon,
  ChevronDownIcon,
  LogoutIcon,
  MenuIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
  UserIcon,
} from "../ui/Icons";
import { useTheme } from "../../context/ThemeContext";

const NOTIFICATIONS = [
  {
    title: "Kuis berhasil!",
    body: 'Anda lulus kuis "Huruf A-F" dengan skor 90.',
    time: "2 jam lalu",
    unread: true,
  },
  {
    title: "Pelajaran baru tersedia",
    body: '"Mengeja Kata Pendek" sudah bisa dimulai.',
    time: "1 hari lalu",
    unread: true,
  },
  {
    title: "Streak 7 hari!",
    body: "Selamat! Anda belajar 7 hari berturut-turut.",
    time: "3 hari lalu",
    unread: false,
  },
];

export default function PortalHeader({
  variant,
  title,
  subtitle,
  currentUser,
  onOpenSidebar,
  onAccessibility,
  onLogout,
}) {
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const userInitial =
    currentUser?.profile?.avatar ||
    currentUser?.name?.slice(0, 2).toUpperCase() ||
    (variant === "admin" ? "A" : "U");
  const firstName = currentUser?.name?.split(" ")[0] || "User";

  return (
    <header
      className={`h-20 ${
        variant === "admin"
          ? "admin-header"
          : "bg-[var(--header-bg)] border-b border-[var(--border)]"
      } flex items-center justify-between px-5 sm:px-6 xl:px-8 flex-shrink-0`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Buka menu samping"
          className={`lg:hidden w-11 h-11 flex items-center justify-center rounded-xl ${variant === "admin" ? "text-[var(--adm-text-muted)] hover:text-[var(--adm-text)] hover:bg-[var(--adm-surface-alt)]" : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)]"}`}
          onClick={onOpenSidebar}
        >
          <MenuIcon size={20} />
        </button>
        <div>
          <h1 className={`text-base font-extrabold ${variant === "admin" ? "admin-header-title" : "text-[var(--text)]"}`}>
            {title}
          </h1>
          <p className={`text-xs ${variant === "admin" ? "text-[var(--adm-text-subtle)]" : "text-[var(--text-subtle)]"}`}>{subtitle}</p>
        </div>
      </div>

      {variant === "admin" ? (
        <div className="flex items-center gap-3">
          <div className="admin-system-status hidden md:inline-flex" aria-label="Status sistem">
            <span className="admin-system-dot" />
            <span>Sistem aktif</span>
          </div>

          <button
            type="button"
            onClick={onAccessibility}
            className="admin-a11y-button"
            aria-label="Buka pengaturan aksesibilitas"
          >
            <SettingsIcon size={18} />
          </button>

          <button
            type="button"
            role="switch"
            aria-checked={isDark}
            aria-label={isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="admin-theme-toggle"
          >
            <span className="admin-theme-toggle-thumb">
              {isDark ? <MoonIcon size={14} /> : <SunIcon size={14} />}
            </span>
          </button>

          <div className="relative">
            <button
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotifOpen(false);
              }}
              className="admin-profile-pill"
              aria-label="Menu profil admin"
            >
              <span className="admin-header-avatar">{userInitial}</span>
              <span className="admin-profile-name text-sm font-extrabold hidden sm:block">
                {firstName}
              </span>
              <ChevronDownIcon size={14} className="text-[var(--adm-text-subtle)]" />
            </button>

            {profileOpen && (
              <div className="admin-dropdown absolute right-0 top-12 w-48 rounded-2xl z-50 overflow-hidden">
                <button
                  onClick={() => {
                    navigate("/admin/settings");
                    setProfileOpen(false);
                  }}
                  className="admin-dropdown-item w-full text-left px-4 py-3 text-sm font-bold flex items-center gap-2"
                >
                  <SettingsIcon size={15} /> Pengaturan
                </button>
                <div className="admin-dropdown-divider border-t" />
                <button
                  onClick={onLogout}
                  className="admin-dropdown-danger w-full text-left px-4 py-3 text-sm font-bold flex items-center gap-2"
                >
                  <LogoutIcon size={15} /> Keluar
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAccessibility}
            className="w-11 h-11 flex items-center justify-center rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-3)] transition-colors"
            aria-label="Buka pengaturan aksesibilitas"
          >
            <SettingsIcon size={18} />
          </button>
          <div className="relative">
            <button
              onClick={() => {
                setNotifOpen(!notifOpen);
                setProfileOpen(false);
              }}
              className="relative w-11 h-11 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-3)] transition-colors"
              data-focus-secondary="true"
              aria-label="Notifikasi"
            >
              <BellIcon size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E74C3C] rounded-full" />
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-11 w-80 bg-[var(--surface)] rounded-2xl shadow-lg border border-[var(--border)] z-50 animate-fade-in overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--border)]">
                  <p className="font-semibold text-sm text-[var(--text)]">
                    Notifikasi
                  </p>
                </div>
                {NOTIFICATIONS.map((item, index) => (
                  <div
                    key={`${item.title}-${index}`}
                    className={`px-4 py-3 border-b border-[var(--border-light)] last:border-0 ${item.unread ? "bg-[var(--surface-2)]" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      {item.unread && (
                        <div className="w-2 h-2 bg-[#4F8EF7] rounded-full mt-1 flex-shrink-0" />
                      )}
                      <div className={item.unread ? "" : "ml-4"}>
                        <p className="text-sm font-medium text-[var(--text)]">
                          {item.title}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          {item.body}
                        </p>
                        <p className="text-xs text-[var(--text-subtle)] mt-1">
                          {item.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotifOpen(false);
              }}
              className="min-h-11 flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-[var(--surface-3)] transition-colors"
              aria-label="Menu profil"
            >
              <div className="w-7 h-7 bg-[#4F8EF7] rounded-full flex items-center justify-center text-white text-xs font-semibold">
                {userInitial}
              </div>
              <span className="text-sm font-medium text-[var(--text)] hidden sm:block">
                {firstName}
              </span>
              <ChevronDownIcon
                size={14}
                className="text-[var(--text-subtle)]"
              />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-11 w-48 bg-[var(--surface)] rounded-2xl shadow-lg border border-[var(--border)] z-50 animate-fade-in overflow-hidden">
                <button
                  onClick={() => {
                    navigate("/profile");
                    setProfileOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--surface-2)] flex items-center gap-2"
                >
                  <UserIcon size={14} /> Profil
                </button>
                <button
                  onClick={() => {
                    navigate("/settings");
                    setProfileOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--surface-2)] flex items-center gap-2"
                >
                  <SettingsIcon size={14} /> Pengaturan
                </button>
                <div className="border-t border-[var(--border)]" />
                <button
                  onClick={onLogout}
                  className="w-full text-left px-4 py-2.5 text-sm text-[#E74C3C] hover:bg-[var(--danger-light)] flex items-center gap-2"
                >
                  <LogoutIcon size={14} /> Keluar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
