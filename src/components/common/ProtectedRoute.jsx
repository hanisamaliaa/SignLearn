import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useApp } from "../../context/app";

export default function ProtectedRoute({ allowedRoles, fallbackPath }) {
  const { currentUser } = useApp();
  const location = useLocation();

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
