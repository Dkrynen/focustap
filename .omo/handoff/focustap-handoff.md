HANDOFF CONTEXT
===============

USER REQUESTS (AS-IS)
---------------------
- "Hey Mr. Deep Seek, I want to do a deep planning And research session so I would like to Build an app. Essentially it's a task tracker. How I thought it would work is you would bind it to one button, one custom button that's obviously not bound to anything else on your system. The app needs to auto-detect it and then it can give you some recommendations. Besides that the task tracker is mainly built for people like me with heavy ADHD who struggle to stay focused on the task they need to do before them. This would be a quick way of essentially opening my task menu, marking it as done, and closing it. As soon as you leave the button it closes, something like Flow Launcher where the search thing just pops up."
- "Perfect I handed off the prompt. Whilst we are busy I think we can go ahead and continue with some research. Doesn't matter what, as long as it can help them."
- "Okay so my stronger model is currently on hold because of limits. Why don't we go ahead and start building everything since we already did all the planning ourselves as well?"
- "Perfect now I need to go ahead and finish everything up. We're obviously very far from done yet."
- "Perfect let's get a full hand-off prompt going and then the full session will obviously get all of the rest that you just mentioned up and running. We'll do a full walkthrough of the app, testing end-to-end all the functions. I want integrations to stuff like calendar, obvious stuff like your tasks that you can keep track of with a notepad function. I have the school design that helps you keep track of daily tasks, everything. But I want a full, total handoff from the completely starting the next session."

GOAL
----
Run a full end-to-end manual QA walkthrough of FocusTap on the built binary, then implement remaining features: deeper calendar integration (syncing tasks with dates), a notepad function (persistent freeform notes), and a school/day-planner template design that helps track daily tasks by class period or time block. Polish all rough edges uncovered during QA.

