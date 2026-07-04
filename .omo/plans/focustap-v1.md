# focustap-v1 - Work Plan

## TL;DR (For humans)

**What you'll get:** FocusTap becomes a complete WFH productivity desk — Pomodoro timer, task detail view with notes, subtasks, keyboard shortcut cheat sheet, WFH statistics dashboard, week/month calendar views, CSV/Markdown export, AI-powered prioritization suggestions, and deep focus analytics. All wrapped in the same dark glassmorphism design.

**Why this approach:** Parallel execution waves — database foundation first, then all features built simultaneously by independent agents, then final polish. No sequential bottlenecks except where features share a data model change.

**What it will NOT do:** Cross-device sync (needs a server — designed for future but not built), third-party integrations, mobile app, or LLM-based AI (uses heuristics instead).

**Effort:** XL — 12 features across 3 priority tiers + polish
**Risk:** Medium — Pomodoro timer's real-time state and calendar view are the most complex UI pieces
**Decisions to sanity-check:** Data model for future sync, heuristic AI approach (no LLM), subtask depth limit (1 level)

Your next move: **Approve the plan** — then execution starts automatically via `/start-work`.

---

> TL;DR (machine): XL effort, Medium risk, 12 deliverables in 4 parallel waves + final verification

## Scope
### Must have
- Database migrations v4+v5 (notes, parent_id, pomodoro_sessions, activity_log)
- Pomodoro timer with work/break phases, notification, sound, settings
- Task detail slide-over panel with notes field + full task editing
- Subtask support (parent_id, indent rendering, progress on parent, create/complete)
- Keyboard shortcut reference overlay (press ? to toggle)
- WFH statistics dashboard (daily trend chart, streak calendar, heatmap)
- Week view (7-column day layout with tasks per day)
- Month view (calendar grid with task dots per day)
- CSV + Markdown export via Tauri save dialog
- AI prioritization suggestions (heuristic scoring engine)
- Deep focus analytics (productivity patterns, recommendations)
- Sync metadata columns in data model (no implementation)

### Must NOT have (guardrails, anti-slop, scope boundaries)
- No LLM/API calls for AI features — pure heuristic scoring
- No new npm dependencies — all UI with Tailwind + lucide-react
- No cross-device sync implementation — data model only
- No third-party integrations (calendar APIs, Slack, etc.)
- No authentication or user accounts
- No mobile/electron builds — Tauri desktop only
- No websocket or real-time features
- No grandchild subtasks — max depth 1
- No drag-and-drop reorder — keep existing move up/down buttons
- No animation on anything except transform/opacity; respect prefers-reduced-motion

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: tests-after with manual QA via building
- Evidence: .omo/evidence/task-<N>-focustap-v1.<ext>
- Every todo verified by: `npx tsc --noEmit` clean + manual build check

## Execution strategy
### Parallel execution waves

**Wave 0 — Foundation** (sequential, everything depends on this):
- DB migrations v4+v5
- db.ts extended with all new CRUD functions

**Wave 1 — Core Features** (fully parallel after Wave 0):
- Pomodoro timer component + store integration
- Task detail slide-over panel
- Subtask rendering in TaskList
- Keyboard shortcut reference overlay
- Import wiring: all new components into App.tsx

**Wave 2 — Advanced Features** (fully parallel):
- WFH Statistics dashboard
- Week/Month calendar views
- CSV + Markdown export
- AI heuristic suggestion engine

**Wave 3 — Premium & Polish**:
- Deep focus analytics panel
- Final verification wave

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
|---|---|---|---|
| 1. DB migrations | None | 2, 3, 4, 5, 6, 7, 8 | — |
| 2. db.ts CRUD | 1 | 3, 4, 5, 6, 7, 8 | — |
| 3. Pomodoro timer | 2 | — | 4, 5, 6, 7, 8 |
| 4. Task detail view | 2 | — | 3, 5, 6, 7, 8 |
| 5. Subtasks UI | 2 | — | 3, 4, 6, 7, 8 |
| 6. Shortcut overlay | 2 | — | 3, 4, 5, 7, 8 |
| 7. App.tsx wiring | 3, 4, 5, 6 | 9, 10, 11, 12 | 8 |
| 8. AI suggestions engine | 2 | 12 | 7 |
| 9. Statistics dashboard | 7 | — | 10, 11 |
| 10. Calendar views | 7 | — | 9, 11 |
| 11. Export module | 7 | — | 9, 10 |
| 12. Focus analytics | 8 | — | 9, 10, 11 |
| F1-F4 Verification | All | Completion | — |

## Todos

