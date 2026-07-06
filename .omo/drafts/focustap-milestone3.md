---
slug: focustap-milestone3
status: awaiting-approval
intent: clear
pending-action: user approves .omo/plans/focustap-milestone3.md
approach: 6-wave execution — critical fixes → themes → UI → Supabase → auth → team sync
---

# Draft: focustap-milestone3

## Components (topology ledger)
| id | outcome | status | evidence path |
|----|---------|--------|---------------|
| critical-fixes | 5 sentry/aria/i18n/dep fixes | planned | .omo/plans/focustap-milestone3.md |
| theme-engine | 5 CSS presets + accent picker + FOUC | planned | same |
| ui-overhaul | Primitives, consistency, typography, keyboard nav | planned | same |
| supabase-backend | Client, schema, RLS, query helpers | planned | same |
| auth-workspaces | Magic-link auth, workspace CRUD, member mgmt | planned | same |
| team-sync | Real-time sync, offline queue, presence, assignment | planned | same |

## Open assumptions (announced defaults)
| assumption | adopted default | rationale | reversible? |
|-----------|----------------|-----------|-------------|
| Theme engine uses CSS custom property switching | Yes | Keeps Tailwind v4 @theme mapping, instant swaps, zero recompilation | No — architecture decision |
| Accent picker writes to CSS vars at runtime | Yes | No build step, real-time preview, persists to localStorage | No — core to UX |
| Supabase JS client works in Tauri webview | Yes | JS v2 confirmed, PKCE OAuth via tauri-plugin-shell (custom protocol) | Medium — edge cases with OAuth redirect |
| Component refactor is per-component not full rewrite | Yes | 16 independent files, extract primitives incrementally | No — safest approach |
| Offline-first: local SQLite source of truth | Yes | Works offline, syncs when reconnected, no data loss | Medium — could invert to Supabase-first |
| i18n uses react-i18next without <Trans> | Yes (existing decision) | Already established in Milestone 2 | No — established pattern |
| No Tailwind dark: variant | Yes (existing decision) | CSS variables for theming, dark: would conflict | No — established pattern |
| Sentry init in main.tsx | Yes (existing decision) | Already in main.tsx | No — established pattern |

## Findings (cited - path:lines)
- `src/index.css:34-72` — Current :root dark + .light theme classes with 13+ CSS custom properties each
- `src/index.css:3-31` — @theme block mapping CSS vars to Tailwind tokens, hardcoded `#8b7eff` for accent
- `src/App.tsx:82-84` — Light mode toggle using matchMedia + classList.toggle, no localStorage persist
- `src/store.ts:240-636` — 19 hardcoded showToast("...") strings with no i18n
- All 16 `src/components/*.tsx` — 20+ UI inconsistencies, missing aria roles, hardcoded colors
- Oracle review (bg_4408bd15) — 5 critical + 5 high-impact findings from Milestone 2

## Decisions (with rationale)
1. **Hybrid theme engine**: Static CSS classes (.theme-*) for presets + runtime CSS var overrides for accent picker. Rationale: FOUC prevention (static classes load with CSS), live preview (accent vars change without re-render).
2. **Supabase over custom backend**: PostgreSQL schemas, built-in Realtime, RLS for auth, JS client works in Tauri. Rationale: Zero backend code, 5-min setup, scales from 1 to 100 users.
3. **Supabase JS v2 with PKCE** (not supabase-js v1): Modern auth flow compatible with Tauri webview via deep-link redirects. Rationale: v2 has better session handling, PKCE is more secure for desktop apps.
4. **Per-component UI refactor**: Extract primitives, apply consistency fixes per component, don't rewrite from scratch. Rationale: Lower risk, each component independently verifiable, existing behavior preserved.
5. **Offline queue via plugin-store**: Local SQLite is already the source of truth for tasks. Add a sync queue that retries on reconnection. Rationale: User can work offline without disruption, no data loss.

## Scope IN
See plan phases 1-6 above.

## Scope OUT (Must NOT have)
- No drag-and-drop kanban board
- No file attachments to tasks
- No Google Calendar / Outlook sync
- No push/desktop notifications for team events
- No social features (comments, likes, activity feed)
- No mobile or tablet layout changes

## Open questions
None — all resolved by research agents.

## Approval gate
status: awaiting-approval
