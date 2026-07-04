import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load("sqlite:focustap.db");
    // Ensure settings table exists
    await db.execute(
      "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)"
    );
  }
  return db;
}

export interface Task {
  id: number;
  text: string;
  is_done: boolean;
  created_at: string;
  completed_at: string | null;
  priority: number;    // 0=none, 1=low, 2=medium, 3=high
  tags: string;        // comma-separated tag names
  sort_order: number;
  recurrence: string;  // '' for none, or rrule-like string
  notes: string;
  parent_id: number | null;
  task_date: string | null;   // yyyy-mm-dd scheduled date (v6)
  time_block_id: number | null;
}

export interface PomodoroSession {
  id: number;
  task_id: number | null;
  started_at: string;
  completed_at: string | null;
  duration_work: number;
  duration_break: number;
  actual_work: number | null;
  actual_break: number | null;
}

export interface ActivityLog {
  id: number;
  task_id: number | null;
  action: string;
  timestamp: string;
}

export async function createTask(): Promise<number> {
  const database = await getDb();
  const result = await database.execute(
    "INSERT INTO tasks (text, is_done, sort_order) VALUES ('', 0, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM tasks))"
  );
  return result.lastInsertId ?? 0;
}

export async function updateTaskText(id: number, text: string): Promise<void> {
  const database = await getDb();
  await database.execute("UPDATE tasks SET text = $1 WHERE id = $2", [
    text,
    id,
  ]);
}

export async function toggleTask(id: number): Promise<void> {
  const database = await getDb();
  const rows = await database.select<{ is_done: number }[]>(
    "SELECT is_done FROM tasks WHERE id = $1",
    [id]
  );
  if (rows.length > 0) {
    const isDone = rows[0].is_done === 1;
    if (isDone) {
      await database.execute(
        "UPDATE tasks SET is_done = 0, completed_at = NULL WHERE id = $1",
        [id]
      );
    } else {
      await database.execute(
        "UPDATE tasks SET is_done = 1, completed_at = datetime('now', 'localtime') WHERE id = $1",
        [id]
      );
    }
  }
}

export async function deleteTask(id: number): Promise<void> {
  const database = await getDb();
  await database.execute("DELETE FROM tasks WHERE id = $1", [id]);
}

export async function listTodayTasks(): Promise<Task[]> {
  const database = await getDb();
  return await database.select<Task[]>(
    `SELECT id, text, is_done, created_at, completed_at, priority, tags, sort_order, recurrence, notes, parent_id, task_date, time_block_id
     FROM tasks
     WHERE COALESCE(task_date, date(created_at)) = date('now', 'localtime')
     ORDER BY sort_order ASC, created_at ASC`
  );
}

export async function updateTaskPriority(id: number, priority: number): Promise<void> {
  const database = await getDb();
  await database.execute("UPDATE tasks SET priority = $1 WHERE id = $2", [priority, id]);
}

export async function updateTaskTags(id: number, tags: string): Promise<void> {
  const database = await getDb();
  await database.execute("UPDATE tasks SET tags = $1 WHERE id = $2", [tags, id]);
}

export async function updateTaskRecurrence(id: number, recurrence: string): Promise<void> {
  const database = await getDb();
  await database.execute("UPDATE tasks SET recurrence = $1 WHERE id = $2", [recurrence, id]);
}

export async function moveTask(id: number, direction: "up" | "down"): Promise<void> {
  const database = await getDb();
  const current = await database.select<{ sort_order: number }[]>(
    "SELECT sort_order FROM tasks WHERE id = $1", [id]
  );
  if (current.length === 0) return;

  const curOrder = current[0].sort_order;
  const cmp = direction === "up" ? "<" : ">";
  const order = direction === "up" ? "DESC" : "ASC";

  const neighbour = await database.select<{ id: number; sort_order: number }[]>(
    `SELECT id, sort_order FROM tasks
     WHERE date(created_at) = date('now', 'localtime')
       AND sort_order ${cmp} $1
     ORDER BY sort_order ${order} LIMIT 1`,
    [curOrder]
  );
  if (neighbour.length === 0) return;

  await database.execute("UPDATE tasks SET sort_order = $1 WHERE id = $2", [neighbour[0].sort_order, id]);
  await database.execute("UPDATE tasks SET sort_order = $1 WHERE id = $2", [curOrder, neighbour[0].id]);
}

/* ── Settings persistence ── */

export async function getSetting(key: string): Promise<string | null> {
  const database = await getDb();
  const rows = await database.select<{ value: string }[]>(
    "SELECT value FROM settings WHERE key = $1",
    [key]
  );
  return rows.length > 0 ? rows[0].value : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const database = await getDb();
  await database.execute(
    "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = $2",
    [key, value]
  );
}

