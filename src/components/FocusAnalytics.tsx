import { useEffect, useState } from "react";
import { X, Lightbulb, TrendingUp, Clock } from "lucide-react";
import { getActivityLog, getStreakHistory, getPomodoroSessions, getStreak } from "../lib/db";
import { getSuggestions, type Suggestion } from "../lib/suggestions";
import { useTaskStore } from "../store";

interface FocusAnalyticsProps {
  open: boolean;
  onClose: () => void;
}

export function FocusAnalytics({ open, onClose }: FocusAnalyticsProps) {
  const [showContent, setShowContent] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [bestHour, setBestHour] = useState("");
  const [bestDay, setBestDay] = useState("");
  const [consistency, setConsistency] = useState(0);
  const [avgDaily, setAvgDaily] = useState(0);
  const [totalPomodoros, setTotalPomodoros] = useState(0);

  useEffect(() => {
    if (!open) { setShowContent(false); return; }
    requestAnimationFrame(() => setShowContent(true));

    const load = async () => {
      const tasks = useTaskStore.getState().tasks;
      const end = new Date().toLocaleDateString("en-CA");
      const start90 = new Date();
      start90.setDate(start90.getDate() - 90);
      const start90Str = start90.toLocaleDateString("en-CA");

      const [log, streakHist, pomodoros, streakVal] = await Promise.all([
        getActivityLog(start90Str, end),
        getStreakHistory(),
        getPomodoroSessions(start90Str, end),
        getStreak(),
      ]);

      setTotalPomodoros(pomodoros.filter((p) => p.completed_at).length);

      /* Best hour: find hour with most completions */
      const hourCounts: Record<string, number> = {};
      for (const entry of log) {
        if (entry.action === "completed") {
          const h = entry.timestamp.slice(11, 13);
          hourCounts[h] = (hourCounts[h] || 0) + 1;
        }
      }
      const bestH = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
      setBestHour(bestH ? `${bestH[0]}:00` : "—");

      /* Best day of week */
      const dayCounts: Record<string, number> = {};
      for (const entry of log) {
        if (entry.action === "completed") {
          const d = new Date(entry.timestamp);
          const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
          dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
        }
      }
      const bestD = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
      setBestDay(bestD ? bestD[0] : "—");

      /* Consistency: % of days in last 30 that had completions */
      const last30 = new Set(
        Array.from({ length: 30 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return d.toLocaleDateString("en-CA");
        })
      );
      const activeDays = new Set(
        streakHist
          .filter((s) => last30.has(s.date))
          .map((s) => s.date)
      );
      setConsistency(Math.round((activeDays.size / 30) * 100));

      /* Avg daily: total completions / 30 */
      const totalCompleted = streakHist
        .filter((s) => last30.has(s.date))
        .reduce((sum, s) => sum + s.count, 0);
      setAvgDaily(Math.round((totalCompleted / 30) * 10) / 10);

      /* Suggestions */
      const sug = getSuggestions(tasks, pomodoros, streakHist, streakVal);
      setSuggestions(sug);
    };
    load();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" onKeyDown={(e) => e.key === "Escape" && onClose()} tabIndex={-1}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div
        className="absolute right-0 top-0 h-full w-[300px] max-w-[85vw] glass-elevated
                     rounded-l-[14px] shadow-2xl flex flex-col
                     transition-transform duration-200 ease-out-expo"
        style={{
          transform: showContent ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h2 className="text-sm font-medium text-text-primary">Focus Analytics</h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>
        <div className="mx-5 h-px bg-border-subtle" />

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-surface-glass rounded-[8px] p-3">
              <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary mb-1">
                <Clock size={11} /> Best hour
              </div>
              <div className="text-base font-medium text-text-primary">{bestHour}</div>
            </div>
            <div className="bg-surface-glass rounded-[8px] p-3">
              <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary mb-1">
                <TrendingUp size={11} /> Best day
              </div>
              <div className="text-base font-medium text-text-primary">{bestDay}</div>
            </div>
            <div className="bg-surface-glass rounded-[8px] p-3">
              <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary mb-1">Consistency</div>
              <div className="text-base font-medium text-text-primary">{consistency}%</div>
            </div>
            <div className="bg-surface-glass rounded-[8px] p-3">
              <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary mb-1">Avg daily</div>
              <div className="text-base font-medium text-text-primary">{avgDaily}</div>
            </div>
          </div>

          {/* Pomodoro count */}
          <div className="bg-surface-glass rounded-[8px] p-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-text-tertiary">Total Pomodoros (90d)</div>
              <div className="text-base font-medium text-text-primary mt-0.5">{totalPomodoros} sessions</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-accent-primary/10 flex items-center justify-center">
              <Clock size={16} className="text-accent-primary" />
            </div>
          </div>

          {/* AI Suggestions */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <Lightbulb size={13} className="text-amber-400" />
              <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-wide">Suggestions</h3>
            </div>
            {suggestions.length === 0 && (
              <p className="text-xs text-text-tertiary/60 italic">No suggestions yet. Keep using FocusTap!</p>
            )}
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <div key={i} className="bg-surface-glass rounded-[8px] p-3 border-l-2 border-accent-primary">
                  <p className="text-xs text-text-primary">{s.text}</p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">{s.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}