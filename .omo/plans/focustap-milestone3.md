# focustap-milestone3 - Customizable Theme Engine + UI Overhaul + Team Features

## TL;DR (For humans)

**What you'll get:**
1. **Makeover themes** — 5 handcrafted looks (Midnight, Aurora, Sepia, Evergreen, Monochrome) you can switch instantly, plus an accent-color picker to tint everything your way
2. **UI/UX polish** — consistent glassmorphism, refined spacing, smooth animations, proper focus rings, all components feeling like they belong to the same app
3. **Team collaboration** — create workspaces, invite teammates via email, assign tasks, see real-time who's working on what, all synced through Supabase

**Why this approach:** CSS custom-property switching (no CSS file swapping) keeps Tailwind v4's `@theme` mapping intact — zero recompilation, instant theme swaps, and the accent picker just writes to `--accent-*` vars at runtime. For team features, Supabase's JS client runs natively in Tauri's webview — the PostgreSQL + Realtime combo covers auth, sync, and live presence without a custom backend.

**What it will NOT do:** No drag-and-drop taskboard, no kanban, no file attachments, no calendar sync to Google/Outlook, no desktop notifications for team events. No social features (likes, comments, activity feed). No mobile app.

**Effort:** XL — 3 major feature pillars across the full stack.
**Risk:** Medium — Supabase integration in Tauri webview has edge cases around OAuth redirects and offline mode.
**Decisions I made for you:** Hybrid theme engine (static CSS presets + runtime accent overrides), Supabase JS v2 with PKCE OAuth, component-by-component refactor (no full rewrite), offline-first via local SQLite with periodic Supabase sync.

Your next move: **Approve this plan** to begin execution, or schedule a review call.

---

> TL;DR (machine): XL effort, Medium risk, 3 parallel workstreams (themes + UI + teams) across ~40 todos, 6 execution waves, Supabase for backend.

## Scope

### Must have

**Phase 1 — Critical Fixes (pre-requisite)**
- Install `@sentry/tauri` npm dependency and wire Tauri integration in sentry.ts
- Add `aria-checkbox` / `aria-dialog` / `aria-modal` roles to interactive components
- Persist theme selection to `localStorage` in setTheme()
- Move `@tauri-apps/plugin-dialog` from devDependencies to dependencies
- Replace all 19 hardcoded `showToast("...")` strings with `t()` i18n calls + add keys to all locale files
- Replace all hardcoded `PRIORITIES` labels with `t()` calls
- Replace 50+ hardcoded color literals across components with CSS variable references
- Add 5+ missing i18n keys (empty-state messages, aria-labels, button texts)

**Phase 2 — Customizable Theme Engine**
- 5 theme presets: Midnight (current dark), Aurora (purple-blue accent shift), Sepia (warm paper), Evergreen (green accent), Monochrome (gray-scale)
- Light variant for each preset (5 light + 5 dark = 10 theme classes total)
- Accent color picker in Settings Panel — allows user-picked accent that overrides current theme's accent
- Theme preview card in Settings showing live sample UI
- User theme preference persisted to localStorage, synced to DB setting
- FOUC prevention: inline `<script>` in index.html reads localStorage before React mounts
- CSS variable cleanup: remove hardcoded `#8b7eff` from `@theme` block, reference `--accent-primary` everywhere
- Add `--accent-rgb` for rgba() usage in heatmaps, focus rings, glows
- Dead CSS removal: remove `bg-accent-glow`, `animate-glow-pulse` if unused

**Phase 3 — UI/UX Design System Overhaul**
- Extract shared component primitives: `SlideInPanel`, `CloseButton`, `EmptyState`, `Toggle`, `IconButton`
- Fix 20+ consistency issues across all 16 components (input heights, button radii, spacing, color tokens)
- Uniform glassmorphism treatment: all panels use same backdrop-blur, same border-opacity, same padding scale
- Refined typography: consistent heading hierarchy, line-height, font-weight usage
- Smooth page transitions: fade-in for panels, slide-in for overlays
- Keyboard navigation audit: tab order, focus trapping in modals, Escape to close
- Focus ring style: consistent `ring-2 ring-accent-primary ring-offset-2` using the accent variable

