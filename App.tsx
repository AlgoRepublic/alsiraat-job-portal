import React, { useState, useEffect } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { Layers } from "lucide-react";
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
import { AdminSettings } from "./pages/AdminSettings";
import { Home } from "./pages/Home";
import { Signup } from "./pages/Signup";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { User, UserRole } from "./types";
import { db } from "./services/database";

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-black overflow-hidden relative">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px] animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-900/10 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-red-900 rounded-2xl flex items-center justify-center mb-6 shadow-2xl animate-float">
            <Layers className="text-white w-9 h-9" />
          </div>
          <div className="text-zinc-400 font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">
            Loading Tasker...
          </div>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Layout
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      >
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={currentUser ? <Home /> : <JobList />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/jobs" element={<JobList />} />
          <Route path="/jobs/:id" element={<JobDetails />} />

          {/* Protected Routes */}
          {currentUser && (
            <>
              <Route
                path="/dashboard"
                element={<Dashboard role={currentUser.role} />}
              />
              <Route
                path="/post-job"
                element={
                  currentUser.role === UserRole.OWNER ||
                  currentUser.role === UserRole.ADMIN ||
                  currentUser.role === UserRole.INDEPENDENT ? (
                    <JobWizard />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )
                }
              />
              <Route path="/jobs/:id/applicants" element={<JobApplicants />} />
              <Route path="/my-tasks" element={<MyTasks />} />
              <Route
                path="/application/:appId"
                element={<ApplicationReview />}
              />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/profile" element={<Profile user={currentUser} />} />
            </>
          )}

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

const PublicLanding = () => {
  const navigate = useNavigate();
  return <LandingPage onGetStarted={() => navigate("/login")} />;
};

export default App;
