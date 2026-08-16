import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BellIcon,
  ChevronDownIcon,
  LogoutIcon,
  SettingsIcon,
  UserIcon,
} from "../ui/Icons";
import { SignLearnAvatar, resolveAvatarId } from "../common/SignLearnAvatar";
import { useNotifications, timeAgo } from "../../features/notifications/useNotifications";

export default function PortalHeader({
  variant,
  sidebarOpen,
  title,
  subtitle,
  currentUser,
  onAccessibility,
  onLogout,
}) {
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifications = useNotifications();
  const [profileOpen, setProfileOpen] = useState(false);
  const userAvatar = resolveAvatarId(currentUser?.profile?.avatar);
  const firstName = currentUser?.name?.split(" ")[0] || "User";

  return (
    <header
      className={`h-20 ${
        !sidebarOpen ? "portal-header-sidebar-closed" : ""
      } ${
        variant === "admin"
          ? "admin-header"
          : "user-header"
      } flex items-center justify-between px-5 sm:px-6 xl:px-8 flex-shrink-0`}
    >
      <div className="flex items-center gap-3">
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

          <div className="relative">
            <button
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotifOpen(false);
              }}
              className="admin-profile-pill"
              aria-label="Menu profil admin"
            >
              <span className="admin-header-avatar" aria-hidden="true">A</span>
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
                const opening = !notifOpen;
                setNotifOpen(opening);
                setProfileOpen(false);
                if (opening) notifications.markAllSeen();
              }}
              className="relative w-11 h-11 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-3)] transition-colors"
              data-focus-secondary="true"
              aria-label={
                notifications.unreadCount
                  ? `Notifikasi, ${notifications.unreadCount} belum dibaca`
                  : "Notifikasi"
              }
            >
              <BellIcon size={18} />
              {/* Titik hanya muncul bila memang ada yang belum dibaca; versi
                  sebelumnya menampilkannya selamanya. */}
              {notifications.unreadCount > 0 && <span className="user-header-notif-dot" />}
            </button>
            {notifOpen && (
              <div className="user-header-dropdown absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl">
                <div className="border-b border-[var(--border)] px-4 py-3"><p className="text-sm font-semibold text-[var(--text)]">Notifikasi</p></div>
                {notifications.items.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                    Belum ada aktivitas. Mulai sebuah kursus untuk melihat kabarnya di sini.
                  </p>
                ) : (
                  notifications.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        navigate(item.to);
                      }}
                      className={`w-full border-b border-[var(--border-light)] px-4 py-3 text-left last:border-0 transition-colors hover:bg-[var(--surface-3)] ${item.unread ? "bg-[var(--surface-2)]" : ""}`}
                    >
                      <div className="flex items-start gap-2">
                        {item.unread && <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#4F8EF7]" />}
                        <div className={item.unread ? "" : "ml-4"}>
                          <p className="text-sm font-medium text-[var(--text)]">{item.title}</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">{item.body}</p>
                          <p className="mt-1 text-xs text-[var(--text-subtle)]">{timeAgo(item.at)}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
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
              <SignLearnAvatar id={userAvatar} size="sm" className="border border-white" />
              <span className="text-sm font-medium text-[var(--text)] hidden sm:block">
                {firstName}
              </span>
              <ChevronDownIcon
                size={14}
                className="text-[var(--text-subtle)]"
              />
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
