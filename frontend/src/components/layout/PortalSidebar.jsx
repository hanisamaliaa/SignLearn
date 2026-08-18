import { NavLink } from "react-router-dom";
import { LogoutIcon, MenuIcon } from "../ui/Icons";
import BrandLogo from "../common/BrandLogo";
import SignLearnAvatar from "../common/SignLearnAvatar";

export default function PortalSidebar({
  variant,
  currentUser,
  navItems,
  navSections,
  sidebarOpen,
  onClose,
  onToggleSidebar,
  onLogout,
  isPremium,
  subscriptionLoading,
}) {
  const isAdmin = variant === "admin";
  const isUser = variant === "user";

  return (
    <aside
      data-tour-target="sidebar"
      className={`portal-sidebar ${isAdmin ? "admin-sidebar" : "user-sidebar"} fixed lg:relative z-30 flex h-full w-72 flex-col transition-[width,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        sidebarOpen
          ? "translate-x-0 user-sidebar-desktop-open lg:w-72 lg:min-w-0 lg:overflow-visible"
          : "-translate-x-full lg:translate-x-0 user-sidebar-desktop-closed lg:w-0 lg:min-w-0 lg:overflow-hidden"
      }`}
    >
      <div
        className={`flex items-center h-16 px-5 border-b justify-between ${
          variant === "admin" ? "admin-sidebar-border" : "border-[var(--border)]"
        } flex-shrink-0`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <BrandLogo
            className="portal-brand"
            to={isAdmin ? "/admin/dashboard" : "/dashboard"}
            ariaLabel={`SignLearn Kids, buka dashboard ${isAdmin ? "admin" : "pengguna"}`}
            onClick={() => {
              if (typeof window !== "undefined" && window.innerWidth < 1024) onClose();
            }}
          />
        </div>
        <button
          type="button"
          aria-label="Sembunyikan sidebar"
          aria-expanded="true"
          className={`${isAdmin ? "admin-sidebar-menu-button text-[var(--adm-text-muted)] hover:text-[var(--adm-text)] hover:bg-[var(--adm-surface-alt)]" : "user-sidebar-menu-button"} min-w-11 min-h-11 flex items-center justify-center rounded-xl transition-colors`}
          onClick={onToggleSidebar}
        >
          <MenuIcon size={20} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Navigasi utama">
        {isUser && navSections ? (
          <div className="space-y-5">
            {navSections
              .filter(
                (section) =>
                  !section.items ||
                  section.items.some(
                    (item) => !item.roles || item.roles.includes(currentUser?.role),
                  ),
              )
              .map((section) => (
                <div key={section.label}>
                  <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-subtle)] select-none">
                    {section.label}
                  </p>
                  <div className="space-y-0.5">
                    {section.items
                      .filter(
                        (item) => !item.roles || item.roles.includes(currentUser?.role),
                      )
                      .map((item) => {
                        const Icon = item.icon;
                        const isPremiumItem = item.premiumEntry;
                        const tourTarget =
                          item.label === "Kursus" || item.label === "Progress Belajar"
                            ? "nav-course-progress"
                            : item.label === "Penerjemah" || item.label === "Kamus BISINDO"
                              ? "nav-tools"
                              : item.label === "Jadi Premium"
                                ? "nav-premium"
                                : item.label === "Profil" || item.label === "Pengaturan"
                                  ? "nav-account"
                                  : undefined;
                        return (
                          <NavLink
                            key={item.page}
                            data-tour-target={tourTarget}
                            to={item.path}
                            onClick={() => {
                              if (typeof window !== "undefined" && window.innerWidth < 1024) {
                                onClose();
                              }
                            }}
                            className={({ isActive }) =>
                              `user-nav-link flex w-full items-center gap-3 px-3 py-2.5 text-sm font-bold transition-all duration-200 ${
                                isActive ? "is-active" : ""
                              } ${isPremiumItem ? "user-nav-premium" : ""}`
                            }
                          >
                            <Icon size={18} className="shrink-0 user-nav-icon" />
                            <span className="user-nav-label">{item.label}</span>
                            {isPremiumItem && isPremium && (
                              <span className="user-nav-premium-badge" aria-label="Premium aktif">AKTIF</span>
                            )}
                            {isPremiumItem && !isPremium && (
                              <span className="user-nav-premium-sparkle" aria-hidden="true">✦</span>
                            )}
                          </NavLink>
                        );
                      })}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.page}
                  to={item.path}
                  onClick={() => {
                    if (typeof window !== "undefined" && window.innerWidth < 1024) {
                      onClose();
                    }
                  }}
                  className={({ isActive }) =>
                    `user-nav-link flex w-full items-center gap-3 px-3 py-3 text-sm font-bold transition-all duration-200 ${isActive ? "is-active" : ""}`
                  }
                >
                  <Icon size={18} className="shrink-0 user-nav-icon" />
                  <span className="user-nav-label">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        )}
      </nav>

      <div className="user-sidebar-footer shrink-0">
        <div
          className="user-sidebar-profile"
          aria-label="Profil pengguna"
        >
          {isAdmin ? (
            <span className="admin-header-avatar" aria-hidden="true">A</span>
          ) : (
            <SignLearnAvatar id={currentUser?.avatar || "luna"} size="md" />
          )}
          <div className="min-w-0">
            <p className="user-sidebar-profile-name truncate">{currentUser?.name || "Pengguna"}</p>
            {!isAdmin && !subscriptionLoading && (
              <span className={`user-sidebar-plan-badge ${isPremium ? "is-premium" : "is-free"}`}>
                {isPremium ? "⭐ Premium" : "Paket Gratis"}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-[14px] px-3 py-3 text-sm font-extrabold transition-colors user-sidebar-logout"
        >
          <LogoutIcon size={17} className="shrink-0" />
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}
