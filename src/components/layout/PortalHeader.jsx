import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BellIcon,
  ChevronDownIcon,
  LogoutIcon,
  MenuIcon,
  SettingsIcon,
  UserIcon,
} from "../ui/Icons";

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

  const userInitial =
    currentUser?.profile?.avatar ||
    currentUser?.name?.slice(0, 2).toUpperCase() ||
    (variant === "admin" ? "A" : "U");
  const firstName = currentUser?.name?.split(" ")[0] || "User";

  return (
    <header
      className={`h-16 bg-[var(--header-bg)] border-b border-[var(--border)] flex items-center justify-between px-6 flex-shrink-0`}
    >
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden text-[var(--text-muted)] hover:text-[var(--text)]"
          onClick={onOpenSidebar}
        >
          <MenuIcon size={20} />
        </button>
        <div>
          <h1 className="text-base font-semibold text-[var(--text)]">
            {title}
          </h1>
          <p className="text-xs text-[var(--text-subtle)]">{subtitle}</p>
        </div>
      </div>

      {variant === "admin" ? (
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-[var(--surface-3)] px-3 py-1.5 rounded-xl">
            <div className="w-2 h-2 bg-[#2ECC71] rounded-full" />
            <span className="text-xs text-[var(--text-muted)] font-medium">
              Sistem Aktif
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#4F8EF7] rounded-full flex items-center justify-center text-white text-xs font-semibold">
              {userInitial}
            </div>
            <span className="text-sm font-medium text-[var(--text)] hidden sm:block">
              {firstName}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => {
                setNotifOpen(!notifOpen);
                setProfileOpen(false);
              }}
              className="relative w-9 h-9 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-3)] transition-colors"
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
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-[var(--surface-3)] transition-colors"
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
