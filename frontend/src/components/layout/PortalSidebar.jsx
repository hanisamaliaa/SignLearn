import { NavLink } from "react-router-dom";
import { LogoutIcon, ShieldIcon, XIcon } from "../ui/Icons";
import BrandLogo from "../common/BrandLogo";

export default function PortalSidebar({
  variant,
  currentUser,
  navItems,
  sidebarOpen,
  onClose,
  onLogout,
}) {
  const sections =
    variant === "admin"
      ? Array.from(
          new Set(
            navItems
              .map((item) => item.section)
              .filter((section) => Boolean(section)),
          ),
        )
      : [];

  const userLabel = variant === "admin" ? "Panel Administrator" : "Menu";

  const logoutClass =
    variant === "admin"
      ? "text-white/60 hover:bg-[var(--surface)]/10 hover:text-white"
      : "text-[#E74C3C] hover:bg-[var(--danger-light)]";

  return (
    <aside
      className={`fixed lg:relative z-30 flex flex-col h-full w-64 ${
        variant === "admin"
          ? "bg-[#1A2332]"
          : "bg-[var(--sidebar-bg)] border-r border-[var(--border)]"
      } transition-transform duration-300 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      <div
        className={`flex items-center justify-between h-16 px-5 border-b ${
          variant === "admin" ? "border-white/10" : "border-[var(--border)]"
        } flex-shrink-0`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <BrandLogo className={`portal-brand ${variant === "admin" ? "portal-brand-inverse" : ""}`} />
          {variant === "admin" && (
            <span className="portal-brand-badge">
              Admin
            </span>
          )}
        </div>
        <button
          className={
            variant === "admin"
              ? "lg:hidden text-white/60"
              : "lg:hidden text-[var(--text-muted)]"
          }
          onClick={onClose}
        >
          <XIcon size={18} />
        </button>
      </div>

      {variant === "admin" && (
        <div className="mx-4 mt-4 p-3 bg-[#4F8EF7]/10 rounded-xl border border-[#4F8EF7]/20">
          <div className="flex items-center gap-2">
            <ShieldIcon size={14} className="text-[var(--primary)]" />
            <span className="text-xs text-[var(--primary)] font-medium">
              Panel Administrator
            </span>
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {variant === "admin" ? (
          sections.map((section) => (
            <div className="mb-4" key={section}>
              <p className="px-2 text-xs font-semibold text-white/30 uppercase tracking-wider mb-2">
                {section}
              </p>
              {navItems
                .filter((item) => item.section === section)
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.page}
                      to={item.path}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-1 transition-all duration-150 ${
                          isActive
                            ? "bg-[#4F8EF7] text-white"
                            : "text-white/60 hover:bg-white/10 hover:text-white"
                        }`
                      }
                    >
                      <Icon size={17} />
                      {item.label}
                    </NavLink>
                  );
                })}
            </div>
          ))
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
          variant === "admin" ? "border-white/10" : "border-[var(--border)]"
        } flex-shrink-0`}
      >
        <div className="flex items-center gap-3 mb-3">
          {/* <div className="w-9 h-9 bg-[#4F8EF7] rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
            {avatarInitial}
          </div> */}
          <div className="min-w-0">
            <p
              className={`text-sm font-semibold truncate ${
                variant === "admin" ? "text-white" : "text-[var(--text)]"
              }`}
            >
              {currentUser?.name}
            </p>
            <p
              className={`text-xs truncate ${
                variant === "admin"
                  ? "text-white/40"
                  : "text-[var(--text-subtle)]"
              }`}
            >
              {currentUser?.email}
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${logoutClass}`}
        >
          <LogoutIcon size={16} />
          Keluar
        </button>
      </div>
    </aside>
  );
}
