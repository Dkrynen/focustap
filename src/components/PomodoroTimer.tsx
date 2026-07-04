import { useEffect, useRef } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { useTaskStore } from "../store";

const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function PomodoroTimer() {
  const {
    pomodoroPhase,
    pomodoroTimeRemaining,
    pomodoroWorkDuration,
    pomodoroActiveTaskId,
    pomodoroStart,
    pomodoroPause,
    pomodoroReset,
    pomodoroTick,
  } = useTaskStore();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (pomodoroPhase !== "idle") {
      intervalRef.current = setInterval(() => {
        pomodoroTick();
      }, 1000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [pomodoroPhase, pomodoroTick]);

  const isRunning = pomodoroPhase !== "idle";
  const progress = pomodoroPhase === "idle"
    ? 1
    : pomodoroTimeRemaining / (pomodoroPhase === "work" ? pomodoroWorkDuration : 300);
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const label = pomodoroPhase === "work" ? "Focus" : pomodoroPhase === "break" ? "Break" : "Timer";

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-[10px] bg-surface-glass border border-border-subtle">
      {/* SVG progress ring */}
      <div className="relative w-[44px] h-[44px] flex-shrink-0">
        <svg width="44" height="44" viewBox="0 0 80 80" className="rotate-[-90deg]">
          <circle
            cx="40" cy="40" r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="4"
          />
          <circle
            cx="40" cy="40" r={RADIUS}
            fill="none"
            stroke={pomodoroPhase === "work" ? "#8b7eff" : "#22c55e"}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={isRunning ? dashOffset : 0}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-text-primary tabular-nums">
          {formatTime(pomodoroTimeRemaining)}
        </span>
      </div>

      {/* Label + task context */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-[11px] font-medium text-text-secondary">{label}</span>
        {pomodoroActiveTaskId && (
          <span className="text-[10px] text-text-tertiary truncate">
            {useTaskStore.getState().tasks.find((t) => t.id === pomodoroActiveTaskId)?.text || "Task"}
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {isRunning ? (
          <button
            onClick={pomodoroPause}
            className="p-1.5 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
            title="Pause"
          >
            <Pause size={14} />
          </button>
        ) : (
          <button
            onClick={() => pomodoroStart()}
            className="p-1.5 text-text-tertiary hover:text-accent-primary transition-colors cursor-pointer"
            title="Start"
          >
            <Play size={14} />
          </button>
        )}
        <button
          onClick={pomodoroReset}
          className="p-1.5 text-text-tertiary hover:text-red-400 transition-colors cursor-pointer"
          title="Reset"
        >
          <RotateCcw size={13} />
        </button>
      </div>
    </div>
  );
}