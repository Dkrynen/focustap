import { useEffect, useState, useCallback } from "react";
import { X, Monitor, Volume2, Keyboard, KeyRound, RefreshCw, Shield, Loader2 } from "lucide-react";
import { isEnabled, enable, disable } from "@tauri-apps/plugin-autostart";
import { check as checkUpdate } from "@tauri-apps/plugin-updater";
import { getVersion } from "@tauri-apps/api/app";
import { useTaskStore } from "../store";
import { playChime } from "../lib/sounds";
import { LicenseActivation } from "./LicenseActivation";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

type Tab = "general" | "license" | "updates" | "privacy";

function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                  transition-colors duration-200 ease-out focus:outline-none
                  ${checked ? "bg-accent-primary" : "bg-white/10"}`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm
                    ring-0 transition-transform duration-200 ease-out
                    ${checked ? "translate-x-4" : "translate-x-0"}`}
      />
    </button>
  );
}

function UpdatesTab() {
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<"idle" | "uptodate" | "available" | "error">("idle");
  const [version, setVersion] = useState("");
  const [currentVersion, setCurrentVersion] = useState("0.1.0");

  useEffect(() => {
    getVersion().then(setCurrentVersion).catch(() => {});
  }, []);

  const handleCheck = async () => {
    setChecking(true);
    setStatus("idle");
    try {
      const update = await checkUpdate();
      if (update) {
        setStatus("available");
        setVersion(update.version ?? "");
      } else {
        setStatus("uptodate");
      }
    } catch {
      setStatus("error");
    } finally {
      setChecking(false);
    }
  };

  const handleInstall = async () => {
    try {
      const update = await checkUpdate();
      if (update) {
        await update.downloadAndInstall();
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="shrink-0">
          <RefreshCw size={16} className="text-text-tertiary" />
        </span>
        <div>
          <p className="text-sm text-text-primary">App updates</p>
          <p className="text-xs text-text-tertiary">v{currentVersion}</p>
        </div>
      </div>

      <button
        onClick={handleCheck}
        disabled={checking}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-text-secondary text-xs rounded-[8px] transition-colors cursor-pointer disabled:opacity-40"
      >
        {checking ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        {checking ? "Checking..." : "Check for Updates"}
      </button>

      {status === "uptodate" && (
        <p className="text-xs text-green-400 text-center">You have the latest version</p>
      )}
      {status === "available" && (
        <div className="space-y-2">
          <p className="text-xs text-accent-primary text-center">
            Update {version} available
          </p>
          <button
            onClick={handleInstall}
            className="w-full px-3 py-2 bg-accent-primary/20 hover:bg-accent-primary/30 text-accent-primary text-xs rounded-[8px] transition-colors cursor-pointer"
          >
            Download & Install
          </button>
        </div>
      )}
      {status === "error" && (
        <p className="text-xs text-red-400 text-center">Update check failed</p>
      )}
    </div>
  );
}

function PrivacyTab() {
  const soundEnabled = useTaskStore((s) => s.soundEnabled);
  const setSoundEnabled = useTaskStore((s) => s.setSoundEnabled);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    import("../lib/analytics").then(({ isAnalyticsEnabled }) => {
      setAnalyticsEnabled(isAnalyticsEnabled());
    });
  }, []);

  const handleAnalyticsToggle = async (enabled: boolean) => {
    setAnalyticsEnabled(enabled);
    const { setAnalyticsEnabled: setAnalytics } = await import("../lib/analytics");
    setAnalytics(enabled);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="shrink-0">
            <Volume2 size={16} className="text-text-tertiary" />
          </span>
          <div>
            <p className="text-sm text-text-primary">Sound effects</p>
            <p className="text-xs text-text-tertiary">Chime on completion</p>
          </div>
        </div>
        <Toggle
          checked={soundEnabled}
          onChange={(c) => {
            setSoundEnabled(c);
            if (c) playChime();
          }}
          label="Sound toggle"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="shrink-0">
            <Shield size={16} className="text-text-tertiary" />
          </span>
          <div>
            <p className="text-sm text-text-primary">Usage analytics</p>
            <p className="text-xs text-text-tertiary">Anonymous app usage data</p>
          </div>
        </div>
        <Toggle
          checked={analyticsEnabled}
          onChange={handleAnalyticsToggle}
          label="Analytics toggle"
        />
      </div>
    </div>
  );
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const [tab, setTab] = useState<Tab>("general");
  const [autoStart, setAutoStart] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (open) {
      isEnabled().then(setAutoStart).catch(() => setAutoStart(false));
      requestAnimationFrame(() => setShowContent(true));
    } else {
      setShowContent(false);
      setTab("general");
    }
  }, [open]);

  const handleAutoStart = useCallback(async (checked: boolean) => {
    setAutoStart(checked);
    try {
      if (checked) {
        await enable();
      } else {
        await disable();
      }
    } catch {
      setAutoStart(!checked);
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  if (!open) return null;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "General", icon: <Monitor size={13} /> },
    { id: "license", label: "License", icon: <KeyRound size={13} /> },
    { id: "updates", label: "Updates", icon: <RefreshCw size={13} /> },
    { id: "privacy", label: "Privacy", icon: <Shield size={13} /> },
  ];

  return (
    <div className="fixed inset-0 z-50" onKeyDown={handleKeyDown} tabIndex={-1}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div
        className={`absolute right-0 top-0 h-full w-[280px] max-w-[85vw] glass-elevated
                     rounded-l-[14px] shadow-2xl flex flex-col
                     transition-transform duration-200 ease-out-expo`}
        style={{ transform: showContent ? "translateX(0)" : "translateX(100%)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h2 className="text-sm font-medium text-text-primary">Settings</h2>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary transition-colors duration-150 cursor-pointer"
            aria-label="Close settings"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pb-3 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-[6px] transition-colors cursor-pointer whitespace-nowrap ${
                tab === t.id
                  ? "bg-accent-primary/15 text-accent-primary"
                  : "text-text-tertiary hover:text-text-secondary hover:bg-white/5"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="mx-5 h-px bg-border-subtle" />

        {/* Content */}
        <div className="flex-1 px-5 py-4 space-y-5 overflow-y-auto">
          {tab === "general" && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="shrink-0">
                    <Monitor size={16} className="text-text-tertiary" />
                  </span>
                  <div>
                    <p className="text-sm text-text-primary">Launch at startup</p>
                    <p className="text-xs text-text-tertiary">Auto-open on login</p>
                  </div>
                </div>
                <Toggle
                  checked={autoStart}
                  onChange={handleAutoStart}
                  label="Auto-start toggle"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="shrink-0">
                    <Keyboard size={16} className="text-text-tertiary" />
                  </span>
                  <div>
                    <p className="text-sm text-text-primary">Keyboard shortcut</p>
                    <p className="text-xs text-text-tertiary">Toggle FocusTap</p>
                  </div>
                </div>
                <span className="text-xs font-mono bg-white/5 text-text-secondary px-2 py-1 rounded-md border border-border-subtle">
                  Ctrl+Shift+Space
                </span>
              </div>
            </>
          )}

          {tab === "license" && <LicenseActivation />}

          {tab === "updates" && <UpdatesTab />}

          {tab === "privacy" && <PrivacyTab />}
        </div>
      </div>
    </div>
  );
}
