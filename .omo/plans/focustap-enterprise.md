# focustap-enterprise - Work Plan

## TL;DR (For humans)

**What you'll get:** A monetizable FocusTap with license key system (Pro upgrade), automatic updates, privacy-first analytics, and production polish — while keeping the free tier exactly as it is today.

**Why this approach:** Desktop apps monetize best with a hybrid model — free for core features, one-time purchase ($19) or subscription ($3/mo) for Pro features like cloud sync and backup. Official Tauri v2 plugins exist for licensing and updates, so we don't build infrastructure from scratch.

**What it will NOT do:** No custom license server, no app store distribution, no mobile app, no real-time collaboration, no enterprise SSO.

**Effort:** Large (estimated 12-15 tasks across 4 waves)
**Risk:** Medium — licensing and code signing have security implications; cloud sync (Phase 2) is deferred
**Decisions I made for you:** Hybrid one-time/subscription pricing ($19 lifetime / $3 monthly), LicenseSeat for licensing, GitHub Releases + tauri-plugin-updater for auto-updates, PostHog for analytics, cloud sync deferred to Phase 2.

Your next move: **Approve this plan** so we start executing Phase 1.

---

> TL;DR (machine): Large effort, Medium risk. 4 waves: (1) Licensing + entitlement gating, (2) Auto-updater, (3) Analytics + privacy, (4) Production polish. Builds on existing free-tier FocusTap without breaking it.

## Scope
### Must have
1. License key system with offline validation (LicenseSeat Tauri plugin)
2. Pro entitlement gating in UI and store
3. Auto-updater with signed releases (GitHub Releases + tauri-plugin-updater)
4. Privacy-first analytics (PostHog, opt-out by default)
5. Encrypted key-value storage for license data
6. Settings UI: License tab, Updates tab, Privacy tab
7. First-run onboarding walkthrough
8. Code signing setup documentation

### Must NOT have (guardrails, anti-slop, scope boundaries)
1. Do NOT build a custom license server — use LicenseSeat or Polar
2. Do NOT submit to any app store (MS Store, Mac App Store)
3. Do NOT add cloud sync (deferred to Phase 2)
4. Do NOT add mobile support
5. Do NOT add real-time collaboration features
6. Do NOT add SSO/SAML/OAuth
7. Do NOT remove or degrade any existing free-tier functionality

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: tests-after (manual QA + LSP diagnostics + build check)
- Evidence: .omo/evidence/task-<N>-focustap-enterprise.<ext>

## Execution strategy
### Parallel execution waves
- **Wave 1** (5 tasks): Licensing + entitlement infrastructure — these are the foundation everything else gates on
- **Wave 2** (2 tasks): Auto-updater — independent of licensing once entitlements exist
- **Wave 3** (3 tasks): Analytics + Privacy settings — runs in parallel with Wave 2
- **Wave 4** (3 tasks): Production polish (onboarding, encrypted storage, code signing docs) — after all features settled

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1. LicenseSeat Rust config | — | 2, 3, 4 | — |
| 2. License activation UI | 1 | 3, 4 | — |
| 3. Entitlement store | 1, 2 | 4, 5 | — |
| 4. Gate Pro features | 3 | — | — |
| 5. Settings License tab | 2 | — | — |
| 6. Auto-updater plugin | — | 7 | 1, 2, 3, 4 |
| 7. Updates tab in Settings | 6 | — | 5 |
| 8. PostHog analytics | — | 9, 10 | 1, 2, 3, 4, 6 |
| 9. Privacy tab + opt-out | 8 | — | 5, 7 |
| 10. Analytics events | 8, 9 | — | — |
| 11. Encrypted storage | — | — | 1, 6, 8 |
| 12. First-run onboarding | 3 | — | 5, 7, 9 |
| 13. Code signing docs | — | — | All |

## Todos

<!-- APPEND TASK BATCHES BELOW THIS LINE - never rewrite the headers above. -->

