import { getCurrentWindow } from "@tauri-apps/api/window";
import {
	BarChart3,
	BrainCircuit,
	Calendar,
	Clock,
	Download,
	Edit3,
	FileText,
	ListChecks,
	Settings,
	Table,
	Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AuthPage } from "./components/AuthPage";
import { CalendarView } from "./components/CalendarView";
import { DayPlanner } from "./components/DayPlanner";
import { FocusAnalytics } from "./components/FocusAnalytics";
import { NotesPanel } from "./components/NotesPanel";
import { Onboarding } from "./components/Onboarding";
import { PomodoroTimer } from "./components/PomodoroTimer";
import { SettingsPanel } from "./components/SettingsPanel";
import { ShortcutOverlay } from "./components/ShortcutOverlay";
import { StatisticsPanel } from "./components/StatisticsPanel";
import { TaskDetail } from "./components/TaskDetail";
import { TaskInput } from "./components/TaskInput";
import { TaskList } from "./components/TaskList";
import { TaskSearch } from "./components/TaskSearch";
import { WorkspacePanel } from "./components/WorkspacePanel";
import { initAnalytics } from "./lib/analytics";
import { useAuthStore } from "./lib/auth-store";
import { exportToCSVFile, exportToMarkdownFile } from "./lib/export";
import { flushQueue, onOnlineChange, subscribeWorkspace } from "./lib/sync";
import { useWorkspaceStore } from "./lib/workspace-store";
import { useTaskStore } from "./store";

