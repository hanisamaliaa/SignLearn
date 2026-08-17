import { Navigate, Route, Routes } from "react-router-dom";
import { useApp } from "../context/app";
import PortalLayout from "../components/layout/PortalLayout";
import ProtectedRoute from "../components/common/ProtectedRoute";
import RoleBasedLayout from "../components/common/RoleBasedLayout";
import Landing from "../pages/Landing";
import Login from "../pages/Login";
import Register from "../pages/Register";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";
import ParentGuide from "../pages/ParentGuide";
import AboutBisindo from "../pages/AboutBisindo";
import PrivacyPolicy from "../pages/PrivacyPolicy";
import UserDashboard from "../pages/user/Dashboard";
import UserCourses from "../pages/user/Courses";
import CourseDetail from "../pages/user/CourseDetail";
import Lesson from "../pages/user/Lesson";
import Quiz from "../pages/user/Quiz";
import QuizResult from "../pages/user/QuizResult";
import Progress from "../pages/user/Progress";
import Profile from "../pages/user/Profile";
import UserSettings from "../pages/user/Settings";
import AdminDashboard from "../pages/admin/Dashboard";
import AdminUsers from "../pages/admin/Users";
import AdminCourses from "../pages/admin/Courses";
import AdminLessons from "../pages/admin/Lessons";
import AdminQuizzes from "../pages/admin/Quizzes";
import AdminReports from "../pages/admin/Reports";
import AdminSettings from "../pages/admin/AdminSettings";
import AdminTranslations from "../pages/admin/Translations";
import Premium from "../pages/user/Premium";
import PremiumCheckout from "../pages/user/PremiumCheckout";
import PaymentResult from "../pages/user/PaymentResult";
import Subscription from "../pages/user/Subscription";

export default function AppRoutes() {
  const { currentUser } = useApp();
  const userFallback =
    currentUser?.role === "admin" ? "/admin/dashboard" : "/login";
  const adminFallback = currentUser?.role === "user" ? "/dashboard" : "/login";

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/parent-guide" element={<ParentGuide />} />
      <Route path="/about-bisindo" element={<AboutBisindo />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />

      {/* User routes (protected, layout) */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["user"]} fallbackPath={userFallback} />
        }
      >
        <Route
          element={
            <RoleBasedLayout
              allowedRoles={["user"]}
              fallbackPath={userFallback}
            />
          }
        >
          <Route element={<PortalLayout variant="user" />}>
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/courses" element={<UserCourses />} />
            <Route path="/course-detail" element={<CourseDetail />} />
            <Route path="/lesson" element={<Lesson />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<UserSettings />} />
            <Route path="/premium" element={<Premium />} />
            <Route path="/premium/checkout" element={<PremiumCheckout />} />
            <Route path="/premium/payment" element={<PaymentResult />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/payments" element={<Subscription />} />
          </Route>
        </Route>
      </Route>

      {/* Quiz routes (protected, full-screen, no layout) */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["user"]} fallbackPath={userFallback} />
        }
      >
        <Route
          element={
            <RoleBasedLayout
              allowedRoles={["user"]}
              fallbackPath={userFallback}
            />
          }
        >
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/quiz-result" element={<QuizResult />} />
        </Route>
      </Route>

      {/* Admin routes (protected, layout) */}
      <Route
        element={
          <ProtectedRoute
            allowedRoles={["admin"]}
            fallbackPath={adminFallback}
          />
        }
      >
        <Route
          element={
            <RoleBasedLayout
              allowedRoles={["admin"]}
              fallbackPath={adminFallback}
            />
          }
        >
          <Route element={<PortalLayout variant="admin" />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/courses" element={<AdminCourses />} />
            <Route path="/admin/lessons" element={<AdminLessons />} />
            <Route path="/admin/quizzes" element={<AdminQuizzes />} />
            <Route path="/admin/translations" element={<AdminTranslations />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>
        </Route>
      </Route>

      {/* Fallback */}
      <Route
        path="*"
        element={
          <Navigate
            to={
              currentUser
                ? currentUser.role === "admin"
                  ? "/admin/dashboard"
                  : "/dashboard"
                : "/"
            }
            replace
          />
        }
      />
    </Routes>
  );
}
