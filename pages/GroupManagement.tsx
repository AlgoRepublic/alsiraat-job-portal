import React, { useEffect, useState } from "react";
import { db } from "../services/database";
import { useToast } from "../components/Toast";
import {
  Users,
  Search,
  Plus,
  Trash2,
  UserCircle,
  X,
  Edit2,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Layers,
  Check,
} from "lucide-react";
import { Loading } from "../components/Loading";

const GROUP_COLORS = [
  "#812349", // AlSiraat
  "#2563eb", // Blue
  "#059669", // Emerald
  "#7c3aed", // Violet
  "#d97706", // Amber
  "#dc2626", // Red
  "#0891b2", // Cyan
  "#be185d", // Pink
];

interface Group {
  _id: string;
  name: string;
  description: string;
  color: string;
  members: any[];
  isActive: boolean;
}

interface CreateGroupModalProps {
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initial?: Group | null;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  onClose,
  onSave,
  initial,
}) => {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [color, setColor] = useState(initial?.color || GROUP_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        color,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-8 w-full max-w-md shadow-2xl border border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">
            {initial ? "Edit Group" : "Create Group"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              Group Name *
            </label>
            <input
              type="text"
              className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              placeholder="e.g. Parents, Teachers, Year 7..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              Description
            </label>
            <textarea
              className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 font-medium text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none h-20"
              placeholder="Brief description of this group..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              Colour
            </label>
            <div className="flex gap-3 flex-wrap">
              {GROUP_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-md"
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 font-black text-xs uppercase tracking-widest text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="flex-1 py-4 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest hover:bg-primaryHover transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {saving ? "Saving..." : initial ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
};

interface AddMembersModalProps {
  group: Group;
  allUsers: any[];
  onClose: () => void;
  onAdd: (userIds: string[]) => Promise<void>;
}

const AddMembersModal: React.FC<AddMembersModalProps> = ({
  group,
  allUsers,
  onClose,
  onAdd,
}) => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const existingMemberIds = group.members.map((m: any) => m._id || m);

  const filtered = allUsers.filter(
    (u) =>
      !existingMemberIds.includes(u._id) &&
      (u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())),
  );

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleAdd = async () => {
    if (selected.length === 0) return;
    setSaving(true);
    try {
      await onAdd(selected);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-8 w-full max-w-lg shadow-2xl border border-zinc-100 dark:border-zinc-800 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">
              Add Members
            </h2>
            <p className="text-sm text-zinc-400 font-medium mt-1">
              to{" "}
              <span className="font-bold" style={{ color: group.color }}>
                {group.name}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search users..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 font-medium text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 font-medium text-sm">
              {search
                ? "No users match your search"
                : "All users are already in this group"}
            </div>
          ) : (
            filtered.map((user) => {
              const isSelected = selected.includes(user._id);
              return (
                <button
                  key={user._id}
                  onClick={() => toggle(user._id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left ${
                    isSelected
                      ? "bg-primary/10 border-2 border-primary/30"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800 border-2 border-transparent"
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserCircle className="w-5 h-5 text-zinc-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-zinc-400 truncate">
                      {user.email}
                    </p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg flex-shrink-0">
                    {user.role}
                  </span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 font-black text-xs uppercase tracking-widest text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={selected.length === 0 || saving}
            className="flex-1 py-4 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest hover:bg-primaryHover transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {saving
              ? "Adding..."
              : `Add ${selected.length > 0 ? `(${selected.length})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export const GroupManagement: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [addMembersGroup, setAddMembersGroup] = useState<Group | null>(null);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [groupsData, usersData] = await Promise.all([
        db.getGroups(),
        db.getUsers(),
      ]);
      setGroups(groupsData);
      setAllUsers(usersData);
    } catch (err) {
      showError("Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (data: any) => {
    try {
      await db.createGroup(data);
      showSuccess("Group created successfully");
      fetchData();
    } catch (err: any) {
      showError(err.message || "Failed to create group");
      throw err;
    }
  };

  const handleUpdateGroup = async (data: any) => {
    if (!editingGroup) return;
    try {
      await db.updateGroup(editingGroup._id, data);
      showSuccess("Group updated successfully");
      fetchData();
    } catch (err: any) {
      showError(err.message || "Failed to update group");
      throw err;
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!window.confirm(`Delete group "${groupName}"? This cannot be undone.`))
      return;
    try {
      await db.deleteGroup(groupId);
      showSuccess("Group deleted");
      fetchData();
    } catch (err: any) {
      showError(err.message || "Failed to delete group");
    }
  };

  const handleAddMembers = async (userIds: string[]) => {
    if (!addMembersGroup) return;
    try {
      await db.addGroupMembers(addMembersGroup._id, userIds);
      showSuccess("Members added successfully");
      fetchData();
    } catch (err: any) {
      showError(err.message || "Failed to add members");
      throw err;
    }
  };

  const handleRemoveMember = async (groupId: string, userId: string) => {
    try {
      await db.removeGroupMember(groupId, userId);
      showSuccess("Member removed");
      fetchData();
    } catch (err: any) {
      showError(err.message || "Failed to remove member");
    }
  };

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">
            Group Management
          </h1>
          <p className="text-zinc-500 font-medium mt-2">
            Organise users into groups to control task visibility
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primaryHover transition-all shadow-lg shadow-primary/20 hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          New Group
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <div className="md:col-span-3 space-y-6">
          {/* Search */}
          <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search groups..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-primary outline-none font-medium text-sm transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Groups List */}
          {loading ? (
            <Loading message="Loading groups..." />
          ) : filteredGroups.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 p-20 text-center">
              <Layers className="w-16 h-16 text-zinc-200 dark:text-zinc-800 mx-auto mb-4" />
              <p className="text-zinc-500 font-bold">
                {searchTerm ? "No groups match your search" : "No groups yet"}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 px-6 py-3 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primaryHover transition-all"
                >
                  Create First Group
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredGroups.map((group) => {
                const isExpanded = expandedGroup === group._id;
                return (
                  <div
                    key={group._id}
                    className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 overflow-hidden shadow-sm transition-all"
                  >
                    {/* Group Header */}
                    <div className="flex items-center gap-4 p-6">
                      {/* Color dot */}
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg"
                        style={{
                          backgroundColor: group.color + "22",
                          border: `2px solid ${group.color}40`,
                        }}
                      >
                        <Users
                          className="w-5 h-5"
                          style={{ color: group.color }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className="font-black text-zinc-900 dark:text-white text-lg leading-tight">
                            {group.name}
                          </h3>
                          <span
                            className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-white"
                            style={{ backgroundColor: group.color }}
                          >
                            {group.members.length} member
                            {group.members.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        {group.description && (
                          <p className="text-sm text-zinc-400 font-medium mt-0.5 truncate">
                            {group.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => {
                            setAddMembersGroup(group);
                          }}
                          className="p-2 text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                          title="Add Members"
                        >
                          <UserPlus className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setEditingGroup(group)}
                          className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
                          title="Edit Group"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteGroup(group._id, group.name)
                          }
                          className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                          title="Delete Group"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() =>
                            setExpandedGroup(isExpanded ? null : group._id)
                          }
                          className="p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
                          title={isExpanded ? "Collapse" : "Expand"}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Members List (expanded) */}
                    {isExpanded && (
                      <div className="border-t border-zinc-50 dark:border-zinc-800 animate-fade-in">
                        {group.members.length === 0 ? (
                          <div className="p-8 text-center">
                            <UserCircle className="w-10 h-10 text-zinc-200 dark:text-zinc-800 mx-auto mb-2" />
                            <p className="text-sm text-zinc-400 font-medium">
                              No members yet
                            </p>
                            <button
                              onClick={() => setAddMembersGroup(group)}
                              className="mt-3 px-4 py-2 bg-primary/10 text-primary rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/20 transition-all"
                            >
                              Add Members
                            </button>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="border-b border-zinc-50 dark:border-zinc-800">
                                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                    Member
                                  </th>
                                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                    Role
                                  </th>
                                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">
                                    Remove
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.members.map((member: any) => (
                                  <tr
                                    key={member._id}
                                    className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors border-b border-zinc-50 dark:border-zinc-800 last:border-none"
                                  >
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                                          {member.avatar ? (
                                            <img
                                              src={member.avatar}
                                              alt={member.name}
                                              className="w-full h-full object-cover"
                                            />
                                          ) : (
                                            <UserCircle className="w-5 h-5 text-zinc-400" />
                                          )}
                                        </div>
                                        <div>
                                          <p className="font-bold text-sm text-zinc-900 dark:text-white">
                                            {member.name}
                                          </p>
                                          <p className="text-xs text-zinc-400">
                                            {member.email}
                                          </p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <span className="px-2 py-1 text-[10px] font-black uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-lg">
                                        {member.role}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <button
                                        onClick={() =>
                                          handleRemoveMember(
                                            group._id,
                                            member._id,
                                          )
                                        }
                                        className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                        title="Remove from group"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="p-8 rounded-[2rem] bg-zinc-900 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
            <div className="relative z-10">
              <Layers className="w-10 h-10 text-primary mb-6" />
              <h3 className="text-xl font-black tracking-tighter mb-2">
                Group Visibility
              </h3>
              <p className="text-sm text-zinc-400 font-medium leading-relaxed">
                When posting an internal task, select which groups can see it.
                Users can belong to multiple groups.
              </p>
              <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-3xl font-black text-white">
                    {groups.length}
                  </div>
                  <div className="text-xs font-black uppercase tracking-widest text-primary mt-1">
                    Total Groups
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-black text-white">
                    {allUsers.length}
                  </div>
                  <div className="text-xs font-black uppercase tracking-widest text-primary mt-1">
                    Total Users
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick group overview */}
          {groups.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 p-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">
                All Groups
              </h4>
              <div className="space-y-3">
                {groups.slice(0, 8).map((g) => (
                  <div key={g._id} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: g.color }}
                    />
                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 truncate flex-1">
                      {g.name}
                    </span>
                    <span className="text-xs font-bold text-zinc-400">
                      {g.members.length}
                    </span>
                  </div>
                ))}
                {groups.length > 8 && (
                  <p className="text-xs text-zinc-400 font-medium">
                    +{groups.length - 8} more
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateGroup}
        />
      )}

      {editingGroup && (
        <CreateGroupModal
          initial={editingGroup}
          onClose={() => setEditingGroup(null)}
          onSave={handleUpdateGroup}
        />
      )}

      {addMembersGroup && (
        <AddMembersModal
          group={addMembersGroup}
          allUsers={allUsers}
          onClose={() => setAddMembersGroup(null)}
          onAdd={handleAddMembers}
        />
      )}
    </div>
  );
};
