import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { UserAvatar } from "./UserAvatar";
import {
  LayoutDashboard,
  Briefcase,
  UserCircle,
  Menu,
  X,
  LogOut,
  PlusCircle,
  Plus,
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
  Clock,
  CheckCheck,
  Trash2,
} from "lucide-react";
import { UserRole, User, Job, Permission } from "../types";
import { SnowBackground } from "./SnowBackground";
import { api, API_BASE_URL, LOGIN_SOURCE_KEY } from "../services/api";

interface LayoutProps {
  children: React.ReactNode;
  currentUser: User | null;
  onSwitchUser: (role: UserRole) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  link?: string;
  read: boolean;
  createdAt: string;
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
    class: "bg-yellow-600",
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
];

const HeaderIconButton: React.FC<{
  icon: any;
  label: string;
  onClick?: () => void;
  badge?: boolean;
  badgeCount?: number;
}> = ({ icon: Icon, label, onClick, badge = false, badgeCount = 0 }) => (
  <button
    onClick={onClick}
    className="relative p-3 rounded-2xl bg-white/30 dark:bg-zinc-800/30 hover:bg-white/60 dark:hover:bg-zinc-800/60 transition-all border border-white/30 dark:border-white/5 shadow-sm"
    title={label}
  >
    <Icon className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
    {badge && badgeCount > 0 && (
      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
        {badgeCount > 9 ? "9+" : badgeCount}
      </span>
    )}
  </button>
);

