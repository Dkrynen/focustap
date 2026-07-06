import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import type { Note, Task } from "./db";
import { getDb, getSetting, listAllTasks, listNotes, setSetting } from "./db";

export interface BackupData {
	version: number;
	exported_at: string;
	app_version: string;
	tasks: Task[];
	notes: Note[];
	settings: Record<string, string>;
}

const BACKUP_VERSION = 1;

function getAppVersion(): string {
	try {
		return import.meta.env.VITE_APP_VERSION || "0.1.0";
	} catch {
		return "0.1.0";
	}
}

/**
 * Collect all app data into a single JSON-serializable object.
 */
export async function collectBackupData(): Promise<BackupData> {
	const [tasks, notes] = await Promise.all([listAllTasks(), listNotes()]);

	// Collect all settings from the DB
	const settingsKeys = [
		"sound_enabled",
		"pomodoro_work",
		"pomodoro_break",
		"onboarding_done",
		"theme",
		"locale",
	];
	const settings: Record<string, string> = {};
	for (const key of settingsKeys) {
		try {
			const val = await getSetting(key);
			if (val !== null) settings[key] = val;
		} catch {
			// skip missing keys
		}
	}

	return {
		version: BACKUP_VERSION,
		exported_at: new Date().toISOString(),
		app_version: getAppVersion(),
		tasks,
		notes,
		settings,
	};
}

/**
 * Export backup: show save dialog, write JSON file.
 */
export async function exportBackup(): Promise<void> {
	const data = await collectBackupData();
	const json = JSON.stringify(data, null, 2);
	const date = new Date().toLocaleDateString("en-CA");

	const path = await save({
		defaultPath: `focustap-backup-${date}.json`,
		filters: [{ name: "JSON Backup", extensions: ["json"] }],
	});

	if (!path) return; // user cancelled

	await writeTextFile(path, json);
}

/**
 * Import backup: show open dialog, read JSON, restore data.
 * Returns the number of tasks restored, or throws on error.
 */
export async function importBackup(): Promise<{
	tasksRestored: number;
	notesRestored: number;
}> {
	const path = await open({
		filters: [{ name: "JSON Backup", extensions: ["json"] }],
		multiple: false,
	});

	if (!path) throw new Error("No file selected");

	const content = await readTextFile(path as string);
	const data: BackupData = JSON.parse(content);

	if (!data.version || data.version > BACKUP_VERSION) {
		throw new Error("Unsupported backup version");
	}

	const database = await getDb();
	await database.execute("BEGIN TRANSACTION");

	try {
		// Clear existing data
		await database.execute("DELETE FROM tasks");
		await database.execute("DELETE FROM notes");
		await database.execute("DELETE FROM settings");

		// Restore tasks
		for (const task of data.tasks) {
			await database.execute(
				`INSERT INTO tasks (id, text, is_done, created_at, completed_at, priority, tags,
                 sort_order, recurrence, notes, parent_id, task_date, time_block_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
				[
					task.id,
					task.text,
					task.is_done ? 1 : 0,
					task.created_at,
					task.completed_at,
					task.priority,
					task.tags,
					task.sort_order,
					task.recurrence || "",
					task.notes || "",
					task.parent_id,
					task.task_date,
					task.time_block_id,
				],
			);
		}

		// Restore notes
		for (const note of data.notes) {
			await database.execute(
				`INSERT INTO notes (id, title, content, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5)`,
				[note.id, note.title, note.content, note.created_at, note.updated_at],
			);
		}

		// Restore settings
		for (const [key, value] of Object.entries(data.settings)) {
			await setSetting(key, value);
		}

		// Reset SQLite auto-increment sequences
		await database.execute(
			`UPDATE sqlite_sequence SET seq = (SELECT COALESCE(MAX(id), 0) FROM tasks) WHERE name = 'tasks'`,
		);
		await database.execute(
			`UPDATE sqlite_sequence SET seq = (SELECT COALESCE(MAX(id), 0) FROM notes) WHERE name = 'notes'`,
		);

		await database.execute("COMMIT");

		return {
			tasksRestored: data.tasks.length,
			notesRestored: data.notes.length,
		};
	} catch (e) {
		await database.execute("ROLLBACK");
		throw e;
	}
}
