# FocusTap Calendar Sync — Architecture Plan

## Overview

Add two-way sync between FocusTap tasks and Google Calendar / Microsoft 365 Calendar.
Users connect their calendar accounts, map tasks to events, and keep both in sync.

---

## Phase 1 — Schema & Storage

### 1a. Local SQLite — New Tables

Add to `lib/db.ts` `initDb()`:

```sql
-- OAuth tokens for each connected provider
CREATE TABLE IF NOT EXISTS calendar_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL CHECK(provider IN ('google', 'microsoft')),
    account_email TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TEXT,                 -- ISO 8601
    scope TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    UNIQUE(provider, account_email)
);

-- Links between local tasks and external calendar events
CREATE TABLE IF NOT EXISTS calendar_event_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL CHECK(provider IN ('google', 'microsoft')),
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    external_event_id TEXT NOT NULL,  -- Google event ID / Graph event ID
    calendar_id TEXT,                 -- which calendar it lives in
    etag TEXT,                        -- for change detection
    last_synced_at TEXT,
    sync_direction TEXT DEFAULT 'bidirectional'
        CHECK(sync_direction IN ('bidirectional', 'local_to_remote', 'remote_to_local')),
    UNIQUE(provider, external_event_id)
);
CREATE INDEX IF NOT EXISTS idx_cel_task ON calendar_event_links(task_id);
CREATE INDEX IF NOT EXISTS idx_cel_external ON calendar_event_links(provider, external_event_id);

-- Sync cursors per provider calendar (for delta/incremental sync)
CREATE TABLE IF NOT EXISTS calendar_sync_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL,
    calendar_id TEXT NOT NULL DEFAULT 'primary',
    sync_token TEXT,                  -- Google: nextSyncToken
    delta_link TEXT,                  -- Microsoft: @odata.deltaLink
    last_full_sync TEXT,
    UNIQUE(provider, calendar_id)
);
```

### 1b. Supabase — New Tables (for cross-device sync)

Add to `supabase/migrations/00003_calendar_integration.sql`:

```sql
-- Same schema but with user_id for multi-device
CREATE TABLE calendar_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    account_email TEXT NOT NULL,
    encrypted_access_token TEXT NOT NULL,  -- encrypted at application level
    encrypted_refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    scope TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, provider, account_email)
);

ALTER TABLE calendar_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own their tokens" ON calendar_tokens
    FOR ALL USING (user_id = auth.uid());

CREATE TABLE calendar_event_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES team_tasks(id) ON DELETE SET NULL,
    local_task_id INTEGER,           -- for offline/local tasks
    provider TEXT NOT NULL,
    external_event_id TEXT NOT NULL,
    calendar_id TEXT,
    etag TEXT,
    last_synced_at TIMESTAMPTZ,
    UNIQUE(provider, external_event_id)
);

ALTER TABLE calendar_event_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own their event links" ON calendar_event_links
    FOR ALL USING (user_id = auth.uid());
```

### 1c. New TypeScript Interfaces (`lib/db.ts`)

```typescript
export interface CalendarToken {
    id: number;
    provider: 'google' | 'microsoft';
    account_email: string;
    access_token: string;
    refresh_token: string | null;
    expires_at: string | null;
    scope: string | null;
}

export interface CalendarEventLink {
    id: number;
    provider: 'google' | 'microsoft';
    task_id: number;
    external_event_id: string;
    calendar_id: string | null;
    etag: string | null;
    last_synced_at: string | null;
    sync_direction: 'bidirectional' | 'local_to_remote' | 'remote_to_local';
}

export interface CalendarSyncState {
    id: number;
    provider: 'google' | 'microsoft';
    calendar_id: string;
    sync_token: string | null;
    delta_link: string | null;
    last_full_sync: string | null;
}
```

---

## Phase 2 — OAuth Authentication

### 2a. Architecture Decision: PKCE Flow via Tauri Opener

