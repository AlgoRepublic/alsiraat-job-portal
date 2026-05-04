import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Mail,
  Server,
  Eye,
  EyeOff,
  Send,
  Save,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Code,
  FileText,
  Zap,
  Layout,
  MonitorSmartphone,
  ImagePlus,
  Loader2,
  Link2,
  Palette,
  Type,
  X,
} from "lucide-react";
import { DefaultEditor } from "react-simple-wysiwyg";
import { API_BASE_URL } from "../services/api";
import { useToast } from "../components/Toast";

/* ─── Image Upload Button ─────────────────────────────────────────────────────
 * Converts a selected image/icon file to a base64 data-URL and inserts an
 * <img> tag into the current HTML body.                                      */
interface ImageUploadBtnProps {
  onInsert: (html: string) => void;
}

const ImageUploadBtn: React.FC<ImageUploadBtnProps> = ({ onInsert }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState("");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      alert("Unsupported image type. Use PNG, JPG, GIF, WebP, or SVG.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be under 2 MB.");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      // For SVGs embed as img; for raster images also use img tag
      const isIcon = file.type === "image/svg+xml" || file.size < 10 * 1024;
      const width = isIcon ? " width=\"32\" height=\"32\"" : " width=\"100%\" style=\"max-width:600px;display:block;margin:8px 0;\"";
      onInsert(`<img src="${src}"${width} alt="${file.name}" />`);
      setUploading(false);
    };
    reader.onerror = () => setUploading(false);
    reader.readAsDataURL(file);
    // reset so same file can be re-selected
    e.target.value = "";
  };

  const handleUrlInsert = () => {
    if (!urlValue.trim()) return;
    onInsert(`<img src="${urlValue.trim()}" width="100%" style="max-width:600px;display:block;margin:8px 0;" alt="image" />`);
    setUrlValue("");
    setShowUrlInput(false);
  };

  return (
    <div className="flex items-center gap-1">
      {/* Upload from disk */}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleFile}
      />
      <button
        type="button"
        title="Insert image / icon"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg transition-all disabled:opacity-50"
      >
        {uploading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <ImagePlus className="w-3.5 h-3.5" />
        )}
        Image
      </button>

      {/* Insert by URL */}
      <button
        type="button"
        title="Insert image by URL"
        onClick={() => setShowUrlInput((p) => !p)}
        className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg transition-all"
      >
        <Link2 className="w-3.5 h-3.5" />
        URL
      </button>

      {showUrlInput && (
        <div className="flex items-center gap-1">
          <input
            type="url"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUrlInsert()}
            placeholder="https://example.com/image.png"
            className="w-56 px-2.5 py-1 text-xs border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="button"
            onClick={handleUrlInsert}
            className="px-2 py-1 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primaryHover transition-colors"
          >
            Insert
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface TemplateMeta {
  eventKey: string;
  label: string;
  description: string;
  variables: string[];
  defaultSubject: string;
  defaultBodyText: string;
}

interface TemplateConfig {
  eventKey: string;
  enabled: boolean;
  subject: string;
  bodyHtml: string;
  bodyText: string;
}

type EmailProviderType = "smtp" | "azure";

interface SmtpConfig {
  smtpEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  fromName: string;
  fromEmail: string;
  replyToEmail: string;
}

interface AzureConfig {
  azureConnectionString: string;
  azureFromEmail: string;
}

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
});

