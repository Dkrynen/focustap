import { useState, useRef, useEffect, memo } from "react";
import { Check, Trash2, Inbox, Search, Pencil } from "lucide-react";
import type { Task } from "../lib/db";
import { useTaskStore } from "../store";

interface TaskListProps {
  tasks: Task[];
  onUpdateText: (id: number, text: string) => void;
  onDelete: (id: number) => void;
  focusId: number | null;
  streak?: number;
}

const PRIORITIES = [
  { value: 0, label: "None", color: "" },
  { value: 1, label: "Low", color: "#3b82f6" },
  { value: 2, label: "Medium", color: "#eab308" },
  { value: 3, label: "High", color: "#ef4444" },
];

function PriorityDot({ priority }: { priority: number }) {
  if (!priority) return null;
  const colors = ["", "#3b82f6", "#eab308", "#ef4444"];
  return (
    <span
      className="w-[6px] h-[6px] rounded-full flex-shrink-0"
      style={{ background: colors[priority] || "#666" }}
    />
  );
}

export const TaskList = memo(function TaskList({ tasks, onUpdateText, onDelete, focusId, streak }: TaskListProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const setPriority = useTaskStore((s) => s.setPriority);
  const setTags = useTaskStore((s) => s.setTags);
  const updateNotes = useTaskStore((s) => s.updateNotes);
  const toggle = useTaskStore((s) => s.toggle);
  const searchQuery = useTaskStore((s) => s.searchQuery);

  // Scroll to new task
  useEffect(() => {
    if (focusId) {
      const el = document.querySelector(`[data-task-id="${focusId}"]`);
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [focusId]);

  const filteredTasks = searchQuery
    ? tasks.filter((t) =>
        t.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.tags && t.tags.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : tasks;

  // Empty state
  if (tasks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-8 gap-2">
        <Inbox size={24} className="text-[#444]" strokeWidth={1.5} />
        <p className="text-sm text-[#666]">No tasks yet</p>
        <p className="text-xs text-[#555]">Type above and press Enter to add one</p>
      </div>
    );
  }

  if (searchQuery && filteredTasks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-8 gap-2">
        <Search size={20} className="text-[#444]" strokeWidth={1.5} />
        <p className="text-sm text-[#666]">No matches for "{searchQuery}"</p>
      </div>
    );
  }

  const doneCount = tasks.filter((t) => t.is_done).length;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Progress bar */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-[#666]">
          {doneCount}/{tasks.length} done
        </span>
        {streak && streak > 0 ? (
          <span className="text-[11px] text-[#eab308]">{streak} day streak 🔥</span>
        ) : null}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto space-y-[2px] outline-none">
        {filteredTasks.map((task) => {
          const isExpanded = expandedId === task.id;
          const tags = task.tags ? task.tags.split(",").filter(Boolean) : [];

          return (
            <div key={task.id} data-task-id={task.id}>
              {/* Main task row */}
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-[6px] transition-colors cursor-pointer
                  ${task.is_done ? "opacity-40" : "hover:bg-[rgba(255,255,255,0.04)]"}
                  ${isExpanded ? "bg-[rgba(255,255,255,0.06)] rounded-b-none" : ""}`}
                onClick={() => {
                  if (!isExpanded) toggle(task.id);
                }}
              >
                {/* Checkbox */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggle(task.id); }}
                  className={`flex-shrink-0 w-[16px] h-[16px] rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer
                    ${task.is_done ? "bg-[#8b7eff] border-[#8b7eff]" : "border-[rgba(255,255,255,0.2)] hover:border-[#8b7eff]"}`}
                >
                  {task.is_done && <Check size={10} className="text-white stroke-[3]" />}
                </button>

                {/* Priority dot */}
                <PriorityDot priority={task.priority} />

                {/* Text */}
                <span className={`flex-1 text-[13px] truncate ${task.is_done ? "line-through text-[#666]" : "text-[#f0f0f0]"}`}>
                  {task.text || "Untitled"}
                </span>

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="flex gap-1">
                    {tags.map((tag) => (
                      <span key={tag} className="text-[10px] px-1.5 py-[1px] rounded bg-[rgba(139,126,255,0.15)] text-[#8b7eff]">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Edit button */}
                {!task.is_done && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : task.id); }}
                    className="flex-shrink-0 opacity-0 hover:opacity-100 text-[#666] hover:text-[#8b7eff] transition-all cursor-pointer"
                    title="Edit task"
                  >
                    <Pencil size={12} />
                  </button>
                )}

                {/* Delete button */}
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                  className="flex-shrink-0 opacity-0 hover:opacity-100 text-[#666] hover:text-[#ef4444] transition-all cursor-pointer"
                  title="Delete task"
                >
                  <Trash2 size={13} />
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
    <div className="px-3 pb-3 pt-1 rounded-[6px] rounded-t-none bg-[rgba(255,255,255,0.06)] space-y-2">
      {/* Text */}
      <div>
        <label className="text-[10px] text-[#666] uppercase tracking-wide">Task</label>
        <input
          ref={textRef}
          type="text"
          value={editText}
          onChange={(e) => { setEditText(e.target.value); setDirty(true); }}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") { save(); onClose(); }
            if (e.key === "Escape") onClose();
          }}
          className="w-full bg-[rgba(0,0,0,0.3)] text-[#f0f0f0] text-[13px] px-2.5 py-1.5 rounded-[4px] outline-none border border-[rgba(255,255,255,0.06)] focus:border-[#8b7eff] transition-colors"
        />
      </div>

      {/* Priority */}
      <div>
        <label className="text-[10px] text-[#666] uppercase tracking-wide">Priority</label>
        <div className="flex gap-1.5 mt-1">
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              onClick={() => onSetPriority(task.id, p.value)}
              className={`px-2.5 py-1 rounded-[4px] text-[11px] transition-colors cursor-pointer
                ${task.priority === p.value
                  ? p.value === 0 ? "bg-[rgba(255,255,255,0.1)] text-[#f0f0f0]"
                    : p.value === 3 ? "bg-[rgba(239,68,68,0.2)] text-[#ef4444]"
                    : p.value === 2 ? "bg-[rgba(234,179,8,0.2)] text-[#eab308]"
                    : "bg-[rgba(59,130,246,0.2)] text-[#3b82f6]"
                  : "bg-[rgba(255,255,255,0.04)] text-[#666] hover:text-[#a0a0a0]"
                }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="text-[10px] text-[#666] uppercase tracking-wide">Tags</label>
        <input
          type="text"
          value={editTags}
          onChange={(e) => { setEditTags(e.target.value); setDirty(true); }}
          onBlur={handleBlur}
          placeholder="comma, separated"
          className="w-full bg-[rgba(0,0,0,0.3)] text-[#f0f0f0] text-[12px] px-2.5 py-1.5 rounded-[4px] outline-none border border-[rgba(255,255,255,0.06)] focus:border-[#8b7eff] transition-colors placeholder-[#555]"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="text-[10px] text-[#666] uppercase tracking-wide">Notes</label>
        <textarea
          value={editNotes}
          onChange={(e) => { setEditNotes(e.target.value); setDirty(true); }}
          onBlur={handleBlur}
          rows={2}
          placeholder="Add notes..."
          className="w-full bg-[rgba(0,0,0,0.3)] text-[#f0f0f0] text-[12px] px-2.5 py-1.5 rounded-[4px] outline-none border border-[rgba(255,255,255,0.06)] focus:border-[#8b7eff] transition-colors resize-none placeholder-[#555]"
        />
      </div>

      {/* Dates & actions */}
      <div className="flex items-center justify-between pt-1">
        <div className="text-[10px] text-[#555]">
          Created {task.created_at.slice(0, 10)}
          {task.completed_at && <> · Done {task.completed_at.slice(0, 10)}</>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { save(); onClose(); }}
            className="text-[11px] px-3 py-1 rounded-[4px] bg-[#8b7eff] text-white hover:bg-[#7a6dee] transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
