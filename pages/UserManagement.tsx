import React, { useEffect, useState } from "react";
import { db } from "../services/database";
import { useToast } from "../components/Toast";
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  UserPen,
  Trash2,
  Shield,
  UserCircle,
} from "lucide-react";

import { Loading } from "../components/Loading";

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const { toast } = useToast();

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
      toast({
        title: "Error",
        description: "Failed to fetch users or roles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, roleId: string) => {
    try {
      await db.updateUserRole(userId, roleId);
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
      fetchData();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
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
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      fetchData();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">
            User Management
          </h1>
          <p className="text-zinc-500 font-medium mt-2">
            Manage your community and assign roles
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <div className="md:col-span-3 space-y-6">
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
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <select
                className="pl-10 pr-8 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-primary outline-none font-medium text-sm transition-all appearance-none"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                {roles.map((role) => (
                  <option key={role._id} value={role.name}>
                    {role.name}
                  </option>
                ))}
              </select>
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
                          <div className="flex items-center gap-2">
                            <select
                              className="bg-transparent border-none p-0 text-sm font-black text-primary hover:underline cursor-pointer focus:ring-0 outline-none"
                              value={
                                roles.find((r) => r.name === user.role)?._id ||
                                ""
                              }
                              onChange={(e) =>
                                handleRoleChange(user._id, e.target.value)
                              }
                            >
                              {roles.map((role) => (
                                <option key={role._id} value={role._id}>
                                  {role.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                            title="Delete User"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="p-8 rounded-[2rem] bg-zinc-900 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
            <div className="relative z-10">
              <Shield className="w-10 h-10 text-primary mb-6" />
              <h3 className="text-xl font-black tracking-tighter mb-2">
                Access Control
              </h3>
              <p className="text-sm text-zinc-400 font-medium leading-relaxed">
                Roles define what users can see and do. Changing a user's role
                takes effect immediately.
              </p>
              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="text-3xl font-black text-white">
                  {users.length}
                </div>
                <div className="text-xs font-black uppercase tracking-widest text-primary mt-1">
                  Total Users
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