// ─── Main Component ───────────────────────────────────────────────────────────
export const EmailNotificationSettings: React.FC<{
  scopeRevision?: number;
}> = ({ scopeRevision = 0 }) => {
  const { showSuccess, showError } = useToast();

  // Provider and master switch
  const [emailProvider, setEmailProvider] = useState<EmailProviderType>("smtp");
  const [emailEnabled, setEmailEnabled] = useState(true);

  // SMTP state
  const [smtp, setSmtp] = useState<SmtpConfig>({
    smtpEnabled: false,
    smtpHost: "smtp.gmail.com",
    smtpPort: 465,
    smtpSecure: true,
    smtpUser: "",
    smtpPass: "",
    fromName: "Al-Siraat Tasker",
    fromEmail: "",
    replyToEmail: "",
  });
  const [azure, setAzure] = useState<AzureConfig>({
    azureConnectionString: "",
    azureFromEmail: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(
    null,
  );
  const [testMsg, setTestMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Template state
  const [templateMeta, setTemplateMeta] = useState<TemplateMeta[]>([]);
  const [templates, setTemplates] = useState<Record<string, TemplateConfig>>(
    {},
  );
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [activeTemplateTab, setActiveTemplateTab] = useState<
    Record<string, "text" | "html" | "visual">
  >({});

  // Brand state
  const [brand, setBrand] = useState({
    brandName: "",
    brandColor: "#812349",
    brandLogo: "",
    brandTagline: "",
  });
  const brandLogoRef = useRef<HTMLInputElement>(null);
  const [brandLogoUploading, setBrandLogoUploading] = useState(false);

  // ── Load data on mount / when active organisation changes ──
  useEffect(() => {
    loadSettings();
  }, [scopeRevision]);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, metaRes] = await Promise.all([
        fetch(`${API_BASE_URL}/email-settings`, { headers: authHeaders() }),
        fetch(`${API_BASE_URL}/email-settings/template-meta`, {
          headers: authHeaders(),
        }),
      ]);

      const settingsData = await settingsRes.json();
      const metaData = await metaRes.json();

      if (Array.isArray(metaData)) setTemplateMeta(metaData);

      if (settingsData.settings) {
        const s = settingsData.settings;
        setEmailProvider(
          s.emailProvider === "azure" ? "azure" : "smtp",
        );
        setEmailEnabled(s.emailEnabled !== false);
        setSmtp({
          smtpEnabled: s.smtpEnabled ?? false,
          smtpHost: s.smtpHost || "smtp.gmail.com",
          smtpPort: s.smtpPort || 465,
          smtpSecure: s.smtpSecure ?? true,
          smtpUser: s.smtpUser || "",
          smtpPass: s.smtpPass ? "••••••••" : "",
          fromName: s.fromName || "Al-Siraat Tasker",
          fromEmail: s.fromEmail || "",
          replyToEmail: s.replyToEmail || "",
        });
        setAzure({
          azureConnectionString: s.azureConnectionString || "",
          azureFromEmail: s.azureFromEmail || "",
        });

        // Brand
        setBrand({
          brandName: s.brandName || "",
          brandColor: s.brandColor || "#812349",
          brandLogo: s.brandLogo || "",
          brandTagline: s.brandTagline || "",
        });

        // Convert stored array to keyed record
        const tMap: Record<string, TemplateConfig> = {};
        if (Array.isArray(s.templates)) {
          s.templates.forEach((t: TemplateConfig) => {
            tMap[t.eventKey] = t;
          });
        }
        setTemplates(tMap);
      }
    } catch {
      showError("Failed to load email settings");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Helpers ──

  const getTemplateForEvent = (meta: TemplateMeta): TemplateConfig => {
    return (
      templates[meta.eventKey] || {
        eventKey: meta.eventKey,
        enabled: true,
        subject: meta.defaultSubject,
        bodyHtml: "",
        bodyText: meta.defaultBodyText,
      }
    );
  };

  const updateTemplate = (eventKey: string, patch: Partial<TemplateConfig>) => {
    setTemplates((prev) => ({
      ...prev,
      [eventKey]: {
        ...getTemplateForEvent(
          templateMeta.find((m) => m.eventKey === eventKey)!,
        ),
        ...prev[eventKey],
        ...patch,
      },
    }));
  };

  // ── Save ──
  const handleSave = async () => {
    setSaving(true);
    try {
      const bodyPayload: Record<string, unknown> = {
        emailProvider,
        emailEnabled,
        ...smtp,
        smtpPass: smtp.smtpPass === "••••••••" ? undefined : smtp.smtpPass,
        azureConnectionString:
          azure.azureConnectionString === "••••••••"
            ? undefined
            : azure.azureConnectionString,
        azureFromEmail: azure.azureFromEmail,
        // Branding
        brandName: brand.brandName,
        brandColor: brand.brandColor,
        brandLogo: brand.brandLogo,
        brandTagline: brand.brandTagline,
        templates: Object.values(templates),
      };

      const res = await fetch(`${API_BASE_URL}/email-settings`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(bodyPayload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showSuccess("Email settings saved successfully");
    } catch (err: any) {
      showError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // ── Test (uses saved config for selected provider) ──
  const handleTest = async () => {
    if (!testEmail) {
      showError("Enter a test recipient email");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/email-settings/test`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          provider: emailProvider,
          testRecipient: testEmail,
          // Include SMTP fields for backward compat when no saved settings
          ...smtp,
          smtpPass: smtp.smtpPass === "••••••••" ? undefined : smtp.smtpPass,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setTestResult("success");
      setTestMsg(data.message);
    } catch (err: any) {
      setTestResult("error");
      setTestMsg(err.message);
    } finally {
      setTesting(false);
    }
  };

  // ─── Brand Panel ────────────────────────────────────────────────────────────

  const handleBrandLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      alert("Unsupported type. Use PNG, JPG, GIF, WebP or SVG.");
      return;
    }
    if (file.size > 500 * 1024) {
      alert("Logo must be under 500 KB for email compatibility.");
      return;
    }
    setBrandLogoUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setBrand((p) => ({ ...p, brandLogo: reader.result as string }));
      setBrandLogoUploading(false);
    };
    reader.onerror = () => setBrandLogoUploading(false);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const renderBrandPanel = () => (
    <div className="space-y-6">
      <p className="text-sm text-zinc-500">
        These values appear in the <strong>header of every email</strong> sent from this organisation.
        Leave a field blank to use the platform default.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Brand Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Organisation Name in Emails
          </label>
          <div className="relative">
            <Type className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={brand.brandName}
              onChange={(e) => setBrand((p) => ({ ...p, brandName: e.target.value }))}
              placeholder="Al-Siraat College (default)"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-primary/30 outline-none"
            />
          </div>
          <p className="text-xs text-zinc-400">Shown in the email header and footer links.</p>
        </div>

        {/* Brand Tagline */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Tagline
          </label>
          <input
            type="text"
            value={brand.brandTagline}
            onChange={(e) => setBrand((p) => ({ ...p, brandTagline: e.target.value }))}
            placeholder="Connecting students with opportunities (default)"
            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-primary/30 outline-none"
          />
          <p className="text-xs text-zinc-400">Short subtitle shown below the logo in the header.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Brand Colour */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Brand Colour
          </label>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl border-2 border-white shadow-md cursor-pointer shrink-0"
              style={{ background: brand.brandColor || "#812349" }}
              onClick={() => document.getElementById("brand-color-picker")?.click()}
            />
            <input
              id="brand-color-picker"
              type="color"
              value={brand.brandColor || "#812349"}
              onChange={(e) => setBrand((p) => ({ ...p, brandColor: e.target.value }))}
              className="sr-only"
            />
            <input
              type="text"
              value={brand.brandColor}
              onChange={(e) => setBrand((p) => ({ ...p, brandColor: e.target.value }))}
              placeholder="#812349"
              className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-mono focus:ring-2 focus:ring-primary/30 outline-none"
            />
          </div>
          <p className="text-xs text-zinc-400">Used for the header background and CTA button colour.</p>
        </div>

        {/* Logo */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Logo
          </label>
          <input
            ref={brandLogoRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleBrandLogoUpload}
          />
          <div className="flex items-center gap-3">
            {brand.brandLogo ? (
              <div className="relative shrink-0">
                <img
                  src={brand.brandLogo}
                  alt="Brand logo"
                  className="h-10 w-auto max-w-[120px] object-contain rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-1"
                />
                <button
                  type="button"
                  onClick={() => setBrand((p) => ({ ...p, brandLogo: "" }))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                  title="Remove logo"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => brandLogoRef.current?.click()}
              disabled={brandLogoUploading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 text-sm font-bold text-zinc-500 hover:text-primary hover:border-primary transition-colors disabled:opacity-50"
            >
              {brandLogoUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImagePlus className="w-4 h-4" />
              )}
              {brand.brandLogo ? "Replace Logo" : "Upload Logo"}
            </button>
          </div>
          <p className="text-xs text-zinc-400">PNG/SVG under 500 KB. Displayed above the org name in emails.</p>
          {/* URL input */}
          <div className="flex gap-2 mt-2">
            <input
              type="url"
              placeholder="Or paste a logo URL…"
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 outline-none focus:ring-1 focus:ring-primary"
              onBlur={(e) => {
                if (e.target.value.trim()) {
                  setBrand((p) => ({ ...p, brandLogo: e.target.value.trim() }));
                  e.target.value = "";
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val) {
                    setBrand((p) => ({ ...p, brandLogo: val }));
                    (e.target as HTMLInputElement).value = "";
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Live Email Header Preview</p>
        <div
          className="rounded-2xl overflow-hidden shadow-md max-w-sm"
          style={{ background: brand.brandColor || "#812349" }}
        >
          <div className="px-8 py-7 text-center">
            {brand.brandLogo && (
              <img
                src={brand.brandLogo}
                alt=""
                className="h-12 max-w-[160px] object-contain mx-auto mb-3"
              />
            )}
            {!brand.brandLogo && (
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🎯</span>
              </div>
            )}
            <p className="text-white font-extrabold text-lg tracking-tight">
              {brand.brandName || "Al-Siraat Tasker"}
            </p>
            <p className="text-white/75 text-xs mt-1">
              {brand.brandTagline || "Connecting students with opportunities"}
            </p>
          </div>
        </div>

        <p className="text-[11px] text-zinc-400">
          This preview shows how the email header will look to recipients.
          Click "Save All Settings" to apply.
        </p>
      </div>
    </div>
  );

  // ─── Provider selector + Enable ─────────────────────────────────────────────

  const renderProviderAndEnable = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-5 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700">
        <div>
          <p className="font-bold text-zinc-900 dark:text-white text-sm">
            Enable Email Notifications
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            When enabled, emails will be sent for configured events using the
            selected provider below
          </p>
        </div>
        <button
          onClick={() => setEmailEnabled((p) => !p)}
          className="shrink-0"
        >
          {emailEnabled ? (
            <ToggleRight className="w-10 h-10 text-primary" />
          ) : (
            <ToggleLeft className="w-10 h-10 text-zinc-400" />
          )}
        </button>
      </div>

      <div>
        <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
          Email Provider
        </label>
        <div className="flex rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 p-1 bg-zinc-100 dark:bg-zinc-800/60">
          <button
            type="button"
            onClick={() => setEmailProvider("smtp")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold transition-colors ${
              emailProvider === "smtp"
                ? "bg-white dark:bg-zinc-900 text-primary shadow-sm"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <Server className="w-4 h-4" />
            SMTP
          </button>
          <button
            type="button"
            onClick={() => setEmailProvider("azure")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold transition-colors ${
              emailProvider === "azure"
                ? "bg-white dark:bg-zinc-900 text-primary shadow-sm"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <Zap className="w-4 h-4" />
            Azure Communication Services
          </button>
        </div>
      </div>
    </div>
  );

  // ─── SMTP Panel ───────────────────────────────────────────────────────────

  const renderSmtpPanel = () => (
    <div className="space-y-6">
      <div
        className={`space-y-5 transition-opacity ${emailEnabled ? "opacity-100" : "opacity-40 pointer-events-none"}`}
      >
        {/* Server settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              SMTP Host
            </label>
            <input
              type="text"
              value={smtp.smtpHost}
              onChange={(e) =>
                setSmtp((p) => ({ ...p, smtpHost: e.target.value }))
              }
              placeholder="smtp.gmail.com"
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-primary/30 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              Port
            </label>
            <div className="flex gap-3">
              <input
                type="number"
                value={smtp.smtpPort}
                onChange={(e) =>
                  setSmtp((p) => ({
                    ...p,
                    smtpPort: parseInt(e.target.value) || 465,
                  }))
                }
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-primary/30 outline-none"
              />
              <button
                onClick={() =>
                  setSmtp((p) => ({ ...p, smtpSecure: !p.smtpSecure }))
                }
                title={
                  smtp.smtpSecure ? "SSL/TLS (port 465)" : "STARTTLS (port 587)"
                }
                className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  smtp.smtpSecure
                    ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400"
                    : "bg-zinc-100 border-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:border-zinc-700"
                }`}
              >
                {smtp.smtpSecure ? "SSL/TLS" : "STARTTLS"}
              </button>
            </div>
          </div>
        </div>

        {/* Auth credentials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              SMTP Username
            </label>
            <input
              type="email"
              value={smtp.smtpUser}
              onChange={(e) =>
                setSmtp((p) => ({ ...p, smtpUser: e.target.value }))
              }
              placeholder="your@gmail.com"
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-primary/30 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              App Password / SMTP Password
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={smtp.smtpPass}
                onChange={(e) =>
                  setSmtp((p) => ({ ...p, smtpPass: e.target.value }))
                }
                placeholder="Gmail App Password (16 chars)"
                className="w-full px-4 py-2.5 pr-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-primary/30 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                {showPass ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* From details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              From Name
            </label>
            <input
              type="text"
              value={smtp.fromName}
              onChange={(e) =>
                setSmtp((p) => ({ ...p, fromName: e.target.value }))
              }
              placeholder="Al-Siraat Tasker"
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-primary/30 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              From Email
            </label>
            <input
              type="email"
              value={smtp.fromEmail}
              onChange={(e) =>
                setSmtp((p) => ({ ...p, fromEmail: e.target.value }))
              }
              placeholder="noreply@alsiraat.vic.edu.au"
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-primary/30 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              Reply-To Email
            </label>
            <input
              type="email"
              value={smtp.replyToEmail}
              onChange={(e) =>
                setSmtp((p) => ({ ...p, replyToEmail: e.target.value }))
              }
              placeholder="support@alsiraat.vic.edu.au"
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-primary/30 outline-none"
            />
          </div>
        </div>

        {/* Test connection */}
        <div className="border border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl p-5 space-y-3">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
            Test Connection
          </p>
          <div className="flex gap-3">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Send test email to..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-primary/30 outline-none"
            />
            <button
              onClick={handleTest}
              disabled={testing}
              className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {testing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {testing ? "Sending…" : "Send Test"}
            </button>
          </div>

          {testResult && (
            <div
              className={`flex items-start gap-3 p-3 rounded-xl text-sm ${
                testResult === "success"
                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                  : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
              }`}
            >
              {testResult === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{testMsg}</span>
            </div>
          )}
        </div>

        {/* Gmail hint */}
        <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-xl text-xs text-amber-800 dark:text-amber-400">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>Gmail users:</strong> Use an{" "}
            <a
              href="https://support.google.com/accounts/answer/185833"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              App Password
            </a>{" "}
            (not your account password). Go to Google Account → Security →
            2-Step Verification → App Passwords.
          </span>
        </div>
      </div>
    </div>
  );

  // ─── Azure Panel ───────────────────────────────────────────────────────────

  const renderAzurePanel = () => (
    <div className="space-y-6">
      <div
        className={`space-y-5 transition-opacity ${emailEnabled ? "opacity-100" : "opacity-40 pointer-events-none"}`}
      >
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              Connection String
            </label>
            <input
              type="password"
              autoComplete="off"
              value={azure.azureConnectionString}
              onChange={(e) =>
                setAzure((p) => ({
                  ...p,
                  azureConnectionString: e.target.value,
                }))
              }
              placeholder={
                azure.azureConnectionString === "••••••••"
                  ? "Stored in database — enter new value to replace"
                  : "endpoint=https://...;accesskey=..."
              }
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-primary/30 outline-none font-mono"
            />
            <p className="text-xs text-zinc-500 mt-1">
              {azure.azureConnectionString === "••••••••"
                ? "Connection string is stored. Leave as is to keep it, or enter a new value to replace."
                : "From Azure Portal: Communication Services → Keys. Use the full connection string (endpoint + accesskey)."}
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              From Email (Sender Address)
            </label>
            <input
              type="email"
              value={azure.azureFromEmail}
              onChange={(e) =>
                setAzure((p) => ({ ...p, azureFromEmail: e.target.value }))
              }
              placeholder="no-reply@taskerapp.au"
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-primary/30 outline-none"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Must be an allowable sender address in your Azure Email
              Communication Service (verified domain).
            </p>
          </div>
        </div>

        {/* Test connection */}
        <div className="border border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl p-5 space-y-3">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
            Test Connection
          </p>
          <div className="flex gap-3">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Send test email to..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-primary/30 outline-none"
            />
            <button
              onClick={handleTest}
              disabled={testing}
              className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {testing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {testing ? "Sending…" : "Send Test"}
            </button>
          </div>

          {testResult && (
            <div
              className={`flex items-start gap-3 p-3 rounded-xl text-sm ${
                testResult === "success"
                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                  : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
              }`}
            >
              {testResult === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{testMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ─── Template Editor ──────────────────────────────────────────────────────

  const renderTemplateEditor = () => (
    <div className="space-y-3">
      {templateMeta.map((meta) => {
        const tpl = getTemplateForEvent(meta);
        const isExpanded = expandedTemplate === meta.eventKey;
        const tab = activeTemplateTab[meta.eventKey] || "text";

        return (
          <div
            key={meta.eventKey}
            className={`rounded-2xl border transition-all ${
              isExpanded
                ? "border-primary/40 shadow-md shadow-primary/5"
                : "border-zinc-200 dark:border-zinc-700"
            } bg-white dark:bg-zinc-900/50 overflow-hidden`}
          >
            {/* Header row */}
            <button
              onClick={() =>
                setExpandedTemplate(isExpanded ? null : meta.eventKey)
              }
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <div className="flex items-center gap-3">
                {/* Enable/disable toggle — div instead of button to avoid nested <button> */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateTemplate(meta.eventKey, { enabled: !tpl.enabled });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      updateTemplate(meta.eventKey, { enabled: !tpl.enabled });
                    }
                  }}
                  className="shrink-0 cursor-pointer"
                >
                  {tpl.enabled ? (
                    <ToggleRight className="w-7 h-7 text-primary" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-zinc-400" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-zinc-900 dark:text-white text-sm">
                    {meta.label}
                  </p>
                  <p className="text-xs text-zinc-500">{meta.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    tpl.enabled
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
                  }`}
                >
                  {tpl.enabled ? "On" : "Off"}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                )}
              </div>
            </button>

            {/* Expanded editor */}
            {isExpanded && (
              <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-5 space-y-4">
                {/* Available variables */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider mr-1 self-center">
                    Variables:
                  </span>
                  {meta.variables.map((v) => (
                    <code
                      key={v}
                      className="text-xs bg-primary/5 text-primary border border-primary/20 px-2 py-0.5 rounded-lg font-mono cursor-pointer hover:bg-primary/10 transition-colors"
                      title="Click to copy"
                      onClick={() =>
                        navigator.clipboard
                          .writeText(v)
                          .then(() => showSuccess(`Copied ${v}`))
                      }
                    >
                      {v}
                    </code>
                  ))}
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={tpl.subject}
                    onChange={(e) =>
                      updateTemplate(meta.eventKey, { subject: e.target.value })
                    }
                    placeholder={meta.defaultSubject}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                  />
                </div>

                {/* Body tab switcher */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mr-2">
                      Body
                    </label>
                    <div className="flex rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 text-xs">
                      <button
                        onClick={() =>
                          setActiveTemplateTab((p) => ({
                            ...p,
                            [meta.eventKey]: "text",
                          }))
                        }
                        className={`flex items-center gap-1 px-3 py-1.5 font-bold transition-colors ${
                          tab === "text"
                            ? "bg-primary text-white"
                            : "bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-700"
                        }`}
                      >
                        <FileText className="w-3 h-3" />
                        Plain Text
                      </button>
                      <button
                        onClick={() =>
                          setActiveTemplateTab((p) => ({
                            ...p,
                            [meta.eventKey]: "visual",
                          }))
                        }
                        className={`flex items-center gap-1 px-3 py-1.5 font-bold transition-colors ${
                          tab === "visual"
                            ? "bg-primary text-white"
                            : "bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-700"
                        }`}
                      >
                        <MonitorSmartphone className="w-3 h-3" />
                        Visual
                      </button>
                      <button
                        onClick={() =>
                          setActiveTemplateTab((p) => ({
                            ...p,
                            [meta.eventKey]: "html",
                          }))
                        }
                        className={`flex items-center gap-1 px-3 py-1.5 font-bold transition-colors ${
                          tab === "html"
                            ? "bg-primary text-white"
                            : "bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-700"
                        }`}
                      >
                        <Code className="w-3 h-3" />
                        HTML
                      </button>
                    </div>
                  </div>

                  {tab === "visual" ? (
                    <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 wysiwyg-wrapper">
                      {/* Custom toolbar row above the WYSIWYG editor */}
                      <div className="flex items-center gap-2 flex-wrap px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/50">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Insert:</span>
                        <ImageUploadBtn
                          onInsert={(html) =>
                            updateTemplate(meta.eventKey, {
                              bodyHtml: (tpl.bodyHtml || "") + html,
                            })
                          }
                        />
                      </div>
                      <style>{`
                        .wysiwyg-wrapper .rsw-editor {
                          background: white;
                          min-height: 220px;
                          font-family: inherit;
                          font-size: 14px;
                          line-height: 1.6;
                          color: #18181b;
                        }
                        .dark .wysiwyg-wrapper .rsw-editor {
                          background: #18181b;
                          color: #f4f4f5;
                        }
                        .wysiwyg-wrapper .rsw-toolbar {
                          background: #f9fafb;
                          border-bottom: 1px solid #e5e7eb;
                          padding: 6px 8px;
                          display: flex;
                          flex-wrap: wrap;
                          gap: 4px;
                        }
                        .dark .wysiwyg-wrapper .rsw-toolbar {
                          background: #27272a;
                          border-bottom: 1px solid #3f3f46;
                        }
                        .wysiwyg-wrapper .rsw-btn {
                          background: transparent;
                          border: 1px solid transparent;
                          border-radius: 6px;
                          padding: 4px 8px;
                          cursor: pointer;
                          font-size: 13px;
                          color: #52525b;
                          transition: all 0.15s;
                          font-weight: 600;
                        }
                        .dark .wysiwyg-wrapper .rsw-btn {
                          color: #a1a1aa;
                        }
                        .wysiwyg-wrapper .rsw-btn:hover {
                          background: #e4e4e7;
                          border-color: #d4d4d8;
                          color: #18181b;
                        }
                        .dark .wysiwyg-wrapper .rsw-btn:hover {
                          background: #3f3f46;
                          border-color: #52525b;
                          color: #f4f4f5;
                        }
                        .wysiwyg-wrapper .rsw-btn.rsw-btn-active,
                        .wysiwyg-wrapper .rsw-btn[data-active="true"] {
                          background: #dc2626;
                          border-color: #dc2626;
                          color: white;
                        }
                        .wysiwyg-wrapper .rsw-ce {
                          padding: 12px 16px;
                          outline: none;
                          min-height: 220px;
                        }
                        .wysiwyg-wrapper .rsw-ce p {
                          margin: 0 0 8px 0;
                        }
                        .wysiwyg-wrapper .rsw-ce a {
                          color: #dc2626;
                          text-decoration: underline;
                        }
                        .wysiwyg-wrapper .rsw-separator {
                          width: 1px;
                          height: 20px;
                          background: #e5e7eb;
                          margin: 0 2px;
                          align-self: center;
                        }
                        .dark .wysiwyg-wrapper .rsw-separator {
                          background: #3f3f46;
                        }
                      `}</style>
                      <DefaultEditor
                        value={tpl.bodyHtml || ""}
                        onChange={(e) =>
                          updateTemplate(meta.eventKey, {
                            bodyHtml: e.target.value,
                          })
                        }
                      />
                    </div>
                  ) : (
                    <textarea
                      value={tab === "html" ? tpl.bodyHtml : tpl.bodyText}
                      onChange={(e) =>
                        updateTemplate(meta.eventKey, {
                          [tab === "html" ? "bodyHtml" : "bodyText"]:
                            e.target.value,
                        })
                      }
                      rows={tab === "html" ? 10 : 6}
                      placeholder={
                        tab === "html"
                          ? "<p>Hi <strong>{{name}}</strong>,</p>\n<p>Your message here...</p>"
                          : meta.defaultBodyText
                      }
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-mono focus:ring-2 focus:ring-primary/30 outline-none resize-y"
                    />
                  )}

                  {tab === "html" && !tpl.bodyHtml && (
                    <p className="text-xs text-zinc-400 mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      Leave blank to use the system default branded template
                    </p>
                  )}
                  {tab === "visual" && (
                    <p className="text-xs text-zinc-400 mt-1.5 flex items-center gap-1">
                      <Layout className="w-3 h-3 text-primary" />
                      Visual editor — changes sync with the HTML tab
                      automatically.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">
            Email Settings
          </h2>
          <p className="text-zinc-500 font-medium mt-1">
            Configure SMTP settings and customise email templates for each
            notification event
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 shrink-0"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? "Saving…" : "Save All Settings"}
        </button>
      </div>

      {/* ── Brand Settings Section ── */}
      <div className="bg-white dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Palette className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-black text-zinc-900 dark:text-white text-sm">
              Email Branding
            </h3>
            <p className="text-xs text-zinc-500">
              Logo, name, colour and tagline shown in the header of every email sent by this organisation
            </p>
          </div>
          {brand.brandLogo && (
            <div className="ml-auto">
              <img src={brand.brandLogo} alt="" className="h-7 w-auto max-w-[80px] object-contain opacity-80" />
            </div>
          )}
        </div>
        <div className="p-6 space-y-6">{renderBrandPanel()}</div>
      </div>

      {/* ── Email Provider Section ── */}
      <div className="bg-white dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            {emailProvider === "azure" ? (
              <Zap className="w-4 h-4 text-primary" />
            ) : (
              <Server className="w-4 h-4 text-primary" />
            )}
          </div>
          <div>
            <h3 className="font-black text-zinc-900 dark:text-white text-sm">
              {emailProvider === "azure"
                ? "Azure Communication Services"
                : "SMTP Configuration"}
            </h3>
            <p className="text-xs text-zinc-500">
              {emailProvider === "azure"
                ? "Send email via Azure Email Communication Service"
                : "Outgoing mail server settings"}
            </p>
          </div>
          <div className="ml-auto">
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full ${
                emailEnabled
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
              }`}
            >
              {emailEnabled ? "● Enabled" : "○ Disabled"}
            </span>
          </div>
        </div>
        <div className="p-6 space-y-6">
          {renderProviderAndEnable()}
          {emailProvider === "smtp" ? renderSmtpPanel() : renderAzurePanel()}
        </div>
      </div>

      {/* ── Email Templates Section ── */}
      <div className="bg-white dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Mail className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-black text-zinc-900 dark:text-white text-sm">
              Email Templates
            </h3>
            <p className="text-xs text-zinc-500">
              Customise the subject and body for each notification event. Use{" "}
              <code className="text-primary text-[11px]">{"{{variable}}"}</code>{" "}
              placeholders for dynamic content.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-zinc-400">
            <Zap className="w-3.5 h-3.5" />
            <span>
              {
                (Object.values(templates) as TemplateConfig[]).filter(
                  (t) => t.enabled !== false,
                ).length
              }{" "}
              / {templateMeta.length} active
            </span>
          </div>
        </div>
        <div className="p-6">{renderTemplateEditor()}</div>
      </div>
    </div>
  );
};
