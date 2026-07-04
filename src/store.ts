import { create } from "zustand";
import type { Task, Note } from "./lib/db";
import {
  listTodayTasks,
  createTask,
  updateTaskText,
  updateTaskPriority,
  updateTaskTags,
  toggleTask,
  deleteTask,
  moveTask as dbMoveTask,
  updateTaskNotes,
  createSubtask,
  completeTaskWithChildren,
  uncompleteTask,
  getSetting,
  setSetting,
  getStreak,
  localDatetime,
  listNotes,
  createNote,
  updateNoteTitle,
  updateNoteContent,
  deleteNote,
} from "./lib/db";
import { playChime } from "./lib/sounds";

type PomodoroPhase = "idle" | "work" | "break";

interface TaskState {
  tasks: Task[];
  loading: boolean;
  newTaskId: number | null;
  settingsOpen: boolean;
  soundEnabled: boolean;
  streak: number;
  searchQuery: string;
  loadTasks: () => Promise<void>;
  addTask: (text?: string, priority?: number, tags?: string) => Promise<void>;
  updateText: (id: number, text: string) => Promise<void>;
  toggle: (id: number) => Promise<void>;
  remove: (id: number) => Promise<void>;
  setPriority: (id: number, priority: number) => Promise<void>;
  setTags: (id: number, tags: string) => Promise<void>;
  moveTask: (id: number, direction: "up" | "down") => Promise<void>;
  activeTaskIndex: number;
  setActiveTaskIndex: (index: number) => void;
  setSearchQuery: (query: string) => void;
  setSettingsOpen: (open: boolean) => void;
  setSoundEnabled: (enabled: boolean) => Promise<void>;
  /* Notes */
  updateNotes: (id: number, notes: string) => Promise<void>;
  /* Subtasks */
  selectedTaskId: number | null;
  setSelectedTaskId: (id: number | null) => void;
  addSubtask: (parentId: number) => Promise<void>;
  toggleWithChildren: (id: number) => Promise<void>;
  /* Notes / Notepad */
  notes: Note[];
  notesPanelOpen: boolean;
  setNotesPanelOpen: (open: boolean) => void;
  loadNotes: () => Promise<void>;
  addNote: () => Promise<void>;
  updateNoteTitle: (id: number, title: string) => Promise<void>;
  updateNoteContent: (id: number, content: string) => Promise<void>;
  removeNote: (id: number) => Promise<void>;

  /* Pomodoro */
  pomodoroPhase: PomodoroPhase;
  pomodoroTimeRemaining: number;
  pomodoroWorkDuration: number;
  pomodoroBreakDuration: number;
  pomodoroActiveTaskId: number | null;
  pomodoroStart: (taskId?: number) => void;
  pomodoroPause: () => void;
  pomodoroReset: () => void;
  pomodoroTick: () => void;
  setPomodoroWorkDuration: (seconds: number) => Promise<void>;
  setPomodoroBreakDuration: (seconds: number) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: true,
  newTaskId: null,
  settingsOpen: false,
  soundEnabled: true,
  streak: 0,
  searchQuery: "",
  selectedTaskId: null,
  activeTaskIndex: -1,
  notes: [],
  notesPanelOpen: false,

  pomodoroPhase: "idle",
  pomodoroTimeRemaining: 1500,
  pomodoroWorkDuration: 1500,
  pomodoroBreakDuration: 300,
  pomodoroActiveTaskId: null,

  loadTasks: async () => {
    set({ loading: true });
    try {
      const [tasks, soundVal, streak, workDur, breakDur] = await Promise.all([
        listTodayTasks(),
        getSetting("sound_enabled"),
        getStreak(),
        getSetting("pomodoro_work"),
        getSetting("pomodoro_break"),
      ]);
      const workDuration = workDur ? parseInt(workDur, 10) : 1500;
      const breakDuration = breakDur ? parseInt(breakDur, 10) : 300;
      set({
        tasks,
        loading: false,
        soundEnabled: soundVal !== "false",
        streak,
        pomodoroWorkDuration: workDuration,
        pomodoroBreakDuration: breakDuration,
        pomodoroTimeRemaining: workDuration,
      });
    } catch (e) {
      console.error("Failed to load tasks", e);
      set({ loading: false });
    }
  },

  addTask: async (text?: string, priority?: number, tags?: string) => {
    try {
      const id = await createTask();
      if (text?.trim()) {
        await updateTaskText(id, text.trim());
      }
      if (priority !== undefined && priority > 0) {
        await updateTaskPriority(id, priority);
      }
      if (tags) {
        await updateTaskTags(id, tags);
      }
      set({ newTaskId: id });
      await get().loadTasks();
    } catch (e) {
      console.error("Failed to create task", e);
    }
  },

