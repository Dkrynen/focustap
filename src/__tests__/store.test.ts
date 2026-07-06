import { beforeEach, describe, expect, it } from "vitest";
import { useTaskStore } from "../store";

// Reset store state between tests
beforeEach(() => {
	useTaskStore.setState({
		tasks: [],
		notes: [],
		selectedTaskId: null,
		activeTaskIndex: -1,
		searchQuery: "",
		settingsOpen: false,
		notesPanelOpen: false,
		soundEnabled: true,
		pomodoroPhase: "idle",
		pomodoroTimeRemaining: 1500,
		pomodoroWorkDuration: 1500,
		pomodoroBreakDuration: 300,
		pomodoroActiveTaskId: null,
		isPro: false,
		licenseState: "unknown",
		onboardingDone: false,
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
	});
});

describe("TaskStore", () => {
	it("should initialize with default values", () => {
		const state = useTaskStore.getState();
		expect(state.tasks).toEqual([]);
		expect(state.loading).toBe(true);
		expect(state.pomodoroPhase).toBe("idle");
		expect(state.isPro).toBe(false);
	});

	/* ── UI state ── */

	it("should set search query", () => {
		useTaskStore.getState().setSearchQuery("test");
		expect(useTaskStore.getState().searchQuery).toBe("test");
	});

	it("should toggle settings panel", () => {
		expect(useTaskStore.getState().settingsOpen).toBe(false);
		useTaskStore.getState().setSettingsOpen(true);
		expect(useTaskStore.getState().settingsOpen).toBe(true);
	});

	it("should toggle notes panel", () => {
		expect(useTaskStore.getState().notesPanelOpen).toBe(false);
		useTaskStore.getState().setNotesPanelOpen(true);
		expect(useTaskStore.getState().notesPanelOpen).toBe(true);
	});

	it("should manage active task index", () => {
		const store = useTaskStore.getState();
		expect(store.activeTaskIndex).toBe(-1);
		store.setActiveTaskIndex(2);
		expect(useTaskStore.getState().activeTaskIndex).toBe(2);
	});

	it("should manage selected task id", () => {
		const store = useTaskStore.getState();
		store.setSelectedTaskId(42);
		expect(useTaskStore.getState().selectedTaskId).toBe(42);
		store.setSelectedTaskId(null);
		expect(useTaskStore.getState().selectedTaskId).toBeNull();
	});

	/* ── Pomodoro edge cases ── */

	it("should handle pomodoro start/stop cycle", () => {
		const store = useTaskStore.getState();
		expect(store.pomodoroPhase).toBe("idle");

		store.pomodoroStart();
		expect(useTaskStore.getState().pomodoroPhase).toBe("work");

		store.pomodoroPause();
		expect(useTaskStore.getState().pomodoroPhase).toBe("idle");
	});

	it("should handle pomodoro tick", () => {
		const store = useTaskStore.getState();
		store.pomodoroStart();
		const initial = useTaskStore.getState().pomodoroTimeRemaining;

		useTaskStore.getState().pomodoroTick();
		expect(useTaskStore.getState().pomodoroTimeRemaining).toBe(initial - 1);
	});

	it("should not tick when pomodoro is idle", () => {
		useTaskStore.getState().pomodoroTick();
		expect(useTaskStore.getState().pomodoroTimeRemaining).toBe(1500);
	});

	it("should auto-switch from work to break on timer expiry", () => {
		const store = useTaskStore.getState();
		store.pomodoroStart();

		// Set remaining to 1 so next tick triggers phase switch
		useTaskStore.setState({ pomodoroTimeRemaining: 1 });
		useTaskStore.getState().pomodoroTick();

		const state = useTaskStore.getState();
		expect(state.pomodoroPhase).toBe("break");
		expect(state.pomodoroTimeRemaining).toBe(300);
	});

	it("should auto-switch from break to work on timer expiry", () => {
		useTaskStore.setState({
			pomodoroPhase: "break",
			pomodoroTimeRemaining: 1,
			pomodoroBreakDuration: 300,
		});
		useTaskStore.getState().pomodoroTick();

		const state = useTaskStore.getState();
		expect(state.pomodoroPhase).toBe("work");
		expect(state.pomodoroTimeRemaining).toBe(1500);
	});

	it("should reset pomodoro to idle with full work duration", () => {
		useTaskStore.setState({
			pomodoroPhase: "work",
			pomodoroTimeRemaining: 700,
			pomodoroActiveTaskId: 5,
		});
		useTaskStore.getState().pomodoroReset();

		const state = useTaskStore.getState();
		expect(state.pomodoroPhase).toBe("idle");
		expect(state.pomodoroTimeRemaining).toBe(1500);
		expect(state.pomodoroActiveTaskId).toBeNull();
	});

	it("pomodoroStart toggles to work from idle and to break from work", () => {
		useTaskStore.getState().pomodoroStart();
		expect(useTaskStore.getState().pomodoroPhase).toBe("work");

		useTaskStore.getState().pomodoroStart();
		expect(useTaskStore.getState().pomodoroPhase).toBe("break");
	});

	/* ── Pomodoro duration ── */

	it("setPomodoroWorkDuration updates duration and resets timer when idle", () => {
		useTaskStore.getState().setPomodoroWorkDuration(1800);
		const state = useTaskStore.getState();
		expect(state.pomodoroWorkDuration).toBe(1800);
		expect(state.pomodoroTimeRemaining).toBe(1800);
	});

	it("setPomodoroBreakDuration updates break duration", () => {
		useTaskStore.getState().setPomodoroBreakDuration(600);
		expect(useTaskStore.getState().pomodoroBreakDuration).toBe(600);
	});

	/* ── Onboarding ── */

	it("should set onboarding done", () => {
		useTaskStore.getState().setOnboardingDone();
		expect(useTaskStore.getState().onboardingDone).toBe(true);
	});

	/* ── Keybindings (sync only — persistence requires Tauri store) ── */

	it("has default keybindings", () => {
		const state = useTaskStore.getState();
		expect(state.keybindings.focusTaskInput).toBe("n");
		expect(state.keybindings.search).toBe("ctrl+f");
		expect(state.keybindings.toggleWindow).toBe("ctrl+shift+space");
	});

	it("setKeybinding updates binding in memory", () => {
		useTaskStore.getState().setKeybinding("focusTaskInput", "ctrl+n");
		expect(useTaskStore.getState().keybindings.focusTaskInput).toBe("ctrl+n");
	});

	/* ── Sound ── */

	it("setSoundEnabled updates state", () => {
		useTaskStore.getState().setSoundEnabled(false);
		expect(useTaskStore.getState().soundEnabled).toBe(false);
	});
});
