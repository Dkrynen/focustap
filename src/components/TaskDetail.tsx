import { useEffect, useState, useCallback, useRef } from "react";
import { X, Plus, ChevronRight, Check, Calendar as CalendarIcon } from "lucide-react";
import { useTaskStore } from "../store";
import {
  updateTaskText, updateTaskPriority, updateTaskTags, updateTaskNotes,
  updateTaskRecurrence, updateTaskDate, updateTaskTimeBlock,
  listSubtasks, listTimeBlocks, toggleTask,
} from "../lib/db";
import type { Task, TimeBlock } from "../lib/db";

const PRIORITY_OPTIONS = [
  { value: 0, label: "None" },
  { value: 1, label: "Low" },
  { value: 2, label: "Medium" },
  { value: 3, label: "High" },
];

const RECURRENCE_OPTIONS = [
  { value: "", label: "None" },
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export function TaskDetail() {
  const selectedTaskId = useTaskStore((s) => s.selectedTaskId);
  const setSelectedTaskId = useTaskStore((s) => s.setSelectedTaskId);
  const tasks = useTaskStore((s) => s.tasks);
  const addSubtask = useTaskStore((s) => s.addSubtask);
  const loadTasks = useTaskStore((s) => s.loadTasks);

  const [showContent, setShowContent] = useState(false);
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [editText, setEditText] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editTaskDate, setEditTaskDate] = useState("");
  const [editTimeBlockId, setEditTimeBlockId] = useState<number | null>(null);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [dirty, setDirty] = useState(false);
  const textRef = useRef<HTMLInputElement>(null);

  const task = tasks.find((t) => t.id === selectedTaskId);

  useEffect(() => {
    if (selectedTaskId) {
      requestAnimationFrame(() => setShowContent(true));
      setEditText(task?.text ?? "");
      setEditNotes(task?.notes ?? "");
      setEditTags(task?.tags ?? "");
      setEditTaskDate(task?.task_date ?? "");
      setEditTimeBlockId(task?.time_block_id ?? null);
      setDirty(false);
      if (selectedTaskId) {
        listSubtasks(selectedTaskId).then(setSubtasks);
        listTimeBlocks().then(setTimeBlocks);
      }
      setTimeout(() => textRef.current?.focus(), 100);
    } else {
      setShowContent(false);
      setSubtasks([]);
    }
  }, [selectedTaskId]);

  // Sync external data only when not dirty (user isn't actively editing)
  useEffect(() => {
    if (!dirty && task && tasks.find((t) => t.id === task.id)) {
      setEditText(task.text);
      setEditNotes(task.notes);
      setEditTags(task.tags);
    }
  }, [task?.text, task?.notes, task?.tags, dirty]);

  const save = useCallback(async () => {
    if (!task) return;
    const trimmedText = editText.trim();
    if (trimmedText && trimmedText !== task.text) await updateTaskText(task.id, trimmedText);
    if (editNotes !== task.notes) await updateTaskNotes(task.id, editNotes);
    if (editTags !== task.tags) await updateTaskTags(task.id, editTags);
    const newTaskDate = editTaskDate || null;
    if (newTaskDate !== task.task_date) await updateTaskDate(task.id, newTaskDate);
    if (editTimeBlockId !== task.time_block_id) await updateTaskTimeBlock(task.id, editTimeBlockId);
    setDirty(false);
    await loadTasks();
  }, [task, editText, editNotes, editTags, editTaskDate, editTimeBlockId, loadTasks]);

  const handlePriority = async (value: number) => {
    if (!task) return;
    await updateTaskPriority(task.id, value);
    await loadTasks();
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (dirty) save();
      setSelectedTaskId(null);
    }
  }, [dirty, save, setSelectedTaskId]);

  if (!selectedTaskId || !task) return null;

  return (
    <div className="fixed inset-0 z-50" onKeyDown={handleKeyDown} tabIndex={-1}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={() => { if (dirty) save(); setSelectedTaskId(null); }}
      />

      {/* Slide-in panel */}
      <div
        className={`absolute right-0 top-0 h-full w-[300px] max-w-[90vw] glass-elevated
                     rounded-l-[14px] shadow-2xl flex flex-col
                     transition-transform duration-200 ease-out-expo`}
        style={{
          transform: showContent ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h2 className="text-sm font-medium text-text-primary">Task Details</h2>
          <button
            onClick={() => { if (dirty) save(); setSelectedTaskId(null); }}
            className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
        <div className="mx-5 h-px bg-border-subtle" />

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Text */}
          <div>
            <label className="text-[11px] font-medium text-text-tertiary uppercase tracking-wide mb-1 block">Task</label>
            <input
              ref={textRef}
              type="text"
              value={editText}
              onChange={(e) => { setEditText(e.target.value); setDirty(true); }}
              className="w-full bg-surface-glass text-text-primary text-sm px-3 py-2 rounded-[8px] outline-none border border-border-default focus:border-accent-primary/30 transition-colors font-sans"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="text-[11px] font-medium text-text-tertiary uppercase tracking-wide mb-1.5 block">Priority</label>
            <div className="flex gap-1.5">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handlePriority(opt.value)}
                  className={`px-2.5 py-1.5 rounded-[6px] text-xs transition-all cursor-pointer
                    ${task.priority === opt.value
                      ? opt.value === 0 ? "bg-surface-glass-edge text-text-primary"
                        : opt.value === 3 ? "bg-red-500/20 text-red-300"
                        : opt.value === 2 ? "bg-yellow-500/20 text-yellow-300"
                        : "bg-blue-500/20 text-blue-300"
                      : "bg-surface-glass text-text-tertiary hover:text-text-secondary"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-[11px] font-medium text-text-tertiary uppercase tracking-wide mb-1 block">Tags</label>
            <input
              type="text"
              value={editTags}
              onChange={(e) => { setEditTags(e.target.value); setDirty(true); }}
              placeholder="comma, separated, tags"
              className="w-full bg-surface-glass text-text-primary text-xs px-3 py-2 rounded-[8px] outline-none border border-border-default focus:border-accent-primary/30 transition-colors font-sans"
            />
          </div>

          {/* Recurrence */}
          <div>
            <label className="text-[11px] font-medium text-text-tertiary uppercase tracking-wide mb-1.5 block">Recurrence</label>
            <div className="flex gap-1.5 flex-wrap">
              {RECURRENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={async () => {
                    await updateTaskRecurrence(task.id, opt.value);
                    await loadTasks();
                  }}
                  className={`px-2.5 py-1 rounded-[6px] text-xs transition-all cursor-pointer
                    ${task.recurrence === opt.value
                      ? "bg-accent-primary/20 text-accent-primary"
                      : "bg-surface-glass text-text-tertiary hover:text-text-secondary"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scheduled Date */}
          <div>
            <label className="text-[11px] font-medium text-text-tertiary uppercase tracking-wide mb-1 block flex items-center gap-1">
              <CalendarIcon size={11} /> Scheduled Date
            </label>
            <div className="flex gap-1.5">
              <input
                type="date"
                value={editTaskDate}
                onChange={(e) => { setEditTaskDate(e.target.value); setDirty(true); }}
                className="flex-1 bg-surface-glass text-text-primary text-xs px-3 py-2 rounded-[8px]
                           outline-none border border-border-default focus:border-accent-primary/30
                           transition-colors font-sans"
              />
              {editTaskDate && (
                <button
                  onClick={async () => {
                    await updateTaskDate(task.id, null);
                    setEditTaskDate("");
                    setDirty(false);
                    await loadTasks();
                  }}
                  className="px-2 text-[10px] text-text-tertiary hover:text-red-400 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Time Block */}
          <div>
            <label className="text-[11px] font-medium text-text-tertiary uppercase tracking-wide mb-1 block">Time Block</label>
            <select
              value={editTimeBlockId ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                const blockId = val ? Number(val) : null;
                setEditTimeBlockId(blockId);
                setDirty(true);
              }}
              className="w-full bg-surface-glass text-text-primary text-xs px-3 py-2 rounded-[8px]
                         outline-none border border-border-default focus:border-accent-primary/30
                         transition-colors cursor-pointer"
            >
              <option value="">None</option>
              {timeBlocks.map((tb) => (
                <option key={tb.id} value={tb.id}>
                  {tb.label} ({tb.start_time.slice(0, 5)}–{tb.end_time.slice(0, 5)})
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-medium text-text-tertiary uppercase tracking-wide mb-1 block">Notes</label>
            <textarea
              value={editNotes}
              onChange={(e) => { setEditNotes(e.target.value); setDirty(true); }}
              rows={4}
              className="w-full bg-surface-glass text-text-primary text-xs px-3 py-2 rounded-[8px] outline-none border border-border-default focus:border-accent-primary/30 transition-colors resize-none font-sans"
            />
          </div>

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-medium text-text-tertiary uppercase tracking-wide">Subtasks</label>
              <button
                onClick={() => addSubtask(task.id)}
                className="flex items-center gap-1 text-[11px] text-accent-primary hover:text-accent-hover transition-colors cursor-pointer"
              >
                <Plus size={11} /> Add
              </button>
            </div>
            <div className="space-y-1">
              {subtasks.length === 0 && (
                <p className="text-[11px] text-text-tertiary/60 italic">No subtasks yet</p>
              )}
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] bg-surface-glass"
                >
                  <button
                    onClick={async () => {
                      await toggleTask(st.id);
                      await loadTasks();
                      listSubtasks(task.id).then(setSubtasks);
                    }}
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all cursor-pointer ${
                      st.is_done ? "bg-accent-primary border-accent-primary" : "border-white/15"
                    }`}
                  >
                    {st.is_done && <Check size={8} className="text-white stroke-[3]" />}
                  </button>
                  <span className={`text-xs flex-1 truncate ${st.is_done ? "line-through text-text-tertiary" : "text-text-primary"}`}>
                    {st.text || "Untitled"}
                  </span>
                  <ChevronRight size={10} className="text-text-quaternary" />
                </div>
              ))}
            </div>
          </div>

          {/* Metadata */}
          <div className="pt-2 border-t border-border-subtle space-y-1.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-text-tertiary">Created</span>
              <span className="text-text-secondary">{task.created_at}</span>
            </div>
            {task.completed_at && (
              <div className="flex justify-between text-[10px]">
                <span className="text-text-tertiary">Completed</span>
                <span className="text-text-secondary">{task.completed_at}</span>
              </div>
            )}
            <div className="flex justify-between text-[10px]">
              <span className="text-text-tertiary">ID</span>
              <span className="text-text-secondary">#{task.id}</span>
            </div>
          </div>
        </div>

        {/* Save footer */}
        <div className="px-5 py-3 border-t border-border-subtle">
          <button
            onClick={async () => {
              await save();
              setSelectedTaskId(null);
            }}
            className="w-full py-2 rounded-[8px] bg-accent-primary text-white text-xs font-medium
                       hover:bg-accent-hover transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}