Both Google and Microsoft require a browser-based OAuth flow. In a Tauri desktop app:

1. Open system browser to the OAuth authorize URL (with PKCE challenge)
2. User consents in browser
3. Provider redirects to a custom URL scheme (`focustap://oauth/callback`)
4. Tauri's `tauri-plugin-opener` (already a dependency) intercepts the deep link
5. App exchanges the auth code for tokens via a local HTTP server or direct POST

**Implementation approach**: Use a lightweight local HTTP server on a random port
for the redirect (more reliable than deep links on Windows).

### 2b. Google OAuth Setup

**Prerequisites**:
- Google Cloud Console project with "Google Calendar API" enabled
- OAuth 2.0 Client ID (Desktop app type)
- Redirect URI: `http://localhost:PORT` (loopback IP recommended)

**Scopes needed**:
```
https://www.googleapis.com/auth/calendar.readonly   — read events
https://www.googleapis.com/auth/calendar.events      — create/update/delete events
```

**Token refresh**: Google access tokens last 1 hour. Refresh tokens never expire
(unless revoked). Store refresh token encrypted locally.

### 2c. Microsoft OAuth Setup

**Prerequisites**:
- Azure AD app registration with "Microsoft Graph" permissions
- Public client (mobile/desktop) — no client secret
- Redirect URI: `http://localhost:PORT` or `msal://focustap`

**Scopes needed**:
```
Calendars.ReadWrite          — full calendar access
offline_access               — refresh tokens
User.Read                    — basic profile (for email)
```

**Token refresh**: Microsoft access tokens last 1 hour. Refresh tokens can expire
if inactive for 90 days. Must handle `AADSTS700082` / `invalid_grant`.

### 2d. Auth State Machine (`lib/calendar-auth.ts`)

```
IDLE → AUTHORIZING (browser opens)
     → TOKEN_RECEIVED (callback captured)
     → REFRESHING (token expired)
     → CONNECTED (tokens valid)
     → DISCONNECTED (user revokes or clears)
     → ERROR (network, invalid grant)
```

New store slice in `store.ts`:

```typescript
interface CalendarAuthState {
    connectedAccounts: CalendarToken[];
    authInProgress: boolean;
    authError: string | null;
    connect: (provider: 'google' | 'microsoft') => Promise<void>;
    disconnect: (provider: string, email: string) => Promise<void>;
    refreshToken: (provider: string, email: string) => Promise<string | null>;
    loadConnectedAccounts: () => Promise<void>;
}
```

### 2e. Existing Supabase Auth Integration

Supabase already has built-in Google OAuth. Since FocusTap uses Supabase for
team sync, we can optionally piggyback on Supabase auth for Google:

```typescript
// Alternative lightweight path — reuse Supabase's Google provider
const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { scopes: 'https://www.googleapis.com/auth/calendar.events' }
});
```

This skips the need for a separate Google Cloud project but limits us to
Google-only (Microsoft would still need its own app registration).

**Recommendation**: Use Supabase Google OAuth for simplicity, standalone
Microsoft OAuth for Outlook.

---

## Phase 3 — Sync Engine (`lib/calendar-sync.ts`)

### 3a. Core Types

```typescript
interface ExternalEvent {
    externalId: string;
    provider: 'google' | 'microsoft';
    calendarId: string;
    title: string;
    description: string | null;
    startTime: string;       // ISO 8601
    endTime: string;         // ISO 8601
    isAllDay: boolean;
    recurrence: string | null; // RRULE or null
    etag: string | null;
    status: 'confirmed' | 'tentative' | 'cancelled';
    location: string | null;
}

interface SyncResult {
    pulled: number;     // events created/updated from remote
    pushed: number;     // events sent to remote
    deleted: number;    // events deleted on remote
    errors: string[];
    newSyncToken?: string;
}
```

### 3b. Sync Direction Rules

