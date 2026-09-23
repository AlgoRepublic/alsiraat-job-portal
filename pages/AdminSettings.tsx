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
import {
  Button,
  Card,
  Input,
  Label,
  PageHeader,
  Textarea,
  inputVariants,
} from "@/components/ui";
import { cn } from "@/utils/cn";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";
import { API_BASE_URL } from "../services/api";
import { GroupManagement } from "./GroupManagement";
import { UserManagement } from "./UserManagement";
import { EmailNotificationSettings } from "./EmailNotificationSettings";
import { OrganisationManagement } from "./OrganisationManagement";
import { ArrowLeft } from "lucide-react";
import { ACTIVE_ORG_CHANGED_EVENT } from "../utils/orgScopedRoles";
import { db } from "../services/database";
import { invalidateRewardTypesCatalog } from "../services/rewardTypesCatalog";

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

function categoryIsOrgScoped(
  cat: { organisation?: string | { _id: string } | null },
): boolean {
  const raw = cat?.organisation;
  if (raw == null) return false;
  if (typeof raw === "object" && "_id" in raw) return true;
  return String(raw).length > 0;
}

type CategoryContactGroupRow = {
  _id: string;
  name: string;
  color?: string;
  kind?: string;
  isActive?: boolean;
  isDefault?: boolean;
};

function normalizeOrgGroupsForContactPicker(
  rows: unknown[],
): CategoryContactGroupRow[] {
  return rows
    .map((row) => {
      const g = row as CategoryContactGroupRow & { id?: string };
      return {
        ...g,
        _id: String(g._id ?? g.id ?? ""),
        name: g.name ?? "Group",
      };
    })
    .filter((g) => g._id);
}

function contactGroupEntryId(entry: unknown): string {
  if (typeof entry === "string") return entry;
  if (entry && typeof entry === "object" && "_id" in entry) {
    return String((entry as { _id: string })._id);
  }
  return String(entry);
}

function contactGroupIdsFromCategory(cat: {
  contactGroups?: unknown[];
}): string[] {
  return (cat.contactGroups ?? []).map(contactGroupEntryId);
}

function resolveCategoryContactGroup(
  id: string,
  storedEntries: unknown[],
  catalog: CategoryContactGroupRow[],
): CategoryContactGroupRow {
  const stored = (storedEntries ?? []).find(
    (entry) => contactGroupEntryId(entry) === id,
  );
  if (stored && typeof stored === "object" && "name" in stored) {
    const row = stored as CategoryContactGroupRow;
    return { ...row, _id: id, name: row.name ?? id };
  }
  const fromCatalog = catalog.find((g) => g._id === id);
  if (fromCatalog) return fromCatalog;
  return { _id: id, name: id };
}

