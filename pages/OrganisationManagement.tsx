import React, { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  Mail,
  Send,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle2,
  X,
  ChevronRight,
  Globe,
  Users,
  AlertCircle,
  ExternalLink,
  Edit2,
  Palette,
  Save,
} from "lucide-react";
import { useToast } from "../components/Toast";
import { API_BASE_URL } from "../services/api";
import { Loading } from "../components/Loading";
import { db } from "../services/database";
import { isValidThemeColorHex } from "../utils/orgTheme";

interface Organisation {
  _id: string;
  name: string;
  slug: string;
  type?: string;
  domain?: string;
  about?: string;
  logo?: string;
  themeColor?: string;
  isPublic: boolean;
  owner?: { name: string; email: string } | null;
  createdAt: string;
  settings?: {
    allowExternalApplications?: boolean;
    requireApprovalForPosts?: boolean;
  };
}

interface OrgInvitation {
  _id: string;
  email: string;
  organisation: { _id: string; name: string; slug: string; type?: string };
  invitedBy: { name: string; email: string };
  expiresAt: string;
  createdAt: string;
  status: "Pending" | "Accepted" | "Expired";
}

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
  "Content-Type": "application/json",
});

export const OrganisationManagement: React.FC<{
  /** Increment when the user switches active organisation so lists refetch. */
  scopeRevision?: number;
}> = ({ scopeRevision = 0 }) => {
  const { showSuccess, showError } = useToast();

  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [invitations, setInvitations] = useState<OrgInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [invLoading, setInvLoading] = useState(true);

  // "Add org" panel state
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "",
    domain: "",
    about: "",
    ownerEmail: "",
    themeColor: "",
  });
  const [inviteLogoFile, setInviteLogoFile] = useState<File | null>(null);

  const [editTarget, setEditTarget] = useState<Organisation | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    type: "",
    domain: "",
    about: "",
    themeColor: "",
    isPublic: false,
    allowExternalApplications: true,
    requireApprovalForPosts: true,
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    loadOrgs();
    loadInvitations();
  }, [scopeRevision]);

  const loadOrgs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/organisations`, {
        headers: authHeader(),
      });
      const data = await res.json();
      setOrgs(Array.isArray(data) ? data : []);
    } catch {
      showError("Failed to load organisations");
    } finally {
      setLoading(false);
    }
  };

  const loadInvitations = async () => {
    setInvLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/organisations/invitations`, {
        headers: authHeader(),
      });
      const data = await res.json();
      setInvitations(Array.isArray(data) ? data : []);
    } catch {
      showError("Failed to load invitations");
    } finally {
      setInvLoading(false);
    }
  };

  const handleInviteOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.ownerEmail.trim()) return;
    const inviteTc = form.themeColor.trim();
    if (inviteTc && !isValidThemeColorHex(inviteTc)) {
      showError("Theme colour must be a 6-digit hex value (e.g. #812349)");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/organisations/invite`, {
        method: "POST",
        headers: authHeader(),
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type.trim() || undefined,
          domain: form.domain.trim() || undefined,
          about: form.about.trim() || undefined,
          ownerEmail: form.ownerEmail.trim().toLowerCase(),
          ...(isValidThemeColorHex(form.themeColor.trim())
            ? { themeColor: form.themeColor.trim().toLowerCase() }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const newOrgId = data.organisation != null ? String(data.organisation) : null;
      showSuccess(data.message);
      if (inviteLogoFile && newOrgId) {
        try {
          await db.uploadOrganizationLogo(newOrgId, inviteLogoFile);
          showSuccess("Logo uploaded for the new organisation.");
        } catch (logoErr: any) {
          showError(
            logoErr?.message ||
              "Logo upload failed — you can add it from the organisation list."
          );
        }
      }
      setShowForm(false);
      setInviteLogoFile(null);
      setForm({
        name: "",
        type: "",
        domain: "",
        about: "",
        ownerEmail: "",
        themeColor: "",
      });
      await loadOrgs();
      await loadInvitations();
    } catch (err: any) {
      showError(err.message || "Failed to send invitation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (invId: string) => {
    if (!confirm("Revoke this invitation? The invite link will stop working."))
      return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/organisations/invitations/${invId}`,
        { method: "DELETE", headers: authHeader() }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showSuccess("Invitation revoked");
      setInvitations((prev) => prev.filter((i) => i._id !== invId));
    } catch (err: any) {
      showError(err.message || "Failed to revoke invitation");
    }
  };

  const handleResend = async (invId: string) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/organisations/invitations/${invId}/resend`,
        { method: "POST", headers: authHeader() }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showSuccess(data.message);
      await loadInvitations();
    } catch (err: any) {
      showError(err.message || "Failed to resend invitation");
    }
  };

  const handleUploadLogo = async (orgId: string, file: File) => {
    try {
      await db.uploadOrganizationLogo(orgId, file);
      showSuccess("Logo uploaded successfully");
      await loadOrgs();
    } catch (err: any) {
      showError(err.message || "Failed to upload logo");
    }
  };

  const handleRemoveLogo = async (orgId: string) => {
    if (!confirm("Are you sure you want to remove this logo?")) return;
    try {
      await db.removeOrganizationLogo(orgId);
      showSuccess("Logo removed successfully");
      await loadOrgs();
    } catch (err: any) {
      showError(err.message || "Failed to remove logo");
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const isExpired = (dateStr: string) => new Date(dateStr) < new Date();

  const handleMarkActive = async (orgId: string) => {
    const ownerEmail = window.prompt(
      "Enter the email address of the existing user to assign as organisation owner:"
    );
    if (!ownerEmail?.trim()) return;
    try {
      // Look up user by email first
      const searchRes = await fetch(
        `${API_BASE_URL}/users?search=${encodeURIComponent(ownerEmail.trim())}&limit=1`,
        { headers: authHeader() }
      );
      const searchData = await searchRes.json();
      const users = searchData.users ?? searchData;
      const matched = Array.isArray(users)
        ? users.find((u: any) => u.email?.toLowerCase() === ownerEmail.trim().toLowerCase())
        : null;
      if (!matched) {
        showError(`No user found with email: ${ownerEmail.trim()}`);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/organisations/${orgId}/mark-active`, {
        method: "PATCH",
        headers: authHeader(),
        body: JSON.stringify({ ownerUserId: matched._id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showSuccess("Organisation marked as active!");
      await loadOrgs();
    } catch (err: any) {
      showError(err.message || "Failed to mark organisation as active");
    }
  };

  const openEdit = (org: Organisation) => {
    if (showForm) setShowForm(false);
    setEditTarget(org);
    setEditForm({
      name: org.name,
      type: org.type ?? "",
      domain: org.domain ?? "",
      about: org.about ?? "",
      themeColor: org.themeColor ?? "",
      isPublic: !!org.isPublic,
      allowExternalApplications:
        org.settings?.allowExternalApplications !== false,
      requireApprovalForPosts: org.settings?.requireApprovalForPosts !== false,
    });
  };

  const closeEdit = () => {
    setEditTarget(null);
  };

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || !editForm.name.trim()) return;
    const tcRaw = editForm.themeColor.trim();
    if (tcRaw && !isValidThemeColorHex(tcRaw)) {
      showError("Theme colour must be a 6-digit hex value (e.g. #812349)");
      return;
    }
    setEditSubmitting(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/organisations/${editTarget._id}`,
        {
          method: "PATCH",
          headers: authHeader(),
          body: JSON.stringify({
            name: editForm.name.trim(),
            type: editForm.type.trim() || undefined,
            domain: editForm.domain.trim() || null,
            about: editForm.about.trim() || undefined,
            isPublic: editForm.isPublic,
            themeColor: tcRaw ? tcRaw.toLowerCase() : null,
            settings: {
              allowExternalApplications: editForm.allowExternalApplications,
              requireApprovalForPosts: editForm.requireApprovalForPosts,
            },
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showSuccess(data.message || "Organisation updated");
      closeEdit();
      await loadOrgs();
    } catch (err: any) {
      showError(err.message || "Failed to update organisation");
    } finally {
      setEditSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {editTarget && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-org-title"
          onClick={closeEdit}
        >
          <div
            className="glass-card rounded-2xl border border-zinc-200 dark:border-zinc-700 w-full max-w-lg max-h-[min(90vh,720px)] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleUpdateOrg} className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3
                    id="edit-org-title"
                    className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2"
                  >
                    <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Edit2 className="w-4 h-4 text-primary" />
                    </span>
                    Edit organisation
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1 font-mono">
                    Slug: {editTarget.slug}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeEdit}
                  className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Organisation name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 focus:border-primary outline-none text-sm font-bold text-zinc-900 dark:text-white transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Type
                </label>
                <select
                  value={editForm.type}
                  onChange={(e) =>
                    setEditForm({ ...editForm, type: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 focus:border-primary outline-none text-sm font-bold text-zinc-900 dark:text-white transition-colors"
                >
                  <option value="">None</option>
                  <option value="School">School</option>
                  <option value="College">College</option>
                  <option value="University">University</option>
                  <option value="Institute">Institute</option>
                  <option value="Company">Company</option>
                  <option value="Non-Profit">Non-Profit</option>
                  <option value="Government">Government</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Email domain{" "}
                  <span className="font-medium normal-case text-zinc-400">
                    (optional)
                  </span>
                </label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={editForm.domain}
                    onChange={(e) =>
                      setEditForm({ ...editForm, domain: e.target.value })
                    }
                    placeholder="Clear field to remove domain"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 focus:border-primary outline-none text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  About
                </label>
                <textarea
                  value={editForm.about}
                  onChange={(e) =>
                    setEditForm({ ...editForm, about: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 focus:border-primary outline-none text-sm font-bold text-zinc-900 dark:text-white transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5" />
                    Theme colour
                  </label>
                  <div className="flex items-center gap-3 flex-wrap">
                    <input
                      type="color"
                      aria-label="Pick theme colour"
                      className="h-11 w-14 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer bg-transparent"
                      value={
                        isValidThemeColorHex(editForm.themeColor.trim())
                          ? editForm.themeColor.trim().toLowerCase()
                          : "#812349"
                      }
                      onChange={(e) =>
                        setEditForm({ ...editForm, themeColor: e.target.value })
                      }
                    />
                    <input
                      type="text"
                      placeholder="Clear to use profile accent only"
                      value={editForm.themeColor}
                      onChange={(e) =>
                        setEditForm({ ...editForm, themeColor: e.target.value })
                      }
                      className="flex-1 min-w-[8rem] px-4 py-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 focus:border-primary outline-none text-sm font-mono font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 transition-colors"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    Replace logo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full text-xs font-bold text-zinc-600 dark:text-zinc-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-primary file:text-white file:font-bold"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && editTarget) {
                        void handleUploadLogo(editTarget._id, f);
                        e.target.value = "";
                      }
                    }}
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.isPublic}
                  onChange={(e) =>
                    setEditForm({ ...editForm, isPublic: e.target.checked })
                  }
                  className="w-4 h-4 rounded accent-primary"
                />
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                  Public organisation (visible in listings)
                </span>
              </label>

              <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Task and application defaults
                </p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.allowExternalApplications}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        allowExternalApplications: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Allow external applications
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.requireApprovalForPosts}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        requireApprovalForPosts: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Require approval for posts
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={editSubmitting || !editForm.name.trim()}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-black text-sm rounded-xl hover:bg-primaryHover transition-colors shadow-lg shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {editSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {editSubmitting ? "Saving…" : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={closeEdit}
                  className="px-5 py-3 text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">
            Organisations
          </h2>
          <p className="text-zinc-500 font-medium mt-1">
            {!loading && orgs.length === 1 ? (
              <>
                You are editing{" "}
                <span className="font-bold text-zinc-800 dark:text-zinc-100">
                  {orgs[0]?.name}
                </span>{" "}
                (the organisation selected in the sidebar). Use the other
                administration sections for members, groups, and settings. The
                onboarding flow below is for adding additional organisations to the
                platform.
              </>
            ) : (
              <>
                Onboard new organisations by sending them an invitation email. They
                register themselves through the secure link.
              </>
            )}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primaryHover transition-all shadow-lg shadow-primary/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add New Organisation
          </button>
        )}
      </div>

      {/* ── Onboarding Form ─────────────────────────────────────────────────── */}
      {showForm && (
        <div className="glass-card rounded-2xl border border-primary/20 p-6 space-y-6 animate-slide-up">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
                <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-primary" />
                </span>
                New Organisation Onboarding
              </h3>
              <p className="text-zinc-500 text-sm mt-1">
                Fill in the organisation details, then enter the owner's email.
                They'll receive an invitation link to create their account.
              </p>
            </div>
            <button
              onClick={() => {
                setShowForm(false);
                setInviteLogoFile(null);
                setForm({
                  name: "",
                  type: "",
                  domain: "",
                  about: "",
                  ownerEmail: "",
                  themeColor: "",
                });
              }}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center gap-0">
            {["Organisation Details", "Owner Email", "Send Invite"].map(
              (step, i) => (
                <React.Fragment key={step}>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                        i === 2
                          ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                          : "bg-primary text-white"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hidden sm:block">
                      {step}
                    </span>
                  </div>
                  {i < 2 && (
                    <ChevronRight className="w-3 h-3 text-zinc-300 mx-3 shrink-0" />
                  )}
                </React.Fragment>
              )
            )}
          </div>

          <form onSubmit={handleInviteOrg} className="space-y-5">
            {/* Name + Type row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Organisation Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Al-Siraat College"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 focus:border-primary outline-none text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Type
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 focus:border-primary outline-none text-sm font-bold text-zinc-900 dark:text-white transition-colors"
                >
                  <option value="">Select type…</option>
                  <option value="School">School</option>
                  <option value="College">College</option>
                  <option value="University">University</option>
                  <option value="Institute">Institute</option>
                  <option value="Company">Company</option>
                  <option value="Non-Profit">Non-Profit</option>
                  <option value="Government">Government</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Domain */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Email Domain{" "}
                <span className="font-medium normal-case text-zinc-400">
                  (optional — e.g. alsiraat.vic.edu.au)
                </span>
              </label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="school.edu.au"
                  value={form.domain}
                  onChange={(e) => setForm({ ...form, domain: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 focus:border-primary outline-none text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 transition-colors"
                />
              </div>
            </div>

            {/* About */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                About{" "}
                <span className="font-medium normal-case text-zinc-400">
                  (optional)
                </span>
              </label>
              <textarea
                placeholder="Brief description of the organisation…"
                value={form.about}
                onChange={(e) => setForm({ ...form, about: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 focus:border-primary outline-none text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 transition-colors resize-none"
              />
            </div>

            {/* Branding: theme + optional logo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" />
                  Theme colour
                  <span className="font-medium normal-case text-zinc-400">
                    (optional)
                  </span>
                </label>
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    type="color"
                    aria-label="Pick theme colour"
                    className="h-11 w-14 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer bg-transparent"
                    value={
                      isValidThemeColorHex(form.themeColor.trim())
                        ? form.themeColor.trim().toLowerCase()
                        : "#812349"
                    }
                    onChange={(e) =>
                      setForm({ ...form, themeColor: e.target.value })
                    }
                  />
                  <input
                    type="text"
                    placeholder="#812349"
                    value={form.themeColor}
                    onChange={(e) =>
                      setForm({ ...form, themeColor: e.target.value })
                    }
                    className="flex-1 min-w-[8rem] px-4 py-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 focus:border-primary outline-none text-sm font-mono font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Logo{" "}
                  <span className="font-medium normal-case text-zinc-400">
                    (optional)
                  </span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full text-xs font-bold text-zinc-600 dark:text-zinc-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-primary file:text-white file:font-bold"
                  onChange={(e) =>
                    setInviteLogoFile(e.target.files?.[0] ?? null)
                  }
                />
                {inviteLogoFile && (
                  <p className="text-[10px] text-zinc-500 truncate">
                    {inviteLogoFile.name}
                  </p>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Owner / Admin Email <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-zinc-400 -mt-0.5">
                  This person will receive the onboarding invitation and become
                  the organisation admin once they register.
                </p>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-400" />
                  <input
                    type="email"
                    required
                    placeholder="principal@school.edu.au"
                    value={form.ownerEmail}
                    onChange={(e) =>
                      setForm({ ...form, ownerEmail: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-primary/5 border-2 border-primary/20 focus:border-primary outline-none text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Info callout */}
            <div className="flex gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                The organisation will be created immediately. The owner will
                receive a secure invite link (valid 48 hours) to register their
                account and will automatically be granted <strong>Organisation Admin</strong>{" "}
                access.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting || !form.name.trim() || !form.ownerEmail.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-black text-sm rounded-xl hover:bg-primaryHover transition-colors shadow-lg shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {submitting ? "Sending…" : "Create & Send Invitation"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setInviteLogoFile(null);
                  setForm({
                    name: "",
                    type: "",
                    domain: "",
                    about: "",
                    ownerEmail: "",
                    themeColor: "",
                  });
                }}
                className="px-5 py-3 text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Pending Invitations ──────────────────────────────────────────────── */}
      {invLoading ? (
        <Loading message="Loading invitations…" />
      ) : invitations.length > 0 ? (
        <div className="glass-card rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <h3 className="font-black text-zinc-900 dark:text-white text-sm uppercase tracking-widest">
                Pending Invitations
              </h3>
              <span className="ml-1 px-2 py-0.5 text-[10px] font-black bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                {invitations.length}
              </span>
            </div>
            <button
              onClick={loadInvitations}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-primary hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {invitations.map((inv) => {
              const expired = isExpired(inv.expiresAt);
              return (
                <div
                  key={inv._id}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        expired
                          ? "bg-red-100 dark:bg-red-900/20"
                          : "bg-amber-100 dark:bg-amber-900/20"
                      }`}
                    >
                      <Mail
                        className={`w-4 h-4 ${
                          expired ? "text-red-500" : "text-amber-500"
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                        {inv.email}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        For{" "}
                        <span className="font-bold text-zinc-700 dark:text-zinc-300">
                          {inv.organisation?.name ?? "—"}
                        </span>{" "}
                        · Invited by {inv.invitedBy?.name ?? "Admin"} ·{" "}
                        {expired ? (
                          <span className="text-red-500 font-bold">
                            Expired {formatDate(inv.expiresAt)}
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">
                            Expires {formatDate(inv.expiresAt)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleResend(inv._id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                      title="Resend invitation"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Resend
                    </button>
                    <button
                      onClick={() => handleRevoke(inv._id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                      title="Revoke invitation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Revoke
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ── Registered Organisations ─────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <h3 className="font-black text-zinc-900 dark:text-white text-sm uppercase tracking-widest">
              Registered Organisations
            </h3>
            <span className="ml-1 px-2 py-0.5 text-[10px] font-black bg-primary/10 text-primary rounded-full">
              {orgs.length}
            </span>
          </div>
          <button
            onClick={loadOrgs}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-primary hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-8">
            <Loading message="Loading organisations…" />
          </div>
        ) : orgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            <Building2 className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-bold text-sm">No organisations yet</p>
            <p className="text-xs mt-1">
              Click "Add New Organisation" to get started.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {orgs.map((org) => (
              <div
                key={org._id}
                className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
              >
                {/* Avatar / Logo */}
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 dark:from-primary/30 dark:to-primary/10 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700 overflow-hidden relative group">
                  {org.logo ? (
                    <img src={`${API_BASE_URL.replace(/\/api$/, "")}${org.logo}`} alt={org.name} className="w-full h-full object-contain bg-white/50" />
                  ) : (
                    <Building2 className="w-5 h-5 text-primary" />
                  )}
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <input
                      type="file"
                      accept="image/*"
                      id={`logo-upload-${org._id}`}
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleUploadLogo(org._id, e.target.files[0]);
                        }
                      }}
                    />
                    <label
                      htmlFor={`logo-upload-${org._id}`}
                      className="text-[8px] font-bold text-white uppercase tracking-wider cursor-pointer hover:text-primary transition-colors text-center px-1"
                    >
                      {org.logo ? "Change" : "Upload"}
                    </label>
                    {org.logo && (
                      <button
                        onClick={(e) => { e.preventDefault(); handleRemoveLogo(org._id); }}
                        className="text-[8px] font-bold text-red-400 hover:text-red-300 uppercase tracking-wider mt-1"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-zinc-900 dark:text-white text-sm">
                      {org.name}
                    </p>
                    {org.type && (
                      <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-full">
                        {org.type}
                      </span>
                    )}
                    {org.isPublic && (
                      <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5" /> Public
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {org.owner ? (
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Owner:{" "}
                        <span className="font-bold text-zinc-700 dark:text-zinc-300">
                          {org.owner.name}
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs text-amber-500 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Awaiting owner registration
                      </span>
                    )}
                    {org.domain && (
                      <span className="text-xs text-zinc-400 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> {org.domain}
                      </span>
                    )}
                    <span className="text-xs text-zinc-400">
                      Created {formatDate(org.createdAt)}
                    </span>
                  </div>
                  {org.about && (
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-1">
                      {org.about}
                    </p>
                  )}
                </div>

                {/* Actions + status */}
                <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(org)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-xs font-bold transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  {org.owner ? (
                    <span className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active
                    </span>
                  ) : (
                    <button
                      onClick={() => handleMarkActive(org._id)}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/40 rounded-lg text-xs font-bold transition-colors"
                      title="Assign an owner to mark this organisation as active"
                    >
                      <Clock className="w-3.5 h-3.5" /> Pending — Mark Active
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
