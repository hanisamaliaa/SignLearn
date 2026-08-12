import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useApp } from "../../context/app";

export default function ProtectedRoute({ allowedRoles, fallbackPath }) {
  const { currentUser, booting } = useApp();
  const location = useLocation();

  /**
   * Jangan memutuskan apa pun sebelum pemulihan sesi selesai.
   *
   * Access token hidup DI MEMORI dan hilang setiap kali halaman dimuat ulang;
   * yang bertahan adalah cookie refresh HttpOnly. `AppProvider` menukarnya
   * menjadi token baru saat aplikasi start, dan proses itu asinkron.
   *
   * Tanpa penjagaan ini, `currentUser` masih `null` pada render pertama —
   * sehingga menekan F5 di halaman mana pun langsung melempar pengguna yang
   * sudah masuk ke halaman login, tepat sebelum sesinya berhasil dipulihkan.
   */
  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)]">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-[#4F8EF7] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--text-muted)]">Memulihkan sesi…</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return (
      <Navigate
        to={
          fallbackPath ||
          (currentUser.role === "admin" ? "/admin/dashboard" : "/dashboard")
        }
        replace
      />
    );
  }

  return <Outlet />;
}
