import React, { useState, useEffect } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { Layers, Sun, Moon } from "lucide-react";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { JobWizard } from "./pages/JobWizard";
import { JobList } from "./pages/JobList";
import { JobDetails } from "./pages/JobDetails";
import { Profile } from "./pages/Profile";
import { Login } from "./pages/Login";
import { LandingPage } from "./components/LandingPage";
import { JobApplicants } from "./pages/JobApplicants";
import { ApplicationReview } from "./pages/ApplicationReview";
import { MyTasks } from "./pages/MyTasks";
import { UserManagement } from "./pages/UserManagement";
import MyApplications from "./pages/MyApplications";
import { AdminSettings } from "./pages/AdminSettings";
import { Reports } from "./pages/Reports";
import { Home } from "./pages/Home";
import { Signup } from "./pages/Signup";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { ToastProvider } from "./components/Toast";
import { User, UserRole, Permission } from "./types";
import { db } from "./services/database";

import { Loading } from "./components/Loading";

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") return true;
    return false;
  });

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
                <button
                  onClick={toggleTheme}
                  className="fixed top-6 right-6 z-50 p-3 rounded-xl glass-card hover:scale-110 transition-all"
                  title={isDarkMode ? "Light mode" : "Dark mode"}
                >
                  {isDarkMode ? (
                    <Sun className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <Moon className="w-5 h-5 text-zinc-700" />
                  )}
                </button>
                <Login onLoginSuccess={refreshUser} />
              </div>
            }
          />
          <Route
            path="/signup"
            element={
              <div className="relative">
                <button
                  onClick={toggleTheme}
                  className="fixed top-6 right-6 z-50 p-3 rounded-xl glass-card hover:scale-110 transition-all"
                  title={isDarkMode ? "Light mode" : "Dark mode"}
                >
                  {isDarkMode ? (
                    <Sun className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <Moon className="w-5 h-5 text-zinc-700" />
                  )}
                </button>
                <Signup />
              </div>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <div className="relative">
                <button
                  onClick={toggleTheme}
                  className="fixed top-6 right-6 z-50 p-3 rounded-xl glass-card hover:scale-110 transition-all"
                  title={isDarkMode ? "Light mode" : "Dark mode"}
                >
                  {isDarkMode ? (
                    <Sun className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <Moon className="w-5 h-5 text-zinc-700" />
                  )}
                </button>
                <ForgotPassword />
              </div>
            }
          />
          <Route
            path="/reset-password/:token"
            element={
              <div className="relative">
                <button
                  onClick={toggleTheme}
                  className="fixed top-6 right-6 z-50 p-3 rounded-xl glass-card hover:scale-110 transition-all"
                  title={isDarkMode ? "Light mode" : "Dark mode"}
                >
                  {isDarkMode ? (
                    <Sun className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <Moon className="w-5 h-5 text-zinc-700" />
                  )}
                </button>
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

                  <Route path="*" element={<Navigate to="/jobs" replace />} />
                </Routes>
              </Layout>
            }
          />
        </Routes>
      </HashRouter>
    </ToastProvider>
  );
};

const PublicLanding = () => {
  const navigate = useNavigate();
  return (
    <LandingPage
      onGetStarted={() => navigate("/login")}
      onBrowseTasks={() => navigate("/jobs")}
    />
  );
};

export default App;
