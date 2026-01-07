
// import React, { useState, useEffect } from 'react';
// import { Link, useLocation } from 'react-router-dom';
// import { 
//   LayoutDashboard, 
//   Briefcase, 
//   UserCircle, 
//   FileBarChart, 
//   Bell, 
//   Menu, 
//   X, 
//   LogOut,
//   PlusCircle,
//   Search,
//   Moon,
//   Sun,
//   Settings,
//   Shield,
//   Users
// } from 'lucide-react';
// import { UserRole, User } from '../types';

// interface LayoutProps {
//   children: React.ReactNode;
//   currentUser: User;
//   onSwitchUser: (role: UserRole) => void;
//   isDarkMode: boolean;
//   onToggleTheme: () => void;
// }

// export const Layout: React.FC<LayoutProps> = ({ children, currentUser, onSwitchUser, isDarkMode, onToggleTheme }) => {
//   const [isSidebarOpen, setSidebarOpen] = useState(false);
//   const location = useLocation();

//   // Hide sidebar/header on login page
//   // if (location.pathname === '/login') {
//   //     return <>{children}</>;
//   // }

//   if (location.pathname === '/login' || location.pathname === '/') {
//     return <>{children}</>;
// }

//   const navItems = [
//     { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
//     { icon: Briefcase, label: 'Jobs', path: '/jobs' },
//     { icon: UserCircle, label: 'Profile', path: '/profile' },
//     { icon: Settings, label: 'Admin Settings', path: '/admin/settings', roles: [UserRole.ADMIN] },
//   ];

//   const filteredNav = navItems.filter(item => 
//     !item.roles || item.roles.includes(currentUser.role)
//   );

//   return (
//     <div className="flex h-screen bg-background dark:bg-black overflow-hidden font-sans text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
//       {/* Mobile Sidebar Overlay */}
//       {isSidebarOpen && (
//         <div 
//           className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
//           onClick={() => setSidebarOpen(false)}
//         />
//       )}

//       {/* Sidebar */}
//       <aside className={`
//         fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 shadow-2xl lg:shadow-none transform transition-transform duration-300 ease-in-out
//         lg:translate-x-0 lg:static lg:inset-0
//         ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
//       `}>
//         <div className="flex flex-col h-full">
//             {/* Logo */}
//             <div className="flex items-center px-6 h-20 border-b border-zinc-100 dark:border-zinc-800">
//                 <div className="w-10 h-10 bg-zinc-900 dark:bg-white rounded-xl flex items-center justify-center shadow-lg shadow-zinc-200 dark:shadow-zinc-900/20">
//                     <span className="text-white dark:text-zinc-900 font-bold text-xl">H</span>
//                 </div>
//                 <div className="ml-3">
//                     <span className="block text-lg font-bold text-zinc-900 dark:text-white leading-none">JobConnect</span>
//                     <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium tracking-wide">HAYATI PORTAL</span>
//                 </div>
//                 <button 
//                   className="ml-auto lg:hidden text-zinc-400 hover:text-zinc-600"
//                   onClick={() => setSidebarOpen(false)}
//                 >
//                   <X className="w-6 h-6" />
//                 </button>
//             </div>

//             {/* Nav */}
//             <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
//                 {(currentUser.role === UserRole.ADVERTISER || currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER) && (
//                     <Link
//                     to="/post-job"
//                     className="flex items-center justify-center w-full px-4 py-3 mb-8 text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-xl shadow-lg shadow-zinc-200 dark:shadow-zinc-900/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
//                     onClick={() => setSidebarOpen(false)}
//                 >
//                     <PlusCircle className="w-5 h-5 mr-2" />
//                     <span className="font-medium">Post New Job</span>
//                 </Link>
//                 )}

//                 <div className="space-y-1">
//                     {filteredNav.map((item) => {
//                         const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
//                         return (
//                         <Link
//                             key={item.path}
//                             to={item.path}
//                             onClick={() => setSidebarOpen(false)}
//                             className={`flex items-center px-4 py-3.5 rounded-xl transition-all duration-200 group ${
//                             isActive 
//                                 ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-sm' 
//                                 : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
//                             }`}
//                         >
//                             <item.icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300'}`} />
//                             <span className="text-sm">{item.label}</span>
//                             {isActive && <div className="ml-auto w-1.5 h-1.5 bg-zinc-900 dark:bg-white rounded-full" />}
//                         </Link>
//                         );
//                     })}
//                 </div>
//             </nav>

