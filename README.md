# FocusTap

**Deep work, streamlined.**

A minimalist, distraction-free Pomodoro timer and task manager for Windows — built with Tauri v2 + React + TypeScript.

5.5 MB. No Electron. No bloat. Just focus.

## Features

- **Pomodoro Timer** — 25-minute focus sessions with a visual progress ring, work/break intervals
- **Smart Task Management** — Natural language input: `Write report !h #work` auto-parses priority and tags
- **5 Themes** — Midnight, Aurora, Sepia, Evergreen, Monochrome — each with dark and light modes
- **Focus Analytics** — Track streaks, daily completions, and focus session history
- **Built-in Notes** — Capture ideas alongside tasks without switching apps
- **Day Planner & Calendar** — Plan your day and review past work
- **Keyboard-First** — Full keyboard navigation with customizable shortcuts
- **Quick Search** — Instant task search (⌘F)
- **Real-time Team Sync** — Optional Supabase integration for workspace collaboration
- **Export** — Markdown and CSV export with one click

## Download

[Download the latest installer](https://github.com/Dkrynen/focustap/releases/latest) (Windows x64)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | [Tauri v2](https://v2.tauri.app) |
| Frontend | React 19 + TypeScript + Tailwind v4 |
| State | Zustand |
| Database | SQLite (via `@tauri-apps/plugin-sql`) |
| Optional cloud | Supabase (auth, Realtime, RLS) |
| Icons | Lucide React |
| Themes | CSS custom properties (5 presets × 2 modes) |

## Development

```bash
# Install dependencies
npm install

# Run in development mode (requires Tauri CLI)
npm run tauri dev

# Build for production
npm run tauri build
```

## License

[MIT](LICENSE)
