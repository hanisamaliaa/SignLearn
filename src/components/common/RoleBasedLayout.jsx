import { Navigate, Outlet } from "react-router-dom";
import { useApp } from "../../context/app";

export default function RoleBasedLayout({ allowedRoles, fallbackPath }) {
  const { currentUser } = useApp();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(currentUser.role)) {
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
