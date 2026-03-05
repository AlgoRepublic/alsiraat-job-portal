import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { API_BASE_URL } from "../services/api";
import { useToast } from "../components/Toast";

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

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
});

// ─── Main Component ───────────────────────────────────────────────────────────
export const EmailNotificationSettings: React.FC = () => {
  const { showSuccess, showError } = useToast();

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
    Record<string, "text" | "html">
  >({});

  // ── Load data on mount ──
  useEffect(() => {
    loadSettings();
  }, []);

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
      const bodyPayload = {
        ...smtp,
        smtpPass: smtp.smtpPass === "••••••••" ? undefined : smtp.smtpPass,
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

  // ── Test SMTP ──
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
          ...smtp,
          smtpPass: smtp.smtpPass === "••••••••" ? undefined : smtp.smtpPass,
          testRecipient: testEmail,
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

  // ─── SMTP Panel ───────────────────────────────────────────────────────────

  const renderSmtpPanel = () => (
    <div className="space-y-6">
      {/* Enable toggle */}
      <div className="flex items-center justify-between p-5 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700">
        <div>
          <p className="font-bold text-zinc-900 dark:text-white text-sm">
            Enable Email Notifications
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            When enabled, emails will be sent for configured events via your
            SMTP server
          </p>
        </div>
        <button
          onClick={() =>
            setSmtp((p) => ({ ...p, smtpEnabled: !p.smtpEnabled }))
          }
          className="shrink-0"
        >
          {smtp.smtpEnabled ? (
            <ToggleRight className="w-10 h-10 text-primary" />
          ) : (
            <ToggleLeft className="w-10 h-10 text-zinc-400" />
          )}
        </button>
      </div>

      <div
        className={`space-y-5 transition-opacity ${smtp.smtpEnabled ? "opacity-100" : "opacity-40 pointer-events-none"}`}
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
                {/* Enable/disable toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateTemplate(meta.eventKey, { enabled: !tpl.enabled });
                  }}
                  className="shrink-0"
                >
                  {tpl.enabled ? (
                    <ToggleRight className="w-7 h-7 text-primary" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-zinc-400" />
                  )}
                </button>
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

                  {tab === "html" && !tpl.bodyHtml && (
                    <p className="text-xs text-zinc-400 mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      Leave blank to use the system default branded template
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
            Email & Notifications
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

      {/* ── SMTP Section ── */}
      <div className="bg-white dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Server className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-black text-zinc-900 dark:text-white text-sm">
              SMTP Configuration
            </h3>
            <p className="text-xs text-zinc-500">
              Outgoing mail server settings
            </p>
          </div>
          <div className="ml-auto">
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full ${
                smtp.smtpEnabled
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
              }`}
            >
              {smtp.smtpEnabled ? "● Enabled" : "○ Disabled"}
            </span>
          </div>
        </div>
        <div className="p-6">{renderSmtpPanel()}</div>
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
