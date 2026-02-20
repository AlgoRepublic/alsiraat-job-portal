import React, { useEffect, useState } from "react";
import { db } from "../services/database";
import { useToast } from "../components/Toast";
import {
  Users,
  Search,
  Filter,
  Trash2,
  Shield,
  UserCircle,
  Pencil,
  X,
  Save,
} from "lucide-react";

import { Loading } from "../components/Loading";
import { CustomDropdown } from "../components/CustomUI";

interface EditForm {
  name: string;
  email: string;
  role: string;
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const { showSuccess, showError } = useToast();

  // Edit modal state
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    email: "",
    role: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [searchTerm, roleFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersData, rolesData] = await Promise.all([
        db.getUsers(searchTerm, roleFilter),
        db.getRoles(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (err) {
      showError("Failed to fetch users or roles");
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "",
    });
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setSaving(false);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await db.updateUser(editingUser._id, {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
      });
      showSuccess("User updated successfully");
      closeEditModal();
      fetchData();
    } catch (err: any) {
      showError(err?.data?.message || err?.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this user? This action cannot be undone.",
      )
    )
      return;

    try {
      await db.deleteUser(userId);
      showSuccess("User deleted successfully");
      fetchData();
    } catch (err: any) {
      showError(err?.data?.message || err?.message || "Failed to delete user");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">
            User Management
          </h2>
          <p className="text-zinc-500 font-medium mt-1">
            Manage your community and assign system roles
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-primary outline-none font-medium text-sm transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="min-w-[200px]">
              <CustomDropdown
                options={[{ name: "All Roles" }, ...roles]}
                value={roleFilter || "All Roles"}
                onChange={(val) =>
                  setRoleFilter(val === "All Roles" ? "" : val)
                }
                placeholder="All Roles"
                variant="outline"
                icon={<Filter className="w-4 h-4 text-zinc-400" />}
              />
            </div>
          </div>

          {/* User List */}
          <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 overflow-hidden shadow-sm">
            {loading ? (
              <Loading message="Loading users..." />
            ) : users.length === 0 ? (
              <div className="p-20 text-center">
                <Users className="w-16 h-16 text-zinc-200 dark:text-zinc-800 mx-auto mb-4" />
                <p className="text-zinc-500 font-bold">No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-zinc-50 dark:border-zinc-800">
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        User
                      </th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        Organisation
                      </th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        Role
                      </th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user._id}
                        className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors border-b border-zinc-50 dark:border-zinc-800 last:border-none"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                              {user.avatar ? (
                                <img
                                  src={user.avatar}
                                  alt={user.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <UserCircle className="w-6 h-6 text-zinc-400" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-zinc-900 dark:text-white leading-tight">
                                {user.name}
                              </div>
                              <div className="text-xs text-zinc-400 font-medium">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-sm font-bold text-zinc-500 dark:text-zinc-400">
                          {(user as any).organisation?.name || "Independent"}
                        </td>
                        <td className="px-6 py-5">
                          <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-black rounded-lg uppercase tracking-wider">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-2 text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                              title="Edit User"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user._id)}
                              className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-zinc-900 dark:text-white">
                    Edit User
                  </h3>
                  <p className="text-xs text-zinc-400 font-medium">
                    Update profile details and role
                  </p>
                </div>
              </div>
              <button
                onClick={closeEditModal}
                className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                  placeholder="Full name"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                  placeholder="email@example.com"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">
                  System Role
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm({ ...editForm, role: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none transition-all appearance-none"
                >
                  {roles.map((r) => (
                    <option key={r._id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={closeEditModal}
                className="px-5 py-2.5 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUser}
                disabled={saving || !editForm.name || !editForm.email}
                className="flex items-center px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primaryHover shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
