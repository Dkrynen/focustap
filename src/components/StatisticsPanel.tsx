import { useEffect, useState } from "react";
import React from "react";
import { X, TrendingUp, Calendar, Activity } from "lucide-react";
import { getActivityLog, getStreakHistory, getPomodoroSessions, getStreak, type StreakDay } from "../lib/db";

interface StatisticsPanelProps {
  open: boolean;
  onClose: () => void;
}

type Tab = "trend" | "streak" | "heatmap";

function getLastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString("en-CA"));
  }
  return days;
}

export function StatisticsPanel({ open, onClose }: StatisticsPanelProps) {
  const [showContent, setShowContent] = useState(false);
  const [tab, setTab] = useState<Tab>("trend");
  const [streakDays, setStreakDays] = useState<StreakDay[]>([]);
  const [dailyCounts, setDailyCounts] = useState<Record<string, number>>({});
  const [hourlyData, setHourlyData] = useState<Record<string, number>>({});
  const [currentStreak, setCurrentStreak] = useState(0);

  useEffect(() => {
    if (!open) { setShowContent(false); return; }
    requestAnimationFrame(() => setShowContent(true));

    const load = async () => {
      const end = new Date().toLocaleDateString("en-CA");
      const start30 = new Date();
      start30.setDate(start30.getDate() - 30);
      const start30Str = start30.toLocaleDateString("en-CA");

      const [log, streakHist, pomodoros, streakVal] = await Promise.all([
        getActivityLog(start30Str, end),
        getStreakHistory(),
        getPomodoroSessions(start30Str, end),
        getStreak(),
      ]);

      setCurrentStreak(streakVal);
      setStreakDays(streakHist);

      const days30 = getLastNDays(30);
      const counts: Record<string, number> = {};
      for (const d of days30) counts[d] = 0;
      for (const entry of log) {
        const date = entry.timestamp.slice(0, 10);
        if (counts[date] !== undefined && entry.action === "completed") {
          counts[date]++;
        }
      }
      setDailyCounts(counts);

      const heat: Record<string, number> = {};
      for (const p of pomodoros) {
        if (p.completed_at) {
          const hour = p.completed_at.slice(11, 13);
          const day = new Date(p.completed_at).toLocaleDateString("en-US", { weekday: "short" });
          const key = `${day}-${hour}`;
          heat[key] = (heat[key] || 0) + 1;
        }
      }
      setHourlyData(heat);
    };
    load();
  }, [open]);

  if (!open) return null;

  const days30 = getLastNDays(30);
  const maxCount = Math.max(1, ...days30.map((d) => dailyCounts[d] || 0));
  const totalCompleted = days30.reduce((s, d) => s + (dailyCounts[d] || 0), 0);
  const daysWithTasks = days30.filter((d) => (dailyCounts[d] || 0) > 0).length;

  /* Streak calendar: last 12 weeks */
  const weeks: { date: string; count: number }[][] = [];
  const streakMap = new Map(streakDays.map((s) => [s.date, s.count]));
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 83); // 12 weeks
  let cursor = new Date(startDate);
  let currentWeek: { date: string; count: number }[] = [];
  while (cursor <= today) {
    const dateStr = cursor.toLocaleDateString("en-CA");
    currentWeek.push({ date: dateStr, count: streakMap.get(dateStr) || 0 });
    if (cursor.getDay() === 6) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  /* Heatmap grid */
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const maxHeat = Math.max(1, ...Object.values(hourlyData));

  return (
    <div className="fixed inset-0 z-50" onKeyDown={(e) => e.key === "Escape" && onClose()} tabIndex={-1}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      {/* Slide-in panel */}
      <div
        className="absolute right-0 top-0 h-full w-[320px] max-w-[90vw] glass-elevated
                     rounded-l-[14px] shadow-2xl flex flex-col
                     transition-transform duration-200 ease-out-expo"
        style={{
          transform: showContent ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h2 className="text-sm font-medium text-text-primary">WFH Statistics</h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>
        <div className="mx-5 h-px bg-border-subtle" />

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 pb-2">
          {(["trend", "streak", "heatmap"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs transition-all cursor-pointer
                ${tab === t ? "bg-accent-primary/20 text-accent-primary" : "text-text-tertiary hover:text-text-secondary"}`}
            >
              {t === "trend" && <TrendingUp size={12} />}
              {t === "streak" && <Calendar size={12} />}
              {t === "heatmap" && <Activity size={12} />}
              {t === "trend" ? "Trend" : t === "streak" ? "Streak" : "Heatmap"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-surface-glass rounded-[8px] p-2.5 text-center">
              <div className="text-lg font-medium text-text-primary">{totalCompleted}</div>
              <div className="text-[10px] text-text-tertiary">30d tasks</div>
            </div>
            <div className="bg-surface-glass rounded-[8px] p-2.5 text-center">
              <div className="text-lg font-medium text-text-primary">{currentStreak}</div>
              <div className="text-[10px] text-text-tertiary">Day streak</div>
            </div>
            <div className="bg-surface-glass rounded-[8px] p-2.5 text-center">
              <div className="text-lg font-medium text-text-primary">{daysWithTasks}</div>
              <div className="text-[10px] text-text-tertiary">Active days</div>
            </div>
          </div>

          {/* Daily Trend Chart */}
          {tab === "trend" && (
            <div>
              <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-wide mb-3">Daily completion trend</h3>
              <div className="flex items-end gap-[3px] h-[100px]">
                {days30.map((d) => {
                  const count = dailyCounts[d] || 0;
                  const h = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  return (
                    <div
                      key={d}
                      className="flex-1 relative group cursor-pointer"
                      style={{ height: "100%" }}
                    >
                      <div
                        className="absolute bottom-0 w-full rounded-t-[2px] bg-accent-primary/60 hover:bg-accent-primary transition-all"
                        style={{ height: `${h}%`, minHeight: count > 0 ? "2px" : "0" }}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                        <div className="bg-surface-elevated border border-border-default rounded-[4px] px-2 py-1 text-[10px] text-text-primary whitespace-nowrap">
                          {d.slice(5)}: {count}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Streak Calendar */}
          {tab === "streak" && (
            <div>
              <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-wide mb-3">Streak history</h3>
              <div className="flex gap-[3px]">
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-[3px]">
                    {week.map((day) => {
                      const level = day.count === 0 ? 0
                        : day.count <= 2 ? 1
                        : day.count <= 5 ? 2
                        : day.count <= 10 ? 3 : 4;
                      return (
                        <div
                          key={day.date}
                          className="relative group"
                        >
                          <div
                            className="w-[10px] h-[10px] rounded-[2px] transition-colors cursor-pointer"
                            style={{
                              background: level === 0 ? "rgba(255,255,255,0.04)"
                                : level === 1 ? "rgba(139,126,255,0.25)"
                                : level === 2 ? "rgba(139,126,255,0.45)"
                                : level === 3 ? "rgba(139,126,255,0.65)"
                                : "rgba(139,126,255,0.85)",
                            }}
                          />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                            <div className="bg-surface-elevated border border-border-default rounded-[4px] px-2 py-1 text-[10px] text-text-primary whitespace-nowrap">
                              {day.date}: {day.count} tasks
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Heatmap */}
          {tab === "heatmap" && (
            <div>
              <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-wide mb-3">Productive hours</h3>
              <div className="overflow-x-auto">
                <div className="grid grid-cols-[auto_repeat(24,1fr)] gap-[2px] text-[9px]">
                  {/* Header row */}
                  <div />
                  {HOURS.map((h) => (
                    <div key={h} className="text-text-quaternary text-center">{h}</div>
                  ))}
                  {/* Day rows */}
                  {DAYS.map((day) => {
                    const dayKey = day;
                    return (
                      <React.Fragment key={dayKey}>
                        <div className="text-text-quaternary pr-1 leading-none pt-0.5">{day}</div>
                        {HOURS.map((hour) => {
                          const key = `${day}-${hour}`;
                          const val = hourlyData[key] || 0;
                          const intensity = maxHeat > 0 ? val / maxHeat : 0;
                          return (
                            <div
                              key={key}
                              className="relative group"
                            >
                              <div
                                className="w-full aspect-square rounded-[2px] transition-colors cursor-pointer"
                                style={{
                                  background: val === 0 ? "rgba(255,255,255,0.03)"
                                    : `rgba(139,126,255,${0.2 + intensity * 0.6})`,
                                }}
                              />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                                <div className="bg-surface-elevated border border-border-default rounded-[4px] px-2 py-1 text-[10px] text-text-primary whitespace-nowrap">
                                  {day} {hour}:00 — {val} sessions
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}