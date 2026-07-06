import { getCurrentWindow } from "@tauri-apps/api/window";
import {
	Download,
	FileText,
	Search,
	Settings,
	Table,
	Upload,
	Archive,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AuthPage } from "./components/AuthPage";
import { CalendarView } from "./components/CalendarView";
import { DayPlanner } from "./components/DayPlanner";
import { NotesPanel } from "./components/NotesPanel";
import { Onboarding } from "./components/Onboarding";
import { PomodoroTimer } from "./components/PomodoroTimer";
import { SettingsPanel } from "./components/SettingsPanel";
import { ShortcutOverlay } from "./components/ShortcutOverlay";
import { Sidebar, type View } from "./components/Sidebar";
import { TaskDetail } from "./components/TaskDetail";
import { TaskInput } from "./components/TaskInput";
import { TaskList } from "./components/TaskList";
import { TaskSearch } from "./components/TaskSearch";

import { initAnalytics } from "./lib/analytics";
import { useAuthStore } from "./lib/auth-store";
import { exportToCSVFile, exportToMarkdownFile } from "./lib/export";
import { flushQueue, onOnlineChange, subscribeWorkspace } from "./lib/sync";
import { useWorkspaceStore } from "./lib/workspace-store";
import {
	buildWorkspaceExport,
	downloadBlob,
	exportToJSON,
	exportToMarkdown as exportWorkspaceMD,
} from "./lib/workspace-export";
import { importFromGoogleCalendar } from "./lib/calendar-import";
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
	const { workspaces, activeWorkspaceId, setActiveWorkspace } =
		useWorkspaceStore();
	const [mounted, setMounted] = useState(false);
	const [activeView, setActiveView] = useState<View>("today");
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [shortcutOverlayOpen, setShortcutOverlayOpen] = useState(false);
	const [exportOpen, setExportOpen] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	const exportOpenRef = useRef(false);
	const shortcutOverlayOpenRef = useRef(false);
	const settingsOpenRef = useRef(false);
	const searchRef = useRef<HTMLInputElement>(null);

	// Keep refs in sync
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
				if (searchOpen) {
					setSearchOpen(false);
					return;
				}
			}

			if (
				keybindings.toggleWindow &&
				pressedBinding === keybindings.toggleWindow
			) {
				e.preventDefault();
				getCurrentWindow().hide();
				return;
			}

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
				setSearchOpen(true);
				setTimeout(() => searchRef.current?.focus(), 50);
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
	}, [searchOpen]);

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
			className={`h-full flex bg-surface-primary ${mounted ? "animate-fade-in" : "opacity-0"}`}
		>
			{/* Sidebar */}
			<Sidebar
				activeView={activeView}
				onViewChange={setActiveView}
				workspaces={workspaces}
				activeWorkspaceId={activeWorkspaceId}
				onWorkspaceChange={setActiveWorkspace}
			/>

			{/* Main area */}
			<div className="flex-1 flex flex-col min-w-0">
				{/* Top bar */}
				<div className="flex items-center gap-2 px-4 pt-3 pb-2 select-none">
					{activeView === "today" || activeView === "inbox" ? (
						<>
							<span className="text-xs font-medium text-text-quaternary uppercase tracking-wider">
								{activeView === "today" ? "Today" : "Inbox"}
							</span>
							{streak > 0 && (
								<span className="text-[11px] text-[#eab308]">{streak}🔥</span>
							)}
							{isPro && (
								<span className="text-[10px] font-medium text-accent-primary ml-auto">
									{t("license.pro_badge")}
								</span>
							)}
						</>
					) : (
						<span className="text-xs font-medium text-text-quaternary uppercase tracking-wider">
							{activeView === "upcoming"
								? t("day_planner.title")
								: activeView === "notes"
									? t("notes.title")
									: "Calendar"}
						</span>
					)}

					<div className="ml-auto flex items-center gap-1">
						{/* Search toggle */}
						<button
							type="button"
							onClick={() => setSearchOpen(!searchOpen)}
							className="text-text-quaternary hover:text-text-primary transition-colors cursor-pointer p-1"
							title={t("common.search")}
						>
							<Search size={15} />
						</button>

						{/* Export */}
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
								<div className="absolute right-0 top-full mt-1 w-[160px] bg-surface-deep border border-border-subtle rounded-[10px] shadow-xl z-50 overflow-hidden">
									<div className="px-3 pt-2 pb-1 text-[10px] text-text-quaternary uppercase tracking-wider font-medium">
										Tasks
									</div>
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
									<div className="border-t border-border-subtle my-1" />
									<div className="px-3 pt-1 pb-1 text-[10px] text-text-quaternary uppercase tracking-wider font-medium">
										Workspace
									</div>
									<button
										type="button"
										onClick={() => {
											setExportOpen(false);
											const state = useTaskStore.getState();
											const wsState = useWorkspaceStore.getState();
											const ws = wsState.workspaces.find((w) => w.id === wsState.activeWorkspaceId);
											const data = buildWorkspaceExport(
												ws?.name || "Workspace",
												ws?.id || "local",
												state.tasks,
												state.notes.map((n: { id: number; title: string; content: string; tags?: string }) => ({
													id: n.id,
													title: n.title,
													content: n.content,
													tags: n.tags || "",
												})),
											);
											const json = exportToJSON(data);
											const date = new Date().toLocaleDateString("en-CA");
											downloadBlob(json, `focustap-workspace-${date}.json`, "application/json");
										}}
										className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-accent-subtle hover:text-text-primary transition-colors cursor-pointer"
									>
										<Archive size={12} /> Export JSON
									</button>
									<button
										type="button"
										onClick={() => {
											setExportOpen(false);
											const state = useTaskStore.getState();
											const wsState = useWorkspaceStore.getState();
											const ws = wsState.workspaces.find((w) => w.id === wsState.activeWorkspaceId);
											const data = buildWorkspaceExport(
												ws?.name || "Workspace",
												ws?.id || "local",
												state.tasks,
												state.notes.map((n: { id: number; title: string; content: string; tags?: string }) => ({
													id: n.id,
													title: n.title,
													content: n.content,
													tags: n.tags || "",
												})),
											);
											const md = exportWorkspaceMD(data);
											const date = new Date().toLocaleDateString("en-CA");
											downloadBlob(md, `focustap-workspace-${date}.md`, "text/markdown");
										}}
										className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-accent-subtle hover:text-text-primary transition-colors cursor-pointer"
									>
										<FileText size={12} /> Export Markdown
									</button>
								</div>
							)}
						</div>

						{/* Calendar import (only when calendar view is active) */}
						{activeView === "calendar" && (
							<>
								<button
									type="button"
									onClick={() => document.getElementById("calendar-csv-input")?.click()}
									className="text-text-quaternary hover:text-accent-primary transition-colors cursor-pointer p-1"
									title="Import Google Calendar CSV"
								>
									<Upload size={15} />
								</button>
								<input
									id="calendar-csv-input"
									type="file"
									accept=".csv"
									className="hidden"
									onChange={(e) => {
										const file = e.target.files?.[0];
										if (!file) return;
										const reader = new FileReader();
										reader.onload = (ev) => {
											const raw = ev.target?.result as string;
											if (!raw) return;
											const addTask = useTaskStore.getState().addTask;
											const result = importFromGoogleCalendar(raw, (task) => {
												addTask(task.text, task.task_date ? 0 : undefined, task.tags || undefined);
											});
											alert(`Imported ${result.imported} of ${result.total} events as tasks.`);
										};
										reader.readAsText(file);
										// Reset so the same file can be re-imported
										e.target.value = "";
									}}
								/>
							</>
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

				{/* Search bar (expandable) */}
				{searchOpen && (
					<div className="px-4 pb-2">
						<TaskSearch
							inputRef={searchRef as React.RefObject<HTMLInputElement | null>}
							onSearchActive={() => {}}
						/>
					</div>
				)}

				{/* Pomodoro timer — always visible */}
				<div className="px-4 pb-2">
					<PomodoroTimer />
				</div>

				{/* Active view */}
				<div className="flex flex-col flex-1 px-4 pb-4 min-h-0 gap-2">
					{(activeView === "today" || activeView === "inbox") && (
						<>
							{!searchOpen && <TaskInput />}
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
						</>
					)}
				</div>
			</div>

			{/* Panels (slide-ins) */}
			{activeView === "upcoming" && (
				<DayPlanner open onClose={() => setActiveView("today")} />
			)}
			{activeView === "notes" && (
				<NotesPanel />
			)}
			{activeView === "calendar" && (
				<CalendarView open onClose={() => setActiveView("today")} />
			)}

			{/* Onboarding */}
			{!loading && !onboardingDone && !settingsOpen && (
				<Onboarding onComplete={setOnboardingDone} />
			)}

			{/* Settings — always slide-in */}
			<SettingsPanel
				open={settingsOpen}
				onClose={() => setSettingsOpen(false)}
			/>
			<TaskDetail />
			<ShortcutOverlay
				open={shortcutOverlayOpen}
				onClose={() => setShortcutOverlayOpen(false)}
			/>
		</div>
	);
}

export default App;
