import {
	activateAndGetState,
	bootstrapState,
	deactivate as deactivateLicensePlugin,
} from "@licenseseat/tauri-plugin";
import { load } from "@tauri-apps/plugin-store";
import { create } from "zustand";
import { showToast } from "./components/Toast";
import { trackEvent } from "./lib/analytics";
import {
	enqueueTaskCreate,
	enqueueTaskDelete,
	enqueueTaskUpdate,
} from "./lib/calendar-sync";
import type { Note, Task } from "./lib/db";
import {
	completeTaskWithChildren,
	createNote,
	createSubtask,
	createTask,
	moveTask as dbMoveTask,
	deleteNote,
	deleteTask,
	getSetting,
	getStreak,
	listNotes,
	listTodayTasks,
	localDatetime,
	setSetting,
	toggleTask,
	uncompleteTask,
	updateNoteContent,
	updateNoteTitle,
	updateTaskNotes,
	updateTaskPriority,
	updateTaskTags,
	updateTaskText,
} from "./lib/db";
import i18n from "./lib/i18n";
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

	/* License / Pro */
	isPro: boolean;
	licenseState: "unknown" | "active" | "none";
	checkLicense: () => Promise<void>;
	activateLicense: (key: string) => Promise<boolean>;
	deactivateLicense: () => Promise<void>;

	/* Onboarding */
	onboardingDone: boolean;
	setOnboardingDone: () => void;

	/* Keybindings */
	keybindings: Record<string, string>;
	loadKeybindings: () => Promise<void>;
	setKeybinding: (action: string, binding: string) => Promise<void>;

	/* Theme */
	theme: "dark" | "light" | "system";
	themePreset: "midnight" | "aurora" | "sepia" | "evergreen" | "monochrome";
	setTheme: (theme: "dark" | "light" | "system") => Promise<void>;
	setThemePreset: (
		preset: "midnight" | "aurora" | "sepia" | "evergreen" | "monochrome",
	) => Promise<void>;

	/* Locale */
	locale: string;
	setLocale: (locale: string) => Promise<void>;
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

	isPro: false,
	licenseState: "unknown",

	onboardingDone: false,

	theme: "system",
	themePreset: "midnight",
	locale: "en",

	keybindings: {
		focusTaskInput: "n",
		search: "ctrl+f",
		toggleWindow: "ctrl+shift+space",
		togglePomodoro: "ctrl+shift+p",
		arrowUp: "arrowup",
		arrowDown: "arrowdown",
		editTask: "e",
		deleteTask: "delete",
		openShortcuts: "?",
	},

	loadKeybindings: async () => {
		try {
			const store = await load("keybindings.json");
			const saved = await store.get<Record<string, string>>("bindings");
			if (saved) {
				set((s) => ({ keybindings: { ...s.keybindings, ...saved } }));
			}
		} catch {
			// defaults are fine
		}
	},

	setKeybinding: async (action, binding) => {
		set((s) => ({ keybindings: { ...s.keybindings, [action]: binding } }));
		try {
			const store = await load("keybindings.json");
			const saved = (await store.get<Record<string, string>>("bindings")) || {};
			saved[action] = binding;
			await store.set("bindings", saved);
			await store.save();
		} catch {
			// silently fail persistence
		}
	},

	loadTasks: async () => {
		set({ loading: true });
		try {
			const [
				tasks,
				soundVal,
				streak,
				workDur,
				breakDur,
				onboardingDoneVal,
				themeVal,
				themePresetVal,
				localeVal,
			] = await Promise.all([
				listTodayTasks(),
				getSetting("sound_enabled"),
				getStreak(),
				getSetting("pomodoro_work"),
				getSetting("pomodoro_break"),
				getSetting("onboarding_done"),
				getSetting("theme"),
				getSetting("theme_preset"),
				getSetting("locale"),
			]);
			const workDuration = workDur ? parseInt(workDur, 10) : 1500;
			const breakDuration = breakDur ? parseInt(breakDur, 10) : 300;
			const storedTheme = localStorage.getItem("focustap-theme") as
				| "dark"
				| "light"
				| "system"
				| null;
			const theme =
				(storedTheme as "dark" | "light" | "system") ||
				(themeVal as "dark" | "light" | "system") ||
				"system";
			const storedPreset = localStorage.getItem("focustap-theme-preset") as
				| "midnight"
				| "aurora"
				| "sepia"
				| "evergreen"
				| "monochrome"
				| null;
			const themePreset =
				(storedPreset as
					| "midnight"
					| "aurora"
					| "sepia"
					| "evergreen"
					| "monochrome") ||
				(themePresetVal as
					| "midnight"
					| "aurora"
					| "sepia"
					| "evergreen"
					| "monochrome") ||
				"midnight";
			const locale = localeVal || "en";
			set({
				tasks,
				loading: false,
				newTaskId: null,
				soundEnabled: soundVal !== "false",
				streak,
				pomodoroWorkDuration: workDuration,
				pomodoroBreakDuration: breakDuration,
				pomodoroTimeRemaining: workDuration,
				onboardingDone: onboardingDoneVal === "true",
				theme,
				themePreset,
				locale,
			});
			// Apply theme preset on load
			const root = document.documentElement;
			root.classList.remove(
				"theme-midnight",
				"theme-aurora",
				"theme-sepia",
				"theme-evergreen",
				"theme-monochrome",
			);
			root.classList.add(`theme-${themePreset}`);
			// Apply theme mode on load
			if (theme === "light") {
				root.classList.add("light");
			} else if (theme === "system") {
				const prefersLight = window.matchMedia(
					"(prefers-color-scheme: light)",
				).matches;
				root.classList.toggle("light", prefersLight);
			} else {
				root.classList.remove("light");
			}
			const storedAccent = localStorage.getItem("focustap-accent");
			if (storedAccent) {
				root.style.setProperty("--accent-primary", storedAccent);
				root.style.setProperty("--accent-hover", `${storedAccent}cc`);
				root.style.setProperty("--accent-subtle", `${storedAccent}26`);
			}
			// Apply locale on load
			if (locale !== "en") {
				try {
					const { default: i18n } = await import("./lib/i18n");
					i18n.changeLanguage(locale);
				} catch {
					// i18n not ready
				}
			}
			// Check license on startup
			get().checkLicense();
			trackEvent("app_opened");
		} catch (e) {
			console.error("Failed to load tasks", e);
			showToast(i18n.t("errors.load_tasks"));
			set({ loading: false });
		}
	},

	addTask: async (text?: string, priority?: number, tags?: string) => {
		try {
			const id = await createTask(text?.trim() || "", priority, tags);
			const now = localDatetime();
			const nowDate = now.slice(0, 10);
			const newTask: Task = {
				id,
				text: text?.trim() || "",
				is_done: false,
				created_at: now,
				completed_at: null,
				priority: priority || 0,
				tags: tags || "",
				sort_order: 0,
				recurrence: "",
				notes: "",
				parent_id: null,
				task_date: nowDate,
				time_block_id: null,
			};
			set((state) => ({
				tasks: [...state.tasks, newTask],
				newTaskId: id,
			}));
			enqueueTaskCreate(id, text?.trim() || "", nowDate).catch(() => {});
			trackEvent("task_created");
			showToast(i18n.t("toast.task_added"), "success");
		} catch (e) {
			console.error("Failed to create task", e);
			showToast(i18n.t("errors.add_task"));
		}
	},

	updateText: async (id, text) => {
		try {
			await updateTaskText(id, text);
			set((state) => ({
				tasks: state.tasks.map((t) => (t.id === id ? { ...t, text } : t)),
			}));
			enqueueTaskUpdate(id, { title: text }).catch(() => {});
		} catch (e) {
			console.error("Failed to update task", e);
			showToast(i18n.t("errors.update_task"));
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
								completed_at: t.is_done ? null : localDatetime(),
							}
						: t,
				),
			}));
			// Play chime when task is completed
			if (becomingDone && get().soundEnabled) {
				playChime();
			}
			if (becomingDone) {
				trackEvent("task_completed");
			}
			// Refresh streak after toggling
			const streak = await getStreak();
			set({ streak });
		} catch (e) {
			console.error("Failed to toggle task", e);
			showToast(i18n.t("errors.toggle_task"));
		}
	},

	remove: async (id) => {
		try {
			await deleteTask(id);
			set((state) => ({
				tasks: state.tasks.filter((t) => t.id !== id),
			}));
			enqueueTaskDelete(id).catch(() => {});
			trackEvent("task_deleted");
		} catch (e) {
			console.error("Failed to delete task", e);
			showToast("Could not delete task");
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
			showToast(i18n.t("errors.set_priority"));
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
			showToast(i18n.t("errors.set_tags"));
		}
	},

	moveTask: async (id, direction) => {
		try {
			await dbMoveTask(id, direction);
			await get().loadTasks();
		} catch (e) {
			console.error("Failed to move task", e);
			showToast(i18n.t("errors.reorder_task"));
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
			showToast(i18n.t("errors.save_notes"));
		}
	},

	/* Subtasks */
	setSelectedTaskId: (id) => set({ selectedTaskId: id }),

	addSubtask: async (parentId) => {
		try {
			const id = await createSubtask(parentId);
			const now = localDatetime();
			const nowDate = now.slice(0, 10);
			const newSub: Task = {
				id,
				text: "",
				is_done: false,
				created_at: now,
				completed_at: null,
				priority: 0,
				tags: "",
				sort_order: 0,
				recurrence: "",
				notes: "",
				parent_id: parentId,
				task_date: nowDate,
				time_block_id: null,
			};
			set((state) => ({
				tasks: [...state.tasks, newSub],
				newTaskId: id,
			}));
		} catch (e) {
			console.error("Failed to create subtask", e);
			showToast(i18n.t("errors.create_subtask"));
		}
	},

	toggleWithChildren: async (id) => {
		try {
			const task = get().tasks.find((t) => t.id === id);
			if (!task) return;
			const becomingDone = !task.is_done;
			if (becomingDone) {
				const { parentAutoCompleted } = await completeTaskWithChildren(id);
				const now = localDatetime();
				set((state) => ({
					tasks: state.tasks.map((t) => {
						if (t.id === id) return { ...t, is_done: true, completed_at: now };
						if (parentAutoCompleted && t.id === task.parent_id)
							return { ...t, is_done: true, completed_at: now };
						return t;
					}),
				}));
			} else {
				await uncompleteTask(id);
				set((state) => ({
					tasks: state.tasks.map((t) => {
						if (t.id === id)
							return { ...t, is_done: false, completed_at: null };
						if (t.id === task.parent_id)
							return { ...t, is_done: false, completed_at: null };
						return t;
					}),
				}));
			}
			const streak = await getStreak();
			set({ streak });
			if (becomingDone && get().soundEnabled) {
				playChime();
			}
		} catch (e) {
			console.error("Failed to toggle with children", e);
			showToast(i18n.t("errors.toggle_task"));
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
			showToast(i18n.t("errors.create_note"));
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
			showToast(i18n.t("errors.update_note_title"));
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
			showToast(i18n.t("errors.save_note"));
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
			showToast(i18n.t("errors.delete_note"));
		}
	},

	/* Pomodoro */
	pomodoroStart: (taskId) => {
		const state = get();
		const nextPhase: PomodoroPhase =
			state.pomodoroPhase === "idle" || state.pomodoroPhase === "break"
				? "work"
				: "break";
		set({
			pomodoroPhase: nextPhase,
			pomodoroTimeRemaining:
				nextPhase === "work"
					? state.pomodoroWorkDuration
					: state.pomodoroBreakDuration,
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
			const nextPhase: PomodoroPhase =
				state.pomodoroPhase === "work" ? "break" : "work";
			set({
				pomodoroPhase: nextPhase,
				pomodoroTimeRemaining:
					nextPhase === "work"
						? state.pomodoroWorkDuration
						: state.pomodoroBreakDuration,
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

	/* License */
	checkLicense: async () => {
		try {
			const state = await bootstrapState();
			set({
				isPro: state.isValid && state.isActivated,
				licenseState: state.isValid ? "active" : "none",
			});
		} catch {
			set({ isPro: false, licenseState: "none" });
		}
	},

	activateLicense: async (key) => {
		try {
			const state = await activateAndGetState(key);
			const active = state.isValid && state.isActivated;
			set({ isPro: active, licenseState: active ? "active" : "none" });
			if (active) {
				trackEvent("license_activated", { plan: state.planKey ?? "pro" });
				showToast(i18n.t("toast.pro_activated"), "success");
			}
			return active;
		} catch {
			showToast(i18n.t("errors.license_activation_failed"));
			return false;
		}
	},

	deactivateLicense: async () => {
		try {
			await deactivateLicensePlugin();
		} catch (e) {
			console.error("License deactivation failed:", e);
			showToast(i18n.t("errors.deactivate_license"));
		}
		set({ isPro: false, licenseState: "none" });
	},

	/* Onboarding */
	setOnboardingDone: () => {
		set({ onboardingDone: true });
		setSetting("onboarding_done", "true");
	},

	/* Theme */
	setTheme: async (theme) => {
		set({ theme });
		try {
			localStorage.setItem("focustap-theme", theme);
		} catch {}
		try {
			await setSetting("theme", theme);
		} catch {
			// non-critical
		}
		// Apply to DOM
		const root = document.documentElement;
		if (theme === "dark") {
			root.classList.remove("light");
		} else if (theme === "light") {
			root.classList.add("light");
		} else {
			// system
			const prefersLight = window.matchMedia(
				"(prefers-color-scheme: light)",
			).matches;
			root.classList.toggle("light", prefersLight);
		}
	},

	setThemePreset: async (preset) => {
		set({ themePreset: preset });
		try {
			localStorage.setItem("focustap-theme-preset", preset);
		} catch {}
		try {
			await setSetting("theme_preset", preset);
		} catch {
			// non-critical
		}
		const root = document.documentElement;
		root.classList.remove(
			"theme-midnight",
			"theme-aurora",
			"theme-sepia",
			"theme-evergreen",
			"theme-monochrome",
		);
		root.classList.add(`theme-${preset}`);
	},

	/* Locale */
	setLocale: async (locale) => {
		set({ locale });
		try {
			await setSetting("locale", locale);
		} catch {
			// non-critical
		}
		try {
			const { default: i18n } = await import("./lib/i18n");
			i18n.changeLanguage(locale);
		} catch {
			// i18n not initialized yet
		}
	},
}));
