import { useEffect, useState, useRef } from "react";
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
import { Onboarding } from "./components/Onboarding";
import { useTaskStore } from "./store";
import { initAnalytics } from "./lib/analytics";
import { ListChecks, BarChart3, Calendar, BrainCircuit, Edit3, Settings, Clock, Download, FileText, Table } from "lucide-react";
import { exportToCSVFile, exportToMarkdownFile } from "./lib/export";

function App() {
  const { tasks, loading, newTaskId, loadTasks, updateText, remove, streak, isPro, onboardingDone, setOnboardingDone } = useTaskStore();
  const [mounted, setMounted] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dayPlannerOpen, setDayPlannerOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutOverlayOpen, setShortcutOverlayOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportOpenRef = useRef(false);
  const shortcutOverlayOpenRef = useRef(false);
  const settingsOpenRef = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Keep refs in sync with state
  useEffect(() => { exportOpenRef.current = exportOpen; }, [exportOpen]);
  useEffect(() => { shortcutOverlayOpenRef.current = shortcutOverlayOpen; }, [shortcutOverlayOpen]);
  useEffect(() => { settingsOpenRef.current = settingsOpen; }, [settingsOpen]);

  useEffect(() => {
    loadTasks();
    initAnalytics();
    requestAnimationFrame(() => setMounted(true));
  }, [loadTasks]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (exportOpenRef.current) { setExportOpen(false); return; }
        if (shortcutOverlayOpenRef.current) { setShortcutOverlayOpen(false); return; }
        if (settingsOpenRef.current) { setSettingsOpen(false); return; }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "P") {
        e.preventDefault();
        useTaskStore.getState().pomodoroStart();
      }
      if (e.key === "n" && !e.metaKey && !e.ctrlKey) {
        document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className={`h-full flex flex-col bg-[#0a0a0a] ${mounted ? "animate-fade-in" : "opacity-0"}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 select-none">
        <ListChecks size={16} className="text-[#8b7eff]" />
        <span className="text-xs font-medium text-[#a0a0a0]">FocusTap</span>
        {streak > 0 && (
          <span className="text-[11px] text-[#eab308]">{streak}🔥</span>
        )}
        {isPro && (
          <span className="text-[10px] font-medium text-accent-primary ml-1">PRO</span>
        )}

        {/* Toolbar */}
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setStatsOpen(true)} className="text-[#555] hover:text-[#f0f0f0] transition-colors cursor-pointer p-1" title="Statistics">
            <BarChart3 size={13} />
          </button>
          <button onClick={() => setCalendarOpen(true)} className="text-[#555] hover:text-[#f0f0f0] transition-colors cursor-pointer p-1" title="Calendar">
            <Calendar size={13} />
          </button>
          <button onClick={() => setDayPlannerOpen(true)} className="text-[#555] hover:text-[#f0f0f0] transition-colors cursor-pointer p-1" title="Day Planner">
            <Clock size={13} />
          </button>
          <button onClick={() => useTaskStore.getState().setNotesPanelOpen(true)} className="text-[#555] hover:text-[#f0f0f0] transition-colors cursor-pointer p-1" title="Notes">
            <Edit3 size={13} />
          </button>
          <button onClick={() => setFocusOpen(true)} className="text-[#555] hover:text-[#f0f0f0] transition-colors cursor-pointer p-1" title="Focus">
            <BrainCircuit size={13} />
          </button>
          <div className="relative">
            <button onClick={() => setExportOpen(!exportOpen)} className="text-[#555] hover:text-[#f0f0f0] transition-colors cursor-pointer p-1" title="Export">
              <Download size={13} />
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-1 w-[130px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] rounded-[6px] shadow-xl z-50 overflow-hidden">
                <button onClick={() => { setExportOpen(false); exportToMarkdownFile(); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#a0a0a0] hover:bg-[rgba(139,126,255,0.1)] hover:text-[#f0f0f0] transition-colors cursor-pointer">
                  <FileText size={12} /> Markdown
                </button>
                <button onClick={() => { setExportOpen(false); exportToCSVFile(); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#a0a0a0] hover:bg-[rgba(139,126,255,0.1)] hover:text-[#f0f0f0] transition-colors cursor-pointer">
                  <Table size={12} /> CSV
                </button>
              </div>
            )}
          </div>
          <button onClick={() => setSettingsOpen(true)} className="text-[#555] hover:text-[#f0f0f0] transition-colors cursor-pointer p-1" title="Settings">
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Pomodoro */}
      <div className="px-4 pb-1">
        <PomodoroTimer />
      </div>

      {/* Main */}
      <div className="flex flex-col flex-1 px-4 pb-4 min-h-0 gap-2">
        <TaskInput />
        <TaskSearch inputRef={searchRef as React.RefObject<HTMLInputElement | null>} onSearchActive={() => {}} />

        {loading && (
          <div className="text-center py-6 text-[#666] text-xs">Loading...</div>
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

      {/* Onboarding */}
      {!loading && !onboardingDone && !settingsOpen && (
        <Onboarding onComplete={setOnboardingDone} />
      )}

      {/* Panels */}
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <TaskDetail />
      <ShortcutOverlay open={shortcutOverlayOpen} onClose={() => setShortcutOverlayOpen(false)} />
      <StatisticsPanel open={statsOpen} onClose={() => setStatsOpen(false)} />
      <CalendarView open={calendarOpen} onClose={() => setCalendarOpen(false)} />
      <FocusAnalytics open={focusOpen} onClose={() => setFocusOpen(false)} />
      <NotesPanel />
      <DayPlanner open={dayPlannerOpen} onClose={() => setDayPlannerOpen(false)} />
    </div>
  );
}

export default App;
