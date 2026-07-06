import { CalendarPlus, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useTranslation } from "react-i18next";
import { listTasksByDateRange, type Task, updateTaskDate } from "../lib/db";
import { useTaskStore } from "../store";
import { CloseButton, SlideInPanel } from "./primitives";

const FOCUS_RING =
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-primary)]";

interface CalendarViewProps {
	open: boolean;
	onClose: () => void;
}

type ViewMode = "week" | "month";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

function getWeekDays(date: Date): Date[] {
	const start = new Date(date);
	start.setDate(start.getDate() - start.getDay());
	const days: Date[] = [];
	for (let i = 0; i < 7; i++) {
		const d = new Date(start);
		d.setDate(d.getDate() + i);
		days.push(d);
	}
	return days;
}

function getMonthGrid(year: number, month: number): Date[][] {
	const first = new Date(year, month, 1);
	const start = new Date(first);
	start.setDate(start.getDate() - start.getDay());
	const weeks: Date[][] = [];
	let current: Date[] = [];
	const cursor = new Date(start);
	while (weeks.length < 6) {
		current.push(new Date(cursor));
		if (cursor.getDay() === 6) {
			weeks.push(current);
			current = [];
		}
		cursor.setDate(cursor.getDate() + 1);
	}
	return weeks;
}