//             {/* User Profile Footer */}
//             <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
//                 <div className="mb-4">
//                     <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 px-1">Switch Role (Demo)</p>
//                     <select 
//                         className="w-full text-xs p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-600 outline-none shadow-sm"
//                         value={currentUser.role}
//                         onChange={(e) => onSwitchUser(e.target.value as UserRole)}
//                     >
//                         {Object.values(UserRole).map(role => (
//                             <option key={role} value={role}>{role}</option>
//                         ))}
//                     </select>
//                 </div>
                
//                 <div className="flex items-center p-2 rounded-xl hover:bg-white dark:hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 hover:shadow-sm cursor-pointer">
//                     <img src={currentUser.avatar} alt="User" className="w-9 h-9 rounded-full object-cover border border-zinc-200 dark:border-zinc-700" />
//                     <div className="flex-1 min-w-0 ml-3">
//                         <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{currentUser.name}</p>
//                         <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{currentUser.role}</p>
//                     </div>
//                     <Link to="/login" className="ml-auto">
//                         <LogOut className="w-4 h-4 text-zinc-400 hover:text-red-500 transition-colors" />
//                     </Link>
//                 </div>
//             </div>
//         </div>
//       </aside>

//       {/* Main Content */}
//       <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-background dark:bg-black">
//         {/* Header */}
//         <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 h-20 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 transition-colors duration-300">
//           <button 
//             className="lg:hidden p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
//             onClick={() => setSidebarOpen(true)}
//           >
//             <Menu className="w-6 h-6" />
//           </button>
          
//           <div className="flex-1 flex justify-between items-center ml-4 lg:ml-0">
//              {/* Breadcrumb or Title */}
//              <div>
//                 <h1 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
//                     {location.pathname === '/' ? 'Dashboard' : 
//                      location.pathname.startsWith('/jobs') ? 'Jobs & Opportunities' :
//                      location.pathname.startsWith('/admin') ? 'Administration' :
//                      location.pathname.substring(1).charAt(0).toUpperCase() + location.pathname.substring(2)}
//                 </h1>
//              </div>

//              {/* Actions */}
//              <div className="flex items-center space-x-3 lg:space-x-6">
//                 <button 
//                   onClick={onToggleTheme}
//                   className="p-2.5 rounded-xl text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
//                   aria-label="Toggle Theme"
//                 >
//                   {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
//                 </button>

//                 <div className="hidden md:flex items-center px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-full border border-transparent focus-within:border-zinc-300 dark:focus-within:border-zinc-600 focus-within:bg-white dark:focus-within:bg-zinc-900 transition-all w-64">
//                     <Search className="w-4 h-4 text-zinc-400" />
//                     <input 
//                         type="text" 
//                         placeholder="Quick search..." 
//                         className="ml-2 bg-transparent border-none outline-none text-sm w-full placeholder-zinc-400 text-zinc-900 dark:text-white" 
//                     />
//                 </div>
//                 <button className="p-2.5 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 relative transition-all">
//                     <Bell className="w-5 h-5" />
//                     <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white dark:border-zinc-900"></span>
//                 </button>
//              </div>
//           </div>
//         </header>

//         {/* Scrollable Content Area */}
//         <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8">
//           <div className="max-w-7xl mx-auto animate-slide-up">
//             {children}
//           </div>
//         </main>
//       </div>
//     </div>
//   );
// };


