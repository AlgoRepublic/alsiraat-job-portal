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
  Search,
  Moon,
  Sun,
  Settings,
  Bell,
  CheckCircle,
  FileText,
  Clock,
  CheckCheck,
  Megaphone,
  ClipboardList,
  ClipboardCheck,
  ChevronDown,
} from "lucide-react";
import { User, Job, Permission, type OrgContext } from "../types";
import { api, API_BASE_URL, LOGIN_SOURCE_KEY } from "../services/api";
import { resolveTaskCategoryLabel } from "../utils/taskCategoryDisplay";
import {
  getPublicCentralOrganisation,
  type PublicPlatformOrg,
  invalidatePlatformOrganisationCaches,
} from "../services/platformOrganisations";
import { getMemberRolesForActiveOrg } from "../utils/orgScopedRoles";
import {
  applyAccentPaletteToDocument,
  buildAccentPaletteFromPrimary,
  isValidThemeColorHex,
} from "../utils/orgTheme";
import { TaskLifecycleActions } from "./TaskLifecycleActions";
import { FloatingMenuPortal } from "./FloatingMenuPortal";

/** Full display name for tooltip / labels when active org may omit `name` on the object. */
function getActiveOrganisationDisplayName(user: User): string {
  const ao = user.activeOrganisation as OrgContext | string | null | undefined;
  if (ao && typeof ao === "object" && ao.name?.trim()) {
    return ao.name.trim();
  }
  const id =
    typeof ao === "string"
      ? ao
      : ao && typeof ao === "object"
        ? ao._id
        : undefined;
  if (id && user.organisations?.length) {
    const match = user.organisations.find((o) => o._id === id);
    if (match?.name?.trim()) return match.name.trim();
  }
  return user.organisations?.[0]?.name?.trim() ?? "No organisation";
}

