import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  UserCircle,
  Menu,
  X,
  LogOut,
  PlusCircle,
  Search,
  Moon,
  Sun,
  Settings,
  Bell,
  Palette,
  Check,
  CheckCircle,
  Layers,
  FileText,
} from "lucide-react";
import { UserRole, User } from "../types";
import { SnowBackground } from "./SnowBackground";
import { api } from "../services/api";

interface LayoutProps {
  children: React.ReactNode;
  currentUser: User | null;
  onSwitchUser: (role: UserRole) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

const COLORS = [
  {
    name: "AlSiraat",
    class: "bg-[#812349]",
    palette: {
      50: "#fdf2f6",
      100: "#fbe6ee",
      200: "#f8cfdf",
      300: "#f1a9c6",
      400: "#e478a3",
      500: "#d44e80",
      600: "#bc3363",
      700: "#a0274f",
      800: "#812349",
      900: "#6d203f",
      950: "#430d22",
    },
  },
  {
    name: "Red",
    class: "bg-red-600",
    palette: {
      50: "#fef2f2",
      100: "#fee2e2",
      200: "#fecaca",
      300: "#fca5a5",
      400: "#f87171",
      500: "#ef4444",
      600: "#dc2626",
      700: "#b91c1c",
      800: "#991b1b",
      900: "#7f1d1d",
      950: "#450a0a",
    },
  },
  {
    name: "Blue",
    class: "bg-blue-600",
    palette: {
      50: "#eff6ff",
      100: "#dbeafe",
      200: "#bfdbfe",
      300: "#93c5fd",
      400: "#60a5fa",
      500: "#3b82f6",
      600: "#2563eb",
      700: "#1d4ed8",
      800: "#1e40af",
      900: "#1e3a8a",
      950: "#172554",
    },
  },
  {
    name: "Emerald",
    class: "bg-emerald-600",
    palette: {
      50: "#ecfdf5",
      100: "#d1fae5",
      200: "#a7f3d0",
      300: "#6ee7b7",
      400: "#34d399",
      500: "#10b981",
      600: "#059669",
      700: "#047857",
      800: "#065f46",
      900: "#064e3b",
      950: "#022c22",
    },
  },
  {
    name: "Violet",
    class: "bg-violet-600",
    palette: {
      50: "#f5f3ff",
      100: "#ede9fe",
      200: "#ddd6fe",
      300: "#c4b5fd",
      400: "#a78bfa",
      500: "#8b5cf6",
      600: "#7c3aed",
      700: "#6d28d9",
      800: "#5b21b6",
      900: "#4c1d95",
      950: "#2e1065",
    },
  },
  {
    name: "Amber",
    class: "bg-amber-600",
    palette: {
      50: "#fffbeb",
      100: "#fef3c7",
      200: "#fde68a",
      300: "#fcd34d",
      400: "#fbbf24",
      500: "#f59e0b",
      600: "#d97706",
      700: "#b45309",
      800: "#92400e",
      900: "#78350f",
      950: "#451a03",
    },
  },
];

const HeaderIconButton: React.FC<{
  onClick?: () => void;
  icon: React.ElementType;
  label: string;
  badge?: boolean;
}> = ({ onClick, icon: Icon, label, badge }) => (
  <div className="relative group">
    <button
      onClick={onClick}
      className="p-2.5 rounded-xl text-zinc-500 dark:text-zinc-400 hover:bg-white/80 dark:hover:bg-zinc-800/80 hover:text-red-900 dark:hover:text-red-400 transition-all active:scale-95 duration-200"
      aria-label={label}
    >
      <Icon className="w-5 h-5" />
      {badge && (
        <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white dark:border-zinc-900"></span>
      )}
    </button>
  </div>
);

export const Layout: React.FC<LayoutProps> = ({
  children,
  currentUser,
  onSwitchUser,
  isDarkMode,
  onToggleTheme,
}) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState("Blue");
  const location = useLocation();
  const navigate = useNavigate();

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : null;
  };

  const changeAccentColor = (colorName: string, palette: any) => {
    setSelectedColor(colorName);
    const root = document.documentElement;
    Object.keys(palette).forEach((key) => {
      root.style.setProperty(`--accent-${key}`, palette[key]);
      const rgb = hexToRgb(palette[key]);
      if (rgb) root.style.setProperty(`--accent-${key}-rgb`, rgb);
    });
    setShowColorPicker(false);
  };

  const isAuthPage = ["/login", "/signup", "/forgot-password"].some((path) =>
    location.pathname.startsWith(path),
  );

  if (isAuthPage) {
    return (
      <div className="min-h-screen font-sans">
        <SnowBackground isDarkMode={isDarkMode} />
        {children}
      </div>
    );
  }

  const navItems = [
    {
      icon: LayoutDashboard,
      label: "Overview",
      path: "/dashboard",
      protected: true,
      roles: [UserRole.ADMIN, UserRole.OWNER],
    },
    { icon: Briefcase, label: "Browse Tasks", path: "/jobs" },
    {
      icon: CheckCircle,
      label: "My Tasks",
      path: "/my-tasks",
      protected: true,
    },
    {
      icon: UserCircle,
      label: "My Profile",
      path: "/profile",
      protected: true,
    },
    {
      icon: Settings,
      label: "Admin Settings",
      path: "/admin/settings",
      roles: [UserRole.ADMIN],
      protected: true,
    },
    {
      icon: FileText,
      label: "Reports",
      path: "/reports",
      roles: [UserRole.ADMIN, UserRole.OWNER],
      protected: true,
    },
  ];

  const filteredNav = navItems.filter((item) => {
    if (item.protected && !currentUser) return false;
    if (item.roles && currentUser) {
      // Case-insensitive role comparison
      const userRoleLower = currentUser.role?.toLowerCase() || "";
      const hasMatchingRole = item.roles.some(
        (role) => role.toLowerCase() === userRoleLower,
      );
      if (!hasMatchingRole) return false;
    } else if (item.roles && !currentUser) {
      return false;
    }
    return true;
  });

  const handleLogout = () => {
    api.logout();
    navigate("/login");
    window.location.reload();
  };

  return (
    <div className="flex h-screen overflow-hidden font-sans text-zinc-900 dark:text-zinc-100 transition-colors duration-300 relative">
      <SnowBackground isDarkMode={isDarkMode} />

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-md z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 glass shadow-2xl lg:shadow-none transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex flex-col h-full">
          <Link
            to="/"
            className="flex items-center px-6 h-24 border-b border-white/20 dark:border-white/5"
          >
            <div className="w-12 h-12 bg-gradient-to-tr from-[#812349] to-[#601a36] rounded-2xl flex items-center justify-center shadow-lg shadow-[#812349]/30 relative">
              <Layers className="text-white w-7 h-7" strokeWidth={2.5} />
            </div>
            <div className="ml-4">
              <span className="block text-2xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none">
                Tasker
              </span>
              <span className="text-[10px] text-[#812349] dark:text-[#a02b5a] font-black tracking-[0.2em] uppercase">
                Connect
              </span>
            </div>
          </Link>

          <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
            {currentUser && currentUser.role !== UserRole.INDEPENDENT && (
              <Link
                to="/post-job"
                className="flex items-center justify-center w-full px-4 py-4 mb-8 text-white bg-[#812349] dark:bg-[#601a36] hover:bg-[#601a36] dark:hover:bg-[#4d152b] rounded-2xl shadow-xl shadow-[#812349]/20 transition-all transform hover:-translate-y-1 active:scale-95"
                onClick={() => setSidebarOpen(false)}
              >
                <PlusCircle className="w-5 h-5 mr-3" />
                <span className="font-bold text-sm">Post a Task</span>
              </Link>
            )}

            <div className="space-y-1">
              {filteredNav.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== "/" &&
                    location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center px-5 py-4 rounded-2xl transition-all duration-300 relative group ${isActive ? "bg-white/60 dark:bg-white/10 text-[#812349] dark:text-[#a02b5a] font-bold shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:bg-white/30 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"}`}
                  >
                    <item.icon
                      className={`w-5 h-5 mr-4 transition-transform group-hover:scale-110 ${isActive ? "text-[#812349] dark:text-[#a02b5a]" : "text-zinc-400"}`}
                    />
                    <span className="text-sm tracking-tight">{item.label}</span>
                    {isActive && (
                      <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-[#812349] dark:bg-[#a02b5a]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="p-6 border-t border-white/20 dark:border-white/5">
            {currentUser ? (
              <div
                className="flex items-center p-3 rounded-2xl hover:bg-white/40 dark:hover:bg-white/5 transition-all group cursor-pointer border border-transparent hover:border-white/30 dark:hover:border-white/10"
                onClick={() => navigate("/profile")}
              >
                <img
                  src={currentUser.avatar}
                  alt="User"
                  className="w-10 h-10 rounded-xl object-cover shadow-sm border border-white/50"
                />
                <div className="flex-1 min-w-0 ml-3">
                  <p className="text-sm font-bold text-zinc-900 dark:text-white truncate group-hover:text-[#812349] transition-colors">
                    {currentUser.name}
                  </p>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    {currentUser.role}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLogout();
                  }}
                  className="ml-auto p-2 text-zinc-400 hover:text-red-600 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black dark:hover:bg-zinc-100 transition-all"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative z-10">
        <header className="glass h-24 flex items-center justify-between px-8 sticky top-0 z-30">
          <button
            className="lg:hidden p-3 rounded-xl text-zinc-500 hover:bg-white/50"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1 flex justify-between items-center ml-4 lg:ml-0">
            <div>
              <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">
                {location.pathname === "/"
                  ? "Home"
                  : location.pathname === "/dashboard"
                    ? "Overview"
                    : location.pathname.startsWith("/jobs")
                      ? "Browse Tasks"
                      : location.pathname.startsWith("/admin")
                        ? "Administration"
                        : location.pathname
                            .substring(1)
                            .split("/")[0]
                            .charAt(0)
                            .toUpperCase() +
                          location.pathname.substring(1).split("/")[0].slice(1)}
              </h1>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <HeaderIconButton
                  icon={Palette}
                  label="Accent"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                />
                {showColorPicker && (
                  <div className="absolute top-16 right-0 w-56 glass-card rounded-2xl p-4 z-50 animate-slide-up">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">
                      Choose Theme
                    </p>
                    <div className="grid grid-cols-5 gap-3">
                      {COLORS.map((color) => (
                        <button
                          key={color.name}
                          onClick={() =>
                            changeAccentColor(color.name, color.palette)
                          }
                          className={`w-8 h-8 rounded-full ${color.class} flex items-center justify-center transition-all hover:scale-125`}
                        >
                          {selectedColor === color.name && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <HeaderIconButton
                icon={isDarkMode ? Sun : Moon}
                label="Theme"
                onClick={onToggleTheme}
              />
              <div className="hidden md:flex items-center px-5 py-3 glass-card rounded-2xl border-white/30 w-72 focus-within:ring-2 focus-within:ring-[#812349]/30 transition-all">
                <Search className="w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Quick find tasks..."
                  className="ml-3 bg-transparent border-none outline-none text-sm w-full placeholder-zinc-400 font-medium"
                />
              </div>
              <HeaderIconButton icon={Bell} label="Alerts" badge={true} />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto animate-slide-up">{children}</div>
        </main>
      </div>
    </div>
  );
};
