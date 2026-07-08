import {
	Calendar as CalendarIcon,
	Check,
	ChevronRight,
	Plus,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useCalendarAuthStore } from "../lib/calendar-auth-store";
import { enqueueTaskCreate, enqueueTaskUpdate } from "../lib/calendar-sync";
import type { CalendarEventLink, Task, TimeBlock } from "../lib/db";
import {
	deleteCalendarEventLink,
	getCalendarEventLinkByTask,
	listSubtasks,
	listTimeBlocks,
	toggleTask,
	updateTaskDate,
	updateTaskNotes,
	updateTaskPriority,
	updateTaskRecurrence,
	updateTaskTags,
	updateTaskText,
	updateTaskTimeBlock,
} from "../lib/db";
import { useTaskStore } from "../store";
import { CloseButton, SlideInPanel } from "./primitives";

const FOCUS_RING =
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-primary)]";

const PRIORITY_OPTIONS = (t: (key: string) => string) => [
	{ value: 0, label: t("task.priority.none") },
	{ value: 1, label: t("task.priority.low") },
	{ value: 2, label: t("task.priority.medium") },
	{ value: 3, label: t("task.priority.high") },
];

const RECURRENCE_OPTIONS = (t: (key: string) => string) => [
	{ value: "", label: t("task.recurrence.none") },
	{ value: "daily", label: t("task.recurrence.daily") },
	{ value: "weekdays", label: t("task.recurrence.weekdays") },
	{ value: "weekly", label: t("task.recurrence.weekly") },
	{ value: "monthly", label: t("task.recurrence.monthly") },
];

