import { NavLink } from "react-router-dom";
import { ChevronRightIcon, LogoutIcon, XIcon } from "../ui/Icons";
import BrandLogo from "../common/BrandLogo";

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
  const userLabel = "Menu";

  const logoutClass =
    variant === "admin"
      ? "admin-logout-link"
      : "text-[#E74C3C] hover:bg-[var(--danger-light)]";

  return (
    <aside
      data-collapsed={collapsed ? "true" : "false"}
      className={`fixed lg:relative z-30 flex flex-col h-full w-64 ${
        collapsed ? "lg:w-20" : ""
      } ${
        variant === "admin"
          ? "admin-sidebar"
          : "bg-[var(--sidebar-bg)] border-r border-[var(--border)]"
      } transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
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
          className={`${
            variant === "admin"
              ? "lg:hidden text-[var(--adm-text-muted)]"
              : "lg:hidden text-[var(--text-muted)]"
          } ${collapsed ? "lg:hidden" : ""}`}
          onClick={onClose}
        >
          <XIcon size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {variant === "admin" ? (
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
                    `admin-nav-link w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-bold transition-all duration-200 ${
                      collapsed ? "lg:justify-center lg:px-0" : ""
                    } ${isActive ? "is-active" : ""}`
                  }
                >
                  <Icon size={18} className="flex-shrink-0" />
                  <span className={collapsed ? "lg:hidden" : ""}>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ) : (
          <>
            <p className="px-2 text-xs font-semibold text-[var(--text-subtle)] uppercase tracking-wider mb-3">
              {userLabel}
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.page}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-1 transition-all duration-150 ${
                      isActive
                        ? "bg-[var(--primary-light)] text-[var(--primary)]"
                        : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={18} />
                      {item.label}
                      {isActive && (
                        <div className="ml-auto w-1.5 h-1.5 bg-[#4F8EF7] rounded-full" />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </>
        )}
      </nav>

      <div
        className={`p-4 border-t ${
          variant === "admin" ? "admin-sidebar-border" : "border-[var(--border)]"
        } flex-shrink-0`}
      >
        <div className={`flex items-center gap-3 mb-3 ${collapsed ? "lg:hidden" : ""}`}>
          <div className="min-w-0">
            <p
              className={`text-sm font-semibold truncate ${
                variant === "admin" ? "admin-sidebar-name" : "text-[var(--text)]"
              }`}
            >
              {currentUser?.name}
            </p>
            <p
              className={`text-xs truncate ${
                variant === "admin"
                  ? "admin-sidebar-email"
                  : "text-[var(--text-subtle)]"
              }`}
            >
              {currentUser?.email}
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          title={collapsed ? "Keluar" : undefined}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${logoutClass} ${
            collapsed ? "lg:justify-center lg:px-0" : ""
          }`}
        >
          <LogoutIcon size={16} className="flex-shrink-0" />
          <span className={collapsed ? "lg:hidden" : ""}>Keluar</span>
        </button>
      </div>
    </aside>
  );
}
