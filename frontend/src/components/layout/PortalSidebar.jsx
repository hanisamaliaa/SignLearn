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
      {/* No X/close button here: desktop uses collapse, mobile closes after selecting a menu item. */}
      <div className={`user-sidebar-brand ${collapsed ? "lg:justify-center" : ""}`}>
        <BrandLogo
          className={`portal-brand ${collapsed ? "lg:[&_.kids-brand-wordmark]:hidden" : ""}`}
        />
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="user-sidebar-collapse hidden lg:grid"
            aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            aria-expanded={!collapsed}
            title={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
          >
            <ChevronRightIcon size={16} className={collapsed ? "" : "rotate-180"} />
          </button>
        )}
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