  updateText: async (id, text) => {
    try {
      await updateTaskText(id, text);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? { ...t, text } : t)),
      }));
    } catch (e) {
      console.error("Failed to update task", e);
    }
  },

  toggle: async (id) => {
    try {
      const task = get().tasks.find((t) => t.id === id);
      const becomingDone = task && !task.is_done;
      await toggleTask(id);
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                is_done: !t.is_done,
                completed_at: t.is_done
                  ? null
                  : localDatetime(),
              }
            : t
        ),
      }));
      // Play chime when task is completed
      if (becomingDone && get().soundEnabled) {
        playChime();
      }
      // Refresh streak after toggling
      const streak = await getStreak();
      set({ streak });
    } catch (e) {
      console.error("Failed to toggle task", e);
    }
  },

  remove: async (id) => {
    try {
      await deleteTask(id);
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
      }));
    } catch (e) {
      console.error("Failed to delete task", e);
    }
  },

  setPriority: async (id, priority) => {
    try {
      await updateTaskPriority(id, priority);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? { ...t, priority } : t)),
      }));
    } catch (e) {
      console.error("Failed to set priority", e);
    }
  },

  setTags: async (id, tags) => {
    try {
      await updateTaskTags(id, tags);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? { ...t, tags } : t)),
      }));
    } catch (e) {
      console.error("Failed to set tags", e);
    }
  },

  moveTask: async (id, direction) => {
    try {
      await dbMoveTask(id, direction);
      await get().loadTasks();
    } catch (e) {
      console.error("Failed to move task", e);
    }
  },

  setActiveTaskIndex: (index) => set({ activeTaskIndex: index }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSettingsOpen: (open) => set({ settingsOpen: open }),

  setSoundEnabled: async (enabled) => {
    set({ soundEnabled: enabled });
    try {
      await setSetting("sound_enabled", enabled ? "true" : "false");
    } catch (e) {
      console.error("Failed to persist sound setting", e);
    }
  },

  /* Notes */
  updateNotes: async (id, notes) => {
    try {
      await updateTaskNotes(id, notes);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? { ...t, notes } : t)),
      }));
    } catch (e) {
      console.error("Failed to update notes", e);
    }
  },

  /* Subtasks */
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),

  addSubtask: async (parentId) => {
    try {
      const id = await createSubtask(parentId);
      set({ newTaskId: id });
      await get().loadTasks();
    } catch (e) {
      console.error("Failed to create subtask", e);
    }
  },

  toggleWithChildren: async (id) => {
    try {
      const task = get().tasks.find((t) => t.id === id);
      if (!task) return;
      const becomingDone = !task.is_done;
      if (becomingDone) {
        await completeTaskWithChildren(id);
      } else {
        await uncompleteTask(id);
      }
      await get().loadTasks();
      const streak = await getStreak();
      set({ streak });
      if (becomingDone && get().soundEnabled) {
        playChime();
      }
    } catch (e) {
      console.error("Failed to toggle with children", e);
    }
  },

  /* Notes / Notepad */
  setNotesPanelOpen: (open) => set({ notesPanelOpen: open }),

  loadNotes: async () => {
    try {
      const notes = await listNotes();
      set({ notes });
    } catch (e) {
      console.error("Failed to load notes", e);
    }
  },

  addNote: async () => {
    try {
      await createNote();
      const notes = await listNotes();
      set({ notes });
    } catch (e) {
      console.error("Failed to create note", e);
    }
  },

  updateNoteTitle: async (id, title) => {
    try {
      await updateNoteTitle(id, title);
      set((state) => ({
        notes: state.notes.map((n) => (n.id === id ? { ...n, title } : n)),
      }));
    } catch (e) {
      console.error("Failed to update note title", e);
    }
  },

  updateNoteContent: async (id, content) => {
    try {
      await updateNoteContent(id, content);
      set((state) => ({
        notes: state.notes.map((n) => (n.id === id ? { ...n, content } : n)),
      }));
    } catch (e) {
      console.error("Failed to update note content", e);
    }
  },

  removeNote: async (id) => {
    try {
      await deleteNote(id);
      set((state) => ({
        notes: state.notes.filter((n) => n.id !== id),
      }));
    } catch (e) {
      console.error("Failed to delete note", e);
    }
  },

  /* Pomodoro */
  pomodoroStart: (taskId) => {
    const state = get();
    const nextPhase: PomodoroPhase = state.pomodoroPhase === "idle" || state.pomodoroPhase === "break"
      ? "work" : "break";
    set({
      pomodoroPhase: nextPhase,
      pomodoroTimeRemaining: nextPhase === "work" ? state.pomodoroWorkDuration : state.pomodoroBreakDuration,
      pomodoroActiveTaskId: taskId ?? state.pomodoroActiveTaskId,
    });
  },

  pomodoroPause: () => {
    const state = get();
    if (state.pomodoroPhase !== "idle") {
      set({ pomodoroPhase: "idle" });
    }
  },

  pomodoroReset: () => {
    const state = get();
    set({
      pomodoroPhase: "idle",
      pomodoroTimeRemaining: state.pomodoroWorkDuration,
      pomodoroActiveTaskId: null,
    });
  },

  pomodoroTick: () => {
    const state = get();
    if (state.pomodoroPhase === "idle") return;
    const remaining = state.pomodoroTimeRemaining - 1;
    if (remaining <= 0) {
      // Phase completed — auto-switch
      const nextPhase: PomodoroPhase = state.pomodoroPhase === "work" ? "break" : "work";
      set({
        pomodoroPhase: nextPhase,
        pomodoroTimeRemaining: nextPhase === "work" ? state.pomodoroWorkDuration : state.pomodoroBreakDuration,
      });
      if (state.soundEnabled) playChime();
    } else {
      set({ pomodoroTimeRemaining: remaining });
    }
  },

  setPomodoroWorkDuration: async (seconds) => {
    set({ pomodoroWorkDuration: seconds });
    if (get().pomodoroPhase === "idle") {
      set({ pomodoroTimeRemaining: seconds });
    }
    try {
      await setSetting("pomodoro_work", String(seconds));
    } catch (e) {
      console.error("Failed to persist work duration", e);
    }
  },

  setPomodoroBreakDuration: async (seconds) => {
    set({ pomodoroBreakDuration: seconds });
    try {
      await setSetting("pomodoro_break", String(seconds));
    } catch (e) {
      console.error("Failed to persist break duration", e);
    }
  },
}));
