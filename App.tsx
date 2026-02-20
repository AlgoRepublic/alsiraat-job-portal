import React, { useState, useEffect, lazy, Suspense } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { Layers } from "lucide-react";
import { ToastProvider } from "./components/Toast";
import { User, UserRole, Permission } from "./types";
import { db } from "./services/database";

import { Loading } from "./components/Loading";
import { ThemeToggle } from "./components/ThemeToggle";

// Lazy loaded components
const Layout = lazy(() =>
  import("./components/Layout").then((module) => ({ default: module.Layout })),
);
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((module) => ({ default: module.Dashboard })),
);
const JobWizard = lazy(() =>
  import("./pages/JobWizard").then((module) => ({ default: module.JobWizard })),
);
const JobList = lazy(() =>
  import("./pages/JobList").then((module) => ({ default: module.JobList })),
);
const JobDetails = lazy(() =>
  import("./pages/JobDetails").then((module) => ({
    default: module.JobDetails,
  })),
);
const Profile = lazy(() =>
  import("./pages/Profile").then((module) => ({ default: module.Profile })),
);
const Login = lazy(() =>
  import("./pages/Login").then((module) => ({ default: module.Login })),
);
const LandingPage = lazy(() =>
  import("./components/LandingPage").then((module) => ({
    default: module.LandingPage,
  })),
);
const JobApplicants = lazy(() =>
  import("./pages/JobApplicants").then((module) => ({
    default: module.JobApplicants,
  })),
);
const ApplicationReview = lazy(() =>
  import("./pages/ApplicationReview").then((module) => ({
    default: module.ApplicationReview,
  })),
);
const MyTasks = lazy(() =>
  import("./pages/MyTasks").then((module) => ({ default: module.MyTasks })),
);
const UserManagement = lazy(() =>
  import("./pages/UserManagement").then((module) => ({
    default: module.UserManagement,
  })),
);
const MyApplications = lazy(() => import("./pages/MyApplications"));
const AdminSettings = lazy(() =>
  import("./pages/AdminSettings").then((module) => ({
    default: module.AdminSettings,
  })),
);
const Reports = lazy(() =>
  import("./pages/Reports").then((module) => ({ default: module.Reports })),
);
const Signup = lazy(() =>
  import("./pages/Signup").then((module) => ({ default: module.Signup })),
);
const ForgotPassword = lazy(() =>
  import("./pages/ForgotPassword").then((module) => ({
    default: module.ForgotPassword,
  })),
);
const ResetPassword = lazy(() =>
  import("./pages/ResetPassword").then((module) => ({
    default: module.ResetPassword,
  })),
);

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") return true;
    return false;
  });

  // Redirect from SSO logout: base URL with ?redirect-to-login=true → #/login
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("redirect-to-login") === "true") {
      const base = `${window.location.origin}${window.location.pathname || "/"}`;
      window.location.replace(`${base}#/login`);
      return;
    }
  }, []);

  useEffect(() => {
    const initUser = async () => {
      setLoading(true);
      const user = await db.getCurrentUser();
      setCurrentUser(user);
      setLoading(false);
    };
    initUser();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const handleSwitchUser = async (role: UserRole) => {
    const updatedUser = await db.updateCurrentUserRole(role);
    setCurrentUser(updatedUser);
  };

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  const refreshUser = async () => {
    const user = await db.getCurrentUser();
    setCurrentUser(user);
  };

  if (loading) {
    return <Loading fullScreen message="Loading Tasker..." />;
  }

  // For non-logged-in users visiting root, show LandingPage without Layout
  return (
    <ToastProvider>
      <HashRouter>
        <Suspense fallback={<Loading fullScreen message="Loading..." />}>
          <Routes>
            {/* Landing page outside Layout for non-authenticated users */}
            <Route
              path="/"
              element={
                !currentUser ? (
                  <LandingPage
                    onGetStarted={() => (window.location.hash = "#/login")}
                    onBrowseTasks={() => (window.location.hash = "#/jobs")}
                  />
                ) : currentUser.permissions?.includes(
                    Permission.DASHBOARD_VIEW,
                  ) ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Navigate to="/jobs" replace />
                )
              }
            />

            {/* Auth pages without Layout (no sidebar/header) */}
            <Route
              path="/login"
              element={
                <div className="relative">
                  <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleTheme} />
                  <Login onLoginSuccess={refreshUser} />
                </div>
              }
            />
            <Route
              path="/signup"
              element={
                <div className="relative">
                  <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleTheme} />
                  <Signup />
                </div>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <div className="relative">
                  <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleTheme} />
                  <ForgotPassword />
                </div>
              }
            />
            <Route
              path="/reset-password/:token"
              element={
                <div className="relative">
                  <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleTheme} />
                  <ResetPassword />
                </div>
              }
            />

            {/* All other routes wrapped in Layout */}
            <Route
              path="/*"
              element={
                <Layout
                  currentUser={currentUser}
                  onSwitchUser={handleSwitchUser}
                  isDarkMode={isDarkMode}
                  onToggleTheme={toggleTheme}
                >
                  <Suspense fallback={<Loading message="Loading Page..." />}>
                    <Routes>
                      <Route path="/jobs" element={<JobList />} />
                      <Route path="/jobs/:id" element={<JobDetails />} />

                      {/* Protected Routes */}
                      {currentUser && (
                        <>
                          <Route
                            path="/dashboard"
                            element={<Dashboard role={currentUser.role} />}
                          />
                          <Route path="/post-job" element={<JobWizard />} />
                          <Route path="/edit-job/:id" element={<JobWizard />} />
                          <Route
                            path="/jobs/:id/applicants"
                            element={<JobApplicants />}
                          />
                          <Route path="/my-tasks" element={<MyTasks />} />
                          <Route
                            path="/my-applications"
                            element={<MyApplications />}
                          />
                          <Route
                            path="/application/:appId"
                            element={<ApplicationReview />}
                          />
                          {/* Admin-only routes */}
                          {currentUser.permissions?.includes(
                            Permission.ADMIN_SETTINGS,
                          ) && (
                            <>
                              <Route
                                path="/admin/settings"
                                element={<AdminSettings />}
                              />
                              <Route
                                path="/admin/users"
                                element={<UserManagement />}
                              />
                            </>
                          )}
                          {/* Admin and Owner routes */}
                          {currentUser.permissions?.includes(
                            Permission.REPORTS_VIEW,
                          ) && <Route path="/reports" element={<Reports />} />}
                          <Route
                            path="/profile"
                            element={<Profile user={currentUser} />}
                          />
                        </>
                      )}

                      <Route
                        path="*"
                        element={<Navigate to="/jobs" replace />}
                      />
                    </Routes>
                  </Suspense>
                </Layout>
              }
            />
          </Routes>
        </Suspense>
      </HashRouter>
    </ToastProvider>
  );
};

export default App;
