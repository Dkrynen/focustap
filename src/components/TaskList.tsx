import {
	CalendarPlus,
	Check,
	ChevronDown,
	ChevronRight,
	Inbox,
	Search,
	Trash2,
} from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Task } from "../lib/db";
import { useTaskStore } from "../store";

const FOCUS_RING =
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-primary)]";

interface TaskListProps {
	tasks: Task[];
	onUpdateText: (id: number, text: string) => void;
	onDelete: (id: number) => void;
	focusId: number | null;
	streak?: number;
	onScheduleToday?: (id: number) => void;
}

function getPriorities(t: (key: string) => string) {
	return [
		{ value: 0, label: t("task.priority.none"), color: "" },
		{ value: 1, label: t("task.priority.low"), color: "#3b82f6" },
		{ value: 2, label: t("task.priority.medium"), color: "#eab308" },
		{ value: 3, label: t("task.priority.high"), color: "#ef4444" },
	];
}

function PriorityDot({ priority }: { priority: number }) {
	if (!priority) return null;
	const colors = ["", "#3b82f6", "#eab308", "#ef4444"];
	return (
		<span
			className="w-[6px] h-[6px] rounded-full flex-shrink-0"
			style={{ background: colors[priority] || "var(--text-quaternary)" }}
		/>
	);
}