WORK COMPLETED
--------------
- Full research cycle on 4 tracks: design system (Wispr Flow / dark glassmorphism), Tauri v2 Windows gotchas (IME freeze #15436, focus chain), ADHD UX neuroscience (dopamine micro-interactions, variable rewards), and stack comparisons (Tauri vs Electron vs Neutralino vs WinUI)
- Environment verified: Rust 1.96.1, Node 24.18.0, npm 11.16.0, toolchain stable-x86_64-pc-windows-msvc
- Project scaffolded at C:\Users\User\Desktop\focustap with npm create tauri-app@latest focustap --template react-ts
- Tailwind CSS v4 configured (CSS-first, @theme block, no tailwind.config.js)
- Tauri v2 Rust backend (src-tauri/src/lib.rs, 157 lines) with: migrations v1-v5 (tasks, priority/tags, sort_order/recurrence, notes/parent_id, pomodoro_sessions/activity_log), tray icon (left-click toggle + menu with Show/Quit), global shortcut (Ctrl+Shift+Space), autostart plugin, WindowEvent::CloseRequested hides to tray, WindowEvent::Focused(false) auto-hides
- 12 frontend components in src/components/:
  1. TaskInput.tsx — NLP priority (!h/!m/!l) and tag (#tagname) parsing
  2. TaskList.tsx — subtask grouping (indent, expand/collapse, progress badge, toggleWithChildren), move up/down, search filtering, keyboard nav, detail button
  3. TaskSearch.tsx — Ctrl+F quick-find, Esc clears, X button
  4. PomodoroTimer.tsx — SVG progress ring, MM:SS, work/break auto-switch, chime, duration persistence
  5. TaskDetail.tsx — slide-over with editable text/priority/tags/notes/recurrence, subtask list, metadata
  6. ShortcutOverlay.tsx — ? key lists all keyboard shortcuts
  7. StatisticsPanel.tsx — 3 tabs (Daily Trend bar chart, Streak Calendar GitHub-style grid, Productive Hour Heatmap 24x7 grid), CSS-only charts, summary KPI cards
  8. CalendarView.tsx — Week view (7-column day grid), Month view (calendar grid with task dots), navigation arrows, Today button, selected-day detail
  9. FocusAnalytics.tsx — best focus hour, best day, consistency score, avg completions, total pomodoros, AI suggestion cards from suggestion engine
  10. SettingsPanel.tsx — auto-start toggle, hotkey display, sound toggle, pomodoro duration sliders
  11. ShortcutOverlay.tsx — keyboard reference grouped by category
  12. Confetti animation in index.css on all-tasks-completed
- src/lib/db.ts (385 lines) — all CRUD: Task/PomodoroSession/ActivityLog/StreakDay interfaces; create/read/update/delete/move; subtask lifecycle; streak computation; date-range queries
- src/lib/suggestions.ts — rule-based heuristic suggestion engine (no LLM, deterministic rules for overdue, high-priority, streak-at-risk, pomodoro, breakdown)
- src/lib/export.ts — CSV + Markdown export via DOM blob download
- src/lib/sounds.ts — Web Audio API chime
- src/store.ts (338 lines) — Zustand store with all state and actions for tasks, pomodoro, search, UI panels, notes/subtasks
- npx tsc --noEmit passes clean with zero type errors
- npm run build succeeds (278KB JS + 39KB CSS single chunk)
- Git repo initialized at focustap root with all 59 files staged (A status), no commits yet
- opencode.jsonc model config fixed at ~/.config/opencode/opencode.jsonc — working fallback models for all 8 categories and 6 agents, zai-coding-plan provider disabled
- Previous tauri build from early session produced working installers; current Rust code has v4+v5 migrations added and needs re-compilation

CURRENT STATE
-------------
- Frontend is 100% complete — all 12 feature components compiled and building successfully
- Rust backend has all plugin registrations and migrations, but has NOT been re-compiled since v4+v5 were added
- Git repo has zero commits — all 59 files staged as additions (A status) awaiting initial commit
- opencode config at ~/.config/opencode/opencode.jsonc has working model fallbacks for all agents (no more dead model references)
- The app binary that was previously on the desktop is a separate build — the source at C:\Users\User\Desktop\focustap needs a fresh tauri build to produce an updated installer
- No todos currently tracked in the session (all implementation work was done inline)

PENDING TASKS
-------------
- Run npm run tauri build to compile Rust binary with all 5 migrations and produce MSI/NSIS installer
- npx tsc --noEmit verification (currently passes — re-verify after any changes)
- End-to-end manual QA on the built binary:
  - Global hotkey (Ctrl+Shift+Space) show/hide
  - Focus-loss auto-hide
  - Close button hides to tray
  - Tray icon left-click toggle and right-click menu
  - Task CRUD (create, edit done state, inline edit, delete)
  - Priority NLP parsing (!h !m !l), tag NLP (#tagname)
  - Subtask creation, indent rendering, parent auto-complete
  - Pomodoro start/pause/reset, work->break auto-switch, chime, duration settings
  - Task detail slide-over (all fields save correctly)
  - Statistics panel data loading and CSS chart rendering
  - Calendar week/month navigation, task dots, day detail
  - Focus Analytics panel with heuristic suggestion cards
  - CSV and Markdown export file downloads
  - Search (Ctrl+F), keyboard navigation, ? shortcut overlay
  - Streak tracking and flame indicator
  - Settings persistence (auto-start, sound, pomodoro durations)
  - Confetti animation on all-tasks-completed
- New features user requested:
  - Calendar integration (deeper than current view — sync tasks with actual dates, drag or reassign dates)
  - Notepad function (persistent freeform notes panel, independent of task notes)
  - School/day-planner template design (class period or time-block layout for daily schedule)
- Optionally create initial git commit to establish baseline
- If opencode background agents still fail, verify fallback models with opencode list-models and update ~/.config/opencode/opencode.jsonc accordingly

KEY FILES
---------
- src-tauri/src/lib.rs — Rust backend: 5 SQLite migrations (v1-v5), tray icon, global shortcut (Ctrl+Shift+Space), autostart, window focus/close behavior
- src/lib/db.ts — All CRUD: Task/PomodoroSession/ActivityLog/StreakDay interfaces, SQL queries, subtask/streak/task-date-range functions
- src/store.ts — Zustand store: tasks/pomodoro/search/UI state + all actions (338 lines)
- src/App.tsx — Root component: all 12 feature components wired, keyboard shortcuts, header buttons (stats/calendar/focus/export/settings)
- src/components/TaskList.tsx — Subtask rendering, inline editing, move/delete, keyboard nav, search filtering (450 lines)
- src/components/PomodoroTimer.tsx — SVG ring timer, work/break phase auto-switch, chime, duration settings
- src/components/CalendarView.tsx — Week/month view, navigation, task dots per day (251 lines)
- src/components/StatisticsPanel.tsx — 3-tab CSS-only charts (daily trend, streak calendar, heatmap)
- src/index.css — Tailwind v4 @theme tokens, glassmorphism utilities, all animations, priority/tag styles (226 lines)
- src-tauri/tauri.conf.json — Window config: decorations=false, visible=false, alwaysOnTop=true, 420x560, resizable=false

IMPORTANT DECISIONS
-------------------
- DB via JS API (not Rust commands): @tauri-apps/plugin-sql JS bindings handle all CRUD directly. No Rust #[tauri::command] duplication. DB path is %APPDATA%/com.focustap.app/focustap.db
- Tailwind v4 CSS-first: No tailwind.config.js, no PostCSS, no @tailwind directives. Single @import "tailwindcss" in CSS. Custom theme via @theme { } block
- Window show/set_focus/center chain: Required for reliable focus on Windows (Tauri #11566)
- Sub-task depth = 1: Flat parent-child, no grandchild nesting
- Cross-device sync deferred: Data model has sync-ready columns but no server implementation
- Heuristic AI only: Deterministic rules for suggestions (overdue, high-priority, streak, pomodoro, breakdown). No LLM, no API calls
- Charts are CSS-only: No charting library dependency. Bar charts via div heights, heatmap via color classes, streak grid via Tailwind grid
- Blob download for export: FileSaver via DOM blob URL, not Tauri save dialog (simpler, no new plugin)
- Pomodoro auto-switch: Phase transitions work/break/work automatically. Timer ticks at 1s interval, cleanup on phase change
- NLP input parsing: !h/!m/!l for priority, #tagname for tags, parsed inline in TaskInput component
- Priority indicators: red=high, yellow=medium, blue=low
- Tags as pill chips with # prefix in the UI

EXPLICIT CONSTRAINTS
--------------------
- Local-only SQLite (no cloud, no accounts, no sync)
- Window decorations=false, visible=false at startup, hide on focus loss, close/tray
- Must feel instant: <200ms show, auto-focused input
- Hotkey: Ctrl+Shift+Space via tauri-plugin-global-shortcut
- Dark minimal overlay design (Wispr Flow inspired), Inter font, lavender accent (#978fff)
- No punishment mechanics, zero friction capture, empty space is a feature
- Never use as any / @ts-ignore / @ts-expect-error — strict types everywhere
- No new npm dependencies — all charts CSS-only
- Natural language input: !h/!m/!l for priority, #tagname for tags
- Only animate transform and opacity; respect prefers-reduced-motion
- Max weight 590 on Inter Variable font

CONTEXT FOR CONTINUATION
------------------------
- The Rust toolchain MUST have the override active: rustup override set stable-x86_64-pc-windows-msvc from the focustap directory. Verify with rustup show active-toolchain before any Rust compilation.
- To build the app, run: npm run tauri build (from focustap root). This produces an MSI installer in src-tauri/target/release/bundle/msi/.
- The SQLite DB path is sqlite:focustap.db, which resolves to %APPDATA%/com.focustap.app/focustap.db. The DB is automatically created with all migrations on first run.
- No commits have been made — git status shows 59 staged files (A status). First commit should establish the baseline before new work begins. For git operations load the /git-master skill.
- The opencode config at ~/.config/opencode/opencode.jsonc was fixed to remove dead model references. If agent spawns still fail, run opencode list-models to check available models and update the fallback_models arrays. Primary model is opencode/deepseek-v4-flash-free.
- For any new visual/components work, load the /frontend skill to get design taste routing and best practices for dark glassmorphism.
- The app currently uses Ctrl+Shift+Space (global hotkey show/hide), Ctrl+F (in-app search), Ctrl+Shift+P (pomodoro toggle), ? (shortcut overlay), n (focus input), Escape (close panel or hide window).
- For the school/day-planner template: consider a view that shows time blocks (e.g., 08:00-09:30 Period 1, 09:45-11:15 Period 2) with tasks assigned to each block, plus a separate notepad panel that can be toggled from the header. Calendar integration should allow dragging tasks to dates or reassigning created_at dates.
- Previous tauri build from early session succeeded and produced working installers but did NOT include v4+v5 migrations. Current Rust code needs re-compilation.
