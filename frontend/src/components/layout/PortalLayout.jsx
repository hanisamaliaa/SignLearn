import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useApp } from "../../context/app";
import { adminNavItems, userNavItems, userNavSections } from "../../config/navigation";
import PortalHeader from "./PortalHeader";
import PortalSidebar from "./PortalSidebar";
import AccessibilityMenu from "../landing/AccessibilityMenu";
import { MenuIcon } from "../ui/Icons";

const DESKTOP_QUERY = "(min-width: 1024px)";
const USER_SIDEBAR_VISIBILITY_KEY = "signlearn-user-sidebar-visible";
const ADMIN_SIDEBAR_VISIBILITY_KEY = "signlearn-admin-sidebar-visible";

function readStoredSidebarVisibility(key) {
  if (typeof window === "undefined") return true;
  try {
    const stored = window.localStorage.getItem(key);
    return stored === null ? true : stored === "1";
  } catch {
    return true;
  }
}

export default function PortalLayout({ variant }) {
  const { pathname } = useLocation();
  const { logout, currentUser, isPremium } = useApp();
  const isUserPortal = variant === "user";
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(DESKTOP_QUERY).matches : false,
  );
  const sidebarVisibilityKey = isUserPortal
    ? USER_SIDEBAR_VISIBILITY_KEY
    : ADMIN_SIDEBAR_VISIBILITY_KEY;

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    const desktop = window.matchMedia(DESKTOP_QUERY).matches;
    return desktop && readStoredSidebarVisibility(sidebarVisibilityKey);
  });
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const previousDesktopRef = useRef(isDesktop);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mediaQuery = window.matchMedia(DESKTOP_QUERY);
    const handleChange = (event) => {
      const nextIsDesktop = event.matches;
      setIsDesktop(nextIsDesktop);
      if (nextIsDesktop && !previousDesktopRef.current) {
        setSidebarOpen(readStoredSidebarVisibility(sidebarVisibilityKey));
      } else if (!nextIsDesktop) {
        setSidebarOpen(false);
      }
      previousDesktopRef.current = nextIsDesktop;
    };
    mediaQuery.addEventListener?.("change", handleChange);
    return () => mediaQuery.removeEventListener?.("change", handleChange);
  }, [sidebarVisibilityKey]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((current) => {
      const next = !current;
      if (isDesktop && typeof window !== "undefined") {
        try {
          window.localStorage.setItem(sidebarVisibilityKey, next ? "1" : "0");
        } catch {
          // ignore storage errors
        }
      }
      return next;
    });
  }, [isDesktop, sidebarVisibilityKey]);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const handleLogout = useCallback(async () => {
    setSidebarOpen(false);
    setAccessibilityOpen(false);
    await logout();
  }, [logout]);

  useEffect(() => {
    if (!sidebarOpen || isDesktop || typeof document === "undefined") return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [sidebarOpen, isDesktop]);

  const navItems = (variant === "admin" ? adminNavItems : userNavItems)
    .filter((item) => !item.roles || item.roles.includes(currentUser?.role))
    .map((item)=>item.premiumEntry&&isPremium?{...item,label:"⭐ Premium",path:"/subscription"}:item);
  const title =
    navItems.find((item) => item.path === pathname)?.label ||
    (variant === "admin" ? "Admin Panel" : "SignLearn");
  const subtitle =
    variant === "admin" ? "SignLearn Administration" : "Platform Belajar BISINDO";

  return (
    <div
      className={`portal-shell relative flex h-screen ${
        variant === "admin" ? "admin-portal" : "bg-[var(--bg)]"
      } overflow-hidden`}
    >
      {sidebarOpen && !isDesktop && (
        <button
          type="button"
          aria-label="Tutup menu samping"
          className="fixed inset-0 z-20 bg-black/30 backdrop-blur-[1px] lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <PortalSidebar
        variant={variant}
        navItems={navItems}
        navSections={variant === "user" ? userNavSections : undefined}
        sidebarOpen={sidebarOpen}
        onClose={closeSidebar}
        onToggleSidebar={toggleSidebar}
        onLogout={handleLogout}
        currentUser={currentUser}
      />

      {!sidebarOpen && (
        <button
          type="button"
          aria-label="Tampilkan sidebar"
          aria-expanded="false"
          className={`${variant === "admin" ? "admin-sidebar-reopen" : "user-sidebar-reopen"} fixed left-3 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-xl border shadow-[var(--adm-shadow-sm)] transition-colors`}
          onClick={toggleSidebar}
        >
          <MenuIcon size={20} />
        </button>
      )}

      <div
        className={`portal-main-shell ${isUserPortal ? "portal-main-shell-user" : "portal-main-shell-admin"} flex-1 flex flex-col min-w-0 overflow-hidden ${
          sidebarOpen ? "portal-main-shell-sidebar-open" : "portal-main-shell-sidebar-closed"
        }`}
      >
        <PortalHeader
          variant={variant}
          sidebarOpen={sidebarOpen}
          title={title}
          subtitle={subtitle}
          currentUser={currentUser}
          onAccessibility={() => setAccessibilityOpen(true)}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-y-auto" data-route-scroll-container>
          <div className="portal-route-content min-w-0 p-4 sm:p-6 xl:p-8 max-w-[1500px] w-full mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      <AccessibilityMenu open={accessibilityOpen} onClose={() => setAccessibilityOpen(false)} />
    </div>
  );
}