- [ ] 1. Add database migrations v4+v5 for notes, parent_id, pomodoro_sessions, activity_log
  What to do / Must NOT do: Add Migration v4 (ALTER TABLE tasks ADD COLUMN notes TEXT NOT NULL DEFAULT ''; ALTER TABLE tasks ADD COLUMN parent_id INTEGER REFERENCES tasks(id);). Add Migration v5 (CREATE TABLE pomodoro_sessions(...); CREATE TABLE activity_log(...)). Do NOT remove or alter existing migrations. Do NOT change existing columns.
  Parallelization: Wave 0 | Blocked by: None | Blocks: 2
  References: src-tauri/src/lib.rs:7-35 (existing migration pattern). src/lib/db.ts:16-26 (current Task interface).
  Acceptance criteria: `npx tsc --noEmit` passes. Migration v4+v5 present in migrations vec. All new columns/tables defined.
  QA scenarios: Read lib.rs to confirm migrations exist. Build: `npm run tauri build` (or npx tsc --noEmit succeeds).
  Commit: Y | feat(db): add notes, parent_id, pomodoro_sessions, activity_log migrations

- [ ] 2. Extend db.ts with all new CRUD functions
  What to do / Must NOT do: Extend Task interface with notes: string, parent_id: number | null. Add: updateTaskNotes(id, notes), getTask(id) → full task, createSubtask(parentId) → id, listSubtasks(parentId) → Task[], completeTaskWithChildren(id), logActivity(taskId, action), getActivityLog(dateFrom, dateTo) → ActivityLog[], getPomodoroSessions(dateFrom, dateTo) → PomodoroSession[], createPomodoroSession(taskId, workDuration, breakDuration) → id, completePomodoroSession(id, actualWork, actualBreak), getStreakFull() → full streak history array. Export ActivityLog and PomodoroSession interfaces. Must NOT modify existing function signatures. Must NOT remove any existing exports.
  Parallelization: Wave 0 | Blocked by: 1 | Blocks: 3, 4, 5, 6, 8
  References: src/lib/db.ts:1-184 (all existing functions, follow pattern exactly). src/lib/db.ts:16-26 (Task interface shape).
  Acceptance criteria: `npx tsc --noEmit` passes. All new functions exported. All existing functions unchanged.
  QA scenarios: `npx tsc --noEmit` passes clean.
  Commit: Y | feat(db): add notes, subtasks, activity log, pomodoro CRUD

- [ ] 3. Create Pomodoro timer component + store integration
  What to do / Must NOT do: Create src/components/PomodoroTimer.tsx. Store: add pomodoro state (isRunning, timeRemaining, phase, workDuration=1500, breakDuration=300, sessionCount). Actions: startTimer, pauseTimer, resetTimer, completePomodoro. Component: circular progress ring (CSS border-radius trick or SVG), time display MM:SS, start/pause + reset buttons, mini mode in header when idle. On completion: Tauri notification + chime sound. Settings: work/break duration config. Persist duration settings. Must NOT use any npm dependencies beyond existing. Must NOT use setInterval without cleanup. Must NOT tick when not visible.
  Parallelization: Wave 1 | Blocked by: 2 | Blocks: 7
  References: src/store.ts (zustand pattern). src/components/SettingsPanel.tsx (settings pattern). src/lib/sounds.ts (chime function). src/index.css (animation classes).
  Acceptance criteria: `npx tsc --noEmit` passes. Timer counts down. Notification fires on completion. Settings persist between restarts.
  QA scenarios: `npx tsc --noEmit` passes. Build check.
  Commit: Y | feat(pomodoro): add timer component with notifications

- [ ] 4. Create task detail slide-over panel
  What to do / Must NOT do: Create src/components/TaskDetail.tsx. Slides in from right with slideInRight animation. Shows all task fields: text (editable), priority (clickable dots), tags (editable text input), notes (textarea, new), recurrence (dropdown: none/daily/weekdays/weekly/monthly), subtasks list, created_at (readonly), completed_at (readonly). Save button persists all changes. Close via X button, Escape, or click outside. Must NOT edit is_done from detail panel (use checkbox in list). Must NOT add new deps. Must follow glassmorphism design tokens from index.css.
  Parallelization: Wave 1 | Blocked by: 2 | Blocks: 7
  References: src/components/SettingsPanel.tsx (slide-over pattern). src/index.css:106-114 (slideInRight animation). src/store.ts (state pattern). src/lib/db.ts (new updateTaskNotes function from todo 2).
  Acceptance criteria: `npx tsc --noEmit` passes. Panel opens/closes smoothly. All fields save correctly. Escape closes panel.
  QA scenarios: `npx tsc --noEmit` passes.
  Commit: Y | feat(ui): add task detail slide-over panel with notes

