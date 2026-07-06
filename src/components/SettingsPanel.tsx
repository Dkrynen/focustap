import { getVersion } from "@tauri-apps/api/app";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { check as checkUpdate } from "@tauri-apps/plugin-updater";
import {
	Database,
	Keyboard,
	KeyRound,
	Loader2,
	Monitor,
	Moon,
	RefreshCw,
	Shield,
	Sun,
	Volume2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { exportBackup, importBackup } from "../lib/backup";
import { playChime } from "../lib/sounds";
import { useTaskStore } from "../store";
import { LicenseActivation } from "./LicenseActivation";
import { showToast } from "./Toast";
import { CloseButton, SlideInPanel, Toggle } from "./primitives";
import { useFocusTrap } from "../hooks/useFocusTrap";

const FOCUS_RING =
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-primary)]";

interface SettingsPanelProps {
	open: boolean;
	onClose: () => void;
}

type Tab =
	| "general"
	| "license"
	| "updates"
	| "privacy"
	| "keybindings"
	| "theme"
	| "backup";

function UpdatesTab() {
	const { t } = useTranslation();
	const [checking, setChecking] = useState(false);
	const [status, setStatus] = useState<
		"idle" | "uptodate" | "available" | "error"
	>("idle");
	const [version, setVersion] = useState("");
	const [currentVersion, setCurrentVersion] = useState("0.1.0");

	useEffect(() => {
		getVersion()
			.then(setCurrentVersion)
			.catch(() => {});
	}, []);

	const handleCheck = async () => {
		setChecking(true);
		setStatus("idle");
		try {
			const update = await checkUpdate();
			if (update) {
				setStatus("available");
				setVersion(update.version ?? "");
			} else {
				setStatus("uptodate");
			}
		} catch {
			setStatus("error");
		} finally {
			setChecking(false);
		}
	};

	const handleInstall = async () => {
		try {
			const update = await checkUpdate();
			if (update) {
				await update.downloadAndInstall();
			}
		} catch {
			setStatus("error");
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3">
				<span className="shrink-0">
					<RefreshCw size={16} className="text-text-tertiary" />
				</span>
				<div>
					<p className="text-sm text-text-primary">
						{t("settings.updates.app_updates")}
					</p>
					<p className="text-xs text-text-tertiary">v{currentVersion}</p>
				</div>
			</div>

			<button
				onClick={handleCheck}
				disabled={checking}
				className={`w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-text-secondary text-xs rounded-[8px] transition-colors cursor-pointer disabled:opacity-40 ${FOCUS_RING}`}
			>
				{checking ? (
					<Loader2 size={14} className="animate-spin" />
				) : (
					<RefreshCw size={14} />
				)}
				{checking
					? t("settings.updates.checking")
					: t("settings.updates.check")}
			</button>

			{status === "uptodate" && (
				<p className="text-xs text-status-success text-center">
					{t("settings.updates.uptodate")}
				</p>
			)}
			{status === "available" && (
				<div className="space-y-2">
					<p className="text-xs text-accent-primary text-center">
						{t("settings.updates.available", { version })}
					</p>
					<button
						onClick={handleInstall}
						className={`w-full px-3 py-2 bg-accent-primary/20 hover:bg-accent-primary/30 text-accent-primary text-xs rounded-[8px] transition-colors cursor-pointer ${FOCUS_RING}`}
					>
						{t("settings.updates.install")}
					</button>
				</div>
			)}
			{status === "error" && (
				<p className="text-xs text-red-400 text-center">
					{t("settings.updates.failed")}
				</p>
			)}
		</div>
	);
}

function PrivacyTab() {
	const { t } = useTranslation();
	const soundEnabled = useTaskStore((s) => s.soundEnabled);
	const setSoundEnabled = useTaskStore((s) => s.setSoundEnabled);
	const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

	useEffect(() => {
		import("../lib/analytics").then(({ isAnalyticsEnabled }) => {
			setAnalyticsEnabled(isAnalyticsEnabled());
		});
	}, []);

	const handleAnalyticsToggle = async (enabled: boolean) => {
		setAnalyticsEnabled(enabled);
		const { setAnalyticsEnabled: setAnalytics } = await import(
			"../lib/analytics"
		);
		setAnalytics(enabled);
	};

	return (
		<div className="space-y-5">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<span className="shrink-0">
						<Volume2 size={16} className="text-text-tertiary" />
					</span>
					<div>
						<p className="text-sm text-text-primary">
							{t("settings.sound.sound_effects")}
						</p>
						<p className="text-xs text-text-tertiary">
							{t("settings.sound.sound_hint")}
						</p>
					</div>
				</div>
				<Toggle
					checked={soundEnabled}
					onChange={(c) => {
						setSoundEnabled(c);
						if (c) playChime();
					}}
					label="Sound toggle"
				/>
			</div>

			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<span className="shrink-0">
						<Shield size={16} className="text-text-tertiary" />
					</span>
					<div>
						<p className="text-sm text-text-primary">
							{t("settings.analytics.usage_analytics")}
						</p>
						<p className="text-xs text-text-tertiary">
							{t("settings.analytics.analytics_hint")}
						</p>
					</div>
				</div>
				<Toggle
					checked={analyticsEnabled}
					onChange={handleAnalyticsToggle}
					label="Analytics toggle"
				/>
			</div>
		</div>
	);
}

const KEYBINDING_LABELS: Record<string, string> = {
	focusTaskInput: "shortcuts.focus_input",
	search: "shortcuts.search",
	toggleWindow: "shortcuts.toggle_window",
	togglePomodoro: "shortcuts.toggle_pomodoro",
	arrowUp: "shortcuts.navigate_up",
	arrowDown: "shortcuts.navigate_down",
	editTask: "shortcuts.edit_task",
	deleteTask: "shortcuts.delete_task",
	openShortcuts: "shortcuts.shortcuts_overlay",
};

function formatBinding(binding: string): string {
	if (!binding) return "\u2014";
	const parts = binding.split("+").map((p) => {
		if (p === "ctrl") return "Ctrl";
		if (p === "shift") return "Shift";
		if (p === "meta") return "Cmd";
		if (p === "arrowup") return "\u2191";
		if (p === "arrowdown") return "\u2193";
		if (p === "arrowleft") return "\u2190";
		if (p === "arrowright") return "\u2192";
		if (p === "delete") return "Del";
		if (p === "backspace") return "Bksp";
		if (p === "escape") return "Esc";
		if (p === " ") return "Space";
		if (p.length === 1) return p.toUpperCase();
		return p.charAt(0).toUpperCase() + p.slice(1);
	});
	return parts.join(" + ");
}

function KeybindingsTab() {
	const { t } = useTranslation();
	const keybindings = useTaskStore((s) => s.keybindings);
	const loadKeybindings = useTaskStore((s) => s.loadKeybindings);
	const setKeybinding = useTaskStore((s) => s.setKeybinding);
	const [recording, setRecording] = useState<string | null>(null);

	useEffect(() => {
		loadKeybindings();
	}, [loadKeybindings]);

	useEffect(() => {
		if (!recording) return;
		const handler = (e: KeyboardEvent) => {
			if (e.repeat) return;
			e.preventDefault();
			e.stopPropagation();
			const parts: string[] = [];
			if (e.ctrlKey || e.metaKey) parts.push("ctrl");
			if (e.shiftKey && e.key !== "Shift") parts.push("shift");
			const key = e.key.toLowerCase();
			if (!["control", "shift", "meta", "alt"].includes(key)) {
				parts.push(key);
				const binding = parts.join("+");
				setKeybinding(recording, binding);
				setRecording(null);
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [recording, setKeybinding]);

	return (
		<div className="space-y-3">
			{Object.entries(KEYBINDING_LABELS).map(([action, labelKey]) => {
				const binding = keybindings[action] || "";
				const isRecording = recording === action;
				return (
					<div key={action} className="flex items-center justify-between gap-3">
						<p className="text-sm text-text-primary flex-1 truncate">
							{t(labelKey)}
						</p>
						<button
							onClick={() => {
								if (isRecording) {
									setRecording(null);
								} else {
									setRecording(action);
								}
							}}
							className={`relative text-xs font-mono px-2 py-1 rounded-[6px] border transition-colors cursor-pointer min-w-[80px] text-center ${FOCUS_RING} ${
								isRecording
									? "border-accent-primary bg-accent-primary/10 text-accent-primary animate-pulse"
									: "border-border-subtle bg-white/5 text-text-secondary hover:border-accent-primary/40"
							}`}
						>
							{isRecording ? "\u25CF  Press key..." : formatBinding(binding)}
						</button>
					</div>
				);
			})}
		</div>
	);
}

const THEME_PRESETS: { value: "midnight" | "aurora" | "sepia" | "evergreen" | "monochrome"; color: string }[] = [
	{ value: "midnight", color: "#8b7eff" },
	{ value: "aurora", color: "#6366f1" },
	{ value: "sepia", color: "#d97706" },
	{ value: "evergreen", color: "#059669" },
	{ value: "monochrome", color: "#6b7280" },
];

const ACCENT_SWATCHES = ["#8b7eff", "#6366f1", "#ec4899", "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6"];

function ThemeTab() {
	const { t } = useTranslation();
	const theme = useTaskStore((s) => s.theme);
	const setTheme = useTaskStore((s) => s.setTheme);
	const themePreset = useTaskStore((s) => s.themePreset);
	const setThemePreset = useTaskStore((s) => s.setThemePreset);

	const modeOptions: { value: "dark" | "light" | "system"; icon: React.ReactNode }[] = [
		{ value: "dark", icon: <Moon size={14} /> },
		{ value: "light", icon: <Sun size={14} /> },
		{ value: "system", icon: <Monitor size={14} /> },
	];

	const [customAccent, setCustomAccent] = useState(() => localStorage.getItem("focustap-accent") || "#8b7eff");

	const handleAccentPick = (color: string) => {
		setCustomAccent(color);
		const root = document.documentElement;
		root.style.setProperty("--accent-primary", color);
		root.style.setProperty("--accent-hover", color + "cc");
		root.style.setProperty("--accent-subtle", color + "26");
		localStorage.setItem("focustap-accent", color);
	};

	return (
		<div className="space-y-5">
			<div>
				<p className="text-sm text-text-primary mb-2">{t("settings.theme.label")}</p>
				<div className="flex gap-2">
					{modeOptions.map((opt) => (
						<button
							key={opt.value}
							onClick={() => setTheme(opt.value)}
							className={`flex flex-1 flex-col items-center gap-2 px-3 py-3 rounded-[10px] border transition-colors cursor-pointer ${FOCUS_RING} ${
								theme === opt.value
									? "border-accent-primary bg-accent-primary/10 text-accent-primary"
									: "border-border-default bg-white/5 text-text-tertiary hover:border-accent-primary/40 hover:text-text-secondary"
							}`}
							title={t(`settings.theme.${opt.value}_description`)}
						>
							{opt.icon}
							<span className="text-xs font-medium">
								{t(`settings.theme.${opt.value}`)}
							</span>
						</button>
					))}
				</div>
			</div>

			<div>
				<p className="text-sm text-text-primary mb-2">{t("settings.theme.preset")}</p>
				<div className="flex gap-2">
					{THEME_PRESETS.map((preset) => (
						<button
							key={preset.value}
							onClick={() => setThemePreset(preset.value)}
							className={`flex flex-1 flex-col items-center gap-2 px-2 py-3 rounded-[10px] border transition-colors cursor-pointer ${FOCUS_RING} ${
								themePreset === preset.value
									? "border-accent-primary bg-accent-primary/10 text-accent-primary"
									: "border-border-default bg-white/5 text-text-tertiary hover:border-accent-primary/40 hover:text-text-secondary"
							}`}
							title={t(`settings.theme.preset_${preset.value}`)}
						>
							<span
								className="w-5 h-5 rounded-full"
								style={{ background: preset.color }}
							/>
							<span className="text-xs font-medium">
								{t(`settings.theme.preset_${preset.value}`)}
							</span>
						</button>
					))}
				</div>
			</div>

			<div>
				<p className="text-sm text-text-primary mb-2">{t("settings.theme.accent")}</p>
				<div className="flex gap-1.5 flex-wrap items-center">
					{ACCENT_SWATCHES.map((color) => (
						<button
							key={color}
							onClick={() => handleAccentPick(color)}
							className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${FOCUS_RING} ${
								customAccent === color
									? "border-accent-primary scale-110"
									: "border-transparent hover:scale-110"
							}`}
							style={{ background: color }}
							aria-label={color}
						/>
					))}
					<input
						type="color"
						value={customAccent}
						onChange={(e) => handleAccentPick(e.target.value)}
						className={`w-7 h-7 rounded-full border-2 border-border-default cursor-pointer bg-transparent ${FOCUS_RING}`}
						aria-label={t("settings.theme.custom_accent")}
					/>
				</div>
			</div>
		</div>
	);
}

function BackupTab() {
	const { t } = useTranslation();
	const [importing, setImporting] = useState(false);

	const handleExport = async () => {
		try {
			await exportBackup();
			showToast(t("settings.backup.success_export"), "success");
		} catch (e) {
			console.error("Backup export failed:", e);
			showToast(t("settings.backup.failed_export"));
		}
	};

	const handleImport = async () => {
		if (!window.confirm(t("settings.backup.import_confirm"))) return;
		setImporting(true);
		try {
			const result = await importBackup();
			showToast(
				`${t("settings.backup.success_import")} (${result.tasksRestored} tasks, ${result.notesRestored} notes)`,
				"success",
			);
		} catch (e) {
			console.error("Backup import failed:", e);
			showToast(t("settings.backup.failed_import"));
		} finally {
			setImporting(false);
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3">
				<span className="shrink-0">
					<Database size={16} className="text-text-tertiary" />
				</span>
				<div>
					<p className="text-sm text-text-primary">
						{t("settings.backup.title")}
					</p>
				</div>
			</div>

			<button
				onClick={handleExport}
				className={`w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-text-secondary text-xs rounded-[8px] transition-colors cursor-pointer ${FOCUS_RING}`}
			>
				<Database size={14} />
				{t("settings.backup.export")}
			</button>
			<p className="text-xs text-text-tertiary -mt-2">
				{t("settings.backup.export_desc")}
			</p>

			<button
				onClick={handleImport}
				disabled={importing}
				className={`w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-text-secondary text-xs rounded-[8px] transition-colors cursor-pointer disabled:opacity-40 ${FOCUS_RING}`}
			>
				{importing ? (
					<Loader2 size={14} className="animate-spin" />
				) : (
					<Database size={14} />
				)}
				{t("settings.backup.import")}
			</button>
			<p className="text-xs text-text-tertiary -mt-2">
				{t("settings.backup.import_desc")}
			</p>
		</div>
	);
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
	const { t } = useTranslation();
	const containerRef = useRef<HTMLDivElement>(null);
	useFocusTrap(containerRef, open);
	const [tab, setTab] = useState<Tab>("general");
	const [autoStart, setAutoStart] = useState(false);
	const keybindings = useTaskStore((s) => s.keybindings);

	useEffect(() => {
		if (open) {
			isEnabled()
				.then(setAutoStart)
				.catch(() => setAutoStart(false));
		} else {
			setTab("general");
		}
	}, [open]);

	const handleAutoStart = useCallback(async (checked: boolean) => {
		setAutoStart(checked);
		try {
			if (checked) {
				await enable();
			} else {
				await disable();
			}
		} catch {
			setAutoStart(!checked);
		}
	}, []);

	const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
		{ id: "general", label: t("settings.tabs.general"), icon: <Monitor size={13} /> },
		{ id: "keybindings", label: t("settings.tabs.keys"), icon: <Keyboard size={13} /> },
		{ id: "theme", label: t("settings.tabs.theme"), icon: <Sun size={13} /> },
		{ id: "license", label: t("settings.tabs.license"), icon: <KeyRound size={13} /> },
		{ id: "updates", label: t("settings.tabs.updates"), icon: <RefreshCw size={13} /> },
		{ id: "privacy", label: t("settings.tabs.privacy"), icon: <Shield size={13} /> },
		{ id: "backup", label: t("settings.tabs.backup"), icon: <Database size={13} /> },
	];

	return (
		<SlideInPanel open={open} onClose={onClose} ariaLabel={t("settings.title")}>
			{/* Header */}
			<div className="flex items-center justify-between px-5 pt-4 pb-3">
				<h2 className="text-sm font-medium text-text-primary">
					{t("settings.title")}
				</h2>
				<CloseButton onClick={onClose} ariaLabel={t("common.close")} />
			</div>

				{/* Tabs */}
				<div className="flex gap-1 px-5 pb-3 overflow-x-auto">
					{tabs.map((t) => (
						<button
							key={t.id}
							onClick={() => setTab(t.id)}
							className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-[6px] transition-colors cursor-pointer whitespace-nowrap ${FOCUS_RING} ${
								tab === t.id
									? "bg-accent-primary/15 text-accent-primary"
									: "text-text-tertiary hover:text-text-secondary hover:bg-white/5"
							}`}
						>
							{t.icon}
							{t.label}
						</button>
					))}
				</div>

				<div className="mx-5 h-px bg-border-subtle" />

				{/* Content */}
				<div className="flex-1 px-5 py-4 space-y-5 overflow-y-auto">
					{tab === "general" && (
						<>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<span className="shrink-0">
										<Monitor size={16} className="text-text-tertiary" />
									</span>
									<div>
										<p className="text-sm text-text-primary">
											{t("settings.general.launch_at_startup")}
										</p>
										<p className="text-xs text-text-tertiary">
											{t("settings.general.launch_hint")}
										</p>
									</div>
								</div>
								<Toggle
									checked={autoStart}
									onChange={handleAutoStart}
									label="Auto-start toggle"
								/>
							</div>

							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<span className="shrink-0">
										<Keyboard size={16} className="text-text-tertiary" />
									</span>
									<div>
										<p className="text-sm text-text-primary">
											{t("settings.general.keyboard_shortcut")}
										</p>
										<p className="text-xs text-text-tertiary">
											{t("settings.general.shortcut_hint")}
										</p>
									</div>
								</div>
								<span className="text-xs font-mono bg-white/5 text-text-secondary px-2 py-1 rounded-md border border-border-subtle">
									{formatBinding(
										keybindings.toggleWindow || "ctrl+shift+space",
									)}
								</span>
							</div>
						</>
					)}

					{tab === "keybindings" && <KeybindingsTab />}

					{tab === "theme" && <ThemeTab />}

					{tab === "license" && <LicenseActivation />}

					{tab === "updates" && <UpdatesTab />}

					{tab === "privacy" && <PrivacyTab />}

				{tab === "backup" && <BackupTab />}
			</div>
		</SlideInPanel>
	);
}
