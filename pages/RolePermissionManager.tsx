import React, { useState, useEffect } from "react";
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Users,
  Lock,
  Loader2,
  AlertCircle,
  Save,
  RefreshCw,
} from "lucide-react";
import { useToast } from "../components/Toast";
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
}

export const RolePermissionManager: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<"roles" | "permissions">("roles");
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(
    null,
  );
  const [showNewRoleForm, setShowNewRoleForm] = useState(false);
  const [showNewPermissionForm, setShowNewPermissionForm] = useState(false);
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

  useEffect(() => {
    loadData();
  }, []);

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
      const categories = new Set(
        permissionsData.map((p: Permission) => p.category),
      );
      setExpandedCategories(categories);
    } catch (err: any) {
      showError("Failed to load roles and permissions");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async (): Promise<Role[]> => {
    const response = await fetch("/api/roles", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch roles");
    return response.json();
  };

  const fetchPermissions = async (): Promise<Permission[]> => {
    const response = await fetch("/api/roles/permissions", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch permissions");
    return response.json();
  };

  const handleSeedDefaults = async () => {
    try {
      const response = await fetch("/api/roles/seed", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to seed defaults");
      showSuccess("Default roles and permissions seeded successfully");
      loadData();
    } catch (err: any) {
      showError(err.message);
    }
  };

  // ============================================================================
  // ROLE MANAGEMENT
  // ============================================================================

  const handleCreateRole = async () => {
    try {
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newRole),
      });
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
      const response = await fetch(`/api/roles/${role._id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(role),
      });
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
    if (!confirm("Are you sure you want to delete this role?")) return;
    try {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
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

  // ============================================================================
  // PERMISSION MANAGEMENT
  // ============================================================================

  const handleCreatePermission = async () => {
    try {
      const response = await fetch("/api/roles/permissions", {
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
      const response = await fetch(`/api/roles/permissions/${permission._id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(permission),
      });
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
    if (
      !confirm(
        "Are you sure you want to delete this permission? It will be removed from all roles.",
      )
    )
      return;
    try {
      const response = await fetch(`/api/roles/permissions/${permissionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">
            Roles & Permissions
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Manage user roles and their access permissions
          </p>
        </div>
        <button
          onClick={handleSeedDefaults}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-white/50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Reset to Defaults
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-white/50 dark:bg-zinc-800/50 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab("roles")}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
            activeTab === "roles"
              ? "bg-[#812349] text-white shadow-lg"
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <Users className="w-4 h-4" />
          Roles ({roles.length})
        </button>
        <button
          onClick={() => setActiveTab("permissions")}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
            activeTab === "permissions"
              ? "bg-[#812349] text-white shadow-lg"
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <Lock className="w-4 h-4" />
          Permissions ({permissions.length})
        </button>
      </div>

      {/* Roles Tab */}
      {activeTab === "roles" && (
        <div className="space-y-6">
          {/* Add Role Button */}
          {!showNewRoleForm && (
            <button
              onClick={() => setShowNewRoleForm(true)}
              className="flex items-center gap-2 px-5 py-3 bg-[#812349] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#812349]/20 hover:bg-[#6a1d3d] transition-all"
            >
              <Plus className="w-4 h-4" />
              Add New Role
            </button>
          )}

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
                  className="p-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700"
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
                  className="p-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700"
                />
              </div>
              <textarea
                placeholder="Description"
                value={newRole.description}
                onChange={(e) =>
                  setNewRole({ ...newRole, description: e.target.value })
                }
                className="w-full p-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700"
                rows={2}
              />
              <div className="flex items-center gap-3">
                <label className="text-sm font-bold text-zinc-500">
                  Color:
                </label>
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
          <div className="grid gap-4">
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
                          className="text-xl font-bold bg-transparent border-b-2 border-[#812349] outline-none dark:text-white"
                        />
                        {role.isSystem && (
                          <span className="px-2 py-1 text-[10px] font-bold uppercase bg-amber-100 text-amber-700 rounded-lg">
                            System
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateRole(editingRole)}
                          className="p-2 bg-emerald-500 text-white rounded-xl"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingRole(null)}
                          className="p-2 bg-zinc-200 dark:bg-zinc-700 rounded-xl"
                        >
                          <X className="w-4 h-4" />
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
                      className="w-full p-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-sm"
                      rows={2}
                    />

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
                                      toggleRolePermission(
                                        editingRole,
                                        perm.code,
                                      )
                                    }
                                    className="w-4 h-4 rounded accent-[#812349]"
                                  />
                                  <span className="text-sm">{perm.name}</span>
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
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingRole(role)}
                        className="p-2 text-zinc-400 hover:text-[#812349] hover:bg-[#812349]/10 rounded-xl transition-all"
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
      )}

      {/* Permissions Tab */}
      {activeTab === "permissions" && (
        <div className="space-y-6">
          {/* Add Permission Button */}
          {!showNewPermissionForm && (
            <button
              onClick={() => setShowNewPermissionForm(true)}
              className="flex items-center gap-2 px-5 py-3 bg-[#812349] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#812349]/20 hover:bg-[#6a1d3d] transition-all"
            >
              <Plus className="w-4 h-4" />
              Add New Permission
            </button>
          )}

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
                  className="p-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700"
                />
                <input
                  type="text"
                  placeholder="Display Name"
                  value={newPermission.name}
                  onChange={(e) =>
                    setNewPermission({ ...newPermission, name: e.target.value })
                  }
                  className="p-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700"
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
                  className="p-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700"
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
                  className="p-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700"
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
                        // Edit Mode
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
                            className="flex-1 p-2 rounded-lg bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-sm"
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
                            className="flex-1 p-2 rounded-lg bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-sm"
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
                        // View Mode
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
                              className="p-2 text-zinc-400 hover:text-[#812349] hover:bg-[#812349]/10 rounded-lg transition-all"
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
      )}
    </div>
  );
};