- [ ] 5. Implement subtask UI in TaskList
  What to do / Must NOT do: Modify src/components/TaskList.tsx. When task has parent_id > 0, render indented (pl-6) with smaller font, connected line. Show parent task with expand/collapse chevron. Show "N/M subtasks done" progress on parent. Create subtask button on parent hover (+ icon). Completing all subtasks auto-completes parent. Show subtask count badge. Must NOT exceed depth 1 (no grandchild subtasks). Must NOT break existing keyboard navigation. Must NOT remove existing reorder/search features.
  Parallelization: Wave 1 | Blocked by: 2 | Blocks: 7
  References: src/components/TaskList.tsx (existing rendering, keyboard nav, move buttons). src/lib/db.ts (createSubtask, listSubtasks, completeTaskWithChildren from todo 2). src/store.ts (existing toggle, remove).
  Acceptance criteria: `npx tsc --noEmit` passes. Subtasks render indented. Parent shows progress. Completing all subtasks completes parent.
  QA scenarios: `npx tsc --noEmit` passes.
  Commit: Y | feat(ui): add subtask rendering with parent progress

- [ ] 6. Create keyboard shortcut reference overlay
  What to do / Must NOT do: Create src/components/ShortcutOverlay.tsx. Press ? to toggle overlay. Dark semi-transparent backdrop. Centered card listing all keyboard shortcuts grouped by category (Navigation, Tasks, Timer, etc.). Press ? or Escape to close. Must NOT intercept ? in input fields. Must NOT conflict with existing shortcuts (Escape, n, Ctrl+F, arrows, j/k, Enter, Delete).
  Parallelization: Wave 1 | Blocked by: 2 | Blocks: 7
  References: src/App.tsx:28-51 (existing keyboard handler pattern). Current shortcuts: Escape (hide), n (focus input), Ctrl+F (search), arrows/j/k (navigate), Enter (toggle), Delete/Backspace (delete).
  Acceptance criteria: `npx tsc --noEmit` passes. ? toggles overlay. All shortcuts listed. Esc closes.
  QA scenarios: `npx tsc --noEmit` passes.
  Commit: Y | feat(ui): add keyboard shortcut reference overlay