/** Produce a local datetime string matching SQLite's datetime('now','localtime') format */
export function localDatetime(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}:${s}`;
}

/* ── Streak computation ── */

export async function getStreak(): Promise<number> {
  const database = await getDb();
  const rows = await database.select<{ completed_date: string }[]>(
    `SELECT DISTINCT date(completed_at) AS completed_date
     FROM tasks
     WHERE is_done = 1 AND completed_at IS NOT NULL
     ORDER BY completed_date DESC`
  );

  if (rows.length === 0) return 0;

  const now = new Date();
  const todayStr = now.toLocaleDateString("en-CA");

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString("en-CA");

  // If latest completed date is not today or yesterday, streak is 0
  if (rows[0].completed_date !== todayStr && rows[0].completed_date !== yesterdayStr) {
    return 0;
  }

  let streak = 0;
  const cursor = new Date(rows[0].completed_date);

  for (const row of rows) {
    const rowDate = new Date(row.completed_date);
    const diff = Math.round(
      (cursor.getTime() - rowDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff === streak) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/* ── Task Notes ── */

export async function updateTaskNotes(id: number, notes: string): Promise<void> {
  const database = await getDb();
  await database.execute("UPDATE tasks SET notes = $1 WHERE id = $2", [notes, id]);
}

export async function getTask(id: number): Promise<Task | null> {
  const database = await getDb();
  const rows = await database.select<Task[]>(
    `SELECT id, text, is_done, created_at, completed_at, priority, tags, sort_order, recurrence, notes, parent_id, task_date, time_block_id FROM tasks WHERE id = $1`,
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
}

/* ── Subtasks ── */

export async function createSubtask(parentId: number): Promise<number> {
  const database = await getDb();
  const result = await database.execute(
    "INSERT INTO tasks (text, is_done, parent_id, sort_order) VALUES ('', 0, $1, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM tasks WHERE parent_id = $1))",
    [parentId]
  );
  return result.lastInsertId ?? 0;
}

export async function listSubtasks(parentId: number): Promise<Task[]> {
  const database = await getDb();
  return await database.select<Task[]>(
    `SELECT id, text, is_done, created_at, completed_at, priority, tags, sort_order, recurrence, notes, parent_id, task_date, time_block_id FROM tasks WHERE parent_id = $1 ORDER BY sort_order ASC, id ASC`,
    [parentId]
  );
}

export async function completeTaskWithChildren(id: number): Promise<void> {
  const database = await getDb();
  const task = await database.select<{ parent_id: number | null }[]>(
    "SELECT parent_id FROM tasks WHERE id = $1", [id]
  );
  if (task.length === 0) return;

  await database.execute(
    "UPDATE tasks SET is_done = 1, completed_at = datetime('now', 'localtime') WHERE id = $1",
    [id]
  );

  const parentId = task[0].parent_id;
  if (parentId) {
    const siblings = await database.select<{ remaining: number }[]>(
      "SELECT COUNT(*) as remaining FROM tasks WHERE parent_id = $1 AND is_done = 0",
      [parentId]
    );
    if (siblings.length > 0 && siblings[0].remaining === 0) {
      await database.execute(
        "UPDATE tasks SET is_done = 1, completed_at = datetime('now', 'localtime') WHERE id = $1",
        [parentId]
      );
    }
  }
}

export async function uncompleteTask(id: number): Promise<void> {
  const database = await getDb();
  const task = await database.select<{ parent_id: number | null }[]>(
    "SELECT parent_id FROM tasks WHERE id = $1", [id]
  );
  if (task.length === 0) return;

  await database.execute(
    "UPDATE tasks SET is_done = 0, completed_at = NULL WHERE id = $1",
    [id]
  );

  const parentId = task[0].parent_id;
  if (parentId) {
    await database.execute(
      "UPDATE tasks SET is_done = 0, completed_at = NULL WHERE id = $1",
      [parentId]
    );
  }
}

/* ── Activity Log ── */

export async function logActivity(taskId: number | null, action: string): Promise<void> {
  const database = await getDb();
  await database.execute(
    "INSERT INTO activity_log (task_id, action) VALUES ($1, $2)",
    [taskId, action]
  );
}

export async function getActivityLog(dateFrom: string, dateTo: string): Promise<ActivityLog[]> {
  const database = await getDb();
  return await database.select<ActivityLog[]>(
    "SELECT id, task_id, action, timestamp FROM activity_log WHERE date(timestamp) >= $1 AND date(timestamp) <= $2 ORDER BY timestamp ASC",
    [dateFrom, dateTo]
  );
}

/* ── Pomodoro Sessions ── */

export async function createPomodoroSession(
  taskId: number | null,
  durationWork: number,
  durationBreak: number
): Promise<number> {
  const database = await getDb();
  const result = await database.execute(
    "INSERT INTO pomodoro_sessions (task_id, duration_work, duration_break) VALUES ($1, $2, $3)",
    [taskId, durationWork, durationBreak]
  );
  return result.lastInsertId ?? 0;
}

export async function completePomodoroSession(
  id: number,
  actualWork: number,
  actualBreak: number
): Promise<void> {
  const database = await getDb();
  await database.execute(
    "UPDATE pomodoro_sessions SET completed_at = datetime('now', 'localtime'), actual_work = $1, actual_break = $2 WHERE id = $3",
    [actualWork, actualBreak, id]
  );
}

export async function getPomodoroSessions(dateFrom: string, dateTo: string): Promise<PomodoroSession[]> {
  const database = await getDb();
  return await database.select<PomodoroSession[]>(
    "SELECT id, task_id, started_at, completed_at, duration_work, duration_break, actual_work, actual_break FROM pomodoro_sessions WHERE date(started_at) >= $1 AND date(started_at) <= $2 ORDER BY started_at ASC",
    [dateFrom, dateTo]
  );
}

/* ── Full Streak History ── */

export interface Note {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface TimeBlock {
  id: number;
  label: string;
  start_time: string;
  end_time: string;
  day_of_week: number | null;
  color: string;
  sort_order: number;
}

export interface StreakDay {
  date: string;
  count: number;
}

export async function getStreakHistory(): Promise<StreakDay[]> {
  const database = await getDb();
  return await database.select<StreakDay[]>(
    `SELECT date(completed_at) AS date, COUNT(*) AS count
     FROM tasks
     WHERE is_done = 1 AND completed_at IS NOT NULL
     GROUP BY date(completed_at)
     ORDER BY date DESC`
  );
}

/* ── All Tasks (for export) ── */

export async function listAllTasks(): Promise<Task[]> {
  const database = await getDb();
  return await database.select<Task[]>(
    `SELECT id, text, is_done, created_at, completed_at, priority, tags, sort_order, recurrence, notes, parent_id, task_date, time_block_id FROM tasks ORDER BY created_at DESC`
  );
}

/* ── Tasks by date range (for calendar) ── */

export async function listTasksByDateRange(dateFrom: string, dateTo: string): Promise<Task[]> {
  const database = await getDb();
  return await database.select<Task[]>(
    `SELECT id, text, is_done, created_at, completed_at, priority, tags, sort_order, recurrence, notes, parent_id, task_date, time_block_id
     FROM tasks
     WHERE COALESCE(task_date, date(created_at)) >= $1 AND COALESCE(task_date, date(created_at)) <= $2
     ORDER BY created_at ASC`,
    [dateFrom, dateTo]
  );
}

/* ── Tasks by time block ── */

export async function listTasksByTimeBlock(timeBlockId: number, dateStr: string): Promise<Task[]> {
  const database = await getDb();
  return await database.select<Task[]>(
    `SELECT id, text, is_done, created_at, completed_at, priority, tags, sort_order, recurrence, notes, parent_id, task_date, time_block_id
     FROM tasks
     WHERE time_block_id = $1 AND COALESCE(task_date, date(created_at)) = $2
     ORDER BY sort_order ASC`,
    [timeBlockId, dateStr]
  );
}

/* ── Update task_date ── */

export async function updateTaskDate(id: number, taskDate: string | null): Promise<void> {
  const database = await getDb();
  await database.execute("UPDATE tasks SET task_date = $1 WHERE id = $2", [taskDate, id]);
}

/* ── Update time_block_id ── */

export async function updateTaskTimeBlock(id: number, timeBlockId: number | null): Promise<void> {
  const database = await getDb();
  await database.execute("UPDATE tasks SET time_block_id = $1 WHERE id = $2", [timeBlockId, id]);
}

/* ── Notes CRUD ── */

export async function listNotes(): Promise<Note[]> {
  const database = await getDb();
  return await database.select<Note[]>(
    "SELECT id, title, content, created_at, updated_at FROM notes ORDER BY updated_at DESC"
  );
}

export async function createNote(): Promise<number> {
  const database = await getDb();
  const result = await database.execute(
    "INSERT INTO notes (title, content) VALUES ('', '')"
  );
  return result.lastInsertId ?? 0;
}

export async function updateNoteTitle(id: number, title: string): Promise<void> {
  const database = await getDb();
  await database.execute(
    "UPDATE notes SET title = $1, updated_at = datetime('now', 'localtime') WHERE id = $2",
    [title, id]
  );
}

export async function updateNoteContent(id: number, content: string): Promise<void> {
  const database = await getDb();
  await database.execute(
    "UPDATE notes SET content = $1, updated_at = datetime('now', 'localtime') WHERE id = $2",
    [content, id]
  );
}

export async function deleteNote(id: number): Promise<void> {
  const database = await getDb();
  await database.execute("DELETE FROM notes WHERE id = $1", [id]);
}

/* ── Time Blocks CRUD ── */

export async function listTimeBlocks(): Promise<TimeBlock[]> {
  const database = await getDb();
  return await database.select<TimeBlock[]>(
    "SELECT id, label, start_time, end_time, day_of_week, color, sort_order FROM time_blocks ORDER BY sort_order ASC"
  );
}

export async function createTimeBlock(label: string, startTime: string, endTime: string, color: string): Promise<number> {
  const database = await getDb();
  const result = await database.execute(
    "INSERT INTO time_blocks (label, start_time, end_time, color, sort_order) VALUES ($1, $2, $3, $4, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM time_blocks))",
    [label, startTime, endTime, color]
  );
  return result.lastInsertId ?? 0;
}

export async function deleteTimeBlock(id: number): Promise<void> {
  const database = await getDb();
  await database.execute("DELETE FROM time_blocks WHERE id = $1", [id]);
}