export const TaskList = memo(function TaskList({
	tasks,
	onUpdateText,
	onDelete,
	focusId,
	streak,
	onScheduleToday,
}: TaskListProps) {
	const { t } = useTranslation();
	const [expandedId, setExpandedId] = useState<number | null>(null);
	const setPriority = useTaskStore((s) => s.setPriority);
	const setTags = useTaskStore((s) => s.setTags);
	const updateNotes = useTaskStore((s) => s.updateNotes);
	const toggle = useTaskStore((s) => s.toggle);
	const searchQuery = useTaskStore((s) => s.searchQuery);
	const activeTaskIndex = useTaskStore((s) => s.activeTaskIndex);
	const listRef = useRef<HTMLDivElement>(null);

	// Scroll to new task
	useEffect(() => {
		if (focusId) {
			const el = document.querySelector(`[data-task-id="${focusId}"]`);
			el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
		}
	}, [focusId]);

	// Scroll focused task into view
	useEffect(() => {
		if (activeTaskIndex >= 0 && listRef.current) {
			const rows = listRef.current.querySelectorAll("[data-task-id]");
			const target = rows[activeTaskIndex] as HTMLElement | undefined;
			target?.scrollIntoView({ block: "nearest", behavior: "smooth" });
		}
	}, [activeTaskIndex]);

	const filteredTasks = searchQuery
		? tasks.filter(
				(t) =>
					t.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
					t.tags?.toLowerCase().includes(searchQuery.toLowerCase()),
			)
		: tasks;

	// Empty state
	if (tasks.length === 0) {
		return (
			<div className="flex-1 flex flex-col items-center justify-center text-center py-12 gap-3">
				<Inbox size={28} className="text-text-quaternary" strokeWidth={1.5} />
				<p className="text-sm text-text-quaternary">{t("task.no_tasks_yet")}</p>
				<p className="text-xs text-text-quaternary">
					{t("task.no_tasks_hint")}
				</p>
			</div>
		);
	}

	if (searchQuery && filteredTasks.length === 0) {
		return (
			<div className="flex-1 flex flex-col items-center justify-center text-center py-8 gap-2">
				<Search size={20} className="text-text-quaternary" strokeWidth={1.5} />
				<p className="text-sm text-text-quaternary">
					{t("task.no_matches", "No matches for")} "{searchQuery}"
				</p>
			</div>
		);
	}

	const doneCount = tasks.filter((t) => t.is_done).length;

	return (
		<div className="flex flex-col flex-1 min-h-0">
			{/* Progress bar */}
			<div className="mb-2 flex items-center justify-between">
				<span className="text-sm text-text-quaternary">
					{doneCount}/{tasks.length} {t("common.done", "done")}
				</span>
				{streak && streak > 0 ? (
					<span className="text-[11px] text-[#eab308]">
						{streak} {t("stats.day_streak")} 🔥
					</span>
				) : null}
			</div>

			{/* Task list */}
			<div className="flex-1 overflow-y-auto space-y-[2px] outline-none">
				{filteredTasks.map((task) => {
					const isExpanded = expandedId === task.id;
					const tags = task.tags ? task.tags.split(",").filter(Boolean) : [];

					const isFocused = filteredTasks.indexOf(task) === activeTaskIndex;
					return (
						<div key={task.id} data-task-id={task.id}>
							{/* Main task row */}
							{/* biome-ignore lint/a11y/useSemanticElements: task row contains child buttons — nesting <button> inside <button> is invalid HTML */}
							<div
								role="button"
								tabIndex={0}
								aria-expanded={isExpanded}
								className={`flex items-center gap-3 px-4 py-3.5 rounded-[10px] transition-colors cursor-pointer
                  ${task.is_done ? "opacity-40" : "hover:bg-surface-glass/60"}
                  ${isExpanded ? "bg-surface-glass-edge rounded-b-none" : ""}
                  ${isFocused && !isExpanded ? "ring-1 ring-accent-primary/40 bg-accent-subtle" : ""}`}
								onClick={() => {
									setExpandedId(isExpanded ? null : task.id);
								}}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										setExpandedId(isExpanded ? null : task.id);
									}
								}}
							>
								{/* Expand chevron */}
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										setExpandedId(isExpanded ? null : task.id);
									}}
									className={`flex-shrink-0 text-text-quaternary hover:text-accent-primary transition-colors cursor-pointer rounded-[4px] p-0.5 ${FOCUS_RING}`}
									title={
										isExpanded
											? t("shortcuts.collapse") || "Collapse"
											: t("shortcuts.edit_task")
									}
									aria-label={
										isExpanded
											? t("shortcuts.collapse") || "Collapse"
											: t("shortcuts.edit_task")
									}
								>
									{isExpanded ? (
										<ChevronDown size={14} />
									) : (
										<ChevronRight size={14} />
									)}
								</button>

								{/* Checkbox */}
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										toggle(task.id);
									}}
									className={`flex-shrink-0 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${FOCUS_RING}
                    ${task.is_done ? "bg-accent-primary border-accent-primary" : "border-border-default hover:border-accent-primary"}`}
								>
									{task.is_done && (
										<Check size={12} className="text-white stroke-[3]" />
									)}
								</button>

								{/* Priority dot */}
								<PriorityDot priority={task.priority} />

								{/* Text */}
								<span
									className={`flex-1 text-[15px] leading-snug truncate ${task.is_done ? "line-through text-text-quaternary" : "text-text-primary"}`}
								>
									{task.text || t("task.untitled")}
								</span>

								{/* Tags */}
								{tags.length > 0 && (
									<div className="flex gap-1">
										{tags.map((tag) => (
											<span
												key={tag}
												className="text-xs px-2 py-[3px] rounded bg-accent-subtle text-accent-primary"
											>
												#{tag}
											</span>
										))}
									</div>
								)}

								{/* Schedule to today (Inbox view) */}
								{onScheduleToday && !task.task_date && (
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											onScheduleToday(task.id);
										}}
										className={`flex-shrink-0 text-text-quaternary hover:text-accent-primary transition-colors cursor-pointer rounded-[6px] p-0.5 ${FOCUS_RING}`}
										title={t("task.schedule_today", "Schedule for today")}
										aria-label={t("task.schedule_today", "Schedule for today")}
									>
										<CalendarPlus size={14} />
									</button>
								)}

								{/* Delete button */}
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										onDelete(task.id);
									}}
									className={`flex-shrink-0 text-text-quaternary hover:text-[#ef4444] transition-colors cursor-pointer rounded-[6px] p-0.5 ${FOCUS_RING}`}
									title={t("shortcuts.delete_task")}
									aria-label={t("shortcuts.delete_task")}
								>
									<Trash2 size={14} />
								</button>
							</div>

							{/* Expanded detail section */}
							{isExpanded && (
								<TaskDetailRow
									task={task}
									onUpdateText={onUpdateText}
									onSetPriority={(id, p) => setPriority(id, p)}
									onSetTags={(id, t) => setTags(id, t)}
									onUpdateNotes={(id, n) => updateNotes(id, n)}
									onClose={() => setExpandedId(null)}
								/>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
});

/* ── Expandable detail row ── */

