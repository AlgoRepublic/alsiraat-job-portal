
// import React, { useState, useEffect } from 'react';
// import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
// import { Layout } from './components/Layout';
// import { Dashboard } from './pages/Dashboard';
// import { JobWizard } from './pages/JobWizard';
// import { JobList } from './pages/JobList';
// import { JobDetails } from './pages/JobDetails';
// import { Profile } from './pages/Profile';
// import { Login } from './pages/Login';
// import { JobApplicants } from './pages/JobApplicants';
// import { ApplicationReview } from './pages/ApplicationReview';
// import { AdminSettings } from './pages/AdminSettings';
// import { User, UserRole } from './types';
// import { db } from './services/database';
// import { LandingPage } from './pages/LandingPage';

// const App: React.FC = () => {
//   const [currentUser, setCurrentUser] = useState<User | null>(null);
//    const [isLoading, setIsLoading] = useState(true); // Add loading state
//   const [isDarkMode, setIsDarkMode] = useState(() => {
//     // Check local storage or system preference
//     if (localStorage.getItem('theme') === 'dark' || 
//        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
//       return true;
//     }
//     return false;
//   });

//   useEffect(() => {
//     // Initial fetch of user from async DB
//     const initUser = async () => {
//         const user = await db.getCurrentUser();
//         setCurrentUser(user);
//     };
//     initUser();
//   }, []);

//   useEffect(() => {
//     // Apply theme to html element
//     const root = window.document.documentElement;
//     if (isDarkMode) {
//       root.classList.add('dark');
//       localStorage.setItem('theme', 'dark');
//     } else {
//       root.classList.remove('dark');
//       localStorage.setItem('theme', 'light');
//     }
//   }, [isDarkMode]);

//   const handleSwitchUser = async (role: UserRole) => {
//     const updatedUser = await db.updateCurrentUserRole(role);
//     setCurrentUser(updatedUser);
//   };

//   const toggleTheme = () => setIsDarkMode(prev => !prev);

// console.log('Current User:', currentUser);


//   if (!currentUser) {
//       return <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-black text-zinc-400">Loading Hayati JobConnect...</div>;
//   }

//   return (
//     <HashRouter>
//       <Layout 
//         currentUser={currentUser} 
//         onSwitchUser={handleSwitchUser} 
//         isDarkMode={isDarkMode}
//         onToggleTheme={toggleTheme}
//       >
//         <Routes>
//           <Route path="/login" element={<Login />} />
//           <Route path="/" element={<LandingPage />} />
//           <Route path="/dashboard" element={<Dashboard role={currentUser.role} />} />

//           <Route 
//             path="/post-job" 
//             element={
//               currentUser.role === UserRole.ADVERTISER || currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER
//                 ? <JobWizard /> 
//                 : <Navigate to="/dashboard" replace />
//             } 
//           />
          
//           <Route path="/jobs" element={<JobList />} />
//           <Route path="/jobs/:id" element={<JobDetails />} />
          
//           {/* Manager / Admin Routes */}
//           <Route path="/jobs/:id/applicants" element={<JobApplicants />} />
//           <Route path="/application/:appId" element={<ApplicationReview />} />
//           <Route path="/admin/settings" element={<AdminSettings />} />

//           <Route path="/profile" element={<Profile user={currentUser} />} />
//           <Route path="*" element={<Navigate to="/" replace />} />
//         </Routes>
//       </Layout>
//     </HashRouter>
//   );
// };

// export default App;



import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'; // Changed to BrowserRouter
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
import { LandingPage } from './pages/LandingPage';
import { Register } from './pages/Register';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (localStorage.getItem('theme') === 'dark' || 
       (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      return true;
    }
    return false;
  });

  useEffect(() => {
    const initUser = async () => {
      try {
        const user = await db.getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to load user:', error);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    initUser();
  }, []);

  useEffect(() => {
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

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-black text-zinc-400">
        Loading ...
      </div>
    );
  }

  return (
    <BrowserRouter> 
      <Routes>
        {/* Public routes - no layout */}
        <Route path="/sign-in" element={<Login />} />
        <Route path="/sign-up" element={<Register />} />
        <Route path="/" element={<LandingPage />} />
        
        {/* Protected routes - with layout wrapper */}
        <Route element={
          <RequireAuth currentUser={currentUser}>
            <Layout 
              currentUser={currentUser!} 
              onSwitchUser={handleSwitchUser} 
              isDarkMode={isDarkMode}
              onToggleTheme={toggleTheme}
            >
              <Outlet />
            </Layout>
          </RequireAuth>
        }>
          <Route path="/dashboard" element={<Dashboard role={currentUser!.role} />} />
          
          <Route 
            path="/post-job" 
            element={
              currentUser?.role === UserRole.ADVERTISER || 
              currentUser?.role === UserRole.ADMIN || 
              currentUser?.role === UserRole.MANAGER
                ? <JobWizard /> 
                : <Navigate to="/dashboard" replace />
            } 
          />
          
          <Route path="/jobs" element={<JobList />} />
          <Route path="/jobs/:id" element={<JobDetails />} />
          
          {/* Manager / Admin Routes */}
          <Route 
            path="/jobs/:id/applicants" 
            element={
              currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.ADMIN
                ? <JobApplicants /> 
                : <Navigate to="/dashboard" replace />
            } 
          />
          
          <Route 
            path="/application/:appId" 
            element={
              currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.ADMIN
                ? <ApplicationReview /> 
                : <Navigate to="/dashboard" replace />
            } 
          />
          
          <Route 
            path="/admin/settings" 
            element={
              currentUser?.role === UserRole.ADMIN
                ? <AdminSettings /> 
                : <Navigate to="/dashboard" replace />
            } 
          />

          <Route path="/profile" element={<Profile user={currentUser!} />} />
        </Route>
        
        {/* Fallback route */}
        <Route 
          path="*" 
          element={
            currentUser 
              ? <Navigate to="/dashboard" replace /> 
              : <Navigate to="/" replace />
          } 
        />
      </Routes>
    </BrowserRouter>
  );
};

// Add this authentication wrapper component
const RequireAuth: React.FC<{ 
  children: React.ReactNode; 
  currentUser: User | null 
}> = ({ children, currentUser }) => {
  if (!currentUser) {
    return <Navigate to="/sign-in" replace />;
  }
  return <>{children}</>;
};

export default App;