interface LayoutProps {
  children: React.ReactNode;
  currentUser: User | null;
  onSwitchUser: (roleCode: string) => void;
  onSwitchOrg: (orgId: string) => Promise<void>;
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

const MAX_VISIBLE_SIDEBAR_ROLES = 1;

type OrganisationShell = {
  _id?: string;
  name?: string;
  logo?: string;
};

const getOrganisationLogoSrc = (logo?: string | null) =>
  logo ? `${API_BASE_URL.replace(/\/api$/, "")}${logo}` : "";

const OrganisationIdentityBadge: React.FC<{
  organisation: OrganisationShell | null;
  isDarkMode: boolean;
}> = ({ organisation, isDarkMode }) => {
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const organisationName = organisation?.name?.trim() || "Tasker";
  const hasCustomLogo = Boolean(organisation?.logo);

  const resolvedLogoSrc =
    hasCustomLogo && !logoLoadFailed
      ? getOrganisationLogoSrc(organisation?.logo)
      : isDarkMode
        ? "/logo-dark.png"
        : "/logo-light.png";

  return (
    <div
      className="lg:hidden shrink-0 flex items-center gap-2 surface-panel px-2.5 py-1.5"
      title={organisationName}
      aria-label={`Organisation: ${organisationName}`}
    >
      <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-control bg-surface-muted border border-border">
        <img
          src={resolvedLogoSrc}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-contain object-center p-0.5"
          width={32}
          height={32}
          onError={() => {
            if (hasCustomLogo && !logoLoadFailed) {
              setLogoLoadFailed(true);
            }
          }}
        />
      </div>
      <span className="hidden sm:inline min-w-0 max-w-[10rem] truncate text-sm font-semibold text-foreground leading-tight">
        {organisationName}
      </span>
    </div>
  );
};

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

const HeaderIconButton = React.forwardRef<
  HTMLButtonElement,
  {
    icon: any;
    label: string;
    onClick?: () => void;
    badge?: boolean;
    badgeCount?: number;
    className?: string;
    iconClassName?: string;
  }
>(function HeaderIconButton(
  {
    icon: Icon,
    label,
    onClick,
    badge = false,
    badgeCount = 0,
    className = "",
    iconClassName = "",
  },
  ref,
) {
  return (
  <button
    ref={ref}
    type="button"
    onClick={onClick}
    className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-border bg-surface text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-colors ${className}`}
    aria-label={label}
    title={label}
  >
    <Icon className={`w-[18px] h-[18px] ${iconClassName}`} />
    {badge && badgeCount > 0 && (
      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
        {badgeCount > 9 ? "9+" : badgeCount}
      </span>
    )}
  </button>
  );
});

export const Layout: React.FC<LayoutProps> = ({
  children,
  currentUser,
  onSwitchUser,
  onSwitchOrg,
  isDarkMode,
  onToggleTheme,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  /** Central shell (logo/theme) only on the public task list `#/jobs`, not login/landing. */
  const isGuestPublicJobsList =
    !currentUser && location.pathname === "/jobs";
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
  const [switchingOrg, setSwitchingOrg] = useState<string | null>(null);
  const [systemVersion, setSystemVersion] = useState<string | null>(null);
  const [isVersionLoading, setIsVersionLoading] = useState(true);
  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Job[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchAnchorRef = useRef<HTMLDivElement>(null);
  const searchMenuRef = useRef<HTMLDivElement>(null);
  const orgSwitcherButtonRef = useRef<HTMLButtonElement>(null);
  const orgSwitcherMenuRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [searchRefreshNonce, setSearchRefreshNonce] = useState(0);
  const [publicCentralOrg, setPublicCentralOrg] = useState<PublicPlatformOrg | null>(null);

  // Load Central org shell only on signed-out /jobs (public task list).
  useEffect(() => {
    if (currentUser) {
      setPublicCentralOrg(null);
      return;
    }
    if (!isGuestPublicJobsList) {
      setPublicCentralOrg(null);
      return;
    }
    let cancelled = false;
    void getPublicCentralOrganisation().then((o) => {
      if (!cancelled) setPublicCentralOrg(o);
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser, isGuestPublicJobsList]);

  // Active organisation theme overrides user accent; Central shell when signed out.
  useEffect(() => {
    const org = currentUser?.activeOrganisation as { themeColor?: string } | undefined;
    const hex = typeof org?.themeColor === "string" ? org.themeColor.trim() : "";
    if (isValidThemeColorHex(hex)) {
      applyAccentPaletteToDocument(buildAccentPaletteFromPrimary(hex));
      return;
    }
    if (!currentUser && isGuestPublicJobsList) {
      const ph =
        typeof publicCentralOrg?.themeColor === "string"
          ? publicCentralOrg.themeColor.trim()
          : "";
      if (isValidThemeColorHex(ph)) {
        applyAccentPaletteToDocument(buildAccentPaletteFromPrimary(ph));
        return;
      }
    }
    const storedName = localStorage.getItem("accentColor") || "AlSiraat";
    const savedColor = COLORS.find((c) => c.name === storedName);
    if (savedColor) {
      applyAccentPaletteToDocument(savedColor.palette);
    }
  }, [
    currentUser?.activeOrganisation,
    currentUser,
    publicCentralOrg,
    isGuestPublicJobsList,
  ]);

  // Leaving Layout (e.g. /jobs → /login): reset CSS accents so auth/landing pages are not tinted by Central.
  useEffect(() => {
    return () => {
      const stored = localStorage.getItem("accentColor") || "AlSiraat";
      const saved = COLORS.find((c) => c.name === stored);
      if (saved) applyAccentPaletteToDocument(saved.palette);
    };
  }, []);

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

  // Public app version (shown in sidebar footer for everyone)
  useEffect(() => {
    let isMounted = true;
    const loadSystemVersion = async () => {
      try {
        const response = await api.getSystemVersion();
        if (isMounted) {
          setSystemVersion(response?.version || "unknown");
          setIsVersionLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setSystemVersion("unknown");
          setIsVersionLoading(false);
        }
      }
    };
    loadSystemVersion();
    return () => {
      isMounted = false;
    };
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inNotifications =
        notificationRef.current?.contains(target) ||
        notificationMenuRef.current?.contains(target);
      if (!inNotifications) {
        setShowNotifications(false);
      }
      const inSearch =
        searchRef.current?.contains(target) ||
        searchMenuRef.current?.contains(target);
      if (!inSearch) {
        setShowSearchResults(false);
      }
      const inOrgSwitcher =
        orgSwitcherButtonRef.current?.contains(target) ||
        orgSwitcherMenuRef.current?.contains(target);
      if (!inOrgSwitcher) {
        setShowOrgSwitcher(false);
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
            `${API_BASE_URL}/tasks/tab/search?search=${encodeURIComponent(searchQuery)}`,
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
  }, [searchQuery, currentUser, searchRefreshNonce]);

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
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "—";
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

  if (!currentUser && location.pathname === "/") {
    return (
      <div className="transition-colors duration-300 overflow-x-hidden">
        {children}
      </div>
    );
  }

  const navItems: {
    icon: any;
    label: string;
    path: string;
    protected?: boolean;
    permission?: Permission;
    /** If set, item is only shown when user has ANY of these permissions */
    anyPermission?: Permission[];
  }[] = [
    {
      icon: LayoutDashboard,
      label: "Overview",
      path: "/dashboard",
      protected: true,
      permission: Permission.DASHBOARD_VIEW,
    },
    { icon: Briefcase, label: "Search Tasks", path: "/jobs" },

    // ── Applicant menu ──────────────────────────────────────────────────────
    {
      icon: FileText,
      label: "My Applications",
      path: "/my-applications",
      protected: true,
      anyPermission: [
        Permission.APPLICATION_CREATE,
        Permission.APPLICATION_READ_OWN,
      ],
    },
    {
      icon: ClipboardCheck,
      label: "My Tasks",
      path: "/my-tasks",
      protected: true,
      anyPermission: [
        Permission.APPLICATION_CREATE,
        Permission.APPLICATION_READ_OWN,
      ],
    },

    // ── Task creator / manager menu ─────────────────────────────────────────
    {
      icon: Megaphone,
      label: "My Ads",
      path: "/my-ads",
      protected: true,
      permission: Permission.TASK_CREATE,
    },

    // ── Manager / admin: pending tasks ─────────────────────────────────────
    {
      icon: ClipboardList,
      label: "Pending Approvals",
      path: "/pending-approvals",
      protected: true,
      permission: Permission.TASK_VIEW_PENDING,
    },

    // ── Common ──────────────────────────────────────────────────────────────
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
    // Single permission guard
    if (item.permission && currentUser) {
      if (!currentUser.permissions?.includes(item.permission)) return false;
    }
    // Any-of permission guard
    if (item.anyPermission && currentUser) {
      const hasAny = item.anyPermission.some((p) =>
        currentUser.permissions?.includes(p),
      );
      if (!hasAny) return false;
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
        redirectUrl =
          typeof res.redirectUrl === "string" &&
          res.redirectUrl.startsWith("http")
            ? res.redirectUrl
            : undefined;
      } catch {
        redirectUrl = undefined;
      }
    }
    api.logout();
    invalidatePlatformOrganisationCaches();
    if (redirectUrl) {
      window.location.replace(redirectUrl);
      return;
    }
    navigate("/login");
    window.location.reload();
  };

  const currentMemberRoles = currentUser
    ? getMemberRolesForActiveOrg(currentUser)
    : [];

  const browseShellOrg = currentUser
    ? (currentUser.activeOrganisation as OrganisationShell | null)
    : isGuestPublicJobsList
      ? publicCentralOrg
      : null;
  const mobileOrganisationOrg = currentUser
    ? browseShellOrg ?? currentUser.organisations?.[0] ?? null
    : browseShellOrg;

  return (
    <div className="flex h-screen overflow-hidden font-sans text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-md z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-surface border-r border-border shadow-lg lg:shadow-none transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar branding: vertical stack, fixed logo, text truncates with native tooltip */}
          <div className="shrink-0 border-b border-border px-5 pt-3 pb-2 min-w-0 flex flex-col items-center text-center">
            <Link
              to="/"
              className="flex flex-col items-center gap-1.5 min-w-0 w-full outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-control -mx-1 px-1"
            >
              <div className="w-12 h-12 max-w-12 max-h-12 shrink-0 flex items-center justify-center relative overflow-hidden rounded-control">
                <img
                  src={
                    browseShellOrg?.logo
                      ? `${API_BASE_URL.replace(/\/api$/, "")}${browseShellOrg.logo}`
                      : isDarkMode
                        ? "/logo-dark.png"
                        : "/logo-light.png"
                  }
                  alt={browseShellOrg?.name || "Tasker Logo"}
                  className="w-12 h-12 max-w-full max-h-full object-contain object-center drop-shadow-sm"
                  width={48}
                  height={48}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement!.innerHTML =
                      '<div class="w-12 h-12 max-w-12 max-h-12 bg-gradient-to-tr from-primary to-primaryHover rounded-control flex items-center justify-center shadow-md shadow-primary/20"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-white w-7 h-7"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg></div>';
                  }}
                />
              </div>
              {!currentUser && (
                <div className="min-w-0 w-full text-center">
                  <span
                    className="block text-xl font-semibold text-foreground tracking-tight leading-none truncate"
                    title={browseShellOrg?.name ?? "Tasker"}
                  >
                    {browseShellOrg?.name ?? "Tasker"}
                  </span>
                </div>
              )}
            </Link>

            {currentUser && (
              <div className="mt-1.5 flex flex-col items-center min-w-0 w-full">
                {(currentUser.organisations?.length ?? 0) > 1 ? (
                  <div className="relative min-w-0 w-full">
                    <button
                      ref={orgSwitcherButtonRef}
                      type="button"
                      title={getActiveOrganisationDisplayName(currentUser)}
                      onClick={() => {
                        if ((currentUser.organisations?.length ?? 0) > 1) {
                          setShowOrgSwitcher((v) => !v);
                        }
                      }}
                      className={`w-full min-w-0 flex flex-col items-center gap-px px-3 py-1.5 rounded-control border border-border transition-colors ${
                        (currentUser.organisations?.length ?? 0) > 1
                          ? "bg-surface-muted hover:bg-surface"
                          : "bg-surface-muted/50 cursor-not-allowed opacity-70"
                      }`}
                    >
                      <p
                        className="w-full min-w-0 text-sm font-semibold text-foreground truncate text-center leading-tight"
                      >
                        {getActiveOrganisationDisplayName(currentUser)}
                      </p>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform ${showOrgSwitcher ? "rotate-180" : ""}`}
                      />
                    </button>

                    <FloatingMenuPortal
                      isOpen={
                        showOrgSwitcher &&
                        (currentUser.organisations?.length ?? 0) > 1
                      }
                      anchorRef={orgSwitcherButtonRef}
                      menuRef={orgSwitcherMenuRef}
                      maxMenuHeight={320}
                      recalculateDeps={[currentUser.organisations?.length]}
                      className="glass-overlay rounded-surface shadow-lg overflow-hidden animate-slide-up"
                    >
                        {currentUser.organisations.map((org) => {
                          const activeId =
                            (currentUser.activeOrganisation as any)?._id ??
                            currentUser.organisations?.[0]?._id;
                          const isActive = org._id === activeId;
                          return (
                            <button
                              key={org._id}
                              type="button"
                              disabled={isActive || switchingOrg !== null}
                              onClick={async () => {
                                if (isActive) return;
                                setSwitchingOrg(org._id);
                                setShowOrgSwitcher(false);
                                await onSwitchOrg(org._id);
                                setSwitchingOrg(null);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                                isActive
                                  ? "bg-primary/10 cursor-default"
                                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                              }`}
                            >
                              <img
                                src={
                                  org.logo
                                    ? `${API_BASE_URL.replace(/\/api$/, "")}${org.logo}`
                                    : isDarkMode
                                      ? "/logo-dark.png"
                                      : "/logo-light.png"
                                }
                                alt={org.name}
                                className="w-7 h-7 rounded-lg object-contain bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700 shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-xs font-bold truncate ${
                                    isActive
                                      ? "text-primary"
                                      : "text-zinc-800 dark:text-white"
                                  }`}
                                  title={org.name}
                                >
                                  {org.name}
                                </p>
                              </div>
                              {isActive && (
                                <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                              )}
                              {switchingOrg === org._id && (
                                <div className="w-4 h-4 border-2 border-zinc-300 border-t-primary rounded-full animate-spin shrink-0" />
                              )}
                            </button>
                          );
                        })}
                    </FloatingMenuPortal>
                  </div>
                ) : (
                  <p
                    className="text-sm font-semibold text-foreground truncate min-w-0 w-full text-center leading-tight"
                    title={getActiveOrganisationDisplayName(currentUser)}
                  >
                    {getActiveOrganisationDisplayName(currentUser)}
                  </p>
                )}
              </div>
            )}
          </div>

          <nav className="flex-1 px-4 pt-2 pb-5 space-y-2 overflow-y-auto min-w-0">
            {currentUser?.permissions?.includes(Permission.TASK_CREATE) && (
              <Link
                to="/post-job"
                className="flex items-center justify-center w-full h-10 px-3 mb-3 text-sm font-medium text-white bg-primary hover:bg-primaryHover rounded-control transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                <span>Create Task</span>
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
                    key={item.label}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center py-2.5 px-3 rounded-control text-sm font-medium transition-colors relative group ${isActive ? "bg-surface-muted text-primary" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"}`}
                  >
                    <item.icon
                      className={`w-[18px] h-[18px] mr-3 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="p-4 border-t border-border">
            <div className="mb-3 flex items-center justify-center gap-1.5 rounded-control border border-border bg-surface-muted px-3 py-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Version
              </span>
              <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 font-mono">
                {isVersionLoading ? "..." : systemVersion}
              </span>
            </div>
            {currentUser ? (
              <div
                className="flex items-center p-2.5 rounded-control hover:bg-surface-muted transition-colors group cursor-pointer"
                onClick={() => navigate("/profile")}
              >
                <UserAvatar
                  src={currentUser.avatar}
                  name={currentUser.name}
                  className="mr-3"
                />
                <div className="flex-1 min-w-0 ml-3">
                  <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {currentUser.name}
                  </p>
                  {currentMemberRoles.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-0.5 mt-0.5">
                      {currentMemberRoles
                        .slice(0, MAX_VISIBLE_SIDEBAR_ROLES)
                        .map((role) => (
                          <span
                            key={role.id}
                            className={`text-xs font-medium rounded-control px-2 py-0.5 border border-border text-muted-foreground bg-surface ${
                              role.isActive === false ? "opacity-60 line-through" : ""
                            }`}
                            title={
                              role.isActive === false
                                ? `${role.name} (inactive)`
                                : role.name
                            }
                          >
                            {role.name}
                          </span>
                        ))}
                      {currentMemberRoles.length > MAX_VISIBLE_SIDEBAR_ROLES && (
                        <span
                          className="text-xs font-medium rounded-control px-2 py-0.5 border border-border text-muted-foreground bg-surface"
                          title={currentMemberRoles
                            .slice(MAX_VISIBLE_SIDEBAR_ROLES)
                            .map((r) =>
                              r.isActive === false ? `${r.name} (inactive)` : r.name,
                            )
                            .join(", ")}
                        >
                          +{currentMemberRoles.length - MAX_VISIBLE_SIDEBAR_ROLES} more
                        </span>
                      )}
                    </div>
                  ) : null}
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
                className="w-full h-10 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-control text-sm font-medium hover:bg-black dark:hover:bg-zinc-100 transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-3 sm:px-5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <HeaderIconButton
              icon={Menu}
              label="Open menu"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
              iconClassName="w-5 h-5"
            />

            {mobileOrganisationOrg && (
              <OrganisationIdentityBadge
                key={mobileOrganisationOrg?._id || mobileOrganisationOrg?.name || "organisation"}
                organisation={mobileOrganisationOrg}
                isDarkMode={isDarkMode}
              />
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <HeaderIconButton
              icon={isDarkMode ? Sun : Moon}
              label="Theme"
              onClick={onToggleTheme}
              iconClassName="w-[18px] h-[18px]"
            />

              {/* Search Bar with Dropdown */}
            <div className="hidden md:block relative" ref={searchRef}>
                <div
                  ref={searchAnchorRef}
                  className="flex h-9 items-center px-3 border border-border bg-surface rounded-control w-64 focus-within:ring-2 focus-within:ring-primary/30 transition-colors"
                >
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

                <FloatingMenuPortal
                  isOpen={showSearchResults && searchResults.length > 0}
                  anchorRef={searchAnchorRef}
                  menuRef={searchMenuRef}
                  maxMenuHeight={384}
                  recalculateDeps={[searchResults.length]}
                  className="glass-overlay rounded-surface shadow-lg overflow-y-auto animate-slide-up flex flex-col min-h-0"
                >
                    <div className="p-2">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-3 py-2">
                        Tasks ({searchResults.length})
                      </p>
                      {searchResults.map((task) => (
                        <div
                          key={task.id}
                          className="w-full flex items-center gap-1 px-2 py-1 rounded-control hover:bg-surface-muted transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              navigate(`/jobs/${task.id}`);
                              setShowSearchResults(false);
                              setSearchQuery("");
                            }}
                            className="flex flex-1 min-w-0 items-center gap-3 px-1 py-2 text-left rounded-lg"
                          >
                          <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                            <Briefcase className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                              {task.title}
                            </p>
                            <p className="text-xs text-zinc-500 truncate">
                              {resolveTaskCategoryLabel(task)}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 text-[10px] font-bold rounded-lg shrink-0 ${
                              task.status === "Published"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-zinc-100 text-zinc-500"
                            }`}
                          >
                            {task.status}
                          </span>
                          </button>
                          {currentUser && (
                            <TaskLifecycleActions
                              job={task}
                              currentUser={currentUser}
                              layout="compact"
                              onAfterMutation={() =>
                                setSearchRefreshNonce((n) => n + 1)
                              }
                            />
                          )}
                        </div>
                      ))}
                    </div>
                </FloatingMenuPortal>

                <FloatingMenuPortal
                  isOpen={
                    showSearchResults &&
                    searchQuery.length >= 2 &&
                    searchResults.length === 0 &&
                    !isSearching
                  }
                  anchorRef={searchAnchorRef}
                  menuRef={searchMenuRef}
                  maxMenuHeight={200}
                  className="glass-overlay rounded-surface shadow-lg p-6 text-center animate-slide-up"
                >
                      <Search className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                      <p className="text-sm text-zinc-500">No tasks found</p>
                </FloatingMenuPortal>
              </div>

            {/* Notifications Bell */}
            <div className="relative" ref={notificationRef}>
              <HeaderIconButton
                ref={notificationButtonRef}
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
                iconClassName="w-[18px] h-[18px]"
              />

              <FloatingMenuPortal
                isOpen={showNotifications && !!currentUser}
                anchorRef={notificationButtonRef}
                menuRef={notificationMenuRef}
                menuWidth={384}
                align="end"
                maxMenuHeight={512}
                recalculateDeps={[notifications.length, unreadCount]}
                className="glass-overlay rounded-surface shadow-lg overflow-hidden animate-slide-up flex flex-col"
              >
                  <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between shrink-0">
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

                  <div className="max-h-80 overflow-y-auto min-h-0">
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
                    <div className="p-3 border-t border-zinc-200 dark:border-zinc-700 shrink-0">
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
              </FloatingMenuPortal>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5">
          <div className="max-w-7xl mx-auto min-w-0 animate-slide-up">{children}</div>
        </main>
      </div>
    </div>
  );
};