export function CalendarView({ open, onClose }: CalendarViewProps) {
	const { t } = useTranslation();
	const containerRef = useRef<HTMLDivElement>(null);
	useFocusTrap(containerRef, open);
	const [mode, setMode] = useState<ViewMode>("week");
	const [anchor, setAnchor] = useState(new Date());
	const [tasks, setTasks] = useState<Task[]>([]);
	const [selectedDay, setSelectedDay] = useState<string | null>(null);

	useEffect(() => {
		const load = async () => {
			let from: Date, to: Date;
			if (mode === "week") {
				const days = getWeekDays(anchor);
				from = days[0];
				to = days[6];
			} else {
				from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
				to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
			}
			const fromStr = from.toLocaleDateString("en-CA");
			const toStr = to.toLocaleDateString("en-CA");
			const loaded = await listTasksByDateRange(fromStr, toStr);
			setTasks(loaded);
		};
		if (open) load();
	}, [open, mode, anchor]);

	const taskMap = new Map<string, Task[]>();
	for (const t of tasks) {
		const date = t.task_date || t.created_at.slice(0, 10);
		if (!taskMap.has(date)) taskMap.set(date, []);
		taskMap.get(date)!.push(t);
	}

	const todayStr = new Date().toLocaleDateString("en-CA");
	const selectedDayTasks = selectedDay ? taskMap.get(selectedDay) || [] : [];
	const unassigned = tasks.filter(
		(t) => !t.task_date && !t.is_done && !t.parent_id,
	);

	const navigate = (dir: number) => {
		const next = new Date(anchor);
		if (mode === "week") next.setDate(next.getDate() + dir * 7);
		else next.setMonth(next.getMonth() + dir);
		setAnchor(next);
		setSelectedDay(null);
	};

	const handleScheduleTask = async (taskId: number, date: string) => {
		await updateTaskDate(taskId, date);
		const from: Date =
			mode === "week"
				? getWeekDays(anchor)[0]
				: new Date(anchor.getFullYear(), anchor.getMonth(), 1);
		const to: Date =
			mode === "week"
				? getWeekDays(anchor)[6]
				: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
		const loaded = await listTasksByDateRange(
			from.toLocaleDateString("en-CA"),
			to.toLocaleDateString("en-CA"),
		);
		setTasks(loaded);
		useTaskStore.getState().loadTasks();
	};

	if (!open) return null;

	return (
		<SlideInPanel open={open} onClose={onClose} ariaLabel={t("calendar.title")} className="w-[340px] max-w-[90vw]">
			{/* Header */}
			<div className="flex items-center justify-between px-5 pt-4 pb-3">
				<div className="flex items-center gap-2">
					<button
						onClick={() => setMode("week")}
						className={`text-xs px-2 py-1 rounded-[6px] transition-colors cursor-pointer ${FOCUS_RING} ${mode === "week" ? "bg-accent-primary/20 text-accent-primary" : "text-text-tertiary hover:text-text-secondary"}`}
					>
						{t("calendar.week")}
					</button>
					<button
						onClick={() => setMode("month")}
						className={`text-xs px-2 py-1 rounded-[6px] transition-colors cursor-pointer ${FOCUS_RING} ${mode === "month" ? "bg-accent-primary/20 text-accent-primary" : "text-text-tertiary hover:text-text-secondary"}`}
					>
						{t("calendar.month")}
					</button>
				</div>
				<CloseButton onClick={onClose} ariaLabel={t("common.close")} />
			</div>
			<div className="mx-5 h-px bg-border-subtle" />

				{/* Navigation */}
				<div className="flex items-center justify-between px-5 pt-3 pb-2">
					<button
						onClick={() => navigate(-1)}
						className={`text-text-tertiary hover:text-text-primary transition-colors cursor-pointer rounded-[6px] p-0.5 ${FOCUS_RING}`}
					>
						<ChevronLeft size={16} />
					</button>
					<span className="text-xs font-medium text-text-primary">
						{mode === "week"
							? `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`
							: `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`}
					</span>
					<button
						onClick={() => navigate(1)}
						className={`text-text-tertiary hover:text-text-primary transition-colors cursor-pointer rounded-[6px] p-0.5 ${FOCUS_RING}`}
					>
						<ChevronRight size={16} />
					</button>
				</div>

				{/* Today button */}
				<div className="px-5 pb-2">
					<button
						onClick={() => {
							setAnchor(new Date());
							setSelectedDay(null);
						}}
						className={`text-[10px] text-accent-primary hover:text-accent-hover transition-colors cursor-pointer rounded-[6px] px-1 py-0.5 ${FOCUS_RING}`}
					>
						{t("calendar.today_btn")}
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto px-5 pb-4">
					{/* Week view */}
					{mode === "week" && (
						<div className="grid grid-cols-7 gap-px bg-border-subtle rounded-[8px] overflow-hidden">
							{DAY_NAMES.map((dn) => (
								<div
									key={dn}
									className="bg-surface-deep text-[9px] text-text-tertiary text-center py-1 uppercase tracking-wide"
								>
									{dn}
								</div>
							))}
							{getWeekDays(anchor).map((d) => {
								const dateStr = d.toLocaleDateString("en-CA");
								const dayTasks = taskMap.get(dateStr) || [];
								const isToday = dateStr === todayStr;
								return (
									<div
										key={dateStr}
										onClick={() => setSelectedDay(dateStr)}
										className={`bg-surface-primary min-h-[76px] p-1.5 cursor-pointer transition-colors
                      ${isToday ? "ring-1 ring-accent-primary/30" : ""}
                      ${selectedDay === dateStr ? "bg-accent-primary/10" : "hover:bg-surface-glass"}`}
									>
										<span
											className={`text-[10px] ${isToday ? "text-accent-primary font-medium" : "text-text-tertiary"}`}
										>
											{d.getDate()}
										</span>
										<div className="mt-1 space-y-[2px]">
											{dayTasks.slice(0, 4).map((task) => (
												<div key={task.id} className="flex items-center gap-0.5">
													<span
														className={`w-1 h-1 rounded-full flex-shrink-0 ${task.is_done ? "bg-status-success" : "bg-accent-primary"}`}
													/>
													<span
														className={`text-[8px] truncate ${task.is_done ? "text-text-tertiary line-through" : "text-text-secondary"}`}
													>
														{task.text || "..."}
													</span>
												</div>
											))}
											{dayTasks.length > 3 && (
												<span className="text-[8px] text-text-tertiary">
													+{dayTasks.length - 3} {t("calendar.more")}
												</span>
											)}
										</div>
									</div>
								);
							})}
						</div>
					)}

					{/* Month view */}
					{mode === "month" && (
						<div className="grid grid-cols-7 gap-px bg-border-subtle rounded-[8px] overflow-hidden">
							{DAY_NAMES.map((dn) => (
								<div
									key={dn}
									className="bg-surface-deep text-[9px] text-text-tertiary text-center py-1 uppercase tracking-wide"
								>
									{dn}
								</div>
							))}
							{getMonthGrid(anchor.getFullYear(), anchor.getMonth())
								.flat()
								.map((d) => {
									const dateStr = d.toLocaleDateString("en-CA");
									const dayTasks = taskMap.get(dateStr) || [];
									const isCurrentMonth = d.getMonth() === anchor.getMonth();
									const isToday = dateStr === todayStr;
									return (
										<div
											key={dateStr}
											onClick={() => setSelectedDay(dateStr)}
											className={`min-h-[32px] p-0.5 cursor-pointer transition-colors
                      ${isCurrentMonth ? "bg-surface-primary" : "bg-surface-deep"}
                      ${isToday ? "ring-1 ring-accent-primary/30" : ""}
                      ${selectedDay === dateStr ? "bg-accent-primary/10" : "hover:bg-surface-glass"}`}
										>
											<span
												className={`text-[9px] ${isToday ? "text-accent-primary font-medium" : isCurrentMonth ? "text-text-tertiary" : "text-text-quaternary"}`}
											>
												{d.getDate()}
											</span>
											{dayTasks.length > 0 && (
												<div className="flex gap-[1px] mt-0.5 px-0.5 flex-wrap">
													{dayTasks.slice(0, 4).map((task) => (
														<span
															key={task.id}
															className={`w-[5px] h-[5px] rounded-full ${task.is_done ? "bg-status-success" : "bg-accent-primary/60"}`}
														/>
													))}
												</div>
											)}
										</div>
									);
								})}
						</div>
					)}

					{/* Selected day detail */}
					{selectedDay && (
						<div className="mt-4">
							<div className="flex items-center justify-between mb-2">
								<h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-wide">
									{selectedDay}
								</h3>
								{selectedDay !== todayStr && unassigned.length > 0 && (
									<div className="relative group">
										<button className={`flex items-center gap-1 text-[10px] text-accent-primary hover:text-accent-hover transition-colors cursor-pointer rounded-[6px] px-1 py-0.5 ${FOCUS_RING}`}>
											<CalendarPlus size={11} /> {t("calendar.schedule")}
										</button>
										<div
											className="absolute right-0 top-full mt-1 w-[180px] bg-surface-elevated border border-border-default
                                    rounded-[8px] shadow-xl z-10 hidden group-hover:block max-h-[150px] overflow-y-auto"
										>
											{unassigned.slice(0, 8).map((ut) => (
												<button
													key={ut.id}
													onClick={() => handleScheduleTask(ut.id, selectedDay)}
													className={`w-full text-left px-2.5 py-1.5 text-[11px] text-text-secondary
                                     hover:bg-accent-primary/10 hover:text-text-primary transition-colors cursor-pointer truncate rounded-[6px] ${FOCUS_RING}`}
												>
													{ut.text || t("task.untitled")}
												</button>
											))}
											{unassigned.length > 8 && (
												<div className="px-2.5 py-1 text-[9px] text-text-tertiary">
													+{unassigned.length - 8} {t("calendar.more")}
												</div>
											)}
										</div>
									</div>
								)}
								{selectedDay === todayStr && (
									<span className="text-[9px] text-accent-primary/60">
										{t("calendar.today")}
									</span>
								)}
							</div>
							{selectedDayTasks.length === 0 ? (
								<p className="text-[11px] text-text-tertiary/60 italic">
									{t("calendar.no_tasks_desc")}
								</p>
							) : (
								<div className="space-y-1">
									{selectedDayTasks.map((task) => (
										<div
											key={task.id}
											className="flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] bg-surface-glass group"
										>
											<span
												className={`w-2 h-2 rounded-full flex-shrink-0 ${task.is_done ? "bg-status-success" : "bg-accent-primary"}`}
											/>
											<span
												className={`text-xs flex-1 truncate ${task.is_done ? "line-through text-text-tertiary" : "text-text-primary"}`}
											>
													{task.text || t("task.untitled")}
											</span>
											{task.priority > 0 && (
												<span
													className={`text-[9px] px-1 rounded ${task.priority === 3 ? "text-red-300 bg-red-500/20" : task.priority === 2 ? "text-yellow-300 bg-yellow-500/20" : "text-blue-300 bg-blue-500/20"}`}
												>
													{task.priority === 3
														? "H"
														: task.priority === 2
															? "M"
															: "L"}
												</span>
											)}
											{task.task_date && (
												<button
													onClick={async () => {
														await updateTaskDate(task.id, null);
														const from: Date =
															mode === "week"
																? getWeekDays(anchor)[0]
																: new Date(
																		anchor.getFullYear(),
																		anchor.getMonth(),
																		1,
																	);
														const to: Date =
															mode === "week"
																? getWeekDays(anchor)[6]
																: new Date(
																		anchor.getFullYear(),
																		anchor.getMonth() + 1,
																		0,
																	);
														const loaded = await listTasksByDateRange(
															from.toLocaleDateString("en-CA"),
															to.toLocaleDateString("en-CA"),
														);
														setTasks(loaded);
														useTaskStore.getState().loadTasks();
													}}
											className={`opacity-0 group-hover:opacity-100 text-[9px] text-text-quaternary hover:text-red-400 transition-all cursor-pointer rounded-[6px] p-0.5 ${FOCUS_RING}`}
												title={t("calendar.unschedule")}
												aria-label={t("calendar.unschedule")}
												>
													<X size={10} />
												</button>
											)}
										</div>
									))}
								</div>
							)}
					</div>
				)}
			</div>
		</SlideInPanel>
	);
}