| Direction | Task→Event | Event→Task |
|---|---|---|
| `bidirectional` | Create/update remote event on task change | Create/update local task on event change |
| `local_to_remote` | Push changes to calendar | Ignore remote changes (one-way export) |
| `remote_to_local` | Ignore local task changes | Pull events as tasks (one-way import) |

### 3c. Pull (Remote → Local) — Incremental Sync

```
function pullEvents(provider, account):
    state = getSyncState(provider, account.calendarId)
    
    if state.sync_token or state.delta_link:
        # Incremental: only fetch changes since last sync
        events = call API with sync_token/delta_link
        state.sync_token = response.nextSyncToken
        state.delta_link = response.@odata.deltaLink
    else:
        # Full sync: fetch all events in a date window
        events = call API with timeMin=30daysAgo, timeMax=90daysFromNow
        state.sync_token = response.nextSyncToken
    
    for each event in events:
        if event.status == 'cancelled':
            deleteLocalEventLink(event)
            continue
        
        link = findEventLink(provider, event.id)
        if link:
            if event.etag != link.etag:
                updateLocalTaskFromEvent(link.task_id, event)
                link.etag = event.etag
        else:
            taskId = createTaskFromEvent(event)  # tag with provider name
            createEventLink(provider, event.id, taskId, event.etag)
    
    saveSyncState(state)
    return SyncResult(pulled: count, ...)
```

### 3d. Push (Local → Remote) — Change-Driven

Use the existing offline queue pattern from `lib/sync.ts`:

```typescript
// New op types
type CalendarOpType = 'cal_event_create' | 'cal_event_update' | 'cal_event_delete';

interface CalendarPendingOp {
    id: string;
    type: CalendarOpType;
    provider: 'google' | 'microsoft';
    accountEmail: string;
    taskId: number;
    payload: ExternalEvent;
    retries: number;
    created_at: string;
    error?: string;
}
```

**Triggers for enqueue (in `store.ts` task mutation actions):**

| Action | Condition | Enqueue Op |
|---|---|---|
| `addTask` | task has `task_date` + connected calendar | `cal_event_create` |
| `updateText` | linked event exists | `cal_event_update` |
| `toggle` (done) | linked event exists | `cal_event_update` (add/remove reminders) |
| `updateTaskDate` | linked event exists | `cal_event_update` (reschedule) |
| `remove` | linked event exists | `cal_event_delete` |

**Flush queue**: `calendarSyncFlush()` runs on a 60-second debounce timer
(avoid rate limits) and processes pending ops FIFO with 3 retries.

### 3e. Rate Limiting

| Provider | Limit | Backoff Strategy |
|---|---|---|
| Google Calendar | 60 requests per 60 seconds per user | Exponential backoff, `Retry-After` header |
| Microsoft Graph | 4,000 requests per 10 minutes per app | `Retry-After` header, batch when possible |

Store rate-limit state in `calendar_sync_state` (fields: `rate_limit_until`,
`rate_limit_backoff`).

---

## Phase 4 — UI Changes

### 4a. CalendarView.tsx — Enhanced Event Rendering

```typescript
// New union type for the calendar grid
type CalendarItem = {
    kind: 'task' | 'event';
    // task: Task fields
    // event: ExternalEvent fields  
    source: 'local' | 'google' | 'microsoft';
    id: string;          // "task-{id}" or "event-{provider}-{extId}"
    title: string;
    startDate: string;
    isDone?: boolean;
    color?: string;      // provider-specific color dot
};
```

- Replace `Task[]` local state with `CalendarItem[]`
- Color-code: Local tasks = accent color, Google = blue, Microsoft = orange
- Show external events alongside tasks in the grid
- Click an event → open detail (read-only or with "Convert to task" action)

### 4b. New Settings Panel — Calendar Accounts

Add a "Connected Calendars" section to `SettingsPanel.tsx`:

