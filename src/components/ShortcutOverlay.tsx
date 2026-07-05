import { X } from "lucide-react";

interface ShortcutOverlayProps {
  open: boolean;
  onClose: () => void;
}

const GROUPS = [
  {
    title: "Tasks",
    shortcuts: [
      { keys: "n", desc: "Focus task input" },
      { keys: "↑↓", desc: "Navigate task list" },
      { keys: "Enter", desc: "Toggle task complete" },
      { keys: "E", desc: "Edit task details (when selected)" },
      { keys: "Delete / Backspace", desc: "Delete selected task" },
    ],
  },
  {
    title: "Search",
    shortcuts: [
      { keys: "Ctrl+F", desc: "Quick find / search tasks" },
      { keys: "Escape", desc: "Clear search" },
    ],
  },
  {
    title: "Navigation",
    shortcuts: [
      { keys: "Escape", desc: "Hide window / close panel" },
      { keys: "Ctrl+Shift+Space", desc: "Toggle FocusTap (global)" },
      { keys: "?", desc: "Show this shortcut reference" },
    ],
  },
  {
    title: "Pomodoro",
    shortcuts: [
      { keys: "Ctrl+Shift+P", desc: "Start / pause timer" },
    ],
  },
];

export function ShortcutOverlay({ open, onClose }: ShortcutOverlayProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" />

      {/* Card */}
      <div
        className="relative glass-elevated rounded-[14px] shadow-2xl w-[320px] max-w-[90vw] max-h-[80vh] overflow-y-auto animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h2 className="text-sm font-medium text-text-primary">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
        <div className="mx-5 h-px bg-border-subtle" />

        {/* Groups */}
        <div className="px-5 py-4 space-y-4">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-wide mb-2">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((sc) => (
                  <div key={sc.desc} className="flex items-center justify-between">
                    <span className="text-xs text-text-primary">{sc.desc}</span>
                    <span className="text-[11px] font-mono bg-white/5 text-text-secondary px-2 py-0.5 rounded-md border border-border-subtle whitespace-nowrap ml-3">
                      {sc.keys}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border-subtle">
          <p className="text-[10px] text-text-tertiary/60 text-center">
            Press <kbd className="text-text-secondary">?</kbd> or <kbd className="text-text-secondary">Escape</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}