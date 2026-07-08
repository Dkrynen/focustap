import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useTaskStore } from "../store";

const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatTime(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const FOCUS_RING =
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-primary)]";

export function PomodoroTimer() {
	const { t } = useTranslation();
	const {
		pomodoroTimeRemaining,
		pomodoroWorkDuration,
		pomodoroBreakDuration,
		pomodoroActiveTaskId,
		pomodoroPhase,
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
	const progress =
		pomodoroPhase === "idle"
			? 1
			: pomodoroTimeRemaining /
				(pomodoroPhase === "work"
					? pomodoroWorkDuration
					: pomodoroBreakDuration);
	const dashOffset = CIRCUMFERENCE * (1 - progress);
	const label =
		pomodoroPhase === "work"
			? t("pomodoro.phase_work")
			: pomodoroPhase === "break"
				? t("pomodoro.phase_break")
				: t("pomodoro.phase_idle");

	return (
		<div className="flex items-center gap-3 px-4 py-3 rounded-[10px] bg-surface-glass border border-border-subtle backdrop-blur-sm">
			{/* SVG progress ring */}
			<div className="relative w-[52px] h-[52px] flex-shrink-0">
				<svg
					width="52"
					height="52"
					viewBox="0 0 80 80"
					className="rotate-[-90deg]"
					aria-label={t("pomodoro.progress_ring")}
				>
					<circle
						cx="40"
						cy="40"
						r={RADIUS}
						fill="none"
						style={{ stroke: "var(--border-subtle)" }}
						strokeWidth="4"
					/>
					<circle
						cx="40"
						cy="40"
						r={RADIUS}
						fill="none"
						stroke={
							pomodoroPhase === "work"
								? "var(--accent-primary)"
								: "var(--status-success)"
						}
						strokeWidth="4"
						strokeLinecap="round"
						strokeDasharray={CIRCUMFERENCE}
						strokeDashoffset={isRunning ? dashOffset : 0}
						className="transition-all duration-1000 ease-linear"
					/>
				</svg>
				<span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-text-primary tabular-nums">
					{formatTime(pomodoroTimeRemaining)}
				</span>
			</div>

			{/* Label + task context */}
			<div className="flex flex-col min-w-0 flex-1">
				<span className="text-xs font-medium text-text-secondary">{label}</span>
				{pomodoroActiveTaskId && (
					<span className="text-[10px] text-text-tertiary truncate">
						{useTaskStore
							.getState()
							.tasks.find((t) => t.id === pomodoroActiveTaskId)?.text || "Task"}
					</span>
				)}
			</div>

			{/* Controls */}
			<div className="flex items-center gap-1">
				{isRunning ? (
					<button
						type="button"
						onClick={pomodoroPause}
						className={`p-2 rounded-[6px] text-text-tertiary hover:text-text-primary transition-colors cursor-pointer ${FOCUS_RING}`}
						title={t("pomodoro.pause")}
						aria-label={t("pomodoro.pause")}
					>
						<Pause size={16} />
					</button>
				) : (
					<button
						type="button"
						onClick={() => pomodoroStart()}
						className={`p-2 rounded-[6px] text-text-tertiary hover:text-accent-primary transition-colors cursor-pointer ${FOCUS_RING}`}
						title={t("pomodoro.start")}
						aria-label={t("pomodoro.start")}
					>
						<Play size={16} />
					</button>
				)}
				<button
					type="button"
					onClick={pomodoroReset}
					className={`p-2 rounded-[6px] text-text-tertiary hover:text-red-400 transition-colors cursor-pointer ${FOCUS_RING}`}
					title={t("pomodoro.reset")}
					aria-label={t("pomodoro.reset")}
				>
					<RotateCcw size={15} />
				</button>
			</div>
		</div>
	);
}