### Wave 1 — Licensing & Pro Entitlements (Foundation)

- [ ] 1. `src-tauri/`: Add LicenseSeat plugin and configure
  What to do / Must NOT do:
  - Add `tauri-plugin-licenseseat` to Cargo.toml dependencies
  - Add license config to tauri.conf.json under `plugins.licenseseat` (use `pk_test_*` publishable key, not secret key)
  - Add `licenseseat:default` permission to capabilities/default.json
  - Add the plugin to tauri::Builder in lib.rs: `.plugin(tauri_plugin_licenseseat::init())`
  - Do NOT embed any `sk_*` secret keys in config or code
  - Do NOT add UI yet (that's task 2)
  Parallelization: Wave 1 | Blocked by: — | Blocks: 2, 3, 4
  References: crates.io/tauri-plugin-licenseseat docs, amajorai/torii LICENSE.md
  Acceptance criteria: `cargo build --release` succeeds, `tauri-plugin-licenseseat` is listed in cargo deps
  QA scenarios: happy = build succeeds; failure = wrong apiKey format triggers compile error
  Commit: Y | feat(license): add LicenseSeat plugin with offline validation config

- [ ] 2. `src/components/LicenseActivation.tsx`: Build license key entry + validation UI
  What to do / Must NOT do:
  - Create a clean inline component with: text input for license key, "Activate" button, loading state, success/error status display
  - Import license plugin: `import { activate, getState, deactivate } from "tauri-plugin-licenseseat"`
  - On activate: call `activate(key)`, show result state (valid/expired/revoked/error)
  - On deactivate: call `deactivate()`, clear stored key
  - Show license state: activated key, expiry date, entitlements list
  - Use existing clean dark design (inline arbitrary Tailwind values, no custom CSS)
  - Must handle offline gracefully — plugin caches last validation
  - Do NOT block the app if license check fails (free tier always works)
  - Do NOT add to navigation yet (rendered in Settings → License tab, task 5)
  Parallelization: Wave 1 | Blocked by: 1 | Blocks: 3, 4, 5
  References: tauri-plugin-licenseseat TypeScript API, src/components/SettingsPanel.tsx for styling patterns
  Acceptance criteria: Component renders, accepts key input, calls activate(), shows validation result
  QA scenarios: happy = enter valid key → shows "activated"; failure = enter garbage → shows error message; offline → shows cached state or graceful message
  Commit: Y | feat(license): add LicenseActivation component with key entry and validation

- [ ] 3. `src/store.ts`: Add license state and Pro entitlement checking
  What to do / Must NOT do:
  - Add `licenseState`, `isPro`, `licenseKey` to TaskState interface
  - Add `checkLicense()`, `activateLicense(key)`, `deactivateLicense()` actions
  - `isPro` derived from license having "pro" entitlement (use `hasAnyEntitlement(['pro'])`)
  - On app start (`loadTasks`), also run `checkLicense()` to restore cached state
  - Persist license key to local state (plugin handles secure storage)
  - Do NOT show license errors as user-facing toasts — silently degrade to free mode
  - Do NOT block any existing functionality based on license (gating happens in UI, task 4)
  Parallelization: Wave 1 | Blocked by: 1, 2 | Blocks: 4, 12
  References: src/store.ts lines 30-80 (TaskState interface), torii use-license-store.ts pattern
  Acceptance criteria: Store has `isPro` boolean, `activateLicense()` updates state, `checkLicense()` restores state on reload
  QA scenarios: happy = activate license → isPro = true; failure = no license → isPro = false; reload → state persists
  Commit: Y | feat(license): add Pro entitlement state to Zustand store

- [ ] 4. Gate Pro features behind entitlement check
  What to do / Must NOT do:
  - In App.tsx, conditionally show "Upgrade to Pro" badge/button for gated features
  - Add a `<ProGate>` wrapper component that renders children if `isPro`, else shows an upgrade prompt
  - Gate the Export button (Markdown/CSV export becomes Pro-only — or keep free and gate cloud sync later)
  - For now, gate a "Pro" badge in the header and prepare the pattern for cloud sync (Phase 2)
  - Do NOT remove or disable any existing free-tier functionality
  - Do NOT show annoying upgrade prompts — use a subtle "Pro" badge, not a paywall
  Parallelization: Wave 1 | Blocked by: 3 | Blocks: —
  References: src/App.tsx lines 78-95 (toolbar buttons), src/components/TaskList.tsx
  Acceptance criteria: Without license, Pro features show upgrade UI. With license, Pro features are accessible.
  QA scenarios: happy = activate Pro license → Pro badge appears, gated features accessible; failure = no license → gated features show upgrade prompt
  Commit: Y | feat(license): add ProGate component and entitlement gating

- [ ] 5. `src/components/SettingsPanel.tsx`: Add License tab to Settings
  What to do / Must NOT do:
  - Add a "License" tab to the existing Settings tabs bar
  - Render `<LicenseActivation>` component inside the tab
  - Show current license status (active/expired/none) in tab label
  - Clean, minimal styling matching existing Settings design
  - Do NOT modify or remove existing settings tabs (General, etc.)
  Parallelization: Wave 1 | Blocked by: 2 | Blocks: —
  References: src/components/SettingsPanel.tsx (full file), tauri-plugin-licenseseat getState()
  Acceptance criteria: Settings has License tab, activation UI renders and works inside it
  QA scenarios: happy = open Settings → see License tab → enter key → validated; failure = tab renders without crash when plugin unavailable
  Commit: Y | feat(settings): add License tab with activation UI

### Wave 2 — Auto-Updater

- [ ] 6. `src-tauri/`: Add tauri-plugin-updater with GitHub Releases
  What to do / Must NOT do:
  - Add `tauri-plugin-updater` to Cargo.toml
  - Add updater config to tauri.conf.json: `endpoints` pointing to GitHub Releases JSON, `pubkey` for signature verification
  - Add `updater:default` permission to capabilities/default.json
  - Generate a signing keypair: `tauri signer generate` → save private key securely, embed public key in config
  - Add plugin to tauri::Builder in lib.rs
  - Configure GitHub Releases as the update server (create a `latest.json` manifest)
  - Do NOT add UI yet (task 7)
  - Do NOT use a dynamic update server — static JSON on GitHub Releases is sufficient
  Parallelization: Wave 2 | Blocked by: — | Blocks: 7
  References: v2.tauri.app/plugin/updater/, tauri-plugin-updater docs, amajorai/torii tauri.conf.json
  Acceptance criteria: `cargo build --release` succeeds, `tauri-plugin-updater` in deps, signing keypair generated
  QA scenarios: happy = build succeeds with updater config; failure = invalid pubkey causes build error
  Commit: Y | feat(updater): add tauri-plugin-updater with GitHub Releases + signing

- [ ] 7. Settings: Add Updates tab with check-for-updates button
  What to do / Must NOT do:
  - Add "Updates" tab to SettingsPanel.tsx
  - Show current version, "Check for Updates" button, last check timestamp
  - On click: call `app.updater().check()` → show "Update available" with download progress or "Up to date"
  - Show download progress bar during update download
  - Show "Install & Restart" button after download completes
  - Handle errors gracefully (network failure, no update server, etc.)
  - Do NOT auto-download updates without user consent
  - Do NOT block the app during update check
  Parallelization: Wave 2 | Blocked by: 6 | Blocks: —
  References: tauri-plugin-updater JavaScript API (check, downloadAndInstall), src/components/SettingsPanel.tsx
  Acceptance criteria: Updates tab renders, "Check for Updates" calls updater API, shows result
  QA scenarios: happy = click check → "Up to date" (or "Update available" with progress); failure = no network → shows error gracefully
  Commit: Y | feat(settings): add Updates tab with manual check + auto-download

### Wave 3 — Analytics & Privacy

- [ ] 8. Add PostHog analytics integration
  What to do / Must NOT do:
  - Add `posthog-js` to package.json dependencies
  - Create `src/lib/analytics.ts` with PostHog init wrapper
  - Read config from env vars: `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`
  - Initialize PostHog only after user opt-in (default: disabled in EU, enabled elsewhere with opt-out)
  - Track key events: task_created, task_completed, task_deleted, app_opened, license_activated
  - Respect the `soundEnabled` / analytics opt-out setting from store
  - Do NOT track personal data (no task text content, no user names)
  - Do NOT initialize PostHog if analytics are disabled
  - Do NOT add any third-party cookies
  Parallelization: Wave 3 | Blocked by: — | Blocks: 9, 10
  References: posthog-js npm docs, amajorai/torii src/lib/posthog.ts
  Acceptance criteria: PostHog initializes on app start (when enabled), `capture()` calls succeed for key events
  QA scenarios: happy = app opens → analytics event fires (check PostHog dashboard); failure = no network → graceful no-op
  Commit: Y | feat(analytics): add PostHog with privacy-first opt-in model

- [ ] 9. Settings: Add Privacy tab with analytics opt-out toggle
  What to do / Must NOT do:
  - Add "Privacy" tab to SettingsPanel.tsx
  - Add toggle: "Share anonymous usage data" (default on outside EU, off in EU)
  - Add toggle: "Enable logging" (for debugging)
  - Add "Export my data" button (placeholder for Phase 2)
  - Persist preferences via Zustand store and SQLite settings table
  - When analytics toggle changes, re-initialize or shutdown PostHog
  - Do NOT add any text about GDPR/CCPA compliance (keep it simple)
  Parallelization: Wave 3 | Blocked by: 8 | Blocks: 10
  References: src/components/SettingsPanel.tsx, src/store.ts lines 247-254 (soundEnabled pattern)
  Acceptance criteria: Privacy tab renders, toggles persist across restarts, PostHog starts/stops when toggled
  QA scenarios: happy = toggle on → analytics enabled; toggle off → analytics disabled; reload → setting persists; failure = missing store key → defaults to off
  Commit: Y | feat(settings): add Privacy tab with analytics opt-out toggle

- [ ] 10. Wire analytics events into store actions
  What to do / Must NOT do:
  - Import `trackEvent` from analytics lib into store.ts
  - Add tracking calls in: `addTask` → "task_created", `toggle`/`toggleWithChildren` → "task_completed" (when becoming done), `remove` → "task_deleted", `loadTasks` → "app_opened"
  - Add tracking for license activation: `activateLicense` → "license_activated" with plan type
  - Respect the analytics opt-out setting — check before each track call
  - Do NOT track task text content or any user-identifiable data
  - Do NOT make analytics calls blocking (fire-and-forget)
  Parallelization: Wave 3 | Blocked by: 8, 9 | Blocks: —
  References: src/store.ts (all action implementations), src/lib/analytics.ts
  Acceptance criteria: Key events fire correctly in PostHog dashboard when enabled
  QA scenarios: happy = add task → "task_created" event fires; complete task → "task_completed" fires; fail = analytics off → no events fire; offline → no crash
  Commit: Y | feat(analytics): add tracking to store actions for key events

### Wave 4 — Production Polish

- [ ] 11. Add encrypted storage for license keys and sensitive settings
  What to do / Must NOT do:
  - Evaluate tauri-plugin-store (JSON file, not encrypted) vs custom Rust solution (AES-256-GCM per torii pattern)
  - For MVP: use tauri-plugin-store for non-sensitive settings, LicenseSeat handles encrypted license storage internally
  - Add `tauri-plugin-store` to Cargo.toml and capabilities
  - Persist: window size/position, analytics opt-in, theme preference, last-checked-update timestamp
  - Do NOT store license keys in plaintext JSON — rely on LicenseSeat's built-in encrypted storage
  - Do NOT encrypt everything — only sensitive data
  Parallelization: Wave 4 | Blocked by: — | Blocks: —
  References: amajorai/torii secure-storage pattern, tauri-plugin-store docs
  Acceptance criteria: Plugin-store works, settings persist across restarts, license key is not in plaintext store file
  QA scenarios: happy = toggle a setting → reload → setting persists; failure = store file corrupted → falls back to defaults
  Commit: Y | feat(storage): add tauri-plugin-store for persistent settings

- [ ] 12. First-run onboarding walkthrough
  What to do / Must NOT do:
  - Add `onboardingDone` boolean to store state, persisted via settings
  - Create `src/components/Onboarding.tsx` — a simple 3-step overlay:
    1. "Welcome to FocusTap" — quick intro, "Get Started" button
    2. "Add your first task" — highlights the input field
    3. "Pro features" — mentions upgrade option (subtle, no upsell pressure)
  - Show only on first launch (check `onboardingDone` flag)
  - Clean overlay with backdrop blur, skip button available
  - Do NOT block app usage — user can always skip or click through
  - Do NOT collect any data during onboarding
  - Do NOT show more than 3 steps
  Parallelization: Wave 4 | Blocked by: 3 (for license check) | Blocks: —
  References: src/App.tsx (mount flow), src/store.ts (persisted settings pattern)
  Acceptance criteria: On first launch, onboarding shows. On subsequent launches, it doesn't.
  QA scenarios: happy = first launch → see 3 steps → complete → never seen again; failure = skip → never seen again; reinstall → seen again
  Commit: Y | feat(onboarding): add first-run walkthrough with 3-step overlay

- [ ] 13. Code signing documentation and CI setup
  What to do / Must NOT do:
  - Write `CODE_SIGNING.md` at project root with step-by-step:
    - Windows: how to get Authenticode certificate, sign the .exe and .msi
    - macOS: how to set up notarization, configure `tauri build` for Apple Developer ID
    - CI: GitHub Actions workflow for automated signing + release
  - Create `.github/workflows/release.yml` that:
    - Builds on tag push
    - Signs the binaries
    - Creates GitHub Release with artifacts + update manifest
  - Do NOT commit any actual certificates or secrets to the repo
  - Do NOT add the CI workflow as required (document it for optional use)
  Parallelization: Wave 4 | Blocked by: — | Blocks: —
  References: tauri.app distribution docs, codegiz.com Tauri self-updating guide
  Acceptance criteria: CODE_SIGNING.md exists, release.yml workflow file exists and is valid YAML
  QA scenarios: happy = workflow parses as valid GitHub Actions YAML; failure = CI would fail due to missing secrets (expected, documented)
  Commit: Y | docs(code-signing): add code signing guide and CI release workflow

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [ ] F1. Plan compliance audit — every todo completed, nothing in Must NOT have was added
- [ ] F2. Code quality review — `tsc --noEmit` passes, `cargo build --release` passes, no suppressed type errors
- [ ] F3. Real manual QA — open app, verify free tier unchanged, activate test license, verify Pro gating, check for updates, verify analytics opt-out
- [ ] F4. Scope fidelity — no cloud sync added (deferred), no app store submission, free tier fully intact

## Commit strategy
- One atomic commit per todo with conventional commit message format: `type(scope): description`
- Commit types: feat, fix, docs, refactor, chore
- All 13 commits are independent and can be merged in any order within waves
- No squashing — each commit represents a coherent, reviewable unit

## Success criteria
1. App builds and runs with all existing free-tier functionality intact
2. License key entry + validation works (offline + online)
3. Pro entitlement gates work (UI shows upgrade prompt without license, Pro features accessible with license)
4. Auto-updater checks GitHub Releases and downloads updates
5. PostHog analytics fire key events when enabled, stay silent when disabled
6. Privacy settings persist across restarts
7. First-run onboarding shows once on fresh install
8. Code signing documented so a release can be cut in <30 minutes
