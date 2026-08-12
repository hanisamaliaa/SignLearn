import { NavLink } from "react-router-dom";
import { LogoutIcon, XIcon } from "../ui/Icons";
import BrandLogo from "../common/BrandLogo";

export default function PortalSidebar({
  variant,
  currentUser,
  navItems,
  sidebarOpen,
  onClose,
  onLogout,
}) {
  const userLabel = "Menu";

  const logoutClass =
    variant === "admin"
      ? "text-[#E94F55] hover:bg-[#FFF0F1] hover:text-[#C83D45]"
      : "text-[#E74C3C] hover:bg-[var(--danger-light)]";

  return (
    <aside
      className={`fixed lg:relative z-30 flex flex-col h-full w-64 ${
        variant === "admin"
          ? "bg-white border-r border-[#E7EEF6]"
          : "bg-[var(--sidebar-bg)] border-r border-[var(--border)]"
      } transition-transform duration-300 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      <div
        className={`flex items-center justify-between h-16 px-5 border-b ${
          variant === "admin" ? "border-[#E7EEF6]" : "border-[var(--border)]"
        } flex-shrink-0`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <BrandLogo className="portal-brand" />
        </div>
        <button
          className={
            variant === "admin"
              ? "lg:hidden text-[#53636F]"
              : "lg:hidden text-[var(--text-muted)]"
          }
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
                  className={({ isActive }) =>
                    `w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-bold transition-all duration-200 ${
                      isActive
                        ? "bg-[#FFD166] text-[#26384D] shadow-[0_8px_18px_rgba(255,209,102,0.24)]"
                        : "text-[#53636F] hover:bg-[#F2F8FF] hover:text-[#1677C8]"
                    }`
                  }
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
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
          variant === "admin" ? "border-[#E7EEF6]" : "border-[var(--border)]"
        } flex-shrink-0`}
      >
        <div className="flex items-center gap-3 mb-3">
          {/* <div className="w-9 h-9 bg-[#4F8EF7] rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
            {avatarInitial}
          </div> */}
          <div className="min-w-0">
            <p
              className={`text-sm font-semibold truncate ${
                variant === "admin" ? "text-[#15202B]" : "text-[var(--text)]"
              }`}
            >
              {currentUser?.name}
            </p>
            <p
              className={`text-xs truncate ${
                variant === "admin"
                  ? "text-[#8B9AAA]"
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
