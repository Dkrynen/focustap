---
slug: focustap-enterprise
status: awaiting-approval
intent: unclear
pending-action: write .omo/plans/focustap-enterprise.md
approach: Phase-gated buildout — monetization infrastructure first (licensing + auto-updater), then cloud sync (the paid feature), then enterprise polish.
---

# Draft: focustap-enterprise

## Components (topology ledger)
| id | outcome | status | evidence path |
|----|---------|--------|---------------|
| monetization-model | Hybrid: free tier + Pro upgrade (one-time or sub) | active | web research: one-time converts 2.3x better at comparable price; hybrid captures both segments |
| licensing | LicenseSeat Tauri plugin (offline Ed25519 keys) | active | crates.io/tauri-plugin-licenseseat — official Tauri v2 plugin, offline validation, entitlement gating |
| auto-updater | tauri-plugin-updater + GitHub Releases | active | tauri v2 official plugin, signed releases, license-gated |
| cloud-sync | Tauri backend plugin + REST API (generic, bring-your-own-server) | deferred to phase 2 | required for subscription upsell |
| analytics | PostHog (self-host or cloud, privacy-first) | active | open source, privacy-friendly, opt-out control |
| crash-reporting | Sentry | deferred | add after cloud sync |
| encrypted-storage | AES-256-GCM for license keys + settings | active | standard practice per torii reference impl |
| onboarding | First-run walkthrough | active | improves conversion and retention |
| pricing | Free (core) + Pro $19 lifetime or $3/month | active | indie desktop sweet spot per research |

## Open assumptions (announced defaults)
| assumption | adopted default | rationale | reversible? |
|-----------|----------------|-----------|-------------|
| Monetization model | Hybrid: free tier + Pro upgrade (one-time $19 or $3/mo subscription) | Desktop apps convert better on one-time; hybrid captures both segments. Free tier = current app. Pro = cloud sync, backup, priority support | Yes — pricing can change |
| Licensing backend | LicenseSeat (managed service) or self-build with Polar/Stripe | LicenseSeat is zero-config Tauri v2 native; Polar is OSS alternative. Both cheaper than building license infra | Yes — can switch providers |
| Update distribution | GitHub Releases + tauri-plugin-updater | Free, signed, no server cost. Scales to any size | Yes — can move to self-hosted |
| Analytics | PostHog (self-hosted option) | Privacy-first, open source, no user data sold. Opt-out by default in EU | Yes — can swap to Plausible/Umami |
| Cloud sync pricing | Included in Pro tier | Drives subscription value. Sync is the #1 paid feature ask for task apps | Yes |
| Distribution | Direct sales via own site (not MS Store) | Higher margins, full customer relationship, no 30% cut | Yes — can add stores later |

## Findings (cited)
1. **One-time purchases outperform subscriptions 2.3x on conversion for indie desktop apps** (LicenseSeat guide). Same app at $39 lifetime vs $5/month: lifetime converts 2.3x better.
2. **Hybrid monetization dominates highest-revenue indie apps in 2025-26** (ExtensionBooster). Free tier + Pro subscription + optional lifetime license captures all user types.
3. **Desktop app users have subscription fatigue** (TeenyApps). Perpetual licenses feel fairer for utility software. Subscription only justified by ongoing server costs.
4. **tauri-plugin-licenseseat v0.5.3 exists** — official Tauri v2 plugin with Ed25519 + AES-256-GCM offline validation, entitlement gating, zero-config setup. (crates.io)
5. **tauri-plugin-updater** — official plugin with cryptographic signature verification. Prevents MITM attacks on update channel. (tauri.app)
6. **Torii reference architecture** (github.com/amajorai/torii) — production Tauri v2 + React 19 app shell with licensing (Polar), analytics (PostHog), auto-updates, encrypted storage. Proven pattern.
7. **PostHog** is the leading privacy-first analytics platform for indie devs. Self-hostable, open source, event-based.
8. **Annual subscriptions have 30-50% lower churn than monthly** (ProfitWell data). Offer annual at 15-30% discount.

## Decisions
1. **Monetization: Free tier + Pro upgrade (hybrid one-time/subscription)**. Free = current app. Pro = cloud sync, backup/restore, advanced features. $19 lifetime or $3/month ($30/year).
2. **Licensing: LicenseSeat plugin** for Tauri v2 native integration. Offline validation, entitlement gating, zero backend to maintain.
3. **Auto-updater: GitHub Releases + tauri-plugin-updater** with code signing. Zero recurring cost.
4. **Analytics: PostHog** — privacy-first, self-hostable. Opt-out by default.
5. **Cloud sync: Phase 2** — REST API + Tauri plugin layer. Bring-your-own-server or managed.

## Scope IN
1. License key entry UI + validation flow
2. Auto-updater integration with GitHub Releases
3. Pro feature gating (entitlements)
4. PostHog analytics integration
5. Encrypted settings storage
6. First-run onboarding walkthrough
7. Backup/restore (ZIP export/import)
8. Settings → License tab, Updates tab, Privacy tab
9. Code signing setup (macOS notarization + Windows Authenticode)

## Scope OUT (Must NOT have)
1. Custom license server — use LicenseSeat or Polar
2. App Store distribution — defer
3. Mobile app — defer
4. Real-time collaboration — defer
5. Enterprise SSO/SAML — defer
6. Self-hosted sync server (offer managed first)

## Open questions
None — research resolved all forks. Defaults adopted per UNCLEAR protocol.

## Approval gate
status: awaiting-approval
<!-- Present brief to user, wait for explicit approval to write the plan -->
