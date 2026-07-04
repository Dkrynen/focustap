import { useEffect, useState, useCallback } from "react";
import { X, Plus, Trash2, Clock } from "lucide-react";
import { listTimeBlocks, listTasksByTimeBlock, createTimeBlock, deleteTimeBlock, updateTaskTimeBlock, type TimeBlock, type Task } from "../lib/db";
import { useTaskStore } from "../store";

interface DayPlannerProps {
  open: boolean;
  onClose: () => void;
}

const BLOCK_COLORS = ["#8b7eff", "#22c55e", "#eab308", "#ef4444", "#3b82f6", "#ec4899", "#a855f7", "#f97316"];

function formatTimeRange(start: string, end: string): string {
  return `${start.slice(0, 5)}–${end.slice(0, 5)}`;
}

function isCurrentBlock(start: string, end: string): boolean {
  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  return currentMin >= startMin && currentMin < endMin;
}

export function DayPlanner({ open, onClose }: DayPlannerProps) {
  const [showContent, setShowContent] = useState(false);
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [tasksByBlock, setTasksByBlock] = useState<Record<number, Task[]>>({});
  const [addingBlock, setAddingBlock] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newStart, setNewStart] = useState("08:00");
  const [newEnd, setNewEnd] = useState("09:30");
  const tasks = useTaskStore((s) => s.tasks);
  const todayStr = new Date().toLocaleDateString("en-CA");

  const loadData = useCallback(async () => {
    const loadedBlocks = await listTimeBlocks();
    setBlocks(loadedBlocks);
    const blockMap: Record<number, Task[]> = {};
    for (const block of loadedBlocks) {
      blockMap[block.id] = await listTasksByTimeBlock(block.id, todayStr);
    }
    setTasksByBlock(blockMap);
  }, [todayStr]);

  useEffect(() => {
    if (!open) { setShowContent(false); return; }
    requestAnimationFrame(() => setShowContent(true));
    loadData();
  }, [open, loadData]);

  const handleAssignTask = async (taskId: number, blockId: number | null) => {
    await updateTaskTimeBlock(taskId, blockId);
    await loadData();
    useTaskStore.getState().loadTasks();
  };

  const handleAddBlock = async () => {
    if (!newLabel.trim()) return;
    const color = BLOCK_COLORS[blocks.length % BLOCK_COLORS.length];
    await createTimeBlock(newLabel.trim(), newStart, newEnd, color);
    setNewLabel("");
    setAddingBlock(false);
    await loadData();
  };

  const handleDeleteBlock = async (blockId: number) => {
    // Unassign all tasks from this block first
    for (const task of tasksByBlock[blockId] || []) {
      await updateTaskTimeBlock(task.id, null);
    }
    await deleteTimeBlock(blockId);
    await loadData();
    useTaskStore.getState().loadTasks();
  };

  if (!open) return null;

  // Tasks not assigned to any block
  const unassigned = tasks.filter((t) => !t.time_block_id && !t.is_done && !t.parent_id);

  return (
    <div className="fixed inset-0 z-50" onKeyDown={(e) => e.key === "Escape" && onClose()} tabIndex={-1}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div
        className="absolute right-0 top-0 h-full w-[380px] max-w-[92vw] glass-elevated
                     rounded-l-[14px] shadow-2xl flex flex-col"
        style={{
          transform: showContent ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h2 className="text-sm font-medium text-text-primary flex items-center gap-2">
            <Clock size={14} className="text-accent-primary" /> Day Planner
          </h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>
        <div className="mx-5 h-px bg-border-subtle" />

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {blocks.map((block) => {
            const blockTasks = tasksByBlock[block.id] || [];
            const isNow = isCurrentBlock(block.start_time, block.end_time);
            return (
              <div
                key={block.id}
                className={`rounded-[10px] overflow-hidden transition-all duration-200
                  ${isNow ? "ring-1 ring-accent-primary/40 bg-accent-glow" : "bg-surface-glass"}`}
              >
                {/* Block header */}
                <div
                  className="flex items-center justify-between px-3 py-2"
                  style={{ borderLeft: `3px solid ${block.color}` }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-medium text-text-primary truncate">{block.label}</span>
                    <span className="text-[10px] text-text-tertiary font-mono whitespace-nowrap">
                      {formatTimeRange(block.start_time, block.end_time)}
                    </span>
                    {isNow && (
                      <span className="text-[9px] text-accent-primary font-medium animate-glow-pulse">NOW</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteBlock(block.id)}
                    className="text-text-quaternary hover:text-red-400 transition-colors cursor-pointer flex-shrink-0 ml-2"
                    title="Delete block"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>

                {/* Block tasks */}
                <div className="px-3 pb-2 space-y-1">
                  {blockTasks.length === 0 && (
                    <p className="text-[10px] text-text-tertiary/50 italic py-1">No tasks scheduled</p>
                  )}
                  {blockTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-[6px] bg-surface-glass-edge group"
                    >
                      <button
                        onClick={() => handleAssignTask(task.id, null)}
                        className="text-text-quaternary hover:text-red-400 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                        title="Remove from block"
                      >
                        <X size={10} />
                      </button>
                      <span className={`text-xs flex-1 truncate ${task.is_done ? "line-through text-text-tertiary" : "text-text-secondary"}`}>
                        {task.text || "Untitled"}
                      </span>
                      {task.priority > 0 && (
                        <span className={`text-[9px] px-1 rounded ${
                          task.priority === 3 ? "text-red-300 bg-red-500/20" :
                          task.priority === 2 ? "text-yellow-300 bg-yellow-500/20" :
                          "text-blue-300 bg-blue-500/20"
                        }`}>
                          {task.priority === 3 ? "H" : task.priority === 2 ? "M" : "L"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Unassigned tasks */}
          {unassigned.length > 0 && (
            <div className="rounded-[10px] bg-surface-deep border border-border-subtle overflow-hidden">
              <div className="px-3 py-2 text-[11px] text-text-tertiary font-medium uppercase tracking-wide">
                Unassigned Tasks
              </div>
              <div className="px-3 pb-2 space-y-1">
                {unassigned.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-[6px] bg-surface-glass group"
                  >
                    <span className="text-xs flex-1 truncate text-text-secondary">{task.text || "Untitled"}</span>
                    <select
                      value=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) handleAssignTask(task.id, Number(val));
                      }}
                      className="text-[10px] bg-surface-glass text-text-tertiary border border-border-subtle
                                 rounded-[4px] px-1.5 py-0.5 outline-none cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <option value="">Assign to block</option>
                      {blocks.map((b) => (
                        <option key={b.id} value={b.id}>{b.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add custom block */}
          {addingBlock ? (
            <div className="rounded-[10px] bg-surface-glass p-3 space-y-2">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Block name (e.g. Study Session)"
                className="w-full bg-surface-glass-edge text-text-primary text-xs px-3 py-2 rounded-[6px]
                           outline-none border border-border-default focus:border-accent-primary/30 transition-colors font-sans"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleAddBlock()}
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[9px] text-text-quaternary block mb-1">Start</label>
                  <input
                    type="time"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="w-full bg-surface-glass-edge text-text-primary text-xs px-2 py-1.5 rounded-[4px]
                               outline-none border border-border-default font-mono"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[9px] text-text-quaternary block mb-1">End</label>
                  <input
                    type="time"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    className="w-full bg-surface-glass-edge text-text-primary text-xs px-2 py-1.5 rounded-[4px]
                               outline-none border border-border-default font-mono"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddBlock}
                  className="flex-1 py-1.5 rounded-[6px] bg-accent-primary text-white text-xs font-medium
                             hover:bg-accent-hover transition-colors cursor-pointer"
                >
                  Add Block
                </button>
                <button
                  onClick={() => setAddingBlock(false)}
                  className="px-3 py-1.5 rounded-[6px] bg-surface-glass-edge text-text-tertiary text-xs
                             hover:text-text-primary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingBlock(true)}
              className="flex items-center gap-1.5 text-xs text-accent-primary hover:text-accent-hover
                         transition-colors cursor-pointer w-full justify-center py-2"
            >
              <Plus size={12} /> Add time block
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