const CategoryContactGroupsEditor: React.FC<{
  contactGroupIds: string[];
  storedContactGroups: unknown[];
  orgGroups: CategoryContactGroupRow[];
  disabled?: boolean;
  onChange: (ids: string[]) => void;
}> = ({
  contactGroupIds,
  storedContactGroups,
  orgGroups,
  disabled,
  onChange,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const storedRows = contactGroupIds.map((id) =>
    resolveCategoryContactGroup(id, storedContactGroups, orgGroups),
  );

  const searchLower = search.toLowerCase();
  const pickerCandidates = orgGroups.filter((group) => {
    if (contactGroupIds.includes(group._id)) return false;
    if (group.isActive === false) return false;
    return group.name.toLowerCase().includes(searchLower);
  });

  const removeGroup = (groupId: string) => {
    onChange(contactGroupIds.filter((id) => id !== groupId));
  };

  const addSelected = () => {
    if (selected.length === 0) return;
    onChange([...contactGroupIds, ...selected]);
    setSelected([]);
    setPickerOpen(false);
    setSearch("");
  };

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 space-y-3 bg-white/60 dark:bg-zinc-900/40">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-600" />
            Category contact groups
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5 max-w-xl">
            Task contact person choices for this category come from the{" "}
            <span className="font-semibold text-zinc-500 dark:text-zinc-300">
              category contact pool
            </span>
            —the members of the groups listed here. With no groups or no members
            in those groups, the contact picker stays empty; there is no fallback
            to all task approvers.
          </p>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold uppercase tracking-wide bg-amber-500/10 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 transition-all shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        )}
      </div>

      {storedRows.length === 0 ? (
        <p className="text-sm text-zinc-400 font-medium py-2">
          No category contact groups configured.
        </p>
      ) : (
        <ul className="space-y-2">
          {storedRows.map((group) => {
            const inactive = group.isActive === false;
            return (
              <li
                key={group._id}
                className="flex items-center gap-3 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-semibold text-white shrink-0"
                  style={{ backgroundColor: group.color || "#6366F1" }}
                >
                  {group.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                    {group.name}
                    {inactive ? " (inactive)" : ""}
                  </p>
                  {inactive && (
                    <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 mt-0.5">
                      Inactive — does not add members to the category contact
                      pool. Remove this group before saving changes.
                    </p>
                  )}
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeGroup(group._id)}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                    title="Remove contact group"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {pickerOpen && !disabled && (
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups..."
            className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm"
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {pickerCandidates.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-4">
                No active groups available to add
              </p>
            ) : (
              pickerCandidates.map((group) => {
                const isSelected = selected.includes(group._id);
                return (
                  <button
                    key={group._id}
                    type="button"
                    onClick={() =>
                      setSelected((prev) =>
                        prev.includes(group._id)
                          ? prev.filter((id) => id !== group._id)
                          : [...prev, group._id],
                      )
                    }
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-lg shrink-0"
                      style={{ backgroundColor: group.color || "#6366F1" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{group.name}</p>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setPickerOpen(false);
                setSelected([]);
                setSearch("");
              }}
              className="px-4 py-2 text-xs font-bold text-zinc-500"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selected.length === 0}
              onClick={addSelected}
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold disabled:opacity-50"
            >
              Add selected
              {selected.length > 0 ? ` (${selected.length})` : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

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
      <PageHeader
        title="AI Settings"
        description="Configure the AI provider and API keys for the active organisation. Switch organisation in the sidebar to manage another community."
      />

      <Card padding="section" className="space-y-8">
        <div className="space-y-4">
          <Label>AI Provider</Label>
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
          <Label>API Key</Label>
          <p className="mb-2 text-xs text-muted-foreground">
            Leave blank to keep the existing key. {hasKey && <span className="ml-1 font-semibold text-emerald-600">An API key is currently saved.</span>}
          </p>
          <Input
            type="password"
            placeholder="sk-..."
            value={settings.apiKey}
            onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
            className="font-mono"
          />
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Save className="h-4 w-4" />}
            Save Settings
          </Button>
        </div>
      </Card>
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
  const [catOrgGroups, setCatOrgGroups] = useState<CategoryContactGroupRow[]>(
    [],
  );

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
    unitLabel: "",
    valuePrefix: "",
    valueSuffix: "",
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

  const loadCategoryContactGroupsData = useCallback(async () => {
    try {
      const groupsData = await db.getGroups();
      setCatOrgGroups(
        normalizeOrgGroupsForContactPicker(
          Array.isArray(groupsData) ? groupsData : [],
        ),
      );
    } catch {
      showError("Failed to load groups for category contact configuration");
    }
  }, [showError]);

  useEffect(() => {
    if (activeTab === "categories") {
      void loadCategoryContactGroupsData();
    }
  }, [activeTab, adminOrgSync, loadCategoryContactGroupsData]);

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
            <h2 className="text-3xl font-semibold text-zinc-900 dark:text-white tracking-tighter">
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
              className="font-bold"
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
          <Card className="space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              Create New Role
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="text"
                placeholder="Role Name"
                value={newRole.name}
                onChange={(e) =>
                  setNewRole({ ...newRole, name: e.target.value })
                }
              />
              <Input
                type="text"
                placeholder="Role Code (e.g., custom_role)"
                value={newRole.code}
                onChange={(e) =>
                  setNewRole({
                    ...newRole,
                    code: e.target.value.toLowerCase().replace(/\s/g, "_"),
                  })
                }
              />
            </div>
            <Textarea
              placeholder="Description"
              value={newRole.description}
              onChange={(e) =>
                setNewRole({ ...newRole, description: e.target.value })
              }
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
          </Card>
        )}
        <div className="space-y-4">
          {roles.map((role) => (
            <Card key={role._id}>
              {editingRole?._id === role._id ? (
                // Edit Mode
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: editingRole.color }}
                      />
                      <Input
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

                  <Textarea
                    value={editingRole.description}
                    onChange={(e) =>
                      setEditingRole({
                        ...editingRole,
                        description: e.target.value,
                      })
                    }
                    rows={2}
                  />

                  {/* OIDC / ADFS Role Mapping */}
                  <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700 space-y-3">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-wide">
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
                      <Input
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
                        className="flex-1"
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
                    <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-wide">
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
            </Card>
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
            <h2 className="text-3xl font-semibold text-zinc-900 dark:text-white tracking-tighter">
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
          <Card className="space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              Create New Permission
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="text"
                placeholder="Permission Code (e.g., reports:export)"
                value={newPermission.code}
                onChange={(e) =>
                  setNewPermission({
                    ...newPermission,
                    code: e.target.value.toLowerCase().replace(/\s/g, "_"),
                  })
                }
              />
              <Input
                type="text"
                placeholder="Display Name"
                value={newPermission.name}
                onChange={(e) =>
                  setNewPermission({ ...newPermission, name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="text"
                placeholder="Category"
                value={newPermission.category}
                onChange={(e) =>
                  setNewPermission({
                    ...newPermission,
                    category: e.target.value,
                  })
                }
              />
              <Input
                type="text"
                placeholder="Description"
                value={newPermission.description}
                onChange={(e) =>
                  setNewPermission({
                    ...newPermission,
                    description: e.target.value,
                  })
                }
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
          </Card>
        )}

        {/* Permissions by Category */}
        {(
          Object.entries(permissionsByCategory) as [string, Permission[]][]
        ).map(([category, perms]) => (
          <Card key={category} padding="none" className="overflow-hidden">
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
                        <Input
                          type="text"
                          value={editingPermission.name}
                          onChange={(e) =>
                            setEditingPermission({
                              ...editingPermission,
                              name: e.target.value,
                            })
                          }
                          className="flex-1"
                        />
                        <Input
                          type="text"
                          value={editingPermission.description}
                          onChange={(e) =>
                            setEditingPermission({
                              ...editingPermission,
                              description: e.target.value,
                            })
                          }
                          className="flex-1"
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
          </Card>
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
      const body: Record<string, unknown> = {
        name: cat.name,
        description: cat.description,
        isActive: cat.isActive,
        color: cat.color,
        icon: cat.icon,
      };
      if (categoryIsOrgScoped(cat)) {
        body.contactGroups = contactGroupIdsFromCategory(cat);
      }
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
          body: JSON.stringify(body),
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
          unitLabel: newRt.unitLabel?.trim() || "",
          valuePrefix: newRt.valuePrefix?.trim() || "",
          valueSuffix: newRt.valueSuffix?.trim() || "",
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
        unitLabel: "",
        valuePrefix: "",
        valueSuffix: "",
      });
      invalidateRewardTypesCatalog(activeOrgId || undefined);
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
      invalidateRewardTypesCatalog(activeOrgId || undefined);
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
      invalidateRewardTypesCatalog(activeOrgId || undefined);
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
      invalidateRewardTypesCatalog(activeOrgId || undefined);
      loadRewardTypes();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const renderRewards = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-semibold text-zinc-900 dark:text-white tracking-tighter">
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
            className="font-bold"
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
        <Card className="space-y-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
            Create reward type
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                Name *
              </label>
              <Input
                type="text"
                value={newRt.name}
                onChange={(e) => setNewRt({ ...newRt, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                Code (optional)
              </label>
              <Input
                type="text"
                value={newRt.code}
                onChange={(e) =>
                  setNewRt({
                    ...newRt,
                    code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                  })
                }
                className="font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
              Description
            </label>
            <Input
              type="text"
              value={newRt.description}
              onChange={(e) =>
                setNewRt({ ...newRt, description: e.target.value })
              }
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
                className={cn(inputVariants(), "font-bold text-sm")}
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
                className={cn(inputVariants(), "font-bold text-sm")}
              >
                {newRt.valueKind === "none" ||
                newRt.valueKind === "text" ? (
                  <option value="none">None</option>
                ) : newRt.valueKind === "number" ? (
                  <>
                    <option value="points">Points / count (e.g. coins, marks)</option>
                    <option value="hours">Hours (e.g. VIA hours)</option>
                    <option value="percent">Percentage (e.g. discount %)</option>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                Unit label (display)
              </label>
              <Input
                type="text"
                placeholder="e.g. Points, Extra Marks, Coins"
                value={newRt.unitLabel}
                onChange={(e) =>
                  setNewRt({ ...newRt, unitLabel: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                Value prefix
              </label>
              <Input
                type="text"
                placeholder="e.g. $"
                value={newRt.valuePrefix}
                onChange={(e) =>
                  setNewRt({ ...newRt, valuePrefix: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                Value suffix
              </label>
              <Input
                type="text"
                placeholder="e.g. %, /hr"
                value={newRt.valueSuffix}
                onChange={(e) =>
                  setNewRt({ ...newRt, valueSuffix: e.target.value })
                }
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
        </Card>
      )}

      {rtLoading ? (
        <Loading message="Loading reward types..." />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
                  Reward
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
                  Code
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
                  Kind / Calc
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
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
                          <Input
                            type="text"
                            value={editingRt.name}
                            onChange={(e) =>
                              setEditingRt({
                                ...editingRt,
                                name: e.target.value,
                              })
                            }
                          />
                          <Input
                            type="text"
                            value={editingRt.description ?? ""}
                            onChange={(e) =>
                              setEditingRt({
                                ...editingRt,
                                description: e.target.value,
                              })
                            }
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
                            className={cn(inputVariants(), "font-bold text-sm")}
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
                                  ? editingRt.calculationMode || "points"
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
                            className={cn(inputVariants(), "font-bold text-sm")}
                          >
                            {editingRt.valueKind === "none" ||
                            editingRt.valueKind === "text" ? (
                              <option value="none">None</option>
                            ) : editingRt.valueKind === "number" ? (
                              <>
                                <option value="points">Points / count</option>
                                <option value="hours">
                                  Hours (e.g. VIA hours)
                                </option>
                                <option value="percent">Percentage</option>
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
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <Input
                            type="text"
                            placeholder="Unit label"
                            value={editingRt.unitLabel ?? ""}
                            onChange={(e) =>
                              setEditingRt({
                                ...editingRt,
                                unitLabel: e.target.value,
                              })
                            }
                          />
                          <Input
                            type="text"
                            placeholder="Prefix ($)"
                            value={editingRt.valuePrefix ?? ""}
                            onChange={(e) =>
                              setEditingRt({
                                ...editingRt,
                                valuePrefix: e.target.value,
                              })
                            }
                          />
                          <Input
                            type="text"
                            placeholder="Suffix (%, /hr)"
                            value={editingRt.valueSuffix ?? ""}
                            onChange={(e) =>
                              setEditingRt({
                                ...editingRt,
                                valueSuffix: e.target.value,
                              })
                            }
                          />
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
                        <span className="mt-1 inline-block px-2 py-0.5 text-[9px] font-semibold uppercase bg-amber-100 text-amber-700 rounded-lg">
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
                        className={`px-3 py-1 text-[9px] font-semibold rounded-full uppercase tracking-wide ${
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
        </Card>
      )}
    </div>
  );

  const renderCategories = () => (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-semibold text-zinc-900 dark:text-white tracking-tighter">
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
            className="font-bold"
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
        <Card className="space-y-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
            Create Category
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                Name *
              </label>
              <Input
                type="text"
                placeholder="e.g. Catering"
                value={newCat.name}
                onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                Code (auto-generated)
              </label>
              <Input
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
                className="font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
              Description
            </label>
            <Input
              type="text"
              placeholder="Short description"
              value={newCat.description}
              onChange={(e) =>
                setNewCat({ ...newCat, description: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                Emoji Icon
              </label>
              <Input
                type="text"
                placeholder="📋"
                value={newCat.icon}
                onChange={(e) => setNewCat({ ...newCat, icon: e.target.value })}
                className="text-2xl"
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
        </Card>
      )}

      {/* Category List */}
      {catLoading ? (
        <Loading message="Loading categories..." />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
                  Category
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
                  Code
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
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
                          <Input
                            type="text"
                            value={editingCat.name}
                            onChange={(e) =>
                              setEditingCat({
                                ...editingCat,
                                name: e.target.value,
                              })
                            }
                            placeholder="Name"
                          />
                          <Input
                            type="text"
                            value={editingCat.description ?? ""}
                            onChange={(e) =>
                              setEditingCat({
                                ...editingCat,
                                description: e.target.value,
                              })
                            }
                            placeholder="Description"
                          />
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-zinc-500">
                              Emoji:
                            </label>
                            <Input
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
                        {categoryIsOrgScoped(editingCat) && activeOrgId && (
                          <CategoryContactGroupsEditor
                            contactGroupIds={contactGroupIdsFromCategory(
                              editingCat,
                            )}
                            storedContactGroups={editingCat.contactGroups ?? []}
                            orgGroups={catOrgGroups}
                            onChange={(ids) =>
                              setEditingCat({
                                ...editingCat,
                                contactGroups: ids.map((id) =>
                                  resolveCategoryContactGroup(
                                    id,
                                    editingCat.contactGroups ?? [],
                                    catOrgGroups,
                                  ),
                                ),
                              })
                            }
                          />
                        )}
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
                          {categoryIsOrgScoped(cat) && (
                            <p className="text-[10px] font-bold text-zinc-400 mt-1">
                              Category contact groups:{" "}
                              {contactGroupIdsFromCategory(cat).length}
                            </p>
                          )}
                        </div>
                        {cat.isSystem && (
                          <span className="px-2 py-0.5 text-[9px] font-semibold uppercase bg-amber-100 text-amber-700 rounded-lg">
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
                        className={`px-3 py-1 text-[9px] font-semibold rounded-full uppercase tracking-wide transition-all ${
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
        </Card>
      )}
    </div>
  );

  const adminTabLabels: Record<typeof activeTab, string> = {
    organisations: "Organisations",
    users: "Manage Users",
    roles: "Roles",
    permissions: "Permissions",
    categories: "Categories",
    rewards: "Reward types",
    groups: "Groups",
    email: "Email Settings",
    ai: "AI Settings",
  };

  return (
    <div className="mx-auto max-w-6xl animate-fade-in space-y-6 pb-20">
      <PageHeader
        title="Admin Settings"
        description={adminTabLabels[activeTab]}
        actions={
          <Button variant="ghost" size="compact" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[12rem_minmax(0,1fr)]">
        <Card padding="none" className="h-fit overflow-hidden">
          <div className="border-b border-border bg-surface-muted px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Administration
            </span>
          </div>

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
              type="button"
              onClick={() => setActiveTab(key)}
              className={`relative flex w-full items-center gap-2 border-b border-border px-3 py-2.5 text-left text-sm font-medium transition-colors last:border-none ${
                activeTab === key
                  ? "bg-primary/5 text-primary"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              {activeTab === key ? (
                <span className="absolute bottom-0 left-0 top-0 w-0.5 bg-primary" />
              ) : null}
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-control ${
                  activeTab === key
                    ? "bg-primary text-white"
                    : "bg-surface-muted text-muted-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="truncate">{label}</span>
            </button>
          ))}
        </Card>

        <div className="min-w-0">
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