- [ ] 7. Wire all Wave 1 components into App.tsx
  What to do / Must NOT do: Import and render: PomodoroTimer (in header area or between header and TaskInput), TaskDetail (triggered by clicking a task's detail icon or double-click), ShortcutOverlay (? key listener). Add double-click handler on task items to open TaskDetail (but keep single-click for edit). Add task detail state to store (selectedTaskId). Add pomodoro state integration. Must NOT break existing layout. Must NOT remove TaskSearch or TaskInput.
  Parallelization: Wave 1 | Blocked by: 3, 4, 5, 6 | Blocks: 9, 10, 11
  References: src/App.tsx (current layout). src/components/TaskList.tsx (task rendering, click handlers). src/store.ts (state).
  Acceptance criteria: `npx tsc --noEmit` passes. All new components render. Keyboard shortcuts work. No regressions.
  QA scenarios: `npx tsc --noEmit` passes. Build check.
  Commit: Y | feat(ui): integrate Pomodoro, detail panel, and shortcut overlay

- [ ] 8. Create AI suggestions engine
  What to do / Must NOT do: Create src/lib/suggestions.ts. Export function getSuggestions(tasks, activityLog, pomodoros) → Suggestion[]. Suggestion = { type, taskId | null, text, reason, priority }. Heuristic rules: overdue or due-soon tasks → "Complete [task] — overdue by N days". Tasks with !h priority not started → "High priority task [task] not started yet". Task with !h that's been pending >3 days → "Consider breaking down [task]". Productive time patterns → "You focus best between X:00-Y:00". Streak at risk → "Complete one task today to keep your N-day streak". Session count → "You've completed N Pomodoros today". Suggestion card UI in stats panel. Must NOT call any external API. Must NOT use LLM. Must NOT import any new deps. Rules must be deterministic.
  Parallelization: Wave 1 | Blocked by: 2 | Blocks: 12
  References: src/lib/db.ts (activity log, pomodoro functions from todo 2). src/store.ts (tasks).
  Acceptance criteria: `npx tsc --noEmit` passes. Suggestions are generated from real data. No external calls.
  QA scenarios: `npx tsc --noEmit` passes. Unit-testable logic.
  Commit: Y | feat(ai): add heuristic suggestion engine

- [ ] 9. Create WFH Statistics dashboard
  What to do / Must NOT do: Create src/components/StatisticsPanel.tsx. Three view tabs: Daily Trend (bar chart of tasks completed per day for last 30 days), Streak Calendar (grid calendar with colored dots per day showing completion, like GitHub contribution graph), Productive Hour Heatmap (24h x 7d grid colored by pomodoro/task completion count). All charts CSS-only (div bars, dot grids, colored cells — no chart library). Show summary stats: total tasks this month, avg per day, best day, current streak, longest streak, total pomodoros this week. Accessible from header stats icon. Slide-over panel same as SettingsPanel pattern. Must NOT add any charting dependency. Must NOT use canvas/SVG for charts (div-based only).
  Parallelization: Wave 2 | Blocked by: 7 | Blocks: None
  References: src/components/SettingsPanel.tsx (slide-over pattern). src/lib/db.ts (activity log, pomodoro functions from todo 2). src/index.css (design tokens, colors).
  Acceptance criteria: `npx tsc --noEmit` passes. Charts render with real data. Tabs switch views. Panel slides in/out.
  QA scenarios: `npx tsc --noEmit` passes.
  Commit: Y | feat(stats): add WFH statistics dashboard with CSS charts

- [ ] 10. Create week/month calendar views
  What to do / Must NOT do: Create src/components/CalendarView.tsx. Week view: 7-column grid showing days of week, each column lists tasks for that day. Month view: calendar grid with small dots indicating tasks per day, click day to see task list. Navigation: < > arrows to move between weeks/months, "Today" button to jump back. Toggle between week/month with tabs. Tasks from activity log / tasks table filtered by date range. Must NOT break existing today view (default). Must NOT use calendar library — pure CSS grid. Must NOT add new deps.
  Parallelization: Wave 2 | Blocked by: 7 | Blocks: None
  References: src/App.tsx (layout pattern). src/lib/db.ts (getActivityLog, listTodayTasks by date range). src/index.css (design tokens).
  Acceptance criteria: `npx tsc --noEmit` passes. Week view renders 7 columns. Month view renders grid. Navigation works.
  QA scenarios: `npx tsc --noEmit` passes.
  Commit: Y | feat(calendar): add week and month calendar views

- [ ] 11. Implement CSV + Markdown export
  What to do / Must NOT do: Create src/lib/export.ts. Export functions: exportToCSV(tasks) — generates CSV with header row + all task fields, uses Tauri save dialog (@tauri-apps/plugin-dialog or invoke save). exportToMarkdown(tasks) — generates Markdown checklist with priority/tags/status. Both export ALL tasks (not just today's). Use Tauri's save dialog for file path. Must NOT overwrite files without confirmation. Must NOT add new npm deps. If Tauri save dialog needs a new plugin, use @tauri-apps/plugin-dialog.
  Parallelization: Wave 2 | Blocked by: 7 | Blocks: None
  References: Task interface (src/lib/db.ts:16-26). Tauri dialog plugin (check if @tauri-apps/plugin-dialog is in package.json or needs adding).
  Acceptance criteria: `npx tsc --noEmit` passes. CSV exports valid data. Markdown exports readable list.
  QA scenarios: `npx tsc --noEmit` passes.
  Commit: Y | feat(export): add CSV and Markdown export with save dialog

- [ ] 12. Create deep focus analytics panel
  What to do / Must NOT do: Create src/components/FocusAnalytics.tsx. Analyzes pomodoro sessions + task completion patterns. Shows: best focus hours (which hours have most completions), consistency score (% of days with >0 tasks completed), average task completion rate, most productive day of week, suggestion cards from AI engine (todo 8). All CSS div-based charts. Slide-over panel. Must NOT add new deps. Must NOT duplicate statistics dashboard content (reference it instead).
  Parallelization: Wave 3 | Blocked by: 8 | Blocks: None
  References: src/components/StatisticsPanel.tsx (reference pattern). src/lib/suggestions.ts (AI engine from todo 8). src/lib/db.ts (activity log, pomodoro functions).
  Acceptance criteria: `npx tsc --noEmit` passes. Charts render. AI suggestions display. Panel opens/closes.
  QA scenarios: `npx tsc --noEmit` passes.
  Commit: Y | feat(analytics): add deep focus analysis with AI suggestions

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [ ] F1. Plan compliance audit — verify every todo's acceptance criteria is met
- [ ] F2. Code quality review — run through all new code, check for AI slop, unused vars, any suppressions
- [ ] F3. Build verification — `npm run tauri build` succeeds (or at minimum `npx tsc --noEmit` + `npm run build`)
- [ ] F4. Scope fidelity — confirm nothing from Must NOT have was implemented

## Commit strategy
- Each todo gets its own atomic commit with conventional commit format
- Commit messages: `type(scope): description` (e.g., `feat(pomodoro): add timer component`)
- Commits should be orderable but NOT dependent (each is independently reviewable)
- Final verification wave does NOT produce a commit

## Success criteria
1. All 12 todos completed with passing verification
2. `npx tsc --noEmit` passes with zero errors
3. Build succeeds
4. All Must NOT have items verified absent
5. App feels complete — no obvious missing features for WFH use
