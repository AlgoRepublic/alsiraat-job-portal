
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { JobWizard } from './pages/JobWizard';
import { JobList } from './pages/JobList';
import { JobDetails } from './pages/JobDetails';
import { Profile } from './pages/Profile';
import { Login } from './pages/Login';
import { JobApplicants } from './pages/JobApplicants';
import { ApplicationReview } from './pages/ApplicationReview';
import { AdminSettings } from './pages/AdminSettings';
import { User, UserRole } from './types';
import { db } from './services/database';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check local storage or system preference
    if (localStorage.getItem('theme') === 'dark' || 
       (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      return true;
    }
    return false;
  });

  useEffect(() => {
    // Initial fetch of user from async DB
    const initUser = async () => {
        const user = await db.getCurrentUser();
        setCurrentUser(user);
    };
    initUser();
  }, []);

  useEffect(() => {
    // Apply theme to html element
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleSwitchUser = async (role: UserRole) => {
    const updatedUser = await db.updateCurrentUserRole(role);
    setCurrentUser(updatedUser);
  };

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  if (!currentUser) {
      return <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-black text-zinc-400">Loading Hayati JobConnect...</div>;
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
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Dashboard role={currentUser.role} />} />
          
          <Route 
            path="/post-job" 
            element={
              currentUser.role === UserRole.ADVERTISER || currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER
                ? <JobWizard /> 
                : <Navigate to="/" replace />
            } 
          />
          
          <Route path="/jobs" element={<JobList />} />
          <Route path="/jobs/:id" element={<JobDetails />} />
          
          {/* Manager / Admin Routes */}
          <Route path="/jobs/:id/applicants" element={<JobApplicants />} />
          <Route path="/application/:appId" element={<ApplicationReview />} />
          <Route path="/admin/settings" element={<AdminSettings />} />

          <Route path="/profile" element={<Profile user={currentUser} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
