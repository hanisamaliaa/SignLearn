import { NavLink } from "react-router-dom";
import { ChevronRightIcon, LogoutIcon } from "../ui/Icons";
import BrandLogo from "../common/BrandLogo";
import { SignLearnAvatar } from "../common/SignLearnAvatar";

export default function PortalSidebar({
  variant,
  currentUser,
  navItems,
  sidebarOpen,
  onClose,
  onLogout,
  collapsed = false,
  onToggleCollapse,
}) {
  const isAdmin = variant === "admin";
  const logoutClass = isAdmin ? "admin-logout-link" : "user-sidebar-logout";

  return (
    <aside
      data-collapsed={collapsed ? "true" : "false"}
      className={`portal-sidebar fixed lg:relative z-30 flex h-full w-72 flex-col ${
        collapsed ? "lg:w-[84px]" : ""
      } ${isAdmin ? "admin-sidebar" : "user-sidebar"} transition-[width,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      {variant === "admin" && onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="admin-sidebar-collapse-btn hidden lg:grid"
          aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
          aria-expanded={!collapsed}
        >
          <ChevronRightIcon
            size={13}
            className={`transition-transform duration-300 ${collapsed ? "" : "rotate-180"}`}
          />
        </button>
      )}

      <div
        className={`flex items-center h-16 px-5 border-b ${
          collapsed ? "lg:justify-center lg:px-2" : "justify-between"
        } ${
          variant === "admin" ? "admin-sidebar-border" : "border-[var(--border)]"
        } flex-shrink-0`}
      >
        <div className={`flex min-w-0 items-center gap-2 ${collapsed ? "lg:justify-center" : ""}`}>
          <BrandLogo className="portal-brand" />
        </div>
        <button
          type="button"
          aria-label="Tutup menu samping"
          className={`min-w-11 min-h-11 flex items-center justify-center rounded-xl ${
            variant === "admin"
              ? "lg:hidden text-[var(--adm-text-muted)]"
              : "lg:hidden text-[var(--text-muted)]"
          } ${collapsed ? "lg:hidden" : ""}`}
          onClick={onClose}
        >
          <XIcon size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Navigasi utama">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.page}
                to={item.path}
                onClick={onClose}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `user-nav-link flex w-full items-center gap-3 px-3 py-3 text-sm font-bold transition-all duration-200 ${
                    collapsed ? "lg:justify-center lg:px-0" : ""
                  } ${isActive ? "is-active" : ""}`
                }
              >
                <Icon size={18} className="shrink-0" />
                <span className={collapsed ? "lg:hidden" : ""}>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      <div className="user-sidebar-footer shrink-0">
        <div
          className={`user-sidebar-profile ${collapsed ? "lg:justify-center lg:px-0" : ""}`}
          aria-label="Profil pengguna"
        >
          <SignLearnAvatar id={currentUser?.profile?.avatar} size="md" />
          <div className={`min-w-0 ${collapsed ? "lg:hidden" : ""}`}>
            <p className="user-sidebar-profile-name truncate">{currentUser?.name || "Pengguna"}</p>
            <p className="user-sidebar-profile-email truncate">{currentUser?.email || ""}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          title={collapsed ? "Keluar" : undefined}
          className={`flex w-full items-center gap-2.5 rounded-[14px] px-3 py-3 text-sm font-extrabold transition-colors user-sidebar-logout ${
            collapsed ? "lg:justify-center lg:px-0" : ""
          }`}
        >
          <LogoutIcon size={17} className="shrink-0" />
          <span className={collapsed ? "lg:hidden" : ""}>Keluar</span>
        </button>
      </div>
    </aside>
  );
}