function TaskDetailRow({
	task,
	onUpdateText,
	onSetPriority,
	onSetTags,
	onUpdateNotes,
	onClose,
}: {
	task: Task;
	onUpdateText: (id: number, text: string) => void;
	onSetPriority: (id: number, priority: number) => void;
	onSetTags: (id: number, tags: string) => void;
	onUpdateNotes: (id: number, notes: string) => void;
	onClose: () => void;
}) {
	const { t } = useTranslation();
	const [editText, setEditText] = useState(task.text);
	const [editTags, setEditTags] = useState(task.tags);
	const [editNotes, setEditNotes] = useState(task.notes);
	const [dirty, setDirty] = useState(false);
	const textRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		textRef.current?.focus();
	}, []);

	// Auto-save on blur or close
	const save = () => {
		const trimmed = editText.trim();
		if (trimmed && trimmed !== task.text) onUpdateText(task.id, trimmed);

		const tagsChanged = editTags !== task.tags;
		if (tagsChanged) onSetTags(task.id, editTags);

		const notesChanged = editNotes !== task.notes;
		if (notesChanged) onUpdateNotes(task.id, editNotes);

		setDirty(false);
	};

	const handleBlur = () => {
		if (dirty) save();
	};

	return (
		<div className="px-4 pb-4 pt-2 rounded-[8px] rounded-t-none bg-surface-glass-edge space-y-3">
			{/* Text */}
			<div>
				<label
					htmlFor={`task-text-${task.id}`}
					className="text-[10px] text-text-quaternary uppercase tracking-wide"
				>
					{t("task.detail.task_label")}
				</label>
				<input
					ref={textRef}
					id={`task-text-${task.id}`}
					type="text"
					value={editText}
					onChange={(e) => {
						setEditText(e.target.value);
						setDirty(true);
					}}
					onBlur={handleBlur}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							save();
							onClose();
						}
						if (e.key === "Escape") onClose();
					}}
					className={`w-full bg-input-bg text-text-primary text-[14px] px-3 py-2 rounded-[8px] border border-border-default focus:border-accent-primary transition-colors ${FOCUS_RING}`}
				/>
			</div>

			{/* Priority */}
			<div>
				<span className="text-[10px] text-text-quaternary uppercase tracking-wide">
					{t("task.detail.priority_label")}
				</span>
				<div className="flex gap-1.5 mt-1">
					{getPriorities(t).map((p) => (
						<button
							type="button"
							key={p.value}
							onClick={() => onSetPriority(task.id, p.value)}
							className={`px-2.5 py-1 rounded-[6px] text-[11px] transition-colors cursor-pointer ${FOCUS_RING}
                ${
									task.priority === p.value
										? p.value === 0
											? "bg-surface-elevated text-text-primary"
											: p.value === 3
												? "bg-[rgba(239,68,68,0.2)] text-[#ef4444]"
												: p.value === 2
													? "bg-[rgba(234,179,8,0.2)] text-[#eab308]"
													: "bg-[rgba(59,130,246,0.2)] text-[#3b82f6]"
										: "bg-surface-glass text-text-quaternary hover:text-text-secondary"
								}`}
						>
							{p.label}
						</button>
					))}
				</div>
			</div>

			{/* Tags */}
			<div>
				<label
					htmlFor={`task-tags-${task.id}`}
					className="text-[10px] text-text-quaternary uppercase tracking-wide"
				>
					{t("task.detail.tags")}
				</label>
				<input
					id={`task-tags-${task.id}`}
					type="text"
					value={editTags}
					onChange={(e) => {
						setEditTags(e.target.value);
						setDirty(true);
					}}
					onBlur={handleBlur}
					placeholder={t("task.detail.tags_placeholder", "comma, separated")}
					className={`w-full bg-input-bg text-text-primary text-[13px] px-3 py-2 rounded-[8px] border border-border-default focus:border-accent-primary transition-colors placeholder-input-placeholder ${FOCUS_RING}`}
				/>
			</div>

			{/* Notes */}
			<div>
				<label
					htmlFor={`task-notes-${task.id}`}
					className="text-[10px] text-text-quaternary uppercase tracking-wide"
				>
					{t("task.detail.notes")}
				</label>
				<textarea
					id={`task-notes-${task.id}`}
					value={editNotes}
					onChange={(e) => {
						setEditNotes(e.target.value);
						setDirty(true);
					}}
					onBlur={handleBlur}
					rows={3}
					placeholder={t("task.detail.notes_placeholder", "Add notes...")}
					className={`w-full bg-input-bg text-text-primary text-[13px] px-3 py-2 rounded-[8px] border border-border-default focus:border-accent-primary transition-colors resize-none placeholder-input-placeholder ${FOCUS_RING}`}
				/>
			</div>

			{/* Dates & actions */}
			<div className="flex items-center justify-between pt-1">
				<div className="text-[10px] text-text-quaternary">
					{t("task.detail.created")} {task.created_at?.slice(0, 10) ?? ""}
					{task.completed_at && (
						<>
							{" "}
							· {t("task.detail.completed")} {task.completed_at.slice(0, 10)}
						</>
					)}
				</div>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={() => {
							save();
							onClose();
						}}
						className={`text-[11px] px-3 py-1 rounded-[6px] bg-accent-primary text-white hover:bg-accent-hover transition-colors cursor-pointer ${FOCUS_RING}`}
					>
						{t("common.done")}
					</button>
				</div>
			</div>
		</div>
	);
}