**Phase 4 — Supabase Backend Setup**
- Create Supabase project (via dashboard — documented in `.env.example`)
- Install `@supabase/supabase-js` v2
- Create Supabase client singleton with anon key from env vars
- Design DB schema: `workspaces`, `workspace_members`, `tasks` (with workspace_id FK), `task_assignments`
- Set up Row-Level Security policies (users see only their workspace's tasks)
- Write typed query helpers for workspace CRUD, member management, task sync

**Phase 5 — Team Auth & Workspace Management**
- Email-based invite flow (Supabase Auth magic link)
- Workspace creation modal: name, optional description, auto-creator-as-owner
- Workspace switcher in sidebar: dropdown of user's workspaces
- Member management: view members, remove member (owner only), leave workspace
- Invite acceptance flow: notified when added, accept to join

**Phase 6 — Team Task Sync & Real-time**
- Task CRUD API calls to Supabase (insert/update/delete)
- Offline-first: local SQLite is source of truth, sync queue to Supabase when online
- Realtime subscriptions: workspace channels push task changes to all members
- Task assignment: assignee selector in TaskDetail, shows assigned tasks in sidebar
- Presence indicators: show online members of current workspace with green dot
- Sync status indicator: small icon showing "Synced" / "Syncing..." / "Offline"

### Must NOT have (guardrails, anti-slop, scope boundaries)
- No drag-and-drop kanban board
- No file attachments to tasks
- No Google Calendar / Outlook sync
- No push/desktop notifications for team events
- No social features (comments, likes, activity feed)
- No mobile or tablet layout changes — Tauri desktop only
- No WebSocket server — Supabase Realtime handles it
- No breaking existing Milestone 1 & 2 functionality (i18n, light mode, analytics, data backup, accessibility)

## Verification strategy
> Zero human intervention — all verification is agent-executable.

- **Test decision:** Tests-after for phases 1-3 (UI/themes are hard to unit test), TDD for phases 4-6 (data logic needs correctness guarantees)
- **Framework:** vitest for unit, @playwright/experimental-ct-react for component tests (if needed)
- **Evidence:** `.omo/evidence/task-<N>-focustap-milestone3.<ext>`

**Verification gates per phase:**
| Phase | Gate 1 | Gate 2 | Gate 3 |
|-------|--------|--------|--------|
| Fixes | `tsc --noEmit` clean | `vitest run` passes | LSP diagnostics clean |
| Themes | Each preset renders correctly visually | Light variant renders | Accent picker changes all accent UI |
| UI | All panels same glass style | Tab order works | No hardcoded colors remain |
| Supabase | Client connects | RLS policies enforced | Schema matches plan |
| Auth | Invite flow works | Workspace CRUD works | Member management works |
| Realtime | Tasks sync across sessions | Presence shows online | Offline queue then syncs |

## Execution strategy

### Parallel execution waves

| Wave | Focus | Todos count | Parallel? |
|------|-------|-------------|-----------|
| 1 | Critical fixes (sentry, aria, i18n, themestore) | 5 | Yes — all independent |
| 2 | Theme engine (CSS presets + accent picker + FOUC) | 5 | Mostly — presets in parallel, picker sequential |
| 3 | UI design system (primitives extraction + consistency) | 6 | 2 parallel groups |
| 4 | Supabase setup (client + schema + RLS) | 4 | Sequential — schema before queries |
| 5 | Auth + Workspaces (invite, switch, members) | 5 | Partially parallel |
| 6 | Team sync (offline + realtime + assignment + presence) | 6 | Parallel for independent features |
| F | Final verification (compliance, quality, QA) | 4 | All parallel |

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1.1 sentry/tauri dep | — | — | 1.2, 1.3, 1.4, 1.5 |
| 1.2 aria roles | — | — | 1.1, 1.3, 1.4, 1.5 |
| 1.3 localStorage theme persist | theme engine context | 2.x (themes) | — |
| 1.4 plugin-dialog dep fix | — | — | 1.1, 1.2, 1.5 |
| 1.5 i18n showToast + hardcoded colors | locale understanding | 3.x (UI) | 1.1, 1.2, 1.4 |
| 2.1 CSS theme classes (5 presets) | 1.3 | 2.4, 2.5 | 2.2, 2.3 |
| 2.2 Accent color picker | 1.3 | 2.4, 2.5 | 2.1, 2.3 |
| 2.3 FOUC prevention script | 1.3 | — | 2.1, 2.2 |
| 2.4 CSS cleanup (dead vars, --accent-rgb) | 2.1 | 3.x (UI) | 2.5 |
| 2.5 Theme preview in settings | 2.1, 2.2 | — | 2.4 |
| 3.1 Extract UI primitives | 1.5, 2.4 | 3.2, 3.3, 3.4 | — |
| 3.2 Component consistency pass | 3.1 | 3.5 | 3.3 |
| 3.3 Typography/glassmorphism refinement | 3.1 | 3.5 | 3.2 |
| 3.4 Keyboard nav + focus rings | 3.1 | 3.5 | 3.2, 3.3 |
| 3.5 QA pass | 3.2-3.4 | — | — |
| 4.1 Supabase project docs + client | — | 4.2 | — |
| 4.2 DB schema + migration | 4.1 | 4.3 | — |
| 4.3 RLS policies | 4.2 | 4.4 | — |
| 4.4 Typed query helpers | 4.3 | 5.x | — |
| 5.1 Auth invite/magic-link flow | 4.4 | 5.2, 5.3 | — |
| 5.2 Workspace CRUD | 4.4 | 5.3, 5.4 | 5.1 |
| 5.3 Workspace switcher UI | 5.2 | 5.5 | 5.1 |
| 5.4 Member management | 5.2 | 5.5 | 5.3 |
| 5.5 Invite acceptance flow | 5.1, 5.4 | 6.x | — |
| 6.1 Task sync to Supabase | 5.5 | 6.3 | 6.2 |
| 6.2 Offline queue | 5.5 | 6.3 | 6.1 |
| 6.3 Realtime subscriptions | 6.1 | 6.4, 6.5, 6.6 | — |
| 6.4 Task assignment UI | 6.3 | — | 6.5, 6.6 |
| 6.5 Presence indicators | 6.3 | — | 6.4, 6.6 |
| 6.6 Sync status indicator | 6.3 | — | 6.4, 6.5 |

## Todos

### Wave 1 — Critical Milestone 2 Fixes (all parallel)

- [ ] 1. Install @sentry/tauri npm dependency and wire Tauri integration
  What to do / Must NOT do: Add `@sentry/tauri` to package.json dependencies (not devDependencies). Import and configure in `src/lib/sentry.ts` — add `SentryTauri.init()` alongside existing `Sentry.init()`. Do NOT modify any component files. Do NOT add fake DSN or placeholder — read the actual DSN from env var.
  Parallelization: Wave 1 | Blocked by: — | Blocks: —
  References: `src/lib/sentry.ts:1-20`, `package.json:dependencies`, `https://docs.sentry.io/platforms/javascript/guides/tauri/`
  Acceptance criteria: `npm ls @sentry/tauri` shows installed version. `tsc --noEmit` passes with the new import.
  QA scenarios: Run `npm run build` — should pass. Evidence `.omo/evidence/task-1-sentry-install.txt`
  Commit: Y | `fix(deps): add @sentry/tauri dependency`

- [ ] 2. Add missing aria roles to interactive components
  What to do / Must NOT do: Audit all 16 `.tsx` components for: (a) elements acting as `checkbox` need `role="checkbox"` + `aria-checked`, (b) panel overlays need `role="dialog"` + `aria-modal="true"` + `aria-label`, (c) close buttons need `aria-label="Close"`. Do NOT change any styling or layout. Do NOT use `useAria` hooks — just static attributes.
  Parallelization: Wave 1 | Blocked by: — | Blocks: —
  References: `src/components/SettingsPanel.tsx` (dialog), `src/components/TaskDetail.tsx` (dialog), `src/components/NotesPanel.tsx` (dialog), `src/components/StatisticsPanel.tsx`, `src/components/PomodoroTimer.tsx`, `src/components/TaskList.tsx` (checkbox items), all 16 component files
  Acceptance criteria: `grep -r "role="checkbox"" src/components/` returns at least 5 matches. `grep -r "aria-modal" src/components/` returns at least 3 matches. `tsc --noEmit` passes.
  QA scenarios: Playwright snapshot check — verify aria attributes present on interactive elements. Evidence `.omo/evidence/task-2-aria-roles.txt`
  Commit: Y | `fix(a11y): add aria-checkbox, aria-dialog, aria-modal roles`

- [ ] 3. Persist theme selection to localStorage
  What to do / Must NOT do: In `src/App.tsx`, find where `document.documentElement.classList.toggle("light", ...)` is called (line ~82-84). Before that toggle, write to `localStorage.setItem("theme", light ? "light" : "dark")`. Also read from localStorage on initial load — check `localStorage.getItem("theme")` first, fall back to `matchMedia("(prefers-color-scheme: light)")` if no stored value. Do NOT create a separate theme store. Do NOT touch `src/store.ts`.
  Parallelization: Wave 1 | Blocked by: — | Blocks: 2.x (theme engine depends on theme persistence working)
  References: `src/App.tsx:80-90`
  Acceptance criteria: Toggle light/dark mode in app → close app → reopen → theme persists. localStorage has "theme" key with "light" or "dark".
  QA scenarios: `localStorage.getItem("theme")` after toggle. Evidence `.omo/evidence/task-3-theme-persist.txt`
  Commit: Y | `fix(theme): persist theme selection to localStorage`

- [ ] 4. Move @tauri-apps/plugin-dialog from devDependencies to dependencies
  What to do / Must NOT do: Edit `package.json` — move `@tauri-apps/plugin-dialog` from `devDependencies` to `dependencies`. Run `npm install` after. Do NOT change versions. Do NOT touch any other file.
  Parallelization: Wave 1 | Blocked by: — | Blocks: —
  References: `package.json:devDependencies` (find `@tauri-apps/plugin-dialog` entry)
  Acceptance criteria: `npm ls @tauri-apps/plugin-dialog` shows it under dependencies, not devDependencies.
  QA scenarios: `node -e "require('@tauri-apps/plugin-dialog')"` should error with proper message (it needs Tauri runtime), but import should resolve. Evidence `.omo/evidence/task-4-plugin-dialog.txt`
  Commit: Y | `fix(deps): move @tauri-apps/plugin-dialog to dependencies`

- [ ] 5. Replace all hardcoded showToast strings with i18n t() calls + add keys
  What to do / Must NOT do: In `src/store.ts`, replace all 19 `showToast("some string")` calls with `showToast(t("toast.someKey"))`. Add the corresponding key-value pairs to `src/locales/en.json`, `src/locales/ko.json`, `src/locales/ja.json`. Also replace `PRIORITIES` hardcoded labels array with `t("priority.low")` etc. Do NOT change toast appearance or behavior. Do NOT break existing i18n patterns. The `t` function is already available in `src/store.ts` via `import { useTranslation } from "react-i18next"` at the component level — check whether it's available or needs to be imported in the store (the store uses zustand, may need to pass t as parameter or use i18next directly via `i18next.t()`).
  Parallelization: Wave 1 | Blocked by: — | Blocks: 3.x (UI overhaul needs clean i18n baseline)
  References: `src/store.ts` (all 19 showToast lines), `src/locales/en.json`, `src/locales/ko.json`, `src/locales/ja.json`, `src/lib/db.ts` (PRIORITIES definition location)
  Acceptance criteria: Zero hardcoded English toast strings in store.ts. `grep 'showToast("' src/store.ts` returns empty. All 3 locale files have the new keys. `tsc --noEmit` passes.
  QA scenarios: Trigger each toast condition (add task, error, etc.) — verify correct translated string appears. Evidence `.omo/evidence/task-5-i18n-toasts.txt`
  Commit: Y | `fix(i18n): replace hardcoded toast strings with t() calls`

### Wave 2 — Theme Engine

- [ ] 6. Create 5 CSS theme preset classes (dark variants)
  What to do / Must NOT do: In `src/index.css`, add 5 theme classes: `.theme-midnight` (same as current :root), `.theme-aurora` (purple/blue accent shift), `.theme-sepia` (warm brown tones), `.theme-evergreen` (green accent), `.theme-monochrome` (gray-scale). Each class defines all 13+ CSS custom properties (--surface-*, --text-*, --border-*, --input-*, --accent-primary, --accent-hover, --accent-subtle). Each theme's accent-primary is unique. Do NOT modify existing :root or .light classes. Keep existing :root as default fallback (theme-midnight behavior). Must NOT do: Do NOT use CSS `@layer` or `@media` for theming.
  Parallelization: Wave 2 | Blocked by: 1.3 (theme persist) | Blocks: 2.4, 2.5
  References: `src/index.css:34-72` (current :root and .light structure)
  Acceptance criteria: Adding `class="theme-aurora"` to `<html>` changes accent-primary to purple-blue. All themes have all required properties set. LSP diagnostics clean.
  QA scenarios: Manually apply each class in devtools — verify visual difference. Evidence `.omo/evidence/task-6-theme-presets.css`
  Commit: Y | `feat(theme): add 5 CSS theme preset classes`

- [ ] 7. Create 5 CSS theme preset classes (light variants)
  What to do / Must NOT do: Add `.light.theme-midnight`, `.light.theme-aurora`, `.light.theme-sepia`, `.light.theme-evergreen`, `.light.theme-monochrome` classes in `src/index.css`. Each is the light variant of the corresponding dark theme — lighter surfaces, dark text, same accent color as the dark variant. Must NOT do: Do not create a separate file — append to index.css. Do not duplicate common properties — each should define only the values that differ from the dark variant.
  Parallelization: Wave 2 | Blocked by: 1.3, 6 | Blocks: 2.4, 2.5
  References: `src/index.css:55-73` (current .light class)
  Acceptance criteria: `<html class="light theme-aurora">` renders light background with aurora accent. All 5 light variants render correctly.
  QA scenarios: Toggle each theme in light mode — verify readable contrast. Evidence `.omo/evidence/task-7-theme-presets-light.css`
  Commit: Y | `feat(theme): add light variants for all 5 theme presets`

- [ ] 8. Add accent color picker to Settings Panel
  What to do / Must NOT do: Add an "Accent Color" section in `src/components/SettingsPanel.tsx` with a row of preset color swatches (8-10 options) plus a native `<input type="color">` for custom pick. On selection: set `document.documentElement.style.setProperty("--accent-primary", color)`, compute and set `--accent-hover` (lighter) and `--accent-subtle` (with alpha). Persist to localStorage key `accent`. Show a preview of each swatch. Must NOT do: Do NOT add any npm package — use native color input. Do NOT modify theme switching behavior — accent overrides theme accent.
  Parallelization: Wave 2 | Blocked by: 1.3 | Blocks: 2.4, 2.5
  References: `src/components/SettingsPanel.tsx` (existing theme toggle section), `src/index.css:18-20` (current accent variables)
  Acceptance criteria: Clicking a swatch changes `--accent-primary` on `<html>`. Custom color picker updates all accent UI. Reloading preserves chosen accent from localStorage. `tsc --noEmit` passes.
  QA scenarios: Pick accent → close settings → reopen → accent still shown as selected. Evidence `.omo/evidence/task-8-accent-picker.txt`
  Commit: Y | `feat(theme): add accent color picker to settings`

- [ ] 9. FOUC prevention with inline script
  What to do / Must NOT do: Edit `src/index.html` — add an inline `<script>` in `<head>` before any CSS loads that reads `localStorage.getItem("theme")` and `localStorage.getItem("accent")` and applies `document.documentElement.classList.add(...)` and `style.setProperty(...)` synchronously. This prevents flash of wrong theme on page load. Must NOT do: Do NOT use `defer` or `async` — must be synchronous. Do NOT move this to a separate JS file — must be inline. Handle the case where localStorage has no values (default to dark, midnight, default accent).
  Parallelization: Wave 2 | Blocked by: 1.3 | Blocks: —
  References: `src/index.html` (find `<head>` structure)
  Acceptance criteria: Page loads with correct theme even on slow connections. No flash of dark theme when user had light theme. `tsc --noEmit` passes (the inline script is plain JS, not TS).
  QA scenarios: Set light theme + accent → hard refresh → no flash, correct theme immediately. Evidence `.omo/evidence/task-9-fouc-prevention.txt`
  Commit: Y | `feat(theme): add FOUC prevention inline script`

- [ ] 10. CSS variable cleanup + add --accent-rgb
  What to do / Must NOT do: (a) Remove hardcoded `#8b7eff` from `@theme` block's `--color-accent-*` — make them reference `var(--accent-*)` so the accent picker works. (b) Add `--accent-rgb` to `:root` and `.light` (and all theme classes) as `139,126,255` etc. for use with `rgba()`. (c) Find and remove `bg-accent-glow` and `animate-glow-pulse` classes if they're defined but unused (check grep). (d) Remove any dead CSS rules referencing removed classes. Must NOT do: Do NOT change any component behavior. Do NOT remove utility classes used elsewhere.
  Parallelization: Wave 2 | Blocked by: 6, 8 | Blocks: 3.x
  References: `src/index.css:3-31` (@theme block), `src/index.css:34-72` (root vars), all component .tsx files (for dead class grep)
  Acceptance criteria: `grep '#8b7eff' src/index.css` returns empty. `grep -- '--accent-rgb' src/index.css` returns at least 1 match. `tsc --noEmit` passes.
  QA scenarios: Verify accent picker changes affect accent buttons across all components. Evidence `.omo/evidence/task-10-css-cleanup.txt`
  Commit: Y | `refactor(theme): clean up CSS variables, add --accent-rgb, remove dead classes`

- [ ] 11. Theme preview card in Settings Panel
  What to do / Must NOT do: In `src/components/SettingsPanel.tsx`, add a theme preview section showing a small card with sample UI elements (button, text, background, border) rendered in the currently selected theme. The preview card should use a nested `classList` that only applies to the preview area (use a `<div>` with the theme class name). Must NOT do: Do NOT use an iframe. Do NOT create a separate component file. Keep it within SettingsPanel.
  Parallelization: Wave 2 | Blocked by: 6, 8 | Blocks: —
  References: `src/components/SettingsPanel.tsx` (theme section area)
  Acceptance criteria: Preview card updates in real-time when changing theme. All 5 themes render correctly in preview. `tsc --noEmit` passes.
  QA scenarios: Switch themes in picker → preview updates without leaving settings. Evidence `.omo/evidence/task-11-theme-preview.txt`
  Commit: Y | `feat(theme): add live theme preview card in settings`

### Wave 3 — UI/UX Design System Overhaul

- [ ] 12. Extract shared UI primitives
  What to do / Must NOT do: Create `src/components/primitives/` directory with extracted shared components: `SlideInPanel.tsx` (reusable slide-in overlay wrapper — currently repeated in 7 panels), `CloseButton.tsx`, `EmptyState.tsx` (icon + message + optional action), `Toggle.tsx` (styled switch), `IconButton.tsx`. Each extracts the pattern from the most mature existing usage. Must NOT do: Do NOT change visual appearance. Do NOT rename or remove existing components — update them to import from primitives.
  Parallelization: Wave 3 (parallel group A) | Blocked by: 1.5, 2.4 | Blocks: 12, 13
  References: `src/components/SettingsPanel.tsx` (SlideInPanel pattern), `src/components/TaskDetail.tsx` (SlideInPanel pattern), `src/components/NotesPanel.tsx` (SlideInPanel pattern), `src/components/StatisticsPanel.tsx`, `src/components/FocusAnalytics.tsx`, `src/components/CalendarView.tsx`, `src/components/ShortcutOverlay.tsx` — ALL follow same panel pattern
  Acceptance criteria: 5 new files in `src/components/primitives/`. Existing components still render identically. `tsc --noEmit` passes.
  QA scenarios: All 7 slide-in panels still open/close correctly. Evidence `.omo/evidence/task-12-primitives.txt`
  Commit: Y | `refactor(ui): extract shared component primitives`

- [ ] 13. Fix 20+ component consistency issues
  What to do / Must NOT do: Audit all 16 components for: consistent input heights (all use same h-10 or h-9), button radii (all rounded-lg or rounded-xl, not mixed), padding (consistent p-3/p-4 in panels), color tokens (no hardcoded `#xxx` or `text-gray-*` — use `var(--text-*)` mapping), border styles (consistent `border-border-default/subtle/strong`). Fix each inconsistency found. Must NOT do: Do NOT redesign or change layout. Only fix inconsistencies. Run `tsc --noEmit` after each file change.
  Parallelization: Wave 3 (parallel group A) | Blocked by: 12 | Blocks: 14, 15
  References: All 16 files in `src/components/*.tsx`, `src/index.css` (token reference)
  Acceptance criteria: Audit count shows <3 remaining inconsistencies. All components use CSS variable references for colors (no hardcoded hex except in theme definitions). `tsc --noEmit` passes.
  QA scenarios: Compare SettingsPanel button vs TaskInput button → same height/radius. Evidence `.omo/evidence/task-13-consistency.txt`
  Commit: Y | `refactor(ui): fix 20+ component consistency issues`

- [ ] 14. Refine typography and glassmorphism treatment
  What to do / Must NOT do: (a) Define consistent heading hierarchy — all panel titles use same font-size/weight. (b) Ensure all glass panels use same `backdrop-filter: blur(16px)` (the `glass-elevated` utility). (c) Standardize border-opacity across all glass surfaces. (d) Add smooth transitions: `transition-colors duration-200` on theme-sensitive elements. Must NOT do: Do NOT change font family. Do NOT remove the existing glass utility.
  Parallelization: Wave 3 (parallel group B) | Blocked by: 12 | Blocks: 15
  References: `src/index.css:104-108` (glass-elevated utility), all component files (backdrop usage)
  Acceptance criteria: All glass panels use consistent blur value. `grep "blur(" src/components/` returns consistent values. `tsc --noEmit` passes.
  QA scenarios: Compare NotesPanel backdrop vs SettingsPanel → same visual treatment. Evidence `.omo/evidence/task-14-typography-glass.txt`
  Commit: Y | `refactor(ui): standardize glassmorphism and typography`

- [ ] 15. Keyboard nav audit + focus ring consistency
  What to do / Must NOT do: (a) Ensure tab order is logical in all panels (focusable elements in reading order). (b) Add focus trapping: when a dialog panel opens, Tab/Shift+Tab cycles within the panel (not to background). (c) Add Escape key to close each panel. (d) Standardize focus ring: `focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-primary)]` on all interactive elements. Must NOT do: Do NOT remove native focus outlines entirely — use `focus-visible:` only. Do NOT add external focus-trap library — use `useEffect` + event listener.
  Parallelization: Wave 3 (parallel group B) | Blocked by: 12 | Blocks: 16
  References: `src/components/SettingsPanel.tsx` (first to add focus trap), `src/components/TaskDetail.tsx` (focus trap), `src/components/NotesPanel.tsx` (focus trap)
  Acceptance criteria: Tab through SettingsPanel → focus cycles within panel → Escape closes. All focusable elements show visible focus ring. `tsc --noEmit` passes.
  QA scenarios: Playwright: open SettingsPanel, Tab 5 times, verify focus stays within panel. Press Escape → panel closes. Evidence `.omo/evidence/task-15-keyboard-nav.txt`
  Commit: Y | `feat(ui): keyboard navigation audit, focus trapping, consistent focus rings`

- [ ] 16. UI QA pass
  What to do / Must NOT do: Run the app, visually inspect all 7 panels + main view for: missing transitions, jarring visual breaks, inconsistent spacing, broken theme colors, misaligned text. Fix any issues found. Focus on: (a) Theme engine works across all components, (b) All panels have matching visual language, (c) No hardcoded colors remain, (d) Accent color applies to all accent-using elements. Must NOT do: Do NOT add new features. Only fix visual bugs found during QA.
  Parallelization: Wave 3 (final) | Blocked by: 13, 14, 15 | Blocks: —
  References: All component files, `src/index.css`
  Acceptance criteria: No visual regressions from Milestone 1 & 2. Theme engine works across all components. `tsc --noEmit` passes.
  QA scenarios: Manual visual inspection of all views in all 5 themes. Evidence `.omo/evidence/task-16-ui-qa.txt`
  Commit: Y | `fix(ui): QA pass — consistent visuals across all themes`

### Wave 4 — Supabase Backend Setup

- [ ] 17. Install Supabase client and create singleton
  What to do / Must NOT do: Run `npm install @supabase/supabase-js`. Create `src/lib/supabase.ts` — import `createClient` from Supabase, create singleton with `SUPABASE_URL` and `SUPABASE_ANON_KEY` from `import.meta.env.VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Export `supabase` client instance. Add env vars to `.env.example` with placeholder values. Add env var names to Tauri's allowlist if needed. Must NOT do: Do NOT hardcode any Supabase keys. Do NOT create the Supabase project programmatically — document manual setup steps.
  Parallelization: Wave 4 | Blocked by: — | Blocks: 18
  References: `src/lib/` (existing lib files pattern), `.env.example`, `vite-env.d.ts` (env typing)
  Acceptance criteria: `npm ls @supabase/supabase-js` shows installed version. `tsc --noEmit` passes with Supabase import.
  QA scenarios: Unit test: `supabase` singleton is not null. Evidence `.omo/evidence/task-17-supabase-client.txt`
  Commit: Y | `feat(supabase): add Supabase JS client singleton`

- [ ] 18. Design and create Supabase database schema
  What to do / Must NOT do: Create `supabase/migrations/` directory with SQL migration file. Schema includes: `workspaces` (id uuid PK, name text, description text, created_by uuid FK auth.users, created_at), `workspace_members` (id uuid PK, workspace_id FK, user_id FK auth.users, role text CHECK 'owner'|'admin'|'member', invited_email text, invited_at, accepted_at), tasks sync table `synced_tasks` (id text PK matching local task ID, workspace_id FK, title, description, priority int, tags text[], assigned_to uuid FK nullable, completed boolean, created_at, updated_at, deleted_at nullable), `task_assignments` (id uuid PK, task_id text FK, workspace_id FK, assigned_to uuid FK, assigned_by uuid FK, assigned_at). Must NOT do: Do NOT use `serial` — use `uuid` with `gen_random_uuid()`. Do NOT include local-only columns.
  Parallelization: Wave 4 | Blocked by: 17 | Blocks: 19
  References: `src/lib/db.ts` (local task schema reference)
  Acceptance criteria: `supabase/migrations/` contains a valid SQL file. SQL parses cleanly (can be verified by copy-paste to Supabase dashboard SQL editor).
  QA scenarios: Run migration SQL in Supabase dashboard — all tables created without errors. Evidence `.omo/evidence/task-18-schema.sql`
  Commit: Y | `feat(supabase): add database schema migration`

- [ ] 19. Set up Row-Level Security policies
  What to do / Must NOT do: Add to the migration file (or a new one): RLS policies for: workspaces (SELECT if member, INSERT if authenticated, UPDATE/DELETE if owner/admin), workspace_members (SELECT if member, INSERT if authenticated + invite, UPDATE/DELETE if owner/admin), synced_tasks (SELECT if workspace member, INSERT/UPDATE/DELETE if workspace member), task_assignments (SELECT if workspace member, INSERT/UPDATE/DELETE if workspace member). Enable RLS on all tables. Must NOT do: Do NOT allow public access to any table. Do NOT use `FOR ALL` — use specific FOR EACH operation.
  Parallelization: Wave 4 | Blocked by: 18 | Blocks: 20
  References: `supabase/migrations/` (schema file)
  Acceptance criteria: All 4 tables have RLS enabled. Each has at least 2 policies (SELECT + INSERT for workspaces, etc.). `SELECT * FROM pg_policies` in Supabase SQL editor shows all policies.
  QA scenarios: Verify authenticated user can only see their workspace data. Evidence `.omo/evidence/task-19-rls.txt`
  Commit: Y | `feat(supabase): add RLS policies for workspace isolation`

- [ ] 20. Write typed query helpers
  What to do / Must NOT do: Create `src/lib/supabase-queries.ts` with typed helper functions: `getWorkspaces(userId)`, `getWorkspace(id)`, `createWorkspace(name, description, userId)`, `updateWorkspace(id, data)`, `deleteWorkspace(id)`, `inviteMember(workspaceId, email)`, `removeMember(workspaceId, userId)`, `syncTask(workspaceId, task)`, `deleteSyncedTask(workspaceId, taskId)`, `getWorkspaceTasks(workspaceId)`, `assignTask(taskId, workspaceId, assigneeId, assignedById)`, `unassignTask(taskId)`. Each returns typed results using Supabase's `PostgrestResponse` types. Must NOT do: Do NOT add error handling — let callers handle errors. Do NOT add caching.
  Parallelization: Wave 4 | Blocked by: 19 | Blocks: 5.x
  References: `src/lib/supabase.ts`, `src/lib/db.ts` (local task type), Supabase JS v2 docs
  Acceptance criteria: All 12+ query functions compile with proper types. `tsc --noEmit` passes. Function signatures match the expected DB schema.
  QA scenarios: Unit test: each function returns a PostgrestFilterBuilder. Evidence `.omo/evidence/task-20-query-helpers.txt`
  Commit: Y | `feat(supabase): add typed query helpers for workspace CRUD`

### Wave 5 — Auth & Workspace Management

- [ ] 21. Implement email magic-link auth flow
  What to do / Must NOT do: Create `src/components/AuthPanel.tsx` — a slide-in panel (using SlideInPanel primitive) for auth. Shows "Sign in with magic link" — email input and "Send Link" button. Uses `supabase.auth.signInWithOtp({ email })`. On success (or error), show toast via t(). Add "Sign Out" button when signed in. Show user email and avatar when authenticated. Uses Supabase `onAuthStateChange` listener to sync auth state. Must NOT do: Do NOT implement password auth. Do NOT store tokens manually — Supabase JS client handles session storage.
  Parallelization: Wave 5 (parallel A) | Blocked by: 20 | Blocks: 23
  References: `src/components/SettingsPanel.tsx` (pattern for slide-in panel), `src/lib/supabase.ts`, Supabase Auth docs
  Acceptance criteria: Enter email → click "Send Link" → toast says "Check your email". After clicking magic link → app shows signed-in state. `tsc --noEmit` passes.
  QA scenarios: Enter invalid email → see validation error. Sign out → app returns to unauthenticated state. Evidence `.omo/evidence/task-21-auth-flow.txt`
  Commit: Y | `feat(auth): add email magic-link authentication`

- [ ] 22. Workspace creation modal + CRUD
  What to do / Must NOT do: Create `src/components/WorkspaceManager.tsx` — shows list of user's workspaces with "New Workspace" button. Clicking opens a modal (name, description inputs). Create calls `createWorkspace()` from query helpers. List shows workspace name + member count. Each workspace is clickable to switch to it. Must NOT do: Do NOT add drag-to-reorder. Do NOT add workspace avatars.
  Parallelization: Wave 5 (parallel B) | Blocked by: 20 | Blocks: 23
  References: `src/lib/supabase-queries.ts`, `src/components/SettingsPanel.tsx` (modal pattern)
  Acceptance criteria: Create workspace → appears in list. Switch workspace → app context changes. Delete workspace → disappears. `tsc --noEmit` passes.
  QA scenarios: Create 3 workspaces → switch between them → verify each has independent state. Evidence `.omo/evidence/task-22-workspace-crud.txt`
  Commit: Y | `feat(workspace): add workspace creation and management`

- [ ] 23. Workspace switcher in sidebar
  What to do / Must NOT do: In `src/App.tsx` (or create `src/components/WorkspaceSwitcher.tsx`), add a dropdown at the top of the sidebar showing current workspace name. Dropdown lists all user workspaces. Selecting one switches context. Shows "(current)" badge on active. Must NOT do: Do NOT add workspace settings in switcher — only switching. Workspace management stays in SettingsPanel.
  Parallelization: Wave 5 (parallel A) | Blocked by: 21, 22 | Blocks: 24
  References: `src/App.tsx` (sidebar area), `src/components/WorkspaceManager.tsx`
  Acceptance criteria: Dropdown shows all workspaces. Clicking switches workspace. Current workspace has visual indicator. `tsc --noEmit` passes.
  QA scenarios: 3 workspaces → switch to 2nd → tasks reload for that workspace. Evidence `.omo/evidence/task-23-workspace-switcher.txt`
  Commit: Y | `feat(workspace): add workspace switcher dropdown to sidebar`

- [ ] 24. Member management UI
  What to do / Must NOT do: In WorkspaceManager (or create `MemberList.tsx`), show list of workspace members with email, role badge, join date. "Invite Member" button opens email input → calls `inviteMember()`. Owner can change roles or remove members. Non-owners see a "Leave Workspace" button. Must NOT do: Do NOT add bulk invite. Do NOT add member activity log.
  Parallelization: Wave 5 (parallel B) | Blocked by: 22 | Blocks: 24, 25
  References: `src/lib/supabase-queries.ts` (inviteMember, removeMember)
  Acceptance criteria: Invite member → they appear as "pending". Remove member → they disappear from list. `tsc --noEmit` passes.
  QA scenarios: Invite a non-existent email → toast shows success (Supabase sends invite). Remove owner → gets error toast. Evidence `.omo/evidence/task-24-member-mgmt.txt`
  Commit: Y | `feat(workspace): add member management UI`

- [ ] 25. Invite acceptance flow
  What to do / Must NOT do: On app load, check if current user has pending invites: `supabase.from("workspace_members").select("*, workspace:workspaces(*)").eq("user_id", userId).is("accepted_at", null)`. If pending invites exist, show a notification badge on workspace switcher. Clicking opens an "Invites" modal with accept/reject buttons. On accept: `update workspace_members set accepted_at = now()`. Must NOT do: Do NOT send real emails — Supabase Auth handles magic link emails. Do NOT add push notifications for invites.
  Parallelization: Wave 5 (final) | Blocked by: 23, 24 | Blocks: 6.x
  References: `src/lib/supabase-queries.ts`, `src/components/WorkspaceSwitcher.tsx`
  Acceptance criteria: Invite another user (via different session) → notification appears → accept → member status active. `tsc --noEmit` passes.
  QA scenarios: Reject invite → notification disappears → not added to workspace. Evidence `.omo/evidence/task-25-invite-flow.txt`
  Commit: Y | `feat(workspace): add invite acceptance flow`

### Wave 6 — Team Task Sync & Real-time

- [ ] 26. Task sync to Supabase (push)
  What to do / Must NOT do: In `src/store.ts` (or create `src/lib/sync.ts`), add sync hooks: after each task CRUD operation (addTask, toggle, remove, updateText, updatePriority, updateTags, reorderTask), call corresponding `syncTask()` from query helpers. Wrap in try/catch — failure should not block local operation (optimistic local, best-effort remote). Must NOT do: Do NOT await sync before returning to user. Do NOT show sync errors as toasts every time — use the sync status indicator instead.
  Parallelization: Wave 6 (parallel A) | Blocked by: 25 | Blocks: 28
  References: `src/store.ts` (addTask, toggle, remove, updateText, updatePriority, updateTags, reorderTask methods), `src/lib/supabase-queries.ts` (syncTask)
  Acceptance criteria: Create task locally → task appears in Supabase `synced_tasks` table. Toggle task → status updates in Supabase. Delete task → deleted_at set in Supabase. `tsc --noEmit` passes.
  QA scenarios: Create 3 tasks offline → go online → 3 tasks sync to Supabase. Evidence `.omo/evidence/task-26-task-sync-push.txt`
  Commit: Y | `feat(team): push task CRUD to Supabase`

- [ ] 27. Offline queue
  What to do / Must NOT do: Create `src/lib/sync-queue.ts` — a queue stored in local SQLite (use `@tauri-apps/plugin-store` or a simple JSON file via Tauri fs). Queue items: `{ id, operation: "create"|"update"|"delete", taskId, data, timestamp }`. When online, process queue FIFO. On app startup, process any pending queue items. Network detection: `navigator.onLine` + Supabase ping. Must NOT do: Do NOT use Service Workers. Do NOT use IndexedDB. Use Tauri's file system or plugin-store.
  Parallelization: Wave 6 (parallel B) | Blocked by: 25 | Blocks: 28
  References: `src/lib/db.ts` (local SQLite pattern via Tauri plugin), `@tauri-apps/plugin-store` docs
  Acceptance criteria: Disconnect network → create task → queue has 1 pending item. Reconnect → queue processes → task appears in Supabase. `tsc --noEmit` passes.
  QA scenarios: 5 offline operations → reconnect → all sync in order. Evidence `.omo/evidence/task-27-offline-queue.txt`
  Commit: Y | `feat(team): add offline sync queue`

- [ ] 28. Realtime subscriptions for task sync (pull)
  What to do / Must NOT do: In `src/lib/sync.ts`, subscribe to workspace channel: `supabase.channel("workspace-{id}").on("postgres_changes", { event: "*", schema: "public", table: "synced_tasks", filter: `workspace_id=eq.{id}` }, (payload) => { handleRemoteChange(payload) })`. On receiving remote changes, update local store state. Handle: new task (insert into local DB if not exist), update (overwrite local if newer), delete (soft-delete local). Must NOT do: Do NOT sync the entire table on every change — use Realtime's filtered subscriptions. Do NOT create infinite loops (local change → sync to Supabase → Realtime sends it back → don't re-process).
  Parallelization: Wave 6 (parallel C) | Blocked by: 26 | Blocks: 29, 30, 31
  References: `src/lib/supabase.ts`, `src/lib/supabase-queries.ts`, Supabase Realtime JS docs
  Acceptance criteria: Two browser windows open → create task in window A → appears in window B within 2 seconds. `tsc --noEmit` passes.
  QA scenarios: Update task in window A → window B shows update. Delete task in window A → window B removes it. Evidence `.omo/evidence/task-28-realtime.txt`
  Commit: Y | `feat(team): add real-time task sync via Supabase Realtime`

- [ ] 29. Task assignment UI
  What to do / Must NOT do: In `src/components/TaskDetail.tsx`, add "Assigned to" section showing current assignee (or "Unassigned"). Clicking opens member selector dropdown showing workspace members. Selecting assigns the task via `assignTask()` from query helpers. Show assigned task count in sidebar. Must NOT do: Do NOT add mentioned notifications. Do NOT add group assignments.
  Parallelization: Wave 6 (parallel D) | Blocked by: 28 | Blocks: —
  References: `src/components/TaskDetail.tsx`, `src/lib/supabase-queries.ts` (assignTask)
  Acceptance criteria: Select assignee in TaskDetail → task shows assigned name. Other workspace members see the assignment via Realtime. `tsc --noEmit` passes.
  QA scenarios: Assign task → unassign → assign to different person → all reflect correctly. Evidence `.omo/evidence/task-29-task-assignment.txt`
  Commit: Y | `feat(team): add task assignment UI with member selector`

- [ ] 30. Presence indicators
  What to do / Must NOT do: Subscribe to presence channel: `supabase.channel("workspace-{id}-presence").on("presence", { event: "sync" }, () => { ... }).subscribe(async (status) => { if (status === "SUBSCRIBED") await channel.track({ user_id: userId, online_at: new Date() }) })`. Show online members as small avatars/dots at the top of the sidebar or workspace area. Green dot = online, gray = offline. Update in real-time. Must NOT do: Do NOT show "typing" indicators. Do NOT track per-task presence.
  Parallelization: Wave 6 (parallel E) | Blocked by: 28 | Blocks: —
  References: Supabase Realtime presence docs, `src/App.tsx` (sidebar area)
  Acceptance criteria: Two sessions in same workspace → both show each other as online. One disconnects → other sees them as offline within 30s. `tsc --noEmit` passes.
  QA scenarios: 3 members in workspace → all see each other's presence. Close one tab → remaining 2 see the third as offline. Evidence `.omo/evidence/task-30-presence.txt`
  Commit: Y | `feat(team): add real-time presence indicators`

- [ ] 31. Sync status indicator
  What to do / Must NOT do: In `src/components/SyncStatus.tsx` (create), show a small icon in the bottom-left of the app: green checkmark = "Synced", animated spinner = "Syncing...", red warning = "Offline". Driven by: `navigator.onLine` events, Supabase channel connection state (`SUBSCRIBED` / `CHANNEL_ERROR`), and offline queue length (>0 = syncing). Must NOT do: Do NOT make it a toast or notification. Do NOT show detailed sync logs in the UI.
  Parallelization: Wave 6 (parallel F) | Blocked by: 28 | Blocks: —
  References: `src/App.tsx` (bottom of sidebar), `src/lib/sync-queue.ts`
  Acceptance criteria: Online + synced → green checkmark. Disconnect network → red warning. Create offline task → spinner appears while syncing. `tsc --noEmit` passes.
  QA scenarios: Toggle airplane mode → indicator updates within 2 seconds. Reconnect → indicator returns to green. Evidence `.omo/evidence/task-31-sync-status.txt`
  Commit: Y | `feat(team): add sync status indicator`

## Final verification wave

- [ ] F1. Plan compliance audit — verify todos match acceptance criteria. All 31 todos marked completed with evidence files present.
- [ ] F2. Code quality review — run `tsc --noEmit` (zero errors), `vitest run` (all pass), lsp diagnostics clean on all changed files.
- [ ] F3. Real manual QA — open the app, test: (a) all 5 themes + accent picker, (b) all 7 panels render correctly, (c) auth flow, (d) workspace CRUD, (e) task sync across two sessions, (f) offline queue.
- [ ] F4. Scope fidelity — verify Must NOT have list: no kanban, no file attachments, no calendar sync, no social features, no mobile layout changes.

## Commit strategy

- Phase 1 (Fixes): 5 atomic commits, each fixing one issue category
- Phase 2 (Themes): 6 commits — presets dark, presets light, accent picker, FOUC script, CSS cleanup, theme preview
- Phase 3 (UI): 5 commits — primitives, consistency, typography, keyboard nav, QA fixes
- Phase 4 (Supabase): 4 commits — client, schema, RLS, query helpers
- Phase 5 (Auth): 5 commits — auth flow, workspace CRUD, switcher, members, invites
- Phase 6 (Team): 6 commits — sync push, offline queue, realtime, assignment, presence, sync status
- Final: 4 verification commits (F1-F4), each with evidence file

Total: ~31 commits across 6 waves. Each commit is focused, atomic, and independently verifiable.

## Success criteria

1. **Zero regressions**: All existing Milestone 1 & 2 features work exactly as before
2. **5 themes + accent picker**: User can switch between Midnight, Aurora, Sepia, Evergreen, Monochrome (each with light/dark variant), and pick a custom accent color
3. **Consistent UI**: All 16 components share the same design language, spacing, glass effect, focus rings
4. **i18n complete**: Zero hardcoded English strings, all 3 locales (en/ko/ja) complete for all new strings
5. **Team workspaces**: Create workspace, invite members, switch workspaces, manage members
6. **Real-time sync**: Tasks sync across team members within 2 seconds, presence indicators work
7. **Offline resilience**: Queue operations when offline, sync when reconnected, no data loss
8. **Build passes**: `tsc --noEmit` = 0 errors, `vitest run` = all pass, `npm run build` = success