import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  UserCircle, 
  Bell, 
  Menu, 
  X, 
  LogOut,
  PlusCircle,
  Search,
  Moon,
  Sun,
  Settings
} from 'lucide-react';
import { UserRole, User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentUser: User;
  onSwitchUser: (role: UserRole) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  currentUser, 
  onSwitchUser, 
  isDarkMode, 
  onToggleTheme 
}) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Navigation items
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Briefcase, label: 'Jobs', path: '/jobs' },
    { icon: UserCircle, label: 'Profile', path: '/profile' },
    ...(currentUser.role === UserRole.ADMIN 
      ? [{ icon: Settings, label: 'Admin Settings', path: '/admin/settings' }] 
      : [])
  ];

  return (
    <div className="flex h-screen bg-background dark:bg-black overflow-hidden font-sans text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 shadow-2xl lg:shadow-none transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center px-6 h-20 border-b border-zinc-100 dark:border-zinc-800">
                <div className="w-10 h-10 bg-zinc-900 dark:bg-white rounded-xl flex items-center justify-center shadow-lg shadow-zinc-200 dark:shadow-zinc-900/20">
                    <span className="text-white dark:text-zinc-900 font-bold text-xl">H</span>
                </div>
                <div className="ml-3">
                    <span className="block text-lg font-bold text-zinc-900 dark:text-white leading-none">JobConnect</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium tracking-wide">HAYATI PORTAL</span>
                </div>
                <button 
                  className="ml-auto lg:hidden text-zinc-400 hover:text-zinc-600"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="w-6 h-6" />
                </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                {(currentUser.role === UserRole.ADVERTISER || currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER) && (
                    <Link
                    to="/post-job"
                    className="flex items-center justify-center w-full px-4 py-3 mb-8 text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-xl shadow-lg shadow-zinc-200 dark:shadow-zinc-900/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                    onClick={() => setSidebarOpen(false)}
                >
                    <PlusCircle className="w-5 h-5 mr-2" />
                    <span className="font-medium">Post New Job</span>
                </Link>
                )}

                <div className="space-y-1">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center px-4 py-3.5 rounded-xl transition-all duration-200 group ${
                            isActive 
                                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-sm' 
                                : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
                            }`}
                        >
                            <item.icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300'}`} />
                            <span className="text-sm">{item.label}</span>
                            {isActive && <div className="ml-auto w-1.5 h-1.5 bg-zinc-900 dark:bg-white rounded-full" />}
                        </Link>
                        );
                    })}
                </div>
            </nav>

            {/* User Profile Footer */}
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="mb-4">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 px-1">Switch Role (Demo)</p>
                    <select 
                        className="w-full text-xs p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-600 outline-none shadow-sm"
                        value={currentUser.role}
                        onChange={(e) => onSwitchUser(e.target.value as UserRole)}
                    >
                        {Object.values(UserRole).map(role => (
                            <option key={role} value={role}>{role}</option>
                        ))}
                    </select>
                </div>
                
                <div className="flex items-center p-2 rounded-xl hover:bg-white dark:hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 hover:shadow-sm cursor-pointer">
                    <img src={currentUser.avatar} alt="User" className="w-9 h-9 rounded-full object-cover border border-zinc-200 dark:border-zinc-700" />
                    <div className="flex-1 min-w-0 ml-3">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{currentUser.name}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{currentUser.role}</p>
                    </div>
                    <Link to="/login" className="ml-auto">
                        <LogOut className="w-4 h-4 text-zinc-400 hover:text-red-500 transition-colors" />
                    </Link>
                </div>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-background dark:bg-black">
        {/* Header */}
        <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 h-20 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 transition-colors duration-300">
          <button 
            className="lg:hidden p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex-1 flex justify-between items-center ml-4 lg:ml-0">
             {/* Breadcrumb or Title */}
             <div>
                <h1 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
                    {location.pathname === '/dashboard' ? 'Dashboard' : 
                     location.pathname.startsWith('/jobs') ? 'Jobs & Opportunities' :
                     location.pathname.startsWith('/admin') ? 'Administration' :
                     location.pathname.substring(1).charAt(0).toUpperCase() + location.pathname.substring(2)}
                </h1>
             </div>

             {/* Actions */}
             <div className="flex items-center space-x-3 lg:space-x-6">
                <button 
                  onClick={onToggleTheme}
                  className="p-2.5 rounded-xl text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  aria-label="Toggle Theme"
                >
                  {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>

                <div className="hidden md:flex items-center px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-full border border-transparent focus-within:border-zinc-300 dark:focus-within:border-zinc-600 focus-within:bg-white dark:focus-within:bg-zinc-900 transition-all w-64">
                    <Search className="w-4 h-4 text-zinc-400" />
                    <input 
                        type="text" 
                        placeholder="Quick search..." 
                        className="ml-2 bg-transparent border-none outline-none text-sm w-full placeholder-zinc-400 text-zinc-900 dark:text-white" 
                    />
                </div>
                <button className="p-2.5 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 relative transition-all">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white dark:border-zinc-900"></span>
                </button>
             </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8">
          <div className="max-w-7xl mx-auto animate-slide-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};