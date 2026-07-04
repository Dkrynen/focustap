import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react";
import { Check, Trash2, Inbox, Sparkles, ChevronUp, ChevronDown, ChevronRight, Plus, Search } from "lucide-react";
import type { Task } from "../lib/db";
import { useTaskStore } from "../store";

interface TaskListProps {
  tasks: Task[];
  onUpdateText: (id: number, text: string) => void;
  onDelete: (id: number) => void;
  focusId: number | null;
  streak?: number;
}

const CONFETTI_COLORS = ["#8b7eff", "#22c55e", "#eab308", "#ef4444", "#3b82f6", "#ec4899"];

function ConfettiBurst({ id }: { id: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {CONFETTI_COLORS.map((color, i) => (
        <div
          key={`${id}-${i}`}
          className="confetti-piece"
          style={{
            background: color,
            left: `${50 + (i - 2.5) * 12}%`,
            top: "50%",
            width: `${5 + (i % 3) * 2}px`,
            height: `${5 + (i % 3) * 2}px`,
            borderRadius: i % 2 === 0 ? "50%" : "1px",
            "--dx": `${(i - 2.5) * 18}px`,
            animationDelay: `${i * 40}ms`,
            animationDuration: `${0.6 + (i % 3) * 0.2}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

function PriorityDot({ priority }: { priority: number }) {
  if (!priority) return null;
  const cls =
    priority === 3 ? "priority-dot priority-high" :
    priority === 2 ? "priority-dot priority-medium" :
    "priority-dot priority-low";
  return <span className={cls} />;
}

export function TaskList({
  tasks,
  onUpdateText,
  onDelete,
  focusId,
  streak,
}: TaskListProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [confettiId, setConfettiId] = useState<number | null>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const activeTaskIndex = useTaskStore((s) => s.activeTaskIndex);
  const setActiveTaskIndex = useTaskStore((s) => s.setActiveTaskIndex);
  const moveTask = useTaskStore((s) => s.moveTask);
  const searchQuery = useTaskStore((s) => s.searchQuery);
  const toggleWithChildren = useTaskStore((s) => s.toggleWithChildren);
  const addSubtask = useTaskStore((s) => s.addSubtask);
  const setSelectedTaskId = useTaskStore((s) => s.setSelectedTaskId);

  const filteredTasks = searchQuery
    ? tasks.filter((t) =>
        t.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.tags && t.tags.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : tasks;

  const [expandedParents, setExpandedParents] = useState<Set<number>>(new Set());

  const parentIds = new Set(tasks.filter((t) => t.parent_id).map((t) => t.parent_id!));

  const groupedTasks = tasks.filter((t) => !t.parent_id).map((parent) => {
    const children = tasks
      .filter((t) => t.parent_id === parent.id)
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    return { parent, children };
  });

  const filteredGrouped = searchQuery
    ? groupedTasks
        .map((g) => ({
          parent: g.parent,
          children: g.children.filter((c) => filteredTasks.includes(c)),
        }))
        .filter((g) => filteredTasks.includes(g.parent) || g.children.length > 0)
    : groupedTasks;

  // Build flat render list with depth info
  const renderItems = filteredGrouped.flatMap((g) => {
    const items: { task: Task; depth: number; parentTask: Task | null }[] = [];
    items.push({ task: g.parent, depth: 0, parentTask: null });
    if (expandedParents.has(g.parent.id)) {
      for (const child of g.children) {
        items.push({ task: child, depth: 1, parentTask: g.parent });
      }
    }
    return items;
  });

  useEffect(() => {
    if (focusId) {
      const idx = tasks.findIndex((t) => t.id === focusId);
      setEditingId(focusId);
      setEditText("");
      if (idx >= 0) setActiveTaskIndex(idx);
      setTimeout(() => editRef.current?.focus(), 50);
    }
  }, [focusId, tasks, setActiveTaskIndex]);

  const startEdit = (task: Task) => {
    if (!task.is_done) {
      setEditingId(task.id);
      setEditText(task.text);
      setTimeout(() => editRef.current?.focus(), 50);
    }
  };

  const saveEdit = () => {
    if (editingId !== null) {
      const trimmed = editText.trim();
      if (trimmed) {
        onUpdateText(editingId, trimmed);
      } else {
        onDelete(editingId);
      }
      setEditingId(null);
      setEditText("");
    }
  };

  const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      saveEdit();
    }
    if (e.key === "Escape") {
      const task = tasks.find((t) => t.id === editingId);
      if (task && !task.text) {
        onDelete(task.id);
      }
      setEditingId(null);
      setEditText("");
    }
  };

  const handleToggle = useCallback((id: number) => {
    const task = tasks.find((t) => t.id === id);
    const becomingDone = task && !task.is_done;
    toggleWithChildren(id);
    if (becomingDone) {
      setConfettiId(id);
      setTimeout(() => setConfettiId(null), 1200);
    }
  }, [tasks, toggleWithChildren]);

  const scrollIntoView = useCallback((index: number) => {
    const el = listRef.current?.children[index] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (editingId !== null) return;

    const visible = renderItems;
    const last = visible.length - 1;
    let idx = activeTaskIndex;

    switch (e.key) {
      case "ArrowDown":
      case "j":
        e.preventDefault();
        if (idx < -1) { setActiveTaskIndex(0); scrollIntoView(0); }
        else if (idx < last) { setActiveTaskIndex(idx + 1); scrollIntoView(idx + 1); }
        break;
      case "ArrowUp":
      case "k":
        e.preventDefault();
        if (idx <= 0) { setActiveTaskIndex(0); }
        else { setActiveTaskIndex(idx - 1); scrollIntoView(idx - 1); }
        break;
      case "Enter":
        e.preventDefault();
        if (idx >= 0 && idx < visible.length) {
          handleToggle(visible[idx].task.id);
        }
        break;
      case "Delete":
      case "Backspace":
        e.preventDefault();
        if (idx >= 0 && idx < visible.length) {
          onDelete(visible[idx].task.id);
          if (idx >= visible.length - 1) setActiveTaskIndex(Math.max(0, visible.length - 2));
        }
        break;
    }
  }, [editingId, renderItems, activeTaskIndex, setActiveTaskIndex, scrollIntoView, handleToggle, onDelete]);

  // empty state
  if (tasks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-8 gap-3">
        <Inbox size={28} className="text-text-tertiary/30" strokeWidth={1.5} />
        <div>
          <p className="text-sm text-text-secondary/60 font-light">No tasks yet</p>
          <p className="text-xs text-text-tertiary/40 font-light mt-0.5">
            Type above to add your first task
          </p>
        </div>
      </div>
    );
  }

  if (searchQuery && renderItems.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-8 gap-3">
        <Search size={24} className="text-text-tertiary/30" strokeWidth={1.5} />
        <div>
          <p className="text-sm text-text-secondary/60 font-light">No matches</p>
          <p className="text-xs text-text-tertiary/40 font-light mt-0.5">
            No tasks match "{searchQuery}"
          </p>
        </div>
      </div>
    );
  }

  const doneCount = tasks.filter((t) => t.is_done).length;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Progress bar + streak */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-text-secondary font-light">
            Today's progress
          </span>
          <div className="flex items-center gap-2">
            {streak && streak > 0 ? (
              <span className="text-[11px] text-accent-primary/60 flex items-center gap-1">
                <Sparkles size={11} className="text-amber-400 animate-flame" />
                {streak} day{streak > 1 ? "s" : ""}
              </span>
            ) : null}
            <span className="text-xs text-text-secondary font-light">
              {doneCount}/{tasks.length}
            </span>
          </div>
        </div>
        <div className="w-full h-[3px] bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent-primary to-[#b0a5ff] rounded-full transition-all duration-500 ease-out-expo"
            style={{
              width: tasks.length > 0 ? `${(doneCount / tasks.length) * 100}%` : "0%",
            }}
          />
        </div>
      </div>

      {/* Task items */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto space-y-1 pr-1 outline-none"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {renderItems.map(({ task, depth }, index) => {
          const isActive = index === activeTaskIndex;
          const tags = task.tags ? task.tags.split(",").filter(Boolean) : [];
          const isParent = depth === 0 && parentIds.has(task.id);
          const childCount = isParent ? tasks.filter((t) => t.parent_id === task.id).length : 0;
          const doneChildren = isParent ? tasks.filter((t) => t.parent_id === task.id && t.is_done).length : 0;
          const expanded = expandedParents.has(task.id);

          return (
            <div
              key={task.id}
              role="listitem"
              aria-selected={isActive}
              style={{ animationDelay: `${index * 30}ms`, paddingLeft: depth === 1 ? "28px" : undefined }}
              className={`group relative flex items-center gap-2 px-3 py-2 rounded-[8px]
                         transition-all duration-150 cursor-pointer task-enter
                         ${task.is_done ? "opacity-50" : ""}
                         ${depth === 1 ? "text-sm" : "text-sm"}
                         ${editingId === task.id ? "bg-surface-elevated" : isActive ? "bg-surface-glass-edge" : "bg-surface-glass hover:bg-surface-elevated"}`}
              onClick={() => { if (!editingId) { setActiveTaskIndex(index); startEdit(task); } }}
            >
              {/* Confetti overlay */}
              {confettiId === task.id && <ConfettiBurst id={task.id} />}

              {/* Expand/collapse for parents */}
              {isParent ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedParents((prev) => {
                      const next = new Set(prev);
                      if (next.has(task.id)) next.delete(task.id);
                      else next.add(task.id);
                      return next;
                    });
                  }}
                  className="flex-shrink-0 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
                >
                  <ChevronRight size={13} className={`transition-transform duration-150 ${expanded ? "rotate-90" : ""}`} />
                </button>
              ) : depth === 1 ? (
                <span className="flex-shrink-0 w-[10px] h-px bg-border-subtle ml-0.5" />
              ) : (
                <span className="w-[13px] flex-shrink-0" />
              )}

              {/* Priority dot */}
              <PriorityDot priority={task.priority} />

              {/* Checkbox */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle(task.id);
                }}
                className={`flex-shrink-0 w-[18px] h-[18px] rounded-full border-2
                            flex items-center justify-center
                            transition-all duration-200 cursor-pointer
                            ${
                              task.is_done
                                ? "bg-accent-primary border-accent-primary"
                                : "border-white/15 hover:border-accent-primary/40"
                            }`}
              >
                {task.is_done && (
                  <Check size={11} className="text-white stroke-[3] animate-check-bounce" />
                )}
              </button>

              {/* Text or Edit input */}
              {editingId === task.id ? (
                <input
                  ref={editRef}
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  onBlur={saveEdit}
                  className="flex-1 bg-transparent text-text-primary text-sm
                             outline-none border-b border-accent-primary/30 pb-0.5 font-sans"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span
                    className={`font-normal truncate
                                ${task.is_done ? "line-through text-text-tertiary" : "text-text-primary"}
                                ${depth === 1 ? "text-xs" : "text-sm"}`}
                  >
                    {task.text || (task.is_done ? "Done" : "Untitled task")}
                  </span>
                  {/* Subtask progress badge */}
                  {isParent && childCount > 0 && (
                    <span className="flex-shrink-0 text-[10px] text-text-tertiary/60">
                      {doneChildren}/{childCount}
                    </span>
                  )}
                  {tags.length > 0 && (
                    <div className="flex gap-1 ml-1">
                      {tags.map((tag) => (
                        <span key={tag} className="tag-pill">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Add subtask button (on parent hover) */}
              {isParent && depth === 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addSubtask(task.id);
                  }}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100
                             text-text-tertiary hover:text-accent-primary
                             transition-all duration-150 cursor-pointer"
                  title="Add subtask"
                >
                  <Plus size={13} />
                </button>
              )}

              {/* Detail button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTaskId(task.id);
                }}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100
                           text-text-tertiary hover:text-text-primary
                           transition-all duration-150 cursor-pointer"
                title="Open details"
              >
                <ChevronRight size={12} />
              </button>

              {/* Move buttons */}
              <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-150">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveTask(task.id, "up");
                  }}
                  className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer leading-none"
                >
                  <ChevronUp size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveTask(task.id, "down");
                  }}
                  className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer leading-none"
                >
                  <ChevronDown size={12} />
                </button>
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task.id);
                }}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100
                           text-text-tertiary hover:text-red-400
                           transition-all duration-150 cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}