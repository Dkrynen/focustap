---
slug: focustap-v1
status: drafting
intent: clear
pending-action: write .omo/plans/focustap-v1.md
approach: Execute full v1 roadmap (P1+P2+P3) in parallel waves — database foundation first, then concurrent feature teams, then verification.
---

# Draft: focustap-v1

## Components (topology ledger)
| id | outcome | status | evidence path |
|---|---|---|---|
| DB-MIGRATIONS | migrations v4 + v5 for notes, parent_id, pomodoro_sessions, activity_log | active | src-tauri/src/lib.rs |
| POMODORO | Pomodoro timer component + store + notifications | active | src/components/PomodoroTimer.tsx |
| DETAIL-VIEW | Task detail panel (slide-over) with notes/edit | active | src/components/TaskDetail.tsx |
| SUBTASKS | Subtask rendering + create/complete in TaskList | active | src/components/TaskList.tsx |
| SHORTCUTS | Keyboard shortcut reference overlay + custom shortcuts | active | src/components/ShortcutsPanel.tsx |
| STATISTICS | WFH stats panel with charts | active | src/components/StatisticsPanel.tsx |
| CALENDAR | Week/month calendar views | active | src/components/CalendarView.tsx |
| EXPORT | CSV/Markdown export via Tauri dialog | active | src/lib/export.ts |
| AI-SUGGEST | Smart prioritization/heuristic suggestions | active | src/lib/suggestions.ts |
| FOCUS-ANALYTICS | Deep focus analytics panel | active | src/components/FocusAnalytics.tsx |
| SYNC | Cross-device cloud sync | deferred | — (requires backend infrastructure) |

## Open assumptions (announced defaults)
| assumption | adopted default | rationale | reversible? |
|---|---|---|---|
| No new npm deps | All UI built with existing Tailwind + lucide-react; no chart library | Keep bundle small, no dependency risk | Yes |
| Pomodoro: 25min work / 5min break | Standard Pomodoro timing | Industry default, user can customize in settings | Yes |
| Subtask max depth = 1 | Flat subtask list (parent → children), no grandchild nesting | UI complexity, 99% of use cases covered | Yes |
| Cross-device sync deferred | Will design data model for sync but NOT implement server | Requires full backend; out of scope for client-only v1 | Yes |
| AI suggestions = rule-based | Heuristic scoring based on priority/due proximity/patterns | No LLM dependency, works offline | Yes |
| Statistics: 3 built-in views | Daily completion trend, streak calendar, productive-hour heatmap | Most requested WFH metrics | Yes |
| Keyboard shortcuts shown with ? key | ? toggle overlay, Esc closes | Things 3 pattern, discoverable | Yes |
| Task detail = slide-over panel | Slides from right, not modal | Context preservation, smooth UX | Yes |

## Findings (cited - path:lines)
- Current data model: tasks(id, text, is_done, created_at, completed_at, priority, tags, sort_order, recurrence) — src/lib/db.ts:16-26
- No notes column yet — needed for detail view
- No parent_id column yet — needed for subtasks
- Zustand store pattern: src/store.ts — all state through single create<TaskState>() store
- CSS animations only animate transform/opacity (index.css lines 101-226)
- Tailwind v4 with @theme custom tokens (index.css:3-39)
- Keyboard shortcuts in App.tsx: Escape (hide/minimize), n (focus input), Ctrl+F (search) — src/App.tsx:28-51
- Tauri v2 plugin-sql for SQLite — package.json:17
- Lucide-react for icons — package.json:18

## Decisions (with rationale)
1. **Slide-over panel for detail view** — preserves task list context, smooth slideInRight animation exists
2. **Pomodoro as its own component** — not embedded in detail view; accessible from header/always
3. **Subtasks through parent_id + recursive query** — simple SQL pattern, no closure table needed for depth=1
4. **Activity log for statistics** — INSERT on every task action (create/complete/delete), enables all metric queries
5. **No backend for sync** — data model will include sync_id/updated_at for future, but no server code
6. **Heuristic AI, not LLM** — rules over patterns (overdue=boost, consistent time=tag productive, etc.)

## Scope IN
- P1: Pomodoro timer, task detail view (notes, full edit), subtasks (parent_id, indent, collapse/expand)
- P2: Keyboard shortcut reference (?), WFH statistics (trends/streak chart/heatmap), week/month calendar views, CSV/Markdown export
- P3: Heuristic AI suggestions, deep focus analytics
- Data model for future sync (sync metadata columns) but NO sync implementation

## Scope OUT (Must NOT have)
- Cross-device sync server/client implementation
- Third-party integrations (Slack, Notion, etc.)
- Native mobile app
- LLM-based AI features
- Real-time collaboration
- Cloud authentication

## Open questions
None — all forks resolved by evidence or adopted defaults.

## Approval gate
status: awaiting-approval
<!-- When exploration is exhausted and unknowns are answered, set status: awaiting-approval. -->
<!-- That durable record is the loop guard: on a later turn read it and resume at the gate instead of re-running exploration. -->
