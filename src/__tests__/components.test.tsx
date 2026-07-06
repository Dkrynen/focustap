import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { TaskInput } from "../components/TaskInput";
import { useTaskStore } from "../store";

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

describe("TaskInput", () => {
	it("renders input with placeholder", () => {
		render(<TaskInput />);
		const input = screen.getByPlaceholderText(/task\.input_placeholder/i);
		expect(input).toBeInTheDocument();
	});

	it("clears input after pressing Enter with text", async () => {
		// addTask is async but fails silently outside Tauri
		render(<TaskInput />);
		const input = screen.getByPlaceholderText(/task\.input_placeholder/i);
		fireEvent.change(input, { target: { value: "test task" } });
		expect(input).toHaveValue("test task");

		fireEvent.keyDown(input, { key: "Enter" });
		// Input should be cleared after submit
		expect(input).toHaveValue("");
	});

	it("does not submit empty text on Enter", () => {
		render(<TaskInput />);
		const input = screen.getByPlaceholderText(/task\.input_placeholder/i);
		fireEvent.keyDown(input, { key: "Enter" });
		expect(input).toHaveValue("");
	});

	it("clears text on Escape", () => {
		render(<TaskInput />);
		const input = screen.getByPlaceholderText(/task\.input_placeholder/i);
		fireEvent.change(input, { target: { value: "something" } });
		fireEvent.keyDown(input, { key: "Escape" });
		expect(input).toHaveValue("");
	});
});

describe("PomodoroTimer", () => {
	it("renders timer label when idle", async () => {
		const { PomodoroTimer } = await import("../components/PomodoroTimer");
		render(<PomodoroTimer />);
		expect(screen.getByText("pomodoro.phase_idle")).toBeInTheDocument();
	});

	it("shows start button when idle", async () => {
		const { PomodoroTimer } = await import("../components/PomodoroTimer");
		render(<PomodoroTimer />);
		expect(screen.getByTitle("pomodoro.start")).toBeInTheDocument();
	});

	it("shows pause button when running", async () => {
		useTaskStore.setState({ pomodoroPhase: "work" });
		const { PomodoroTimer } = await import("../components/PomodoroTimer");
		render(<PomodoroTimer />);
		expect(screen.getByTitle("pomodoro.pause")).toBeInTheDocument();
	});

	it("shows Focus label during work phase", async () => {
		useTaskStore.setState({ pomodoroPhase: "work" });
		const { PomodoroTimer } = await import("../components/PomodoroTimer");
		render(<PomodoroTimer />);
		expect(screen.getByText("pomodoro.phase_work")).toBeInTheDocument();
	});

	it("shows Break label during break phase", async () => {
		useTaskStore.setState({ pomodoroPhase: "break" });
		const { PomodoroTimer } = await import("../components/PomodoroTimer");
		render(<PomodoroTimer />);
		expect(screen.getByText("pomodoro.phase_break")).toBeInTheDocument();
	});

	it("displays formatted time", async () => {
		const { PomodoroTimer } = await import("../components/PomodoroTimer");
		render(<PomodoroTimer />);
		expect(screen.getByText("25:00")).toBeInTheDocument();
	});
});

describe("Toast", () => {
	it("ToastProvider renders children", async () => {
		const { ToastProvider } = await import("../components/Toast");
		render(
			<ToastProvider>
				<div>child content</div>
			</ToastProvider>,
		);
		expect(screen.getByText("child content")).toBeInTheDocument();
	});
});
