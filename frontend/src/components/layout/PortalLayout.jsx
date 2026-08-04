import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useApp } from "../../context/app";
import { adminNavItems, userNavItems } from "../../config/navigation";
import PortalHeader from "./PortalHeader";
import PortalSidebar from "./PortalSidebar";

export default function PortalLayout({ variant }) {
  const { pathname } = useLocation();
  const { logout, currentUser } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      className={`flex h-screen ${
        variant === "admin" ? "bg-[var(--surface-2)]" : "bg-[var(--bg)]"
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
          <div className="p-6 max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
