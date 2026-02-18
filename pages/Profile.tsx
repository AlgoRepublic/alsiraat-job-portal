import React, { useState, useEffect } from "react";
import { User, Skill, ApplicantProfile, UserRole } from "../types";
import {
  Camera,
  Upload,
  Trash2,
  Plus,
  Star,
  Mail,
  Phone,
  Edit2,
  Check,
  X,
  User as UserIcon,
  Users,
  GraduationCap,
  FileText,
  Download,
  Loader2,
} from "lucide-react";
import { UserAvatar } from "../components/UserAvatar";
import { db } from "../services/database";
import { CustomDropdown } from "../components/CustomUI";

interface ProfileProps {
  user: User;
}

const GENDER_OPTIONS = [
  { name: "Male", code: "Male" },
  { name: "Female", code: "Female" },
];

const YEAR_LEVEL_OPTIONS = [
  { name: "Year 7", code: "Year 7" },
  { name: "Year 8", code: "Year 8" },
  { name: "Year 9", code: "Year 9" },
  { name: "Year 10", code: "Year 10" },
  { name: "Year 11", code: "Year 11" },
  { name: "Year 12", code: "Year 12" },
  { name: "Staff", code: "Staff" },
  { name: "Other", code: "Other" },
];

/**
 * Formats a raw input string as an Australian phone number.
 * Mobile (04XX): "04XX XXX XXX"
 * Landline (0X):  "(0X) XXXX XXXX"
 */
const formatAustralianPhone = (raw: string): string => {
  // Keep only digits
  const digits = raw.replace(/\D/g, "").slice(0, 10);

  if (digits.startsWith("04")) {
    // Mobile: 04XX XXX XXX
    const p1 = digits.slice(0, 4);
    const p2 = digits.slice(4, 7);
    const p3 = digits.slice(7, 10);
    return [p1, p2, p3].filter(Boolean).join(" ");
  } else if (digits.startsWith("0")) {
    // Landline: (0X) XXXX XXXX
    const area = digits.slice(0, 2);
    const p1 = digits.slice(2, 6);
    const p2 = digits.slice(6, 10);
    let result = area ? `(${area}` : "";
    if (digits.length > 2) result += `) ${p1}`;
    if (digits.length > 6) result += ` ${p2}`;
    return result;
  }

  // Fallback: just return digits spaced in groups
  return digits;
};

