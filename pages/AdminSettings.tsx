import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Edit2,
  Shield,
  Layers,
  Plus,
  Users,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Trash2,
  Save,
  RefreshCw,
  Lock,
  ExternalLink,
  Mail,
  Sparkles,
  Gift,
} from "lucide-react";
import { Loading } from "../components/Loading";
import { useNavigate } from "react-router-dom";
import { UserRole } from "../types";
import { useToast } from "../components/Toast";
import { API_BASE_URL } from "../services/api";
import { GroupManagement } from "./GroupManagement";
import { UserManagement } from "./UserManagement";
import { EmailNotificationSettings } from "./EmailNotificationSettings";
import { OrganisationManagement } from "./OrganisationManagement";
import { ArrowLeft } from "lucide-react";
import {
  ACTIVE_ORG_CHANGED_EVENT,
} from "../utils/orgScopedRoles";
import { db } from "../services/database";

interface Permission {
  _id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  isSystem: boolean;
}

interface Role {
  _id: string;
  name: string;
  code: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  isActive: boolean;
  color: string;
  oidcMapping: string[];
  organisation?: string | { _id: string } | null;
}

function withOrganisationQuery(url: string, organisationId: string): string {
  if (!organisationId) return url;
  const joiner = url.includes("?") ? "&" : "?";
  return `${url}${joiner}organisation=${encodeURIComponent(organisationId)}`;
}

function organisationParamFromRole(
  role: Role | undefined,
  activeOrgId: string,
): string {
  const raw = role?.organisation;
  if (raw && typeof raw === "object" && "_id" in raw) {
    return String((raw as { _id: string })._id);
  }
  if (typeof raw === "string") return raw;
  return activeOrgId;
}

function organisationParamFromCategory(
  cat: { organisation?: string | { _id: string } | null },
  activeOrgId: string,
): string {
  const raw = cat?.organisation;
  if (raw && typeof raw === "object" && "_id" in raw) {
    return String((raw as { _id: string })._id);
  }
  if (typeof raw === "string") return raw;
  return activeOrgId;
}

function organisationParamFromReward(
  rt: { organisation?: string | { _id: string } | null },
  activeOrgId: string,
): string {
  const raw = rt?.organisation;
  if (raw && typeof raw === "object" && "_id" in raw) {
    return String((raw as { _id: string })._id);
  }
  if (typeof raw === "string") return raw;
  return activeOrgId;
}