export function TaskDetail() {
	const { t } = useTranslation();
	const selectedTaskId = useTaskStore((s) => s.selectedTaskId);
	const setSelectedTaskId = useTaskStore((s) => s.setSelectedTaskId);
	const tasks = useTaskStore((s) => s.tasks);
	const addSubtask = useTaskStore((s) => s.addSubtask);
	const loadTasks = useTaskStore((s) => s.loadTasks);

	const containerRef = useRef<HTMLDivElement>(null);
	useFocusTrap(containerRef, !!selectedTaskId);
	const [subtasks, setSubtasks] = useState<Task[]>([]);
	const [editText, setEditText] = useState("");
	const [editNotes, setEditNotes] = useState("");
	const [editTags, setEditTags] = useState("");
	const [editTaskDate, setEditTaskDate] = useState("");
	const [editTimeBlockId, setEditTimeBlockId] = useState<number | null>(null);
	const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
	const [dirty, setDirty] = useState(false);
	const [calendarLink, setCalendarLink] = useState<CalendarEventLink | null>(
		null,
	);
	const hasConnectedCalendar = useCalendarAuthStore(
		(s) => s.connectedAccounts.length > 0,
	);
	const textRef = useRef<HTMLInputElement>(null);

	const task = tasks.find((t) => t.id === selectedTaskId);

	useEffect(() => {
		if (selectedTaskId) {
			setEditText(task?.text ?? "");
			setEditNotes(task?.notes ?? "");
			setEditTags(task?.tags ?? "");
			setEditTaskDate(task?.task_date ?? "");
			setEditTimeBlockId(task?.time_block_id ?? null);
			setDirty(false);
			if (selectedTaskId) {
				listSubtasks(selectedTaskId).then(setSubtasks);
				listTimeBlocks().then(setTimeBlocks);
				getCalendarEventLinkByTask(selectedTaskId)
					.then((links) => setCalendarLink(links.length > 0 ? links[0] : null))
					.catch(() => setCalendarLink(null));
			}
			setTimeout(() => textRef.current?.focus(), 100);
		} else {
			setSubtasks([]);
			setCalendarLink(null);
		}
	}, [
		selectedTaskId,
		task?.tags,
		task?.time_block_id,
		task?.notes,
		task?.text,
		task?.task_date,
	]);

	// Sync external data only when not dirty (user isn't actively editing)
	useEffect(() => {
		if (!dirty && task && tasks.find((t) => t.id === task.id)) {
			setEditText(task.text);
			setEditNotes(task.notes);
			setEditTags(task.tags);
		}
	}, [task?.text, task?.notes, task?.tags, task?.id, dirty, task, tasks]);

	const save = useCallback(async () => {
		if (!task) return;
		const trimmedText = editText.trim();
		if (trimmedText && trimmedText !== task.text) {
			await updateTaskText(task.id, trimmedText);
			enqueueTaskUpdate(task.id, { title: trimmedText }).catch(() => {});
		}
		if (editNotes !== task.notes) await updateTaskNotes(task.id, editNotes);
		if (editTags !== task.tags) await updateTaskTags(task.id, editTags);
		const newTaskDate = editTaskDate || null;
		if (newTaskDate !== task.task_date) {
			await updateTaskDate(task.id, newTaskDate);
			enqueueTaskUpdate(task.id, { taskDate: newTaskDate }).catch(() => {});
		}
		if (editTimeBlockId !== task.time_block_id)
			await updateTaskTimeBlock(task.id, editTimeBlockId);
		setDirty(false);
		await loadTasks();
	}, [
		task,
		editText,
		editNotes,
		editTags,
		editTaskDate,
		editTimeBlockId,
		loadTasks,
	]);

	const handlePriority = async (value: number) => {
		if (!task) return;
		await updateTaskPriority(task.id, value);
		await loadTasks();
	};

	const handleClose = useCallback(() => {
		if (dirty) save();
		setSelectedTaskId(null);
	}, [dirty, save, setSelectedTaskId]);

	if (!selectedTaskId || !task) return null;

	return (
		<SlideInPanel
			open={true}
			onClose={handleClose}
			ariaLabel={t("task.detail.title")}
			className="w-[380px] max-w-[90vw]"
			resizable
			defaultWidth={380}
			minWidth={280}
			maxWidth={700}
		>
			{/* Header */}
			<div className="flex items-center justify-between px-5 pt-4 pb-3">
				<h2 className="text-sm font-medium text-text-primary">
					{t("task.detail.title")}
				</h2>
				<CloseButton onClick={handleClose} ariaLabel={t("common.close")} />
			</div>
			<div className="mx-5 h-px bg-border-subtle" />

			{/* Content */}
			<div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
				{/* Text */}
				<div>
					<label
						htmlFor="td-text"
						className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-1 block"
					>
						{t("task.detail.task_label")}
					</label>
					<input
						id="td-text"
						ref={textRef}
						type="text"
						value={editText}
						onChange={(e) => {
							setEditText(e.target.value);
							setDirty(true);
						}}
						className={`w-full bg-surface-glass text-text-primary text-sm px-3 py-2 rounded-[6px] border border-border-default focus:border-accent-primary/30 transition-colors font-sans ${FOCUS_RING}`}
					/>
				</div>

				{/* Priority */}
				<div>
					<span className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-1.5 block">
						{t("task.detail.priority_label")}
					</span>
					<div className="flex gap-1.5">
						{PRIORITY_OPTIONS(t).map((opt) => (
							<button
								type="button"
								key={opt.value}
								onClick={() => handlePriority(opt.value)}
								className={`px-2.5 py-1.5 rounded-[6px] text-xs transition-all cursor-pointer ${FOCUS_RING}
                    ${
											task.priority === opt.value
												? opt.value === 0
													? "bg-surface-glass-edge text-text-primary"
													: opt.value === 3
														? "bg-red-500/20 text-red-300"
														: opt.value === 2
															? "bg-yellow-500/20 text-yellow-300"
															: "bg-blue-500/20 text-blue-300"
												: "bg-surface-glass text-text-tertiary hover:text-text-secondary"
										}`}
							>
								{opt.label}
							</button>
						))}
					</div>
				</div>

				{/* Tags */}
				<div>
					<label
						htmlFor="td-tags"
						className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-1 block"
					>
						{t("task.detail.tags")}
					</label>
					<input
						id="td-tags"
						type="text"
						value={editTags}
						onChange={(e) => {
							setEditTags(e.target.value);
							setDirty(true);
						}}
						placeholder={t(
							"task.detail.tags_placeholder",
							"comma, separated, tags",
						)}
						className={`w-full bg-surface-glass text-text-primary text-xs px-3 py-2 rounded-[6px] border border-border-default focus:border-accent-primary/30 transition-colors font-sans ${FOCUS_RING}`}
					/>
				</div>

				{/* Recurrence */}
				<div>
					<span className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-1.5 block">
						{t("task.detail.recurrence_label")}
					</span>
					<div className="flex gap-1.5 flex-wrap">
						{RECURRENCE_OPTIONS(t).map((opt) => (
							<button
								type="button"
								key={opt.value}
								onClick={async () => {
									await updateTaskRecurrence(task.id, opt.value);
									await loadTasks();
								}}
								className={`px-2.5 py-1 rounded-[6px] text-xs transition-all cursor-pointer ${FOCUS_RING}
                    ${
											task.recurrence === opt.value
												? "bg-accent-primary/20 text-accent-primary"
												: "bg-surface-glass text-text-tertiary hover:text-text-secondary"
										}`}
							>
								{opt.label}
							</button>
						))}
					</div>
				</div>

				{/* Scheduled Date */}
				<div>
					<label
						htmlFor="td-date"
						className="text-[11px] font-medium text-text-tertiary uppercase tracking-wide mb-1 block flex items-center gap-1"
					>
						<CalendarIcon size={11} /> {t("task.detail.scheduled_date")}
					</label>
					<div className="flex gap-1.5">
						<input
							id="td-date"
							type="date"
							value={editTaskDate}
							onChange={(e) => {
								setEditTaskDate(e.target.value);
								setDirty(true);
							}}
							className={`flex-1 bg-surface-glass text-text-primary text-xs px-3 py-2 rounded-[6px]
                           border border-border-default focus:border-accent-primary/30
                           transition-colors font-sans ${FOCUS_RING}`}
						/>
						{editTaskDate && (
							<button
								type="button"
								onClick={async () => {
									await updateTaskDate(task.id, null);
									setEditTaskDate("");
									setDirty(false);
									await loadTasks();
								}}
								className={`px-2 text-xs text-text-tertiary hover:text-red-400 transition-colors cursor-pointer rounded-[6px] ${FOCUS_RING}`}
							>
								{t("task.detail.clear")}
							</button>
						)}
					</div>
				</div>

				{/* Time Block */}
				<div>
					<label
						htmlFor="td-timeblock"
						className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-1 block"
					>
						{t("task.detail.time_block")}
					</label>
					<select
						id="td-timeblock"
						value={editTimeBlockId ?? ""}
						onChange={(e) => {
							const val = e.target.value;
							const blockId = val ? Number(val) : null;
							setEditTimeBlockId(blockId);
							setDirty(true);
						}}
						className={`w-full bg-surface-glass text-text-primary text-xs px-3 py-2 rounded-[6px]
                         border border-border-default focus:border-accent-primary/30
                         transition-colors cursor-pointer ${FOCUS_RING}`}
					>
						<option value="">{t("task.recurrence.none")}</option>
						{timeBlocks.map((tb) => (
							<option key={tb.id} value={tb.id}>
								{tb.label} ({tb.start_time.slice(0, 5)}Ã¢â‚¬â€œ
								{tb.end_time.slice(0, 5)})
							</option>
						))}
					</select>
				</div>

				{/* Notes */}
				<div>
					<label
						htmlFor="td-notes"
						className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-1 block"
					>
						{t("task.detail.notes")}
					</label>
					<textarea
						id="td-notes"
						value={editNotes}
						onChange={(e) => {
							setEditNotes(e.target.value);
							setDirty(true);
						}}
						rows={4}
						className={`w-full bg-surface-glass text-text-primary text-xs px-3 py-2 rounded-[6px] border border-border-default focus:border-accent-primary/30 transition-colors resize-none font-sans ${FOCUS_RING}`}
					/>
				</div>

				{/* Subtasks */}
				<div>
					<div className="flex items-center justify-between mb-1.5">
						<span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wide">
							{t("task.detail.subtasks_label")}
						</span>
						<button
							type="button"
							onClick={() => addSubtask(task.id)}
							className={`flex items-center gap-1 text-xs text-accent-primary hover:text-accent-hover transition-colors cursor-pointer rounded-[6px] px-1 py-0.5 ${FOCUS_RING}`}
						>
							<Plus size={11} /> {t("task.detail.add")}
						</button>
					</div>
					<div className="space-y-1">
						{subtasks.length === 0 && (
							<p className="text-xs text-text-tertiary/60 italic">
								{t("task.detail.no_subtasks")}
							</p>
						)}
						{subtasks.map((st) => (
							<div
								key={st.id}
								className="flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] bg-surface-glass"
							>
								<button
									type="button"
									onClick={async () => {
										await toggleTask(st.id);
										await loadTasks();
										listSubtasks(task.id).then(setSubtasks);
									}}
									className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all cursor-pointer ${FOCUS_RING} ${
										st.is_done
											? "bg-accent-primary border-accent-primary"
											: "border-white/15"
									}`}
								>
									{st.is_done && (
										<Check size={8} className="text-white stroke-[3]" />
									)}
								</button>
								<span
									className={`text-xs flex-1 truncate ${st.is_done ? "line-through text-text-tertiary" : "text-text-primary"}`}
								>
									{st.text || t("task.untitled")}
								</span>
								<ChevronRight size={10} className="text-text-quaternary" />
							</div>
						))}
					</div>
				</div>

				{/* Calendar Link */}
				{(calendarLink || (hasConnectedCalendar && editTaskDate)) && (
					<div>
						<span className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-1 block">
							Calendar
						</span>
						{calendarLink ? (
							<div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-[6px] bg-surface-glass">
								<div className="flex items-center gap-2 min-w-0">
									<span
										className="text-[8px] px-1 rounded font-medium flex-shrink-0"
										style={{
											color:
												calendarLink.provider === "google"
													? "#3b82f6"
													: "#f97316",
											backgroundColor:
												calendarLink.provider === "google"
													? "rgba(59,130,246,0.15)"
													: "rgba(249,115,22,0.15)",
										}}
									>
										{calendarLink.provider === "google" ? "G" : "M"}
									</span>
									<span className="text-xs text-text-secondary truncate">
										{calendarLink.provider === "google"
											? "Google Calendar"
											: "Microsoft Calendar"}
									</span>
									{calendarLink.last_synced_at && (
										<span className="text-[9px] text-text-quaternary flex-shrink-0">
											synced {calendarLink.last_synced_at.slice(0, 10)}
										</span>
									)}
								</div>
								<button
									type="button"
									onClick={async () => {
										if (!calendarLink) return;
										await deleteCalendarEventLink(calendarLink.id);
										setCalendarLink(null);
									}}
									className={`text-[10px] text-text-tertiary hover:text-red-400 transition-colors cursor-pointer rounded-[6px] px-1 py-0.5 flex-shrink-0 ${FOCUS_RING}`}
								>
									Unlink
								</button>
							</div>
						) : (
							<button
								type="button"
								onClick={() => {
									if (!task) return;
									enqueueTaskCreate(
										task.id,
										editText.trim(),
										editTaskDate,
									).catch(() => {});
								}}
								className={`w-full flex items-center justify-center gap-2 px-3 py-2 bg-surface-glass hover:bg-surface-elevated text-text-secondary text-xs rounded-[6px] transition-colors cursor-pointer ${FOCUS_RING}`}
							>
								<CalendarIcon size={12} /> Create calendar event
							</button>
						)}
					</div>
				)}

				{/* Metadata */}
				<div className="pt-2 border-t border-border-subtle space-y-1.5">
					<div className="flex justify-between text-xs">
						<span className="text-text-tertiary">
							{t("task.detail.created")}
						</span>
						<span className="text-text-secondary">{task.created_at}</span>
					</div>
					{task.completed_at && (
						<div className="flex justify-between text-xs">
							<span className="text-text-tertiary">
								{t("task.detail.completed")}
							</span>
							<span className="text-text-secondary">{task.completed_at}</span>
						</div>
					)}
					<div className="flex justify-between text-xs">
						<span className="text-text-tertiary">{t("task.detail.id")}</span>
						<span className="text-text-secondary">#{task.id}</span>
					</div>
				</div>
			</div>

			{/* Save footer */}
			<div className="px-5 py-3 border-t border-border-subtle">
				<button
					type="button"
					onClick={async () => {
						await save();
						setSelectedTaskId(null);
					}}
					className={`w-full py-2 rounded-[6px] bg-accent-primary text-white text-xs font-medium
                       hover:bg-accent-hover transition-colors cursor-pointer ${FOCUS_RING}`}
				>
					{t("common.done")}
				</button>
			</div>
		</SlideInPanel>
	);
}