export const Profile: React.FC<ProfileProps> = ({ user }) => {
  const [profile, setProfile] = useState<ApplicantProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const data = await db.getCurrentUser();
      setProfile(data);
    };
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const updated = await db.updateUserProfile({
        firstName: profile.firstName,
        lastName: profile.lastName,
        about: profile.about,
        skills: profile.skills,
        avatar: profile.avatar,
        contactNumber: profile.contactNumber,
        gender: profile.gender,
        yearLevel: profile.yearLevel,
      });
      // Sync the derived name back into local state
      if (updated) {
        setProfile((prev) =>
          prev ? { ...prev, name: updated.name || prev.name } : prev,
        );
      }
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Re-fetch to discard unsaved changes
    db.getCurrentUser().then((data) => {
      setProfile(data);
      setIsEditing(false);
    });
  };

  const handleAddSkill = () => {
    if (!newSkill.trim() || !profile) return;
    const skill: Skill = {
      id: Date.now().toString(),
      name: newSkill,
      level: "Beginner",
    };
    setProfile((prev) =>
      prev ? { ...prev, skills: [...(prev.skills || []), skill] } : null,
    );
    setNewSkill("");
  };

  const removeSkill = (id: string) => {
    setProfile((prev) =>
      prev
        ? { ...prev, skills: (prev.skills || []).filter((s) => s.id !== id) }
        : null,
    );
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && profile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfile({ ...profile, avatar: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const [isUploadingResume, setIsUploadingResume] = useState(false);

  const handleResumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Validate: PDF, DOC, DOCX only; max 5 MB
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowed.includes(file.type)) {
      alert("Only PDF, DOC, or DOCX files are accepted.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("File must be under 5 MB.");
      return;
    }

    setIsUploadingResume(true);
    try {
      const result = await db.uploadResume(file);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              resumeUrl: result.resumeUrl,
              resumeOriginalName: result.resumeOriginalName,
            }
          : prev,
      );
    } catch (err: any) {
      alert(err.message || "Failed to upload resume.");
    } finally {
      setIsUploadingResume(false);
      // Reset the file input so the same file can be re-selected
      e.target.value = "";
    }
  };

  const handleRemoveResume = async () => {
    if (!window.confirm("Remove your uploaded CV?")) return;
    try {
      await db.removeResume();
      setProfile((prev) =>
        prev
          ? { ...prev, resumeUrl: undefined, resumeOriginalName: undefined }
          : prev,
      );
    } catch (err: any) {
      alert(err.message || "Failed to remove resume.");
    }
  };

  if (!profile)
    return (
      <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
        Loading profile...
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Hidden File Inputs */}
      <input
        type="file"
        id="avatar-upload"
        className="hidden"
        accept="image/*"
        onChange={handleAvatarChange}
      />
      <input
        type="file"
        id="resume-upload"
        className="hidden"
        accept=".pdf,.doc,.docx"
        onChange={handleResumeChange}
      />

      {/* Header Card */}
      <div className="glass-card rounded-2xl shadow-lg shadow-zinc-200 dark:shadow-none border border-zinc-100 dark:border-zinc-800 overflow-hidden relative group">
        {/* Cover Image */}
        <div className="h-40 bg-primary w-full relative">
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        </div>

        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-12 mb-6">
            <div className="relative">
              <UserAvatar
                src={profile.avatar}
                name={profile.name}
                className="w-28 h-28 text-4xl border-[6px] border-white dark:border-zinc-900 shadow-xl"
                size="xl"
              />
              {isEditing && (
                <button
                  onClick={() =>
                    document.getElementById("avatar-upload")?.click()
                  }
                  className="absolute bottom-1 right-1 p-2 bg-primary text-white rounded-full hover:bg-primaryHover shadow-md transition-colors"
                >
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {isEditing && (
                <button
                  onClick={handleCancel}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center gap-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
              )}
              <button
                onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
                disabled={isSaving}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center gap-2 ${
                  isEditing
                    ? "bg-primary text-white hover:bg-primaryHover"
                    : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                }`}
              >
                {isEditing ? (
                  <>
                    <Check className="w-4 h-4" />
                    {isSaving ? "Saving..." : "Save Profile"}
                  </>
                ) : (
                  <>
                    <Edit2 className="w-4 h-4" /> Edit Profile
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
              {[profile.firstName, profile.lastName]
                .filter(Boolean)
                .join(" ") || profile.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-zinc-500 dark:text-zinc-400 text-sm font-medium">
              <span className="flex items-center">
                <Mail className="w-4 h-4 mr-1.5" /> {profile.email}
              </span>
              {profile.contactNumber && (
                <span className="flex items-center">
                  <Phone className="w-4 h-4 mr-1.5" /> {profile.contactNumber}
                </span>
              )}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                {profile.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information Card */}
      <div className="glass-card rounded-2xl shadow-lg shadow-zinc-200 dark:shadow-none p-8 border border-zinc-50 dark:border-zinc-800">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-primary" />
          Personal Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* First Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              First Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={profile.firstName || ""}
                onChange={(e) =>
                  setProfile({ ...profile, firstName: e.target.value })
                }
                placeholder="Enter first name"
                className="w-full p-3 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
              />
            ) : (
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                {profile.firstName || (
                  <span className="text-zinc-400 italic">Not set</span>
                )}
              </p>
            )}
          </div>

          {/* Last Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              Last Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={profile.lastName || ""}
                onChange={(e) =>
                  setProfile({ ...profile, lastName: e.target.value })
                }
                placeholder="Enter last name"
                className="w-full p-3 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
              />
            ) : (
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                {profile.lastName || (
                  <span className="text-zinc-400 italic">Not set</span>
                )}
              </p>
            )}
          </div>

          {/* Contact Number */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              Contact Number
            </label>
            {isEditing ? (
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                <input
                  type="tel"
                  value={profile.contactNumber || ""}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      contactNumber: formatAustralianPhone(e.target.value),
                    })
                  }
                  placeholder="04XX XXX XXX"
                  maxLength={13}
                  className="w-full pl-9 pr-3 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
                />
              </div>
            ) : (
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl flex items-center gap-2">
                {profile.contactNumber ? (
                  <>
                    <Phone className="w-4 h-4 text-zinc-400" />
                    {profile.contactNumber}
                  </>
                ) : (
                  <span className="text-zinc-400 italic">Not set</span>
                )}
              </p>
            )}
          </div>

          {/* Gender */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              Gender
            </label>
            {isEditing ? (
              <CustomDropdown
                options={GENDER_OPTIONS}
                value={profile.gender || ""}
                onChange={(val) =>
                  setProfile({
                    ...profile,
                    gender: val as "Male" | "Female",
                  })
                }
                placeholder="Select gender"
                icon={<Users className="w-4 h-4 text-zinc-400" />}
                variant="compact"
              />
            ) : (
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                {profile.gender || (
                  <span className="text-zinc-400 italic">Not set</span>
                )}
              </p>
            )}
          </div>

          {/* Year Level */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              Year Level
            </label>
            {isEditing ? (
              <CustomDropdown
                options={YEAR_LEVEL_OPTIONS}
                value={profile.yearLevel || ""}
                onChange={(val) => setProfile({ ...profile, yearLevel: val })}
                placeholder="Select year level"
                icon={<GraduationCap className="w-4 h-4 text-zinc-400" />}
                variant="compact"
              />
            ) : (
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl flex items-center gap-2">
                {profile.yearLevel ? (
                  <>
                    <GraduationCap className="w-4 h-4 text-zinc-400" />
                    {profile.yearLevel}
                  </>
                ) : (
                  <span className="text-zinc-400 italic">Not set</span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* About Me */}
        <div className="mt-6 space-y-1.5">
          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
            About Me
          </label>
          {isEditing ? (
            <textarea
              className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none leading-relaxed transition-all dark:text-white focus:bg-white dark:focus:bg-zinc-900"
              rows={4}
              value={profile.about}
              placeholder="Tell us about yourself..."
              onChange={(e) =>
                setProfile({ ...profile, about: e.target.value })
              }
            />
          ) : (
            <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
              {profile.about || (
                <span className="text-zinc-400 italic">No bio added yet.</span>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Skills */}
        <div className="md:col-span-2 glass-card rounded-2xl shadow-lg shadow-zinc-200 dark:shadow-none p-8 border border-zinc-50 dark:border-zinc-800 h-full">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
              Skills &amp; Expertise
            </h3>
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
            {(profile.skills || []).map((skill) => (
              <div
                key={skill.id}
                className="flex items-center bg-white/60 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 pl-4 pr-3 py-2 rounded-xl text-sm font-semibold border border-zinc-200 dark:border-zinc-700 shadow-sm"
              >
                <span>{skill.name}</span>
                <span className="mx-2 text-zinc-300 dark:text-zinc-600">|</span>
                <span className="text-[10px] uppercase text-zinc-400 dark:text-zinc-500 tracking-wider">
                  {skill.level}
                </span>
                {isEditing && (
                  <button
                    onClick={() => removeSkill(skill.id)}
                    className="ml-2 p-1 text-zinc-400 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            {((profile.skills as any[])?.length || 0) === 0 && !isEditing && (
              <p className="text-zinc-400 dark:text-zinc-600 italic text-sm">
                No skills listed.
              </p>
            )}
          </div>

          {isEditing && (
            <div className="flex gap-2 mt-auto">
              <input
                type="text"
                className="flex-1 p-3 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-primary dark:focus:ring-primary outline-none transition-all dark:text-white"
                placeholder="Add a new skill (e.g. Leadership)"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddSkill()}
              />
              <button
                onClick={handleAddSkill}
                className="px-4 bg-primary text-white rounded-xl hover:bg-primaryHover transition-colors shadow-md"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Resume Upload */}
        <div className="glass-card rounded-2xl shadow-lg shadow-zinc-200 dark:shadow-none p-8 border border-zinc-50 dark:border-zinc-800 flex flex-col">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
            Resume / CV
          </h3>

          {profile.resumeUrl ? (
            /* ── Uploaded CV thumbnail card ── */
            <div className="flex-1 flex flex-col gap-4">
              {/* PDF icon card */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
                <div className="shrink-0 w-14 h-14 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <FileText className="w-7 h-7 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                    {profile.resumeOriginalName || "Resume.pdf"}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">PDF / Document</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-auto">
                <a
                  href={`${import.meta.env.VITE_API_URL?.replace(/\/api$/, "") ?? "http://localhost:5001"}${profile.resumeUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primaryHover transition-all shadow-md"
                >
                  <Download className="w-3.5 h-3.5" /> View / Download
                </a>
                <button
                  onClick={() =>
                    document.getElementById("resume-upload")?.click()
                  }
                  className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                  title="Replace CV"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleRemoveResume}
                  className="px-4 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
                  title="Remove CV"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* ── Empty drop-zone ── */
            <div
              onClick={() =>
                !isUploadingResume &&
                document.getElementById("resume-upload")?.click()
              }
              className="flex-1 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 text-center hover:bg-red-50 dark:hover:bg-red-900/10 hover:border-red-300 dark:hover:border-red-900 transition-all cursor-pointer flex flex-col items-center justify-center group h-full min-h-[160px]"
            >
              {isUploadingResume ? (
                <>
                  <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                  <p className="text-sm text-zinc-500 font-semibold">
                    Uploading…
                  </p>
                </>
              ) : (
                <>
                  <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-400 dark:text-zinc-500 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 font-semibold">
                    Upload PDF / DOC Resume
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                    Max 5 MB
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Volunteer History */}
      <div className="glass-card rounded-2xl shadow-lg shadow-zinc-200 dark:shadow-none p-8 border border-zinc-50 dark:border-zinc-800">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">
          Volunteer History
        </h3>
        <div className="space-y-6">
          <div className="flex gap-4 p-4 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
            <div className="mt-1">
              <div className="p-2.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-xl shadow-sm">
                <Star className="w-5 h-5 fill-current" />
              </div>
            </div>
            <div>
              <h4 className="text-base font-bold text-zinc-900 dark:text-white">
                School Library Helper
              </h4>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                Verified by Mrs. Librarian • Jan 2024
              </p>
              <div className="mt-3 inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                4 Hours
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