export const Layout: React.FC<LayoutProps> = ({
  children,
  currentUser,
  onSwitchUser,
  isDarkMode,
  onToggleTheme,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState(() => {
    const stored = localStorage.getItem("accentColor");
    return stored || "AlSiraat";
  });

  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Job[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Apply saved accent color on mount
  useEffect(() => {
    const savedColor = COLORS.find((c) => c.name === selectedColor);
    if (savedColor) {
      Object.entries(savedColor.palette).forEach(([key, value]) => {
        document.documentElement.style.setProperty(`--accent-${key}`, value);
        if (["100", "200", "300", "400", "800", "900", "950"].includes(key)) {
          document.documentElement.style.setProperty(
            `--accent-${key}-rgb`,
            hexToRgb(value),
          );
        }
      });
    }
  }, []); // Only run on mount

  // Load notifications
  useEffect(() => {
    if (currentUser) {
      loadNotifications();
      loadUnreadCount();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(() => {
        loadUnreadCount();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length >= 2) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await fetch(
            `${API_BASE_URL}/tasks?search=${encodeURIComponent(searchQuery)}`,
            {
              headers: currentUser
                ? {
                    Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
                  }
                : {},
            },
          );
          if (response.ok) {
            const data = await response.json();
            setSearchResults((data.tasks || data || []).slice(0, 8));
            setShowSearchResults(true);
          }
        } catch (err) {
          console.error("Search error:", err);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchQuery, currentUser]);

  const loadNotifications = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications/unread-count`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        },
      );
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count);
      }
    } catch (err) {
      console.error("Failed to load unread count:", err);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification._id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
    setShowNotifications(false);
  };

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "warning":
        return <Clock className="w-4 h-4 text-amber-500" />;
      case "error":
        return <X className="w-4 h-4 text-red-500" />;
      default:
        return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  };

  const changeAccentColor = (name: string, palette: Record<string, string>) => {
    setSelectedColor(name);
    localStorage.setItem("accentColor", name);
    setShowColorPicker(false);
    Object.entries(palette).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--accent-${key}`, value);
      // Update RGB variables for radial gradients (specific ones needed)
      if (["100", "200", "300", "400", "800", "900", "950"].includes(key)) {
        document.documentElement.style.setProperty(
          `--accent-${key}-rgb`,
          hexToRgb(value),
        );
      }
    });
  };

  if (!currentUser && location.pathname === "/") {
    return (
      <div className="transition-colors duration-300 relative overflow-x-hidden">
        <SnowBackground isDarkMode={isDarkMode} />
        <div className="relative z-10">{children}</div>
      </div>
    );
  }

  const navItems: {
    icon: any;
    label: string;
    path: string;
    protected?: boolean;
    permission?: Permission;
  }[] = [
    {
      icon: LayoutDashboard,
      label: "Overview",
      path: "/dashboard",
      protected: true,
      permission: Permission.DASHBOARD_VIEW,
    },
    { icon: Briefcase, label: "Browse Tasks", path: "/jobs" },
    {
      icon: Plus,
      label: "Create Task",
      path: "/post-job",
      protected: true,
      permission: Permission.TASK_CREATE,
    },
    {
      icon: FileText,
      label: "My Applications",
      path: "/my-applications",
      protected: true,
    },
    {
      icon: Clock,
      label: "Pending Approvals",
      path: "/jobs?status=Pending",
      protected: true,
      permission: Permission.TASK_APPROVE,
    },
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
      permission: Permission.ADMIN_SETTINGS,
      protected: true,
    },
  ];

  const filteredNav = navItems.filter((item) => {
    if (item.protected && !currentUser) return false;
    if (item.permission && currentUser) {
      if (!currentUser.permissions?.includes(item.permission)) return false;
    }
    return true;
  });

  const handleLogout = async () => {
    const idToken = localStorage.getItem("id_token");
    const loginSource = localStorage.getItem(LOGIN_SOURCE_KEY);
    let redirectUrl: string | undefined;
    if (loginSource === "sso" && idToken) {
      try {
        const res = await api.getSsoLogoutUrl(idToken);
        redirectUrl = typeof res.redirectUrl === "string" && res.redirectUrl.startsWith("http") ? res.redirectUrl : undefined;
      } catch {
        redirectUrl = undefined;
      }
    }
    api.logout();
    if (redirectUrl) {
      window.location.replace(redirectUrl);
      return;
    }
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
            <div className="w-12 h-12 bg-gradient-to-tr from-primary to-primaryHover rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 relative">
              <Layers className="text-white w-7 h-7" strokeWidth={2.5} />
            </div>
            <div className="ml-4">
              <span className="block text-2xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none">
                Tasker
              </span>
              <span className="text-[10px] text-primary dark:text-primary rounded uppercase font-black tracking-[0.2em]">
                Connect
              </span>
            </div>
          </Link>

          <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
            {currentUser?.permissions?.includes(Permission.TASK_CREATE) && (
              <Link
                to="/post-job"
                className="flex items-center justify-center w-full px-4 py-4 mb-8 text-white bg-primary hover:bg-primaryHover rounded-2xl shadow-xl shadow-primary/20 transition-all transform hover:-translate-y-1 active:scale-95"
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
                    className={`flex items-center px-5 py-4 rounded-2xl transition-all duration-300 relative group ${isActive ? "bg-white/60 dark:bg-white/10 text-primary font-bold shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:bg-white/30 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"}`}
                  >
                    <item.icon
                      className={`w-5 h-5 mr-4 transition-transform group-hover:scale-110 ${isActive ? "text-primary" : "text-zinc-400"}`}
                    />
                    <span className="text-sm tracking-tight">{item.label}</span>
                    {isActive && (
                      <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-primary" />
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
                <UserAvatar
                  src={currentUser.avatar}
                  name={currentUser.name}
                  className="mr-3"
                />
                <div className="flex-1 min-w-0 ml-3">
                  <p className="text-sm font-bold text-zinc-900 dark:text-white truncate group-hover:text-primary transition-colors">
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
                      ? "Search Tasks"
                      : location.pathname.startsWith("/admin")
                        ? "Administration"
                        : location.pathname.startsWith("/reports")
                          ? "Reports"
                          : location.pathname
                              .substring(1)
                              .split("/")[0]
                              .charAt(0)
                              .toUpperCase() +
                            location.pathname
                              .substring(1)
                              .split("/")[0]
                              .slice(1)}
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

              {/* Search Bar with Dropdown */}
              <div className="hidden md:block relative" ref={searchRef}>
                <div className="flex items-center px-5 py-3 glass-card rounded-2xl border-white/30 w-72 focus-within:ring-2 focus-within:ring-primary/30 transition-all">
                  <Search className="w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Quick find tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() =>
                      searchQuery.length >= 2 && setShowSearchResults(true)
                    }
                    className="ml-3 bg-transparent border-none outline-none text-sm w-full placeholder-zinc-400 font-medium"
                  />
                  {isSearching && (
                    <div className="w-4 h-4 border-2 border-zinc-300 border-t-primary rounded-full animate-spin" />
                  )}
                </div>

                {/* Search Results Dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute top-14 left-0 right-0 glass-card rounded-2xl shadow-2xl z-50 max-h-96 overflow-y-auto animate-slide-up">
                    <div className="p-2">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-3 py-2">
                        Tasks ({searchResults.length})
                      </p>
                      {searchResults.map((task) => (
                        <button
                          key={task.id}
                          onClick={() => {
                            navigate(`/jobs/${task.id}`);
                            setShowSearchResults(false);
                            setSearchQuery("");
                          }}
                          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left transition-all"
                        >
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Briefcase className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                              {task.title}
                            </p>
                            <p className="text-xs text-zinc-500 truncate">
                              {task.category}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 text-[10px] font-bold rounded-lg ${
                              task.status === "Published"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-zinc-100 text-zinc-500"
                            }`}
                          >
                            {task.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {showSearchResults &&
                  searchQuery.length >= 2 &&
                  searchResults.length === 0 &&
                  !isSearching && (
                    <div className="absolute top-14 left-0 right-0 glass-card rounded-2xl shadow-2xl z-50 p-6 text-center animate-slide-up">
                      <Search className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                      <p className="text-sm text-zinc-500">No tasks found</p>
                    </div>
                  )}
              </div>

              {/* Notifications Bell */}
              <div className="relative" ref={notificationRef}>
                <HeaderIconButton
                  icon={Bell}
                  label="Notifications"
                  badge={true}
                  badgeCount={unreadCount}
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    if (!showNotifications) {
                      loadNotifications();
                    }
                  }}
                />

                {/* Notification Dropdown */}
                {showNotifications && currentUser && (
                  <div className="absolute top-14 right-0 w-96 glass-card rounded-2xl shadow-2xl z-50 max-h-[32rem] overflow-hidden animate-slide-up">
                    <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                      <h3 className="font-bold text-zinc-900 dark:text-white">
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-primary hover:underline font-bold flex items-center gap-1"
                        >
                          <CheckCheck className="w-3 h-3" />
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="w-10 h-10 text-zinc-200 dark:text-zinc-700 mx-auto mb-3" />
                          <p className="text-sm text-zinc-400">
                            No notifications yet
                          </p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <button
                            key={notification._id}
                            onClick={() =>
                              handleNotificationClick(notification)
                            }
                            className={`w-full p-4 flex items-start gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all text-left border-b border-zinc-100 dark:border-zinc-800 last:border-0 ${
                              !notification.read
                                ? "bg-blue-50/50 dark:bg-blue-900/10"
                                : ""
                            }`}
                          >
                            <div
                              className={`p-2 rounded-xl ${
                                notification.type === "success"
                                  ? "bg-emerald-100 dark:bg-emerald-900/30"
                                  : notification.type === "warning"
                                    ? "bg-amber-100 dark:bg-amber-900/30"
                                    : notification.type === "error"
                                      ? "bg-red-100 dark:bg-red-900/30"
                                      : "bg-blue-100 dark:bg-blue-900/30"
                              }`}
                            >
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm ${!notification.read ? "font-bold" : "font-medium"} text-zinc-900 dark:text-white`}
                              >
                                {notification.title}
                              </p>
                              <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-[10px] text-zinc-400 mt-1">
                                {getRelativeTime(notification.createdAt)}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                            )}
                          </button>
                        ))
                      )}
                    </div>

                    {notifications.length > 0 && (
                      <div className="p-3 border-t border-zinc-200 dark:border-zinc-700">
                        <button
                          onClick={() => {
                            navigate("/notifications");
                            setShowNotifications(false);
                          }}
                          className="w-full text-center text-sm text-[#812349] font-bold hover:underline"
                        >
                          View All Notifications
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
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