function App() {
	const { t } = useTranslation();
	const {
		tasks,
		loading,
		newTaskId,
		loadTasks,
		updateText,
		remove,
		streak,
		isPro,
		theme,
		onboardingDone,
		setOnboardingDone,
		loadKeybindings,
	} = useTaskStore();
	const { user, initialized: authInitialized, checkSession } = useAuthStore();
	const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
	const [mounted, setMounted] = useState(false);
	const [statsOpen, setStatsOpen] = useState(false);
	const [calendarOpen, setCalendarOpen] = useState(false);
	const [dayPlannerOpen, setDayPlannerOpen] = useState(false);
	const [focusOpen, setFocusOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [shortcutOverlayOpen, setShortcutOverlayOpen] = useState(false);
	const [workspaceOpen, setWorkspaceOpen] = useState(false);
	const [exportOpen, setExportOpen] = useState(false);
	const exportOpenRef = useRef(false);
	const shortcutOverlayOpenRef = useRef(false);
	const settingsOpenRef = useRef(false);
	const searchRef = useRef<HTMLInputElement>(null);
	const [userMenuOpen, setUserMenuOpen] = useState(false);
	const userMenuRef = useRef<HTMLDivElement>(null);

	// Keep refs in sync with state
	useEffect(() => {
		exportOpenRef.current = exportOpen;
	}, [exportOpen]);
	useEffect(() => {
		shortcutOverlayOpenRef.current = shortcutOverlayOpen;
	}, [shortcutOverlayOpen]);
	useEffect(() => {
		settingsOpenRef.current = settingsOpen;
	}, [settingsOpen]);

	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (
				userMenuOpen &&
				userMenuRef.current &&
				!userMenuRef.current.contains(e.target as Node)
			) {
				setUserMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [userMenuOpen]);

	useEffect(() => {
		checkSession();
	}, [checkSession]);

	useEffect(() => {
		const unsub = onOnlineChange((online) => {
			if (online) flushQueue();
		});
		return unsub;
	}, []);

	useEffect(() => {
		if (!activeWorkspaceId) return;
		const unsub = subscribeWorkspace(
			activeWorkspaceId,
			() => {},
			() => {},
		);
		return unsub;
	}, [activeWorkspaceId]);

	useEffect(() => {
		loadTasks();
		loadKeybindings();
		initAnalytics();
		requestAnimationFrame(() => setMounted(true));
	}, [loadTasks, loadKeybindings]);

	useEffect(() => {
		const root = document.documentElement;
		// Apply stored theme preset
		const storedPreset = localStorage.getItem("focustap-theme-preset") as
			| "midnight"
			| "aurora"
			| "sepia"
			| "evergreen"
			| "monochrome"
			| null;
		if (storedPreset) {
			root.classList.remove(
				"theme-midnight",
				"theme-aurora",
				"theme-sepia",
				"theme-evergreen",
				"theme-monochrome",
			);
			root.classList.add(`theme-${storedPreset}`);
		}
		// Apply stored theme mode
		const stored = localStorage.getItem("focustap-theme") as
			| "dark"
			| "light"
			| "system"
			| null;
		if (stored === "light") {
			root.classList.add("light");
		} else if (stored === "dark") {
			root.classList.remove("light");
		} else if (stored === "system") {
			const prefersLight = window.matchMedia(
				"(prefers-color-scheme: light)",
			).matches;
			root.classList.toggle("light", prefersLight);
		}
		if (theme !== "system") return;
		const mq = window.matchMedia("(prefers-color-scheme: light)");
		const handler = (e: MediaQueryListEvent) => {
			document.documentElement.classList.toggle("light", e.matches);
		};
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, [theme]);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			const {
				tasks,
				activeTaskIndex,
				setActiveTaskIndex,
				setSelectedTaskId,
				remove,
				keybindings,
			} = useTaskStore.getState();
			const key = e.key.toLowerCase();
			const ctrl = e.ctrlKey || e.metaKey;

			// Build pressed binding string for modifier-aware comparison
			const pressedParts: string[] = [];
			if (ctrl) pressedParts.push("ctrl");
			if (e.shiftKey && key !== "shift") pressedParts.push("shift");
			if (!["control", "shift", "meta", "alt"].includes(key))
				pressedParts.push(key);
			const pressedBinding = pressedParts.join("+");

			if (key === "escape") {
				if (exportOpenRef.current) {
					setExportOpen(false);
					return;
				}
				if (shortcutOverlayOpenRef.current) {
					setShortcutOverlayOpen(false);
					return;
				}
				if (settingsOpenRef.current) {
					setSettingsOpen(false);
					return;
				}
			}

			// Toggle window (minimize/restore)
			if (
				keybindings.toggleWindow &&
				pressedBinding === keybindings.toggleWindow
			) {
				e.preventDefault();
				getCurrentWindow().hide();
				return;
			}

			// Arrow navigation (only when no panel is open and not in input)
			if (
				(key === "arrowup" || key === "arrowdown") &&
				!settingsOpenRef.current &&
				!exportOpenRef.current
			) {
				const tag = (e.target as HTMLElement)?.tagName;
				if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
				e.preventDefault();
				if (tasks.length === 0) return;
				const maxIdx = tasks.length - 1;
				if (key === "arrowup") {
					setActiveTaskIndex(
						activeTaskIndex <= 0 ? maxIdx : activeTaskIndex - 1,
					);
				} else {
					setActiveTaskIndex(
						activeTaskIndex >= maxIdx ? 0 : activeTaskIndex + 1,
					);
				}
				return;
			}

			if (
				keybindings.editTask &&
				pressedBinding === keybindings.editTask &&
				activeTaskIndex >= 0 &&
				activeTaskIndex < tasks.length
			) {
				e.preventDefault();
				setSelectedTaskId(tasks[activeTaskIndex].id);
				return;
			}

			if (
				keybindings.deleteTask &&
				pressedBinding === keybindings.deleteTask &&
				activeTaskIndex >= 0 &&
				activeTaskIndex < tasks.length
			) {
				e.preventDefault();
				const id = tasks[activeTaskIndex].id;
				remove(id);
				setActiveTaskIndex(Math.min(activeTaskIndex, tasks.length - 2));
				return;
			}

			if (keybindings.search && pressedBinding === keybindings.search) {
				e.preventDefault();
				searchRef.current?.focus();
				return;
			}

			if (
				keybindings.togglePomodoro &&
				pressedBinding === keybindings.togglePomodoro
			) {
				e.preventDefault();
				useTaskStore.getState().pomodoroStart();
				return;
			}

			if (
				keybindings.openShortcuts &&
				pressedBinding === keybindings.openShortcuts
			) {
				e.preventDefault();
				setShortcutOverlayOpen(true);
				return;
			}

			if (
				keybindings.focusTaskInput &&
				pressedBinding === keybindings.focusTaskInput
			) {
				document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
				return;
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, []);

	const requiresAuth = Boolean(import.meta.env.VITE_SUPABASE_URL);
	const showAuthWall = requiresAuth && authInitialized && !user;

	if (requiresAuth && !authInitialized) {
		return (
			<div className="h-full flex items-center justify-center bg-surface-primary">
				<div className="animate-spin w-5 h-5 border-2 border-accent-primary border-t-transparent rounded-full" />
			</div>
		);
	}

	if (showAuthWall) {
		return <AuthPage />;
	}

	return (
		<div
			className={`h-full flex flex-col bg-surface-primary ${mounted ? "animate-fade-in" : "opacity-0"}`}
		>
			{/* Header */}
			<div className="flex items-center gap-2 px-5 pt-4 pb-3 select-none">
				<ListChecks size={18} className="text-accent-primary" />
				<span className="text-sm font-medium text-text-secondary">
					{t("app.name")}
				</span>
				{streak > 0 && (
					<span className="text-[11px] text-[#eab308]">{streak}🔥</span>
				)}
				{isPro && (
					<span className="text-[10px] font-medium text-accent-primary ml-1">
						{t("license.pro_badge")}
					</span>
				)}

				{/* Toolbar */}
				<div className="ml-auto flex items-center gap-1">
					<button
						type="button"
						onClick={() => setStatsOpen(true)}
						className="text-text-quaternary hover:text-text-primary transition-colors cursor-pointer p-1"
						title={t("stats.title")}
					>
						<BarChart3 size={15} />
					</button>
					<button
						type="button"
						onClick={() => setCalendarOpen(true)}
						className="text-text-quaternary hover:text-text-primary transition-colors cursor-pointer p-1"
						title={t("calendar.today")}
					>
						<Calendar size={15} />
					</button>
					<button
						type="button"
						onClick={() => setDayPlannerOpen(true)}
						className="text-text-quaternary hover:text-text-primary transition-colors cursor-pointer p-1"
						title={t("day_planner.title")}
					>
						<Clock size={15} />
					</button>
					<button
						type="button"
						onClick={() => useTaskStore.getState().setNotesPanelOpen(true)}
						className="text-text-quaternary hover:text-text-primary transition-colors cursor-pointer p-1"
						title={t("notes.title")}
					>
						<Edit3 size={15} />
					</button>
					<button
						type="button"
						onClick={() => setFocusOpen(true)}
						className="text-text-quaternary hover:text-text-primary transition-colors cursor-pointer p-1"
						title={t("focus.title")}
					>
						<BrainCircuit size={15} />
					</button>
					<div className="relative">
						<button
							type="button"
							onClick={() => setExportOpen(!exportOpen)}
							className="text-text-quaternary hover:text-text-primary transition-colors cursor-pointer p-1"
							title={t("task.export.title")}
						>
							<Download size={15} />
						</button>
						{exportOpen && (
							<div className="absolute right-0 top-full mt-1 w-[130px] bg-surface-deep border border-border-subtle rounded-[6px] shadow-xl z-50 overflow-hidden">
								<button
									type="button"
									onClick={() => {
										setExportOpen(false);
										exportToMarkdownFile();
									}}
									className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-accent-subtle hover:text-text-primary transition-colors cursor-pointer"
								>
									<FileText size={12} /> {t("task.export.markdown")}
								</button>
								<button
									type="button"
									onClick={() => {
										setExportOpen(false);
										exportToCSVFile();
									}}
									className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-accent-subtle hover:text-text-primary transition-colors cursor-pointer"
								>
									<Table size={12} /> {t("task.export.csv")}
								</button>
							</div>
						)}
					</div>

					{/* Workspace */}
					{user && (
						<button
							type="button"
							onClick={() => setWorkspaceOpen(true)}
							className="text-text-quaternary hover:text-text-primary transition-colors cursor-pointer p-1"
							title={t("workspace.title")}
						>
							<Users size={15} />
						</button>
					)}

					<button
						type="button"
						onClick={() => setSettingsOpen(true)}
						className="text-text-quaternary hover:text-text-primary transition-colors cursor-pointer p-1"
						title={t("settings.title")}
					>
						<Settings size={16} />
					</button>
				</div>
			</div>

			{/* Pomodoro */}
			<div className="px-5 pb-2">
				<PomodoroTimer />
			</div>

			{/* Main */}
			<div className="flex flex-col flex-1 px-5 pb-5 min-h-0 gap-2">
				<TaskInput />
				<TaskSearch
					inputRef={searchRef as React.RefObject<HTMLInputElement | null>}
					onSearchActive={() => {}}
				/>

				{loading && (
					<div className="text-center py-6 text-text-quaternary text-xs">
						{t("common.loading")}
					</div>
				)}

				{!loading && (
					<TaskList
						tasks={tasks}
						onUpdateText={updateText}
						onDelete={remove}
						focusId={newTaskId}
						streak={streak}
					/>
				)}
			</div>

			{/* Onboarding */}
			{!loading && !onboardingDone && !settingsOpen && (
				<Onboarding onComplete={setOnboardingDone} />
			)}

			{/* Panels */}
			<SettingsPanel
				open={settingsOpen}
				onClose={() => setSettingsOpen(false)}
			/>
			<TaskDetail />
			<ShortcutOverlay
				open={shortcutOverlayOpen}
				onClose={() => setShortcutOverlayOpen(false)}
			/>
			<StatisticsPanel open={statsOpen} onClose={() => setStatsOpen(false)} />
			<CalendarView
				open={calendarOpen}
				onClose={() => setCalendarOpen(false)}
			/>
			<FocusAnalytics open={focusOpen} onClose={() => setFocusOpen(false)} />
			<NotesPanel />
			<DayPlanner
				open={dayPlannerOpen}
				onClose={() => setDayPlannerOpen(false)}
			/>
			<WorkspacePanel
				open={workspaceOpen}
				onClose={() => setWorkspaceOpen(false)}
			/>
		</div>
	);
}

export default App;
