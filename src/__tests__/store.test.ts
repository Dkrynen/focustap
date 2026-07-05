import { describe, it, expect, beforeEach } from "vitest";
import { useTaskStore } from "../store";

// Reset store state between tests (don't override loading — it's set by initial state)
beforeEach(() => {
  useTaskStore.setState({
    tasks: [],
    notes: [],
    pomodoroPhase: "idle",
    pomodoroTimeRemaining: 1500,
    pomodoroWorkDuration: 1500,
    pomodoroBreakDuration: 300,
    isPro: false,
    licenseState: "unknown",
    onboardingDone: false,
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

  it("should set onboarding done", () => {
    useTaskStore.getState().setOnboardingDone();
    expect(useTaskStore.getState().onboardingDone).toBe(true);
  });
});
