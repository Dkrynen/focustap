import { useEffect, useState, useCallback, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { TaskInput } from "./components/TaskInput";
import { TaskList } from "./components/TaskList";
import { TaskSearch } from "./components/TaskSearch";
import { PomodoroTimer } from "./components/PomodoroTimer";
import { TaskDetail } from "./components/TaskDetail";
import { ShortcutOverlay } from "./components/ShortcutOverlay";
import { StatisticsPanel } from "./components/StatisticsPanel";
import { CalendarView } from "./components/CalendarView";
import { FocusAnalytics } from "./components/FocusAnalytics";
import { SettingsPanel } from "./components/SettingsPanel";
import { NotesPanel } from "./components/NotesPanel";
import { DayPlanner } from "./components/DayPlanner";
import { useTaskStore } from "./store";
import { Settings, Sparkles, BarChart3, Calendar, BrainCircuit, Download, Edit3, Clock } from "lucide-react";
import { exportToCSVFile, exportToMarkdownFile } from "./lib/export";

function App() {
  const {
    tasks, loading, newTaskId, settingsOpen, streak,
    loadTasks, updateText, remove, setSettingsOpen,
  } = useTaskStore();

  const [mounted, setMounted] = useState(false);
  const [shortcutOverlayOpen, setShortcutOverlayOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [dayPlannerOpen, setDayPlannerOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTasks();
    requestAnimationFrame(() => setMounted(true));
  }, [loadTasks]);

  const handleEscape = useCallback(() => {
    if (settingsOpen) {
      setSettingsOpen(false);
    } else {
      getCurrentWindow().hide();
    }
  }, [settingsOpen, setSettingsOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (shortcutOverlayOpen) { setShortcutOverlayOpen(false); return; }
        handleEscape();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "P") {
        e.preventDefault();
        useTaskStore.getState().pomodoroStart();
      }
      if (e.key === "?" && !settingsOpen && !shortcutOverlayOpen) {
        setShortcutOverlayOpen(true);
      }
      if (e.key === "n" && !e.metaKey && !e.ctrlKey && !e.altKey && !settingsOpen) {
        const input = document.querySelector<HTMLInputElement>(
          'input[type="text"]'
        );
        input?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleEscape, settingsOpen, shortcutOverlayOpen]);

  return (
    <div className={`bg-surface-deep rounded-[16px] p-[1.5px] h-full ${mounted ? "animate-window-enter" : "opacity-0"}`}>
      {/* Inner core */}
      <div className="bg-surface-primary rounded-[14px] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 pt-4 pb-3"
          data-tauri-drag-region
        >
          {/* Brand glow dot */}
          <div className="w-[18px] h-[18px] rounded-full bg-surface-glass border border-border-subtle flex items-center justify-center">
            <div className="w-[8px] h-[8px] rounded-full bg-accent-primary shadow-[0_0_8px_rgba(139,126,255,0.5)] animate-glow-pulse" />
          </div>

          <span className="text-xs font-medium tracking-wide uppercase text-text-secondary select-none">
            FocusTap
          </span>

          {/* Streak flame */}
          {streak > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-amber-400/80 select-none">
              <Sparkles size={12} className="animate-flame" />
              {streak}
            </span>
          )}

          {/* Header action buttons */}
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setStatsOpen(true)}
              className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
              title="Statistics"
            >
              <BarChart3 size={13} />
            </button>
            <button
              onClick={() => setCalendarOpen(true)}
              className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
              title="Calendar"
            >
              <Calendar size={13} />
            </button>
            <button
              onClick={() => setDayPlannerOpen(true)}
              className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
              title="Day Planner"
            >
              <Clock size={13} />
            </button>
            <button
              onClick={() => useTaskStore.getState().setNotesPanelOpen(true)}
              className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
              title="Notepad"
            >
              <Edit3 size={13} />
            </button>
            <button
              onClick={() => setFocusOpen(true)}
              className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
              title="Focus Analytics"
            >
              <BrainCircuit size={13} />
            </button>
            <button
              onClick={() => {
                const m = confirm("Export as Markdown? Cancel for CSV.");
                if (m) exportToMarkdownFile();
                else exportToCSVFile();
              }}
              className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
              title="Export"
            >
              <Download size={13} />
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
              aria-label="Open settings"
            >
              <Settings size={14} />
            </button>
          </div>
        </div>

          {/* Pomodoro Timer */}
          <div className="px-5 pb-2">
            <PomodoroTimer />
          </div>

          {/* Main content */}
        <div className="flex flex-col flex-1 px-5 pb-4 pt-2 min-h-0 gap-3">
          <TaskInput />

          {/* Quick find */}
          <TaskSearch inputRef={searchRef} onSearchActive={() => {}} />

          {loading && (
            <div className="text-center py-6 text-text-tertiary/40 text-xs font-light">
              Loading...
            </div>
          )}

          {!loading && (
            <TaskList
              tasks={tasks}
              onUpdateText={updateText}
              onDelete={remove}
              focusId={newTaskId}
              streak={streak}
            />
          )}
        </div>

        {/* Settings panel */}
        <SettingsPanel
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />

        {/* Task detail panel */}
        <TaskDetail />

        {/* Shortcut overlay */}
        <ShortcutOverlay
          open={shortcutOverlayOpen}
          onClose={() => setShortcutOverlayOpen(false)}
        />

        {/* Statistics panel */}
        <StatisticsPanel
          open={statsOpen}
          onClose={() => setStatsOpen(false)}
        />

        {/* Calendar view */}
        <CalendarView
          open={calendarOpen}
          onClose={() => setCalendarOpen(false)}
        />

        {/* Focus Analytics */}
        <FocusAnalytics
          open={focusOpen}
          onClose={() => setFocusOpen(false)}
        />

        {/* Notepad */}
        <NotesPanel />

        {/* Day Planner */}
        <DayPlanner
          open={dayPlannerOpen}
          onClose={() => setDayPlannerOpen(false)}
        />
      </div>
    </div>
  );
}

export default App;
