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
import { SignLearnAvatar } from "../common/SignLearnAvatar";

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
          : "user-header"
      } flex items-center justify-between px-5 sm:px-6 xl:px-8 flex-shrink-0`}
    >
      <div className="flex items-center gap-3">
        <button
          className={`lg:hidden ${variant === "admin" ? "text-[var(--adm-text-muted)] hover:text-[var(--adm-text)]" : "text-[var(--text-muted)] hover:text-[var(--text)]"}`}
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
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <button onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }} className="user-header-icon" aria-label="Notifikasi">
              <BellIcon size={18} />
              <span className="user-header-notif-dot" />
            </button>
            {notifOpen && (
              <div className="user-header-dropdown absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl">
                <div className="border-b border-[var(--border)] px-4 py-3"><p className="text-sm font-semibold text-[var(--text)]">Notifikasi</p></div>
                {NOTIFICATIONS.map((item, index) => (
                  <div key={`${item.title}-${index}`} className={`border-b border-[var(--border-light)] px-4 py-3 last:border-0 ${item.unread ? "bg-[var(--surface-2)]" : ""}`}>
                    <div className="flex items-start gap-2">
                      {item.unread && <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#4F8EF7]" />}
                      <div className={item.unread ? "" : "ml-4"}>
                        <p className="text-sm font-medium text-[var(--text)]">{item.title}</p>
                        <p className="mt-0.5 text-xs text-[var(--text-muted)]">{item.body}</p>
                        <p className="mt-1 text-xs text-[var(--text-subtle)]">{item.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }} className="user-header-profile" aria-label="Menu profil">
              <SignLearnAvatar id={currentUser?.profile?.avatar} size="sm" />
              <span className="user-header-profile-name hidden sm:block">{firstName}</span>
              <ChevronDownIcon size={14} className="text-[var(--text-subtle)]" />
            </button>
            {profileOpen && (
              <div className="user-header-dropdown absolute right-0 top-12 z-50 w-48 overflow-hidden rounded-2xl">
                <button onClick={() => { navigate("/profile"); setProfileOpen(false); }} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"><UserIcon size={14} /> Profil</button>
                <button onClick={() => { navigate("/settings"); setProfileOpen(false); }} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"><SettingsIcon size={14} /> Pengaturan</button>
                <div className="border-t border-[var(--border)]" />
                <button onClick={onLogout} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-[#E74C3C] hover:bg-[var(--danger-light)]"><LogoutIcon size={14} /> Keluar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
