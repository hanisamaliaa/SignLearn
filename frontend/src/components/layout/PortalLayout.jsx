import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useApp } from "../../context/app";
import { adminNavItems, userNavItems } from "../../config/navigation";
import PortalHeader from "./PortalHeader";
import PortalSidebar from "./PortalSidebar";

export default function PortalLayout({ variant }) {
  const { pathname } = useLocation();
  const { logout, currentUser } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const collapseStorageKey = `signlearn-sidebar-collapsed-${variant}`;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(collapseStorageKey) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        collapseStorageKey,
        sidebarCollapsed ? "1" : "0",
      );
    } catch {
      // ignore storage errors (e.g. private browsing)
    }
  }, [sidebarCollapsed, collapseStorageKey]);

  const navItems = (variant === "admin" ? adminNavItems : userNavItems).filter(
    (item) => !item.roles || item.roles.includes(currentUser?.role),
  );

  const title =
    navItems.find((item) => item.path === pathname)?.label ||
    (variant === "admin" ? "Admin Panel" : "SignLearn");
  const subtitle =
    variant === "admin"
      ? "SignLearn Administration"
      : "Platform Belajar BISINDO";

  return (
    <div
      className={`portal-shell flex h-screen ${
        variant === "admin" ? "admin-portal" : "bg-[var(--bg)]"
      } overflow-hidden`}
    >
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <PortalSidebar
        variant={variant}
        navItems={navItems}
        sidebarOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={logout}
        currentUser={currentUser}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <PortalHeader
          variant={variant}
          title={title}
          subtitle={subtitle}
          currentUser={currentUser}
          onOpenSidebar={() => setSidebarOpen(true)}
          onLogout={logout}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="p-5 sm:p-6 xl:p-8 max-w-[1500px] w-full mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
