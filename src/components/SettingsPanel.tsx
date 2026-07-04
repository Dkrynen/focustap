import { useEffect, useState, useCallback } from "react";
import { X, Monitor, Volume2, Keyboard } from "lucide-react";
import { isEnabled, enable, disable } from "@tauri-apps/plugin-autostart";
import { useTaskStore } from "../store";
import { playChime } from "../lib/sounds";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

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

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const [autoStart, setAutoStart] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const soundEnabled = useTaskStore((s) => s.soundEnabled);
  const setSoundEnabled = useTaskStore((s) => s.setSoundEnabled);

  useEffect(() => {
    if (open) {
      isEnabled().then(setAutoStart).catch(() => setAutoStart(false));
      requestAnimationFrame(() => setShowContent(true));
    } else {
      setShowContent(false);
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

  const handleSound = useCallback(
    (checked: boolean) => {
      setSoundEnabled(checked);
      if (checked) {
        playChime();
      }
    },
    [setSoundEnabled]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Glass slide-in panel */}
      <div
        className={`absolute right-0 top-0 h-full w-[280px] max-w-[85vw] glass-elevated
                     rounded-l-[14px] shadow-2xl flex flex-col
                     transition-transform duration-200 ease-out-expo`}
        style={{
          transform: showContent ? "translateX(0)" : "translateX(100%)",
        }}
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

        {/* Divider */}
        <div className="mx-5 h-px bg-border-subtle" />

        {/* Content */}
        <div className="flex-1 px-5 py-4 space-y-5">
          {/* Auto-start */}
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

          {/* Sound */}
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
              onChange={handleSound}
              label="Sound toggle"
            />
          </div>

          {/* Shortcut */}
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
        </div>
      </div>
    </div>
  );
}