const AiSettingsPanel: React.FC<{ reloadKey?: number }> = ({
  reloadKey = 0,
}) => {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({ provider: "gemini", apiKey: "" });
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE_URL}/ai`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setSettings({ provider: data.provider || "gemini", apiKey: "" });
        setHasKey(data.hasApiKey);
      })
      .catch(() => showError("Failed to load AI settings"))
      .finally(() => setLoading(false));
  }, [reloadKey, showError]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = { provider: settings.provider };
      if (settings.apiKey) payload.apiKey = settings.apiKey;
      
      const res = await fetch(`${API_BASE_URL}/ai`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      showSuccess("AI Settings saved");
      if (settings.apiKey) setHasKey(true);
      setSettings((s) => ({ ...s, apiKey: "" }));
    } catch {
      showError("Failed to save AI settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading message="Loading AI settings..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">
          AI Settings
        </h2>
        <p className="text-zinc-500 font-medium mt-1">
          Configure the AI provider and API keys for the active organisation.
          Switch organisation in the sidebar to manage another community.
        </p>
      </div>

      <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-8">
        <div className="space-y-4">
          <label className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">
            AI Provider
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { id: "gemini", label: "Google Gemini" },
              { id: "chatgpt", label: "OpenAI ChatGPT" },
              { id: "anthropic", label: "Anthropic Claude" },
            ].map((p) => (
              <label
                key={p.id}
                className={`flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  settings.provider === p.id
                    ? "border-primary bg-primary/5"
                    : "border-zinc-200 dark:border-zinc-700 hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="provider"
                    value={p.id}
                    checked={settings.provider === p.id}
                    onChange={() => setSettings({ ...settings, provider: p.id })}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="font-bold text-zinc-900 dark:text-white">
                    {p.label}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">
            API Key
          </label>
          <p className="text-xs text-zinc-500 mb-2">
            Leave blank to keep the existing key. {hasKey && <span className="text-emerald-500 font-bold ml-1">An API key is currently saved.</span>}
          </p>
          <input
            type="password"
            placeholder="sk-..."
            value={settings.apiKey}
            onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
            className="w-full p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 focus:border-primary outline-none text-zinc-900 dark:text-white font-mono"
          />
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-primary text-white font-black text-sm rounded-xl hover:bg-primaryHover transition-colors flex items-center gap-2"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export const AdminSettings: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    | "users"
    | "roles"
    | "permissions"
    | "categories"
    | "rewards"
    | "groups"
    | "email"
    | "ai"
    | "organisations"
  >("users");

  // Dynamic roles and permissions state
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(
    null,
  );
  const [showNewRoleForm, setShowNewRoleForm] = useState(false);
  const [showNewPermissionForm, setShowNewPermissionForm] = useState(false);
  const [oidcMappingInput, setOidcMappingInput] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  // New role form state
  const [newRole, setNewRole] = useState({
    name: "",
    code: "",
    description: "",
    color: "#6B7280",
    permissions: [] as string[],
  });

  // New permission form state
  const [newPermission, setNewPermission] = useState({
    code: "",
    name: "",
    description: "",
    category: "General",
  });

  // Task categories state
  const [taskCategories, setTaskCategories] = useState<any[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [editingCat, setEditingCat] = useState<any | null>(null);
  const [showNewCatForm, setShowNewCatForm] = useState(false);
  const [newCat, setNewCat] = useState({
    name: "",
    code: "",
    description: "",
    color: "#6366F1",
    icon: "📋",
  });

  const [rewardTypesList, setRewardTypesList] = useState<any[]>([]);
  const [rtLoading, setRtLoading] = useState(false);
  const [editingRt, setEditingRt] = useState<any | null>(null);
  const [showNewRtForm, setShowNewRtForm] = useState(false);
  const [newRt, setNewRt] = useState({
    name: "",
    code: "",
    description: "",
    color: "#6366F1",
    valueKind: "currency",
    calculationMode: "fixed",
  });
  const rewardTypesLoadSeqRef = useRef(0);

  const [adminOrgSync, setAdminOrgSync] = useState(0);
  const [activeOrgName, setActiveOrgName] = useState("");
  const [activeOrgId, setActiveOrgId] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const refreshActiveOrgLabel = useCallback(async () => {
    try {
      const user = await db.getCurrentUser();
      setIsSuperAdmin(!!(user as { isSuperAdmin?: boolean } | null)?.isSuperAdmin);
      const org = user?.activeOrganisation;
      if (typeof org === "object" && org && "_id" in org) {
        setActiveOrgName((org as { name?: string }).name || "");
        setActiveOrgId(String((org as { _id: string })._id));
      } else {
        setActiveOrgName("");
        setActiveOrgId("");
      }
    } catch {
      setActiveOrgName("");
      setActiveOrgId("");
      setIsSuperAdmin(false);
    }
  }, []);

  useEffect(() => {
    void refreshActiveOrgLabel();
  }, [adminOrgSync, refreshActiveOrgLabel]);

  useEffect(() => {
    if (!isSuperAdmin && activeTab === "organisations") {
      setActiveTab("users");
    }
  }, [isSuperAdmin, activeTab]);

  useEffect(() => {
    const bump = () => setAdminOrgSync((n) => n + 1);
    window.addEventListener(ACTIVE_ORG_CHANGED_EVENT, bump);
    return () => window.removeEventListener(ACTIVE_ORG_CHANGED_EVENT, bump);
  }, []);

  useEffect(() => {
    loadData();
    loadCategories();
  }, [adminOrgSync]);

  const loadRewardTypes = useCallback(async () => {
    const requestSeq = ++rewardTypesLoadSeqRef.current;
    setRtLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reward-types?all=true`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      const list = await res.json();
      if (requestSeq !== rewardTypesLoadSeqRef.current) return;
      setRewardTypesList(Array.isArray(list) ? list : []);
    } catch {
      if (requestSeq === rewardTypesLoadSeqRef.current) {
        showError("Failed to load reward types");
      }
    } finally {
      if (requestSeq === rewardTypesLoadSeqRef.current) {
        setRtLoading(false);
      }
    }
  }, [showError]);

  useEffect(() => {
    if (activeTab !== "rewards") return;
    void loadRewardTypes();
  }, [activeTab, adminOrgSync, loadRewardTypes]);

  const loadCategories = async () => {
    setCatLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/task-categories?all=true`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      const data = await res.json();
      // fetch all (including inactive) for admin — use a separate admin-all endpoint if exists, else include inactive via query
      setTaskCategories(Array.isArray(data) ? data : []);
    } catch {
      showError("Failed to load categories");
    } finally {
      setCatLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [rolesData, permissionsData] = await Promise.all([
        fetchRoles(),
        fetchPermissions(),
      ]);
      setRoles(rolesData);
      setPermissions(permissionsData);

      // Expand all categories by default
      const cats = new Set(permissionsData.map((p: Permission) => p.category));
      setExpandedCategories(cats);
    } catch (err: any) {
      showError("Failed to load roles and permissions");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async (): Promise<Role[]> => {
    const response = await fetch(`${API_BASE_URL}/roles`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch roles");
    return response.json();
  };

  const fetchPermissions = async (): Promise<Permission[]> => {
    const response = await fetch(`${API_BASE_URL}/roles/permissions`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch permissions");
    return response.json();
  };

  const handleSeedDefaults = async () => {
    try {
      const response = await fetch(
        withOrganisationQuery(`${API_BASE_URL}/roles/seed`, activeOrgId),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Failed to seed defaults");
      }
      showSuccess(
        data.message ||
          "Default permissions and system roles updated successfully.",
      );
      loadData();
    } catch (err: any) {
      showError(err.message);
    }
  };

  // Role CRUD operations
  const handleCreateRole = async () => {
    try {
      const response = await fetch(
        withOrganisationQuery(`${API_BASE_URL}/roles`, activeOrgId),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newRole),
        },
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message);
      }
      showSuccess("Role created successfully");
      setShowNewRoleForm(false);
      setNewRole({
        name: "",
        code: "",
        description: "",
        color: "#6B7280",
        permissions: [],
      });
      loadData();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleUpdateRole = async (role: Role) => {
    try {
      const response = await fetch(
        withOrganisationQuery(
          `${API_BASE_URL}/roles/${role._id}`,
          organisationParamFromRole(role, activeOrgId),
        ),
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(role),
        },
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message);
      }
      showSuccess("Role updated successfully");
      setEditingRole(null);
      loadData();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    const role = roles.find((r) => r._id === roleId);
    if (role?.isSystem) {
      showError("System roles cannot be deleted");
      return;
    }
    if (!confirm("Are you sure you want to delete this role?")) return;
    try {
      const response = await fetch(
        withOrganisationQuery(
          `${API_BASE_URL}/roles/${roleId}`,
          organisationParamFromRole(role, activeOrgId),
        ),
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        },
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message);
      }
      showSuccess("Role deleted successfully");
      loadData();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const toggleRolePermission = (role: Role, permissionCode: string) => {
    const updatedPermissions = role.permissions.includes(permissionCode)
      ? role.permissions.filter((p) => p !== permissionCode)
      : [...role.permissions, permissionCode];

    setEditingRole({ ...role, permissions: updatedPermissions });
  };

  // Permission CRUD operations
  const handleCreatePermission = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/roles/permissions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newPermission),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message);
      }
      showSuccess("Permission created successfully");
      setShowNewPermissionForm(false);
      setNewPermission({
        code: "",
        name: "",
        description: "",
        category: "General",
      });
      loadData();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleUpdatePermission = async (permission: Permission) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/roles/permissions/${permission._id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(permission),
        },
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message);
      }
      showSuccess("Permission updated successfully");
      setEditingPermission(null);
      loadData();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleDeletePermission = async (permissionId: string) => {
    const perm = permissions.find((p) => p._id === permissionId);
    if (perm?.isSystem) {
      showError("System permissions cannot be deleted");
      return;
    }
    if (!confirm("Are you sure you want to delete this permission?")) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/roles/permissions/${permissionId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        },
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message);
      }
      showSuccess("Permission deleted successfully");
      loadData();
    } catch (err: any) {
      showError(err.message);
    }
  };

  // Group permissions by category
  const permissionsByCategory = permissions.reduce(
    (acc, perm) => {
      if (!acc[perm.category]) acc[perm.category] = [];
      acc[perm.category].push(perm);
      return acc;
    },
    {} as Record<string, Permission[]>,
  );

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  const renderRoles = () => {
    if (loading) return <Loading message="Loading roles..." />;

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">
              Role Management
            </h2>
            <p className="text-zinc-500 font-medium mt-1">
              {activeOrgName ? (
                <>
                  System roles apply everywhere. Custom roles are managed for{" "}
                  <span className="font-bold text-zinc-800 dark:text-zinc-100">
                    {activeOrgName}
                  </span>
                  .
                </>
              ) : (
                "Select an organisation in the sidebar to tie custom roles to that community. Without an active organisation, Reset Defaults also runs platform-wide legacy role cleanup."
              )}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSeedDefaults}
              className="flex items-center px-4 py-2 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-white/50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 transition-all"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset Defaults
            </button>
            {!showNewRoleForm && (
              <button
                onClick={() => setShowNewRoleForm(true)}
                className="flex items-center px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primaryHover transition-all shadow-lg shadow-primary/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Role
              </button>
            )}
          </div>
        </div>

        {/* New Role Form */}
        {showNewRoleForm && (
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              Create New Role
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Role Name"
                value={newRole.name}
                onChange={(e) =>
                  setNewRole({ ...newRole, name: e.target.value })
                }
                className="p-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
              />
              <input
                type="text"
                placeholder="Role Code (e.g., custom_role)"
                value={newRole.code}
                onChange={(e) =>
                  setNewRole({
                    ...newRole,
                    code: e.target.value.toLowerCase().replace(/\s/g, "_"),
                  })
                }
                className="p-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
              />
            </div>
            <textarea
              placeholder="Description"
              value={newRole.description}
              onChange={(e) =>
                setNewRole({ ...newRole, description: e.target.value })
              }
              className="w-full p-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
              rows={2}
            />
            <div className="flex items-center gap-3">
              <label className="text-sm font-bold text-zinc-500">Color:</label>
              <input
                type="color"
                value={newRole.color}
                onChange={(e) =>
                  setNewRole({ ...newRole, color: e.target.value })
                }
                className="w-10 h-10 rounded-lg cursor-pointer"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCreateRole}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-500 text-white rounded-xl font-bold text-sm"
              >
                <Save className="w-4 h-4" />
                Create Role
              </button>
              <button
                onClick={() => setShowNewRoleForm(false)}
                className="px-5 py-2 text-zinc-500 hover:text-zinc-900 font-bold text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Roles List */}
        <div className="space-y-4">
          {roles.map((role) => (
            <div key={role._id} className="glass-card p-6 rounded-2xl">
              {editingRole?._id === role._id ? (
                // Edit Mode
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: editingRole.color }}
                      />
                      <input
                        type="text"
                        value={editingRole.name}
                        onChange={(e) =>
                          setEditingRole({
                            ...editingRole,
                            name: e.target.value,
                          })
                        }
                        className="text-xl font-bold bg-transparent border-b-2 border-primary outline-none dark:text-white"
                      />
                      {role.isSystem && (
                        <span className="px-2 py-1 text-[10px] font-bold uppercase bg-amber-100 text-amber-700 rounded-lg">
                          System
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateRole(editingRole)}
                        title="Save role changes"
                        aria-label="Save role changes"
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Save Role
                      </button>
                      <button
                        onClick={() => setEditingRole(null)}
                        title="Cancel editing"
                        aria-label="Cancel editing"
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 rounded-xl text-sm font-bold transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={editingRole.description}
                    onChange={(e) =>
                      setEditingRole({
                        ...editingRole,
                        description: e.target.value,
                      })
                    }
                    className="w-full p-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-white"
                    rows={2}
                  />

                  {/* OIDC / ADFS Role Mapping */}
                  <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700 space-y-3">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">
                        OIDC / ADFS Role Mapping
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        ADFS claim values that automatically assign this role on
                        SSO login. Press Enter or comma to add.
                      </p>
                    </div>
                    {(editingRole.oidcMapping ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {(editingRole.oidcMapping ?? []).map((v) => (
                          <span
                            key={v}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-mono font-medium"
                          >
                            {v}
                            <button
                              onClick={() =>
                                setEditingRole({
                                  ...editingRole,
                                  oidcMapping: (
                                    editingRole.oidcMapping ?? []
                                  ).filter((m) => m !== v),
                                })
                              }
                              className="hover:text-red-500 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Claim value (e.g. OrgAdmin)"
                        value={oidcMappingInput}
                        onChange={(e) => setOidcMappingInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            const val = oidcMappingInput
                              .trim()
                              .replace(/,$/, "");
                            if (
                              val &&
                              !(editingRole.oidcMapping ?? []).includes(val)
                            ) {
                              setEditingRole({
                                ...editingRole,
                                oidcMapping: [
                                  ...(editingRole.oidcMapping ?? []),
                                  val,
                                ],
                              });
                            }
                            setOidcMappingInput("");
                          }
                        }}
                        className="flex-1 p-2.5 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400"
                      />
                      <button
                        onClick={() => {
                          const val = oidcMappingInput.trim();
                          if (
                            val &&
                            !(editingRole.oidcMapping ?? []).includes(val)
                          ) {
                            setEditingRole({
                              ...editingRole,
                              oidcMapping: [
                                ...(editingRole.oidcMapping ?? []),
                                val,
                              ],
                            });
                          }
                          setOidcMappingInput("");
                        }}
                        title="Add mapping value"
                        aria-label="Add mapping value"
                        className="inline-flex items-center justify-center w-11 h-11 border border-blue-300 dark:border-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/35 text-blue-700 dark:text-blue-300 rounded-xl transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-xs text-zinc-400">
                      This button only adds a claim value. Use Save Role above to
                      persist all role changes.
                    </p>
                  </div>

                  {/* Permission Checkboxes */}
                  <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                    <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">
                      Permissions
                    </h4>
                    {(
                      Object.entries(permissionsByCategory) as [
                        string,
                        Permission[],
                      ][]
                    ).map(([category, perms]) => (
                      <div key={category} className="space-y-2">
                        <button
                          onClick={() => toggleCategory(category)}
                          className="flex items-center gap-2 text-sm font-bold text-zinc-700 dark:text-zinc-300"
                        >
                          {expandedCategories.has(category) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          {category}
                        </button>
                        {expandedCategories.has(category) && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pl-6">
                            {perms.map((perm) => (
                              <label
                                key={perm._id}
                                className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-zinc-800/50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={editingRole.permissions.includes(
                                    perm.code,
                                  )}
                                  onChange={() =>
                                    toggleRolePermission(editingRole, perm.code)
                                  }
                                  className="w-4 h-4 rounded accent-primary"
                                />
                                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                  {perm.name}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: role.color }}
                      />
                      <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                        {role.name}
                      </h3>
                      <span className="text-xs text-zinc-400 font-mono">
                        {role.code}
                      </span>
                      {role.isSystem && (
                        <span className="px-2 py-1 text-[10px] font-bold uppercase bg-amber-100 text-amber-700 rounded-lg">
                          System
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {role.description}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {role.permissions.length} permissions assigned
                    </p>
                    {role.oidcMapping?.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-xs text-zinc-400">OIDC:</span>
                        {role.oidcMapping.map((v) => (
                          <span
                            key={v}
                            className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-mono"
                          >
                            {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingRole(role);
                        setOidcMappingInput("");
                      }}
                      className="p-2 text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {!role.isSystem && (
                      <button
                        onClick={() => handleDeleteRole(role._id)}
                        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPermissions = () => {
    if (loading) return <Loading message="Loading permissions..." />;

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">
              Permissions
            </h2>
            <p className="text-zinc-500 font-medium mt-1">
              Permission codes are platform-wide (they define what the app can do).{" "}
              {activeOrgName ? (
                <>
                  You are viewing them while administering{" "}
                  <span className="font-bold text-zinc-800 dark:text-zinc-100">
                    {activeOrgName}
                  </span>
                  .
                </>
              ) : null}
            </p>
          </div>
          <div className="flex gap-3">
            {!showNewPermissionForm && (
              <button
                onClick={() => setShowNewPermissionForm(true)}
                className="flex items-center px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primaryHover transition-all shadow-lg shadow-primary/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Permission
              </button>
            )}
          </div>
        </div>

        {/* New Permission Form */}
        {showNewPermissionForm && (
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              Create New Permission
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Permission Code (e.g., reports:export)"
                value={newPermission.code}
                onChange={(e) =>
                  setNewPermission({
                    ...newPermission,
                    code: e.target.value.toLowerCase().replace(/\s/g, "_"),
                  })
                }
                className="p-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
              />
              <input
                type="text"
                placeholder="Display Name"
                value={newPermission.name}
                onChange={(e) =>
                  setNewPermission({ ...newPermission, name: e.target.value })
                }
                className="p-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Category"
                value={newPermission.category}
                onChange={(e) =>
                  setNewPermission({
                    ...newPermission,
                    category: e.target.value,
                  })
                }
                className="p-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
              />
              <input
                type="text"
                placeholder="Description"
                value={newPermission.description}
                onChange={(e) =>
                  setNewPermission({
                    ...newPermission,
                    description: e.target.value,
                  })
                }
                className="p-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCreatePermission}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-500 text-white rounded-xl font-bold text-sm"
              >
                <Save className="w-4 h-4" />
                Create Permission
              </button>
              <button
                onClick={() => setShowNewPermissionForm(false)}
                className="px-5 py-2 text-zinc-500 hover:text-zinc-900 font-bold text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Permissions by Category */}
        {(
          Object.entries(permissionsByCategory) as [string, Permission[]][]
        ).map(([category, perms]) => (
          <div
            key={category}
            className="glass-card rounded-2xl overflow-hidden"
          >
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-white/30 dark:hover:bg-zinc-800/30 transition-all"
            >
              <div className="flex items-center gap-3">
                {expandedCategories.has(category) ? (
                  <ChevronDown className="w-5 h-5 text-zinc-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-zinc-400" />
                )}
                <span className="text-lg font-bold text-zinc-900 dark:text-white">
                  {category}
                </span>
                <span className="px-2 py-1 text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-lg">
                  {perms.length}
                </span>
              </div>
            </button>

            {expandedCategories.has(category) && (
              <div className="border-t border-zinc-200 dark:border-zinc-700">
                {perms.map((perm) => (
                  <div
                    key={perm._id}
                    className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-white/30 dark:hover:bg-zinc-800/30"
                  >
                    {editingPermission?._id === perm._id ? (
                      <div className="flex-1 flex items-center gap-4">
                        <input
                          type="text"
                          value={editingPermission.name}
                          onChange={(e) =>
                            setEditingPermission({
                              ...editingPermission,
                              name: e.target.value,
                            })
                          }
                          className="flex-1 p-2 rounded-lg bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-white"
                        />
                        <input
                          type="text"
                          value={editingPermission.description}
                          onChange={(e) =>
                            setEditingPermission({
                              ...editingPermission,
                              description: e.target.value,
                            })
                          }
                          className="flex-1 p-2 rounded-lg bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-white"
                          placeholder="Description"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleUpdatePermission(editingPermission)
                            }
                            className="p-2 bg-emerald-500 text-white rounded-lg"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingPermission(null)}
                            className="p-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-zinc-900 dark:text-white">
                              {perm.name}
                            </span>
                            <code className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                              {perm.code}
                            </code>
                            {perm.isSystem && (
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-amber-100 text-amber-700 rounded">
                                System
                              </span>
                            )}
                          </div>
                          {perm.description && (
                            <p className="text-sm text-zinc-500 mt-1">
                              {perm.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingPermission(perm)}
                            className="p-2 text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {!perm.isSystem && (
                            <button
                              onClick={() => handleDeletePermission(perm._id)}
                              className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const handleCreateCategory = async () => {
    if (!newCat.name.trim()) return showError("Name is required");
    try {
      const autoCode =
        newCat.code.trim() ||
        newCat.name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_|_$/g, "");
      const res = await fetch(
        withOrganisationQuery(`${API_BASE_URL}/task-categories`, activeOrgId),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...newCat, code: autoCode }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showSuccess("Category created");
      setShowNewCatForm(false);
      setNewCat({
        name: "",
        code: "",
        description: "",
        color: "#6366F1",
        icon: "📋",
      });
      loadCategories();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleUpdateCategory = async (cat: any) => {
    try {
      const res = await fetch(
        withOrganisationQuery(
          `${API_BASE_URL}/task-categories/${cat._id}`,
          organisationParamFromCategory(cat, activeOrgId),
        ),
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(cat),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showSuccess("Category updated");
      setEditingCat(null);
      loadCategories();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleToggleCategoryActive = async (cat: any) => {
    await handleUpdateCategory({ ...cat, isActive: !cat.isActive });
  };

  const handleDeleteCategory = async (cat: any) => {
    if (cat.isSystem) return showError("System categories cannot be deleted");
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    try {
      const res = await fetch(
        withOrganisationQuery(
          `${API_BASE_URL}/task-categories/${cat._id}`,
          organisationParamFromCategory(cat, activeOrgId),
        ),
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showSuccess("Category deleted");
      loadCategories();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleSeedCategories = async () => {
    try {
      const res = await fetch(
        withOrganisationQuery(
          `${API_BASE_URL}/task-categories/seed/defaults`,
          activeOrgId,
        ),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Seed failed");
      showSuccess(
        data.message || "Default categories seeded successfully.",
      );
      loadCategories();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleCreateRewardType = async () => {
    if (!newRt.name.trim()) return showError("Name is required");
    try {
      const autoCode =
        newRt.code.trim() ||
        newRt.name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_|_$/g, "");
      const vk = newRt.valueKind;
      const cm =
        vk === "none" || vk === "text" ? "none" : newRt.calculationMode;
      const res = await fetch(
        withOrganisationQuery(`${API_BASE_URL}/reward-types`, activeOrgId),
        {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: autoCode,
          name: newRt.name.trim(),
          description: newRt.description,
          color: newRt.color,
          valueKind: vk,
          calculationMode: cm,
        }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showSuccess("Reward type created");
      setShowNewRtForm(false);
      setNewRt({
        name: "",
        code: "",
        description: "",
        color: "#6366F1",
        valueKind: "currency",
        calculationMode: "fixed",
      });
      loadRewardTypes();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleUpdateRewardType = async (rt: any) => {
    try {
      const res = await fetch(
        withOrganisationQuery(
          `${API_BASE_URL}/reward-types/${rt._id}`,
          organisationParamFromReward(rt, activeOrgId),
        ),
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(rt),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showSuccess("Reward type updated");
      setEditingRt(null);
      loadRewardTypes();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleDeleteRewardType = async (rt: any) => {
    if (rt.isSystem && !isSuperAdmin) {
      return showError("System reward types cannot be deleted");
    }
    if (
      !confirm(
        rt.isSystem
          ? `Delete system reward type "${rt.name}"? This cannot be undone.`
          : `Delete reward type "${rt.name}"?`,
      )
    ) {
      return;
    }
    try {
      const res = await fetch(
        withOrganisationQuery(
          `${API_BASE_URL}/reward-types/${rt._id}`,
          organisationParamFromReward(rt, activeOrgId),
        ),
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showSuccess("Reward type deleted");
      setRewardTypesList((prev) => prev.filter((item) => item._id !== rt._id));
      await loadRewardTypes();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleSeedRewardTypes = async () => {
    try {
      const res = await fetch(
        withOrganisationQuery(
          `${API_BASE_URL}/reward-types/seed/defaults`,
          activeOrgId,
        ),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Seed failed");
      showSuccess(data.message || "Default reward types seeded.");
      loadRewardTypes();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const renderRewards = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">
            Reward Types
          </h2>
          <p className="text-zinc-500 font-medium mt-1 max-w-2xl">
            {activeOrgName ? (
              <>
                Choose what volunteers see on tasks for{" "}
                <span className="font-bold text-zinc-800 dark:text-zinc-100">
                  {activeOrgName}
                </span>
                . Use <span className="font-bold text-zinc-600 dark:text-zinc-300">Seed Defaults</span> to load the standard set for this organisation.
              </>
            ) : (
              <>
                Choose what volunteers see on tasks: money, points, VIA hours, vouchers, or
                recognition only. Select an organisation in the sidebar, then use{" "}
                <span className="font-bold text-zinc-600 dark:text-zinc-300">Seed Defaults</span>.
              </>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSeedRewardTypes}
            className="flex items-center px-4 py-2 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-white/50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 transition-all"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Seed Defaults
          </button>
          {!showNewRtForm && (
            <button
              type="button"
              onClick={() => setShowNewRtForm(true)}
              className="flex items-center px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primaryHover transition-all shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Reward Type
            </button>
          )}
        </div>
      </div>

      {showNewRtForm && (
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
            Create reward type
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                Name *
              </label>
              <input
                type="text"
                value={newRt.name}
                onChange={(e) => setNewRt({ ...newRt, name: e.target.value })}
                className="w-full p-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                Code (optional)
              </label>
              <input
                type="text"
                value={newRt.code}
                onChange={(e) =>
                  setNewRt({
                    ...newRt,
                    code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                  })
                }
                className="w-full p-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 font-mono text-sm text-zinc-900 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
              Description
            </label>
            <input
              type="text"
              value={newRt.description}
              onChange={(e) =>
                setNewRt({ ...newRt, description: e.target.value })
              }
              className="w-full p-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                Value kind *
              </label>
              <select
                value={newRt.valueKind}
                onChange={(e) => {
                  const vk = e.target.value;
                  setNewRt((p) => ({
                    ...p,
                    valueKind: vk,
                    calculationMode:
                      vk === "none" || vk === "text"
                        ? "none"
                        : vk === "number"
                          ? "points"
                          : "fixed",
                  }));
                }}
                className="w-full p-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white font-bold text-sm"
              >
                <option value="none">None</option>
                <option value="currency">Currency</option>
                <option value="number">Number</option>
                <option value="text">Text</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                Calculation *
              </label>
              <select
                value={
                  newRt.valueKind === "none" || newRt.valueKind === "text"
                    ? "none"
                    : newRt.calculationMode
                }
                onChange={(e) =>
                  setNewRt({ ...newRt, calculationMode: e.target.value })
                }
                disabled={
                  newRt.valueKind === "none" || newRt.valueKind === "text"
                }
                className="w-full p-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white font-bold text-sm disabled:opacity-50"
              >
                {newRt.valueKind === "none" ||
                newRt.valueKind === "text" ? (
                  <option value="none">None</option>
                ) : newRt.valueKind === "number" ? (
                  <>
                    <option value="points">Points</option>
                    <option value="hours">Hours (e.g. VIA hours)</option>
                  </>
                ) : (
                  <>
                    <option value="fixed">Fixed</option>
                    <option value="hourly">Hourly</option>
                    <option value="weekly">Weekly</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                Colour
              </label>
              <input
                type="color"
                value={newRt.color}
                onChange={(e) =>
                  setNewRt({ ...newRt, color: e.target.value })
                }
                className="w-12 h-12 rounded-xl cursor-pointer border-0"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCreateRewardType}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-all"
            >
              <Save className="w-4 h-4" /> Create
            </button>
            <button
              type="button"
              onClick={() => setShowNewRtForm(false)}
              className="px-5 py-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-bold text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {rtLoading ? (
        <Loading message="Loading reward types..." />
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  Reward
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  Code
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  Kind / Calc
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rewardTypesList.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-sm text-zinc-400"
                  >
                    No reward types. Click &quot;Seed Defaults&quot; to load the
                    standard set.
                  </td>
                </tr>
              )}
              {rewardTypesList.map((rt) =>
                editingRt?._id === rt._id ? (
                  <tr key={rt._id} className="bg-primary/5">
                    <td className="px-6 py-4" colSpan={5}>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={editingRt.name}
                            onChange={(e) =>
                              setEditingRt({
                                ...editingRt,
                                name: e.target.value,
                              })
                            }
                            className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-white"
                          />
                          <input
                            type="text"
                            value={editingRt.description ?? ""}
                            onChange={(e) =>
                              setEditingRt({
                                ...editingRt,
                                description: e.target.value,
                              })
                            }
                            className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-white"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <select
                            value={editingRt.valueKind || "number"}
                            onChange={(e) => {
                              const vk = e.target.value;
                              setEditingRt((p: any) => ({
                                ...p,
                                valueKind: vk,
                                calculationMode:
                                  vk === "none" || vk === "text"
                                    ? "none"
                                    : vk === "number"
                                      ? "points"
                                      : "fixed",
                              }));
                            }}
                            className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-white font-bold"
                          >
                            <option value="none">None</option>
                            <option value="currency">Currency</option>
                            <option value="number">Number</option>
                            <option value="text">Text</option>
                          </select>
                          <select
                            value={
                              editingRt.valueKind === "none" ||
                              editingRt.valueKind === "text"
                                ? "none"
                                : editingRt.valueKind === "number"
                                  ? editingRt.calculationMode === "hours"
                                    ? "hours"
                                    : "points"
                                  : editingRt.calculationMode || "fixed"
                            }
                            onChange={(e) =>
                              setEditingRt({
                                ...editingRt,
                                calculationMode: e.target.value,
                              })
                            }
                            disabled={
                              editingRt.valueKind === "none" ||
                              editingRt.valueKind === "text"
                            }
                            className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-white font-bold disabled:opacity-50"
                          >
                            {editingRt.valueKind === "none" ||
                            editingRt.valueKind === "text" ? (
                              <option value="none">None</option>
                            ) : editingRt.valueKind === "number" ? (
                              <>
                                <option value="points">Points</option>
                                <option value="hours">
                                  Hours (e.g. VIA hours)
                                </option>
                              </>
                            ) : (
                              <>
                                <option value="fixed">Fixed</option>
                                <option value="hourly">Hourly</option>
                                <option value="weekly">Weekly</option>
                              </>
                            )}
                          </select>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={editingRt.color ?? "#6B7280"}
                            onChange={(e) =>
                              setEditingRt({
                                ...editingRt,
                                color: e.target.value,
                              })
                            }
                            className="w-10 h-10 rounded-lg cursor-pointer"
                          />
                          <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!editingRt.isActive}
                              onChange={(e) =>
                                setEditingRt({
                                  ...editingRt,
                                  isActive: e.target.checked,
                                })
                              }
                              className="w-4 h-4 rounded accent-primary"
                            />
                            Active
                          </label>
                          <div className="flex gap-2 ml-auto">
                            <button
                              type="button"
                              onClick={() => handleUpdateRewardType(editingRt)}
                              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all"
                            >
                              <Check className="w-3.5 h-3.5" /> Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingRt(null)}
                              className="px-4 py-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-xl text-xs font-bold"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={rt._id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-zinc-900 dark:text-white text-sm">
                        {rt.name}
                      </p>
                      {rt.description && (
                        <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                          {rt.description}
                        </p>
                      )}
                      {rt.isSystem && (
                        <span className="mt-1 inline-block px-2 py-0.5 text-[9px] font-black uppercase bg-amber-100 text-amber-700 rounded-lg">
                          System
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                        {rt.code}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-zinc-600 dark:text-zinc-300">
                      {rt.valueKind || "—"}{" "}
                      <span className="text-zinc-400">/</span>{" "}
                      {rt.calculationMode || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 text-[9px] font-black rounded-full uppercase tracking-widest ${
                          rt.isActive
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {rt.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingRt({ ...rt })}
                          className="p-2 text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {(isSuperAdmin || !rt.isSystem) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteRewardType(rt)}
                            className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                            title={
                              rt.isSystem
                                ? "Super admin: delete system reward type"
                                : "Delete reward type"
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderCategories = () => (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">
            Category Management
          </h2>
          <p className="text-zinc-500 font-medium mt-1">
            {activeOrgName ? (
              <>
                Seed Defaults creates categories for{" "}
                <span className="font-bold text-zinc-800 dark:text-zinc-100">
                  {activeOrgName}
                </span>
                ; lists prefer your organisation’s row when it shares a code with a
                platform default. Switch organisation in the sidebar to manage another
                community.
              </>
            ) : (
              "Select an organisation in the sidebar, then use Seed Defaults to load the standard category set for that community."
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSeedCategories}
            className="flex items-center px-4 py-2 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-white/50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 transition-all"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Seed Defaults
          </button>
          {!showNewCatForm && (
            <button
              onClick={() => setShowNewCatForm(true)}
              className="flex items-center px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primaryHover transition-all shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Category
            </button>
          )}
        </div>
      </div>

      {/* Create Form */}
      {showNewCatForm && (
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
            Create Category
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Catering"
                value={newCat.name}
                onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                className="w-full p-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                Code (auto-generated)
              </label>
              <input
                type="text"
                placeholder="catering (leave blank to auto)"
                value={newCat.code}
                onChange={(e) =>
                  setNewCat({
                    ...newCat,
                    code: e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9_]/g, ""),
                  })
                }
                className="w-full p-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
              Description
            </label>
            <input
              type="text"
              placeholder="Short description"
              value={newCat.description}
              onChange={(e) =>
                setNewCat({ ...newCat, description: e.target.value })
              }
              className="w-full p-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                Emoji Icon
              </label>
              <input
                type="text"
                placeholder="📋"
                value={newCat.icon}
                onChange={(e) => setNewCat({ ...newCat, icon: e.target.value })}
                className="w-full p-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white text-2xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                Colour
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={newCat.color}
                  onChange={(e) =>
                    setNewCat({ ...newCat, color: e.target.value })
                  }
                  className="w-12 h-12 rounded-xl cursor-pointer border-0"
                />
                <span className="text-sm font-mono text-zinc-500">
                  {newCat.color}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCreateCategory}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-all"
            >
              <Save className="w-4 h-4" /> Create
            </button>
            <button
              onClick={() => setShowNewCatForm(false)}
              className="px-5 py-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-bold text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Category List */}
      {catLoading ? (
        <Loading message="Loading categories..." />
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  Category
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  Code
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {taskCategories.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-sm text-zinc-400"
                  >
                    No categories yet. Select an organisation, then click
                    “Seed Defaults” to load the standard set.
                  </td>
                </tr>
              )}
              {taskCategories.map((cat) =>
                editingCat?._id === cat._id ? (
                  // ── Edit Row ──
                  <tr key={cat._id} className="bg-primary/5">
                    <td className="px-6 py-4" colSpan={4}>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={editingCat.name}
                            onChange={(e) =>
                              setEditingCat({
                                ...editingCat,
                                name: e.target.value,
                              })
                            }
                            placeholder="Name"
                            className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-white"
                          />
                          <input
                            type="text"
                            value={editingCat.description ?? ""}
                            onChange={(e) =>
                              setEditingCat({
                                ...editingCat,
                                description: e.target.value,
                              })
                            }
                            placeholder="Description"
                            className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-white"
                          />
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-zinc-500">
                              Emoji:
                            </label>
                            <input
                              type="text"
                              value={editingCat.icon ?? ""}
                              onChange={(e) =>
                                setEditingCat({
                                  ...editingCat,
                                  icon: e.target.value,
                                })
                              }
                              className="w-16 p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xl text-center"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-zinc-500">
                              Colour:
                            </label>
                            <input
                              type="color"
                              value={editingCat.color ?? "#6B7280"}
                              onChange={(e) =>
                                setEditingCat({
                                  ...editingCat,
                                  color: e.target.value,
                                })
                              }
                              className="w-10 h-10 rounded-lg cursor-pointer"
                            />
                          </div>
                          <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingCat.isActive}
                              onChange={(e) =>
                                setEditingCat({
                                  ...editingCat,
                                  isActive: e.target.checked,
                                })
                              }
                              className="w-4 h-4 rounded accent-primary"
                            />
                            Active
                          </label>
                          <div className="flex gap-2 ml-auto">
                            <button
                              onClick={() => handleUpdateCategory(editingCat)}
                              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all"
                            >
                              <Check className="w-3.5 h-3.5" /> Save
                            </button>
                            <button
                              onClick={() => setEditingCat(null)}
                              className="px-4 py-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-xl text-xs font-bold"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  // ── View Row ──
                  <tr
                    key={cat._id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                          style={{ backgroundColor: cat.color + "20" }}
                        >
                          {cat.icon || "📋"}
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900 dark:text-white text-sm">
                            {cat.name}
                          </p>
                          {cat.description && (
                            <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                              {cat.description}
                            </p>
                          )}
                        </div>
                        {cat.isSystem && (
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-amber-100 text-amber-700 rounded-lg">
                            System
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                        {cat.code}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleCategoryActive(cat)}
                        className={`px-3 py-1 text-[9px] font-black rounded-full uppercase tracking-widest transition-all ${
                          cat.isActive
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {cat.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingCat({ ...cat })}
                          className="p-2 text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!cat.isSystem && (
                          <button
                            onClick={() => handleDeleteCategory(cat)}
                            className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-fade-in pb-20">
      <h1 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">
        Admin Settings
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Sidebar Nav */}
        <div className="space-y-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors group mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
            Back to Dashboard
          </button>

          <div className="glass-card rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden shadow-sm bg-white dark:bg-zinc-900/50">
            {/* Section label */}
            <div className="px-5 py-3 bg-zinc-50/50 dark:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Administration
              </span>
            </div>

            {/* Tab items */}
            {(
              [
                ...(isSuperAdmin
                  ? [{ key: "organisations" as const, icon: ExternalLink, label: "Organisations" }]
                  : []),
                { key: "users" as const, icon: Users, label: "Manage Users" },
                { key: "roles" as const, icon: Shield, label: "Roles" },
                { key: "permissions" as const, icon: Lock, label: "Permissions" },
                { key: "categories" as const, icon: Layers, label: "Categories" },
                { key: "rewards" as const, icon: Gift, label: "Reward types" },
                { key: "groups" as const, icon: Users, label: "Groups" },
                { key: "email" as const, icon: Mail, label: "Email Settings" },
                { key: "ai" as const, icon: Sparkles, label: "AI Settings" },
              ] as const
            ).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`w-full flex items-center justify-between px-5 py-4 text-xs font-black uppercase tracking-widest transition-all border-b border-zinc-100 dark:border-zinc-800 last:border-none relative group ${
                  activeTab === key
                    ? "text-primary bg-primary/5"
                    : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                }`}
              >
                <div className="flex items-center relative z-10">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-colors ${
                      activeTab === key
                        ? "bg-primary text-white"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:text-zinc-600"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  {label}
                </div>
                {activeTab === key && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                )}
                <ChevronRight
                  className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                    activeTab === key
                      ? "opacity-100 translate-x-0"
                      : "opacity-0 -translate-x-2 group-hover:opacity-30 group-hover:translate-x-0"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-3">
          {activeTab === "organisations" && (
            <OrganisationManagement scopeRevision={adminOrgSync} />
          )}
          {activeTab === "users" && <UserManagement />}
          {activeTab === "roles" && renderRoles()}
          {activeTab === "permissions" && renderPermissions()}
          {activeTab === "categories" && renderCategories()}
          {activeTab === "rewards" && renderRewards()}
          {activeTab === "groups" && (
            <GroupManagement scopeRevision={adminOrgSync} />
          )}
          {activeTab === "email" && (
            <EmailNotificationSettings scopeRevision={adminOrgSync} />
          )}
          {activeTab === "ai" && <AiSettingsPanel reloadKey={adminOrgSync} />}
        </div>
      </div>
    </div>
  );
};