```
┌──────────────────────────────────┐
│  Connected Calendars             │
│                                  │
│  Google Calendar                 │
│  ─────────────────────────      │
│  user@gmail.com        [Sync]    │
│  Last synced: 2 min ago          │
│                         [Disconnect]│
│                                  │
│  [+ Add Google Calendar]         │
│  [+ Add Microsoft Calendar]      │
│                                  │
│  Sync Direction per account:     │
│  ○ Two-way (bidirectional)       │
│  ○ Export tasks only             │
│  ○ Import events only            │
└──────────────────────────────────┘
```

### 4c. Task Detail — Calendar Mapping

In `TaskDetail.tsx`, add a "Linked Calendar Event" section below the existing
sections:

- If not linked: button "Create calendar event" → creates event, shows link
- If linked: badge showing provider icon, "Open in Calendar" button,
  "Unlink" button, last-synced timestamp

### 4d. Sync Progress Indicator

Add a subtle sync indicator to the sidebar footer or status bar:

```
Google Calendar ● synced 2m ago
               ○ syncing...
               ○ sync error (click to retry)
```

---

## Phase 5 — Implementation Order

### Step 1 — Foundation (files: `lib/db.ts`, `lib/calendar-auth.ts`, `lib/calendar-api-google.ts`)
- Add SQLite tables and CRUD functions to `lib/db.ts`
- Build `lib/calendar-auth.ts` — PKCE OAuth flow
- Build `lib/calendar-api-google.ts` — Google Calendar REST client
- Build `lib/calendar-api-microsoft.ts` — Microsoft Graph client
- Add `calendar_tokens` CRUD to `store.ts`

### Step 2 — One-Way Pull (files: `lib/calendar-sync.ts`, `CalendarView.tsx`)
- Build `pullEvents()` in sync engine
- Add `CalendarItem` rendering to `CalendarView.tsx`
- Wire "Import events" button

### Step 3 — One-Way Push (files: `lib/calendar-sync.ts`, `store.ts`)
- Add push enqueue hooks to task mutations in `store.ts`
- Build `calendarSyncFlush()` with debounce
- Wire sync indicator

### Step 4 — Two-Way & Settings UI (files: `SettingsPanel.tsx`, `TaskDetail.tsx`)
- Add calendar account management to Settings
- Add event link display to TaskDetail
- Handle conflict resolution

### Step 5 — Supabase Cross-Device (files: `supabase/migrations/`, `lib/sync.ts`)
- Add Supabase tables for calendar tokens and event links
- Extend existing sync engine to include calendar data

---

## Estimated Effort

| Phase | Files | Complexity | Time |
|---|---|---|---|
| 1 (Foundation) | 4 new + 2 modified | Medium | 3-4 hours |
| 2 (Pull) | 1 new + 2 modified | Medium | 2-3 hours |
| 3 (Push) | 1 new + 1 modified | High | 3-4 hours |
| 4 (Two-Way/UI) | 2-3 modified | Medium | 2-3 hours |
| 5 (Supabase) | 2 new + 1 modified | Medium | 2 hours |

**Total**: ~12-16 hours of dev time, excluding testing and edge-case handling.

---

## Key Risks

1. **OAuth on Desktop**: Tauri has no built-in OAuth helper. The local HTTP
   server approach works but feels hacky. The Supabase piggyback approach
   (Phase 1, section 2e) avoids this for Google.
2. **Token Storage**: Plaintext tokens in SQLite are accessible to anyone
   with file system access. Use `tauri-plugin-store` (already a dep) with
   encryption, or Windows Credential Manager via a Rust command.
3. **Rate Limits**: Sync during high churn (e.g., importing 100 tasks) may
   hit provider limits. The queue + debounce pattern mitigates this.
4. **Recurring Events**: Google and Microsoft handle recurrence differently.
   Start with single events only, add recurrence in a follow-up.
5. **Conflict Resolution**: If a task is edited locally AND the corresponding
   event is edited externally between syncs, last-write-wins may lose data.
   MVP can accept this; v2 can add merge prompts.
