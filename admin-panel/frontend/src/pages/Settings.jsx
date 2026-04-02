import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Topbar from "../components/Topbar.jsx";
import api from "../api.js";

const PINK    = "#C57C8A";
const LIGHT   = "#fce7ea";
const CARD_BG = "rgba(255,255,255,0.85)";
const BORDER  = "rgba(252,228,233,0.8)";

function SettingSection({ title, icon, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 20, boxShadow: "0 4px 24px rgba(197,124,138,0.08)" }}
      className="overflow-hidden"
    >
      <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <span className="text-xl">{icon}</span>
        <p className="text-sm font-bold text-gray-800">{title}</p>
      </div>
      <div className="px-6 py-5">{children}</div>
    </motion.div>
  );
}

function SettingRow({ label, description, children }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid rgba(252,228,233,0.4)" }}>
      <div className="mr-4">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        {description && <p className="text-xs mt-0.5" style={{ color: "#c4a0a8" }}>{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="relative inline-flex items-center w-11 h-6 rounded-full transition-colors duration-300"
      style={{ background: enabled ? "linear-gradient(135deg, #C57C8A, #e8a0ae)" : "#e5e7eb" }}
    >
      <motion.span
        animate={{ x: enabled ? 22 : 2 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="inline-block w-5 h-5 bg-white rounded-full shadow-md"
      />
    </button>
  );
}

export default function Settings() {
  const [settings, setSettings] = useState({
    emailNotifications:  true,
    newUserAlert:        true,
    highRiskAlert:       true,
    maintenanceMode:     false,
    autoApproveDoctors:  false,
    analyticsEnabled:    true,
  });
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // "saved" | "error"

  // Load settings from DB on mount
  useEffect(() => {
    api.get("/settings")
      .then((res) => {
        const { maintenanceMode, autoApproveDoctors, analyticsEnabled,
                emailNotifications, newUserAlert, highRiskAlert } = res.data;
        setSettings({
          maintenanceMode:    maintenanceMode    ?? false,
          autoApproveDoctors: autoApproveDoctors ?? false,
          analyticsEnabled:   analyticsEnabled   ?? true,
          emailNotifications: emailNotifications ?? true,
          newUserAlert:       newUserAlert        ?? true,
          highRiskAlert:      highRiskAlert       ?? true,
        });
      })
      .catch((err) => console.error("[Settings] load error:", err.message));
  }, []);

  const toggle = async (key) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    setSaving(true);
    setSaveStatus(null);
    try {
      await api.put("/settings", next);
      setSaveStatus("saved");
    } catch (err) {
      console.error("[Settings] save error:", err.message);
      setSettings(settings); // revert on failure
      setSaveStatus("error");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(null), 2500);
    }
  };

  const emailConfig = {
    provider: "SMTP",
    host: "smtp.gmail.com",
    port: "587",
    from: "noreply@ovacare.com",
    status: "Connected",
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Topbar title="Settings" subtitle="Configure admin panel preferences" />

      <div className="p-8 max-w-[900px] mx-auto w-full space-y-6">

        {/* Save status banner */}
        {saveStatus && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-center"
            style={{
              background: saveStatus === "saved" ? "#f0fdf4" : "#fff1f2",
              color:      saveStatus === "saved" ? "#16a34a" : "#e11d48",
              border:     `1px solid ${saveStatus === "saved" ? "#bbf7d0" : "#fecdd3"}`,
            }}
          >
            {saveStatus === "saved" ? "✓ Settings saved" : "✗ Failed to save — changes reverted"}
          </motion.div>
        )}

        {/* App Settings */}
        <SettingSection title="Application Settings" icon="⚙️">
          <SettingRow
            label="Maintenance Mode"
            description="Temporarily disable user-facing features"
          >
            <Toggle enabled={settings.maintenanceMode} onToggle={() => toggle("maintenanceMode")} />
          </SettingRow>
          <SettingRow
            label="Auto-Approve Doctors"
            description="New doctors are automatically set to active"
          >
            <Toggle enabled={settings.autoApproveDoctors} onToggle={() => toggle("autoApproveDoctors")} />
          </SettingRow>
          <SettingRow
            label="Analytics Tracking"
            description="Collect usage analytics for the dashboard"
          >
            <Toggle enabled={settings.analyticsEnabled} onToggle={() => toggle("analyticsEnabled")} />
          </SettingRow>
        </SettingSection>

        {/* Notification Settings */}
        <SettingSection title="Notification Preferences" icon="🔔">
          <SettingRow
            label="Email Notifications"
            description="Receive email alerts for admin events"
          >
            <Toggle enabled={settings.emailNotifications} onToggle={() => toggle("emailNotifications")} />
          </SettingRow>
          <SettingRow
            label="New User Registration"
            description="Alert when a new user registers"
          >
            <Toggle enabled={settings.newUserAlert} onToggle={() => toggle("newUserAlert")} />
          </SettingRow>
          <SettingRow
            label="High PCOS Risk Alert"
            description="Notify when a user is assessed as high risk"
          >
            <Toggle enabled={settings.highRiskAlert} onToggle={() => toggle("highRiskAlert")} />
          </SettingRow>
        </SettingSection>

        {/* Email Config Preview */}
        <SettingSection title="Email Configuration" icon="📧">
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(emailConfig).map(([key, val]) => (
              <div key={key} className="px-4 py-3 rounded-xl" style={{ background: LIGHT }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#c4a0a8" }}>
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800">{val}</p>
                  {key === "status" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#f0fdf4", color: "#16a34a" }}>
                      ● {val}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs mt-4" style={{ color: "#c4a0a8" }}>
            Email credentials are managed via environment variables on the server.
          </p>
        </SettingSection>

        {/* Platform Info */}
        <SettingSection title="Platform Info" icon="🌸">
          <div className="flex flex-col gap-2">
            {[
              { label: "App Name", val: "OvaCare" },
              { label: "Version",  val: "1.0.0" },
              { label: "Backend",  val: "Node.js + Express + MongoDB" },
              { label: "ML Model", val: "Random Forest + Decision Tree" },
              { label: "Admin Panel", val: "React + Tailwind + Framer Motion" },
            ].map(({ label, val }) => (
              <div key={label} className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid rgba(252,228,233,0.4)" }}>
                <span className="text-sm text-gray-500">{label}</span>
                <span className="text-sm font-semibold text-gray-800">{val}</span>
              </div>
            ))}
          </div>
        </SettingSection>

      </div>
    </div>
  );
}
