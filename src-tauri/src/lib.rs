use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::Manager;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_sql::{Migration, MigrationKind};
use tracing::{error, info};

pub struct FocusState {
    pub recently_shown: Arc<AtomicBool>,
}

fn show_window(window: &tauri::WebviewWindow) {
    if let Err(e) = window.show() {
        error!(?e, "failed to show window");
    }
    if let Err(e) = window.set_focus() {
        error!(?e, "failed to set window focus");
    }
    if let Err(e) = window.center() {
        error!(?e, "failed to center window");
    }
    if let Some(state) = window.try_state::<FocusState>() {
        state.recently_shown.store(true, Ordering::SeqCst);
    }
}

fn toggle_window(window: &tauri::WebviewWindow) {
    match window.is_visible() {
        Ok(true) => {
            if let Err(e) = window.hide() {
                error!(?e, "failed to hide window");
            }
        }
        Ok(false) => show_window(window),
        Err(e) => error!(?e, "failed to check window visibility"),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_tasks_table",
            sql: "CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT NOT NULL DEFAULT '',
                is_done INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                completed_at TEXT
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_priority_and_tags",
            sql: "ALTER TABLE tasks ADD COLUMN priority INTEGER NOT NULL DEFAULT 0;
                  ALTER TABLE tasks ADD COLUMN tags TEXT NOT NULL DEFAULT '';",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add_sort_order_and_recurrence",
            sql: "ALTER TABLE tasks ADD COLUMN sort_order REAL NOT NULL DEFAULT 0;
                  ALTER TABLE tasks ADD COLUMN recurrence TEXT NOT NULL DEFAULT '';
                  UPDATE tasks SET sort_order = id;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add_notes_and_subtasks",
            sql: "ALTER TABLE tasks ADD COLUMN notes TEXT NOT NULL DEFAULT '';
                  ALTER TABLE tasks ADD COLUMN parent_id INTEGER REFERENCES tasks(id);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "create_pomodoro_and_activity_log",
            sql: "CREATE TABLE IF NOT EXISTS pomodoro_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER REFERENCES tasks(id),
                started_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                completed_at TEXT,
                duration_work INTEGER NOT NULL DEFAULT 1500,
                duration_break INTEGER NOT NULL DEFAULT 300,
                actual_work INTEGER,
                actual_break INTEGER
            );
            CREATE TABLE IF NOT EXISTS activity_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER,
                action TEXT NOT NULL,
                timestamp TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "add_task_date_notes_timeblocks",
            sql: "ALTER TABLE tasks ADD COLUMN task_date TEXT;
                  ALTER TABLE tasks ADD COLUMN time_block_id INTEGER REFERENCES time_blocks(id);
                  CREATE TABLE IF NOT EXISTS notes (
                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                      title TEXT NOT NULL DEFAULT '',
                      content TEXT NOT NULL DEFAULT '',
                      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
                  );
                  CREATE TABLE IF NOT EXISTS time_blocks (
                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                      label TEXT NOT NULL,
                      start_time TEXT NOT NULL,
                      end_time TEXT NOT NULL,
                      day_of_week INTEGER,
                      color TEXT NOT NULL DEFAULT '#8b7eff',
                      sort_order REAL NOT NULL DEFAULT 0
                  );
                  INSERT INTO time_blocks (label, start_time, end_time, day_of_week, color, sort_order) VALUES
                      ('Morning Prep', '07:00', '08:00', NULL, '#8b7eff', 1),
                      ('Period 1', '08:00', '09:30', NULL, '#22c55e', 2),
                      ('Period 2', '09:45', '11:15', NULL, '#eab308', 3),
                      ('Period 3', '11:30', '13:00', NULL, '#ef4444', 4),
                      ('Lunch', '13:00', '14:00', NULL, '#ec4899', 5),
                      ('Period 4', '14:00', '15:30', NULL, '#3b82f6', 6),
                      ('Period 5', '15:45', '17:15', NULL, '#a855f7', 7),
                      ('Evening Study', '18:00', '21:00', NULL, '#22c55e', 8);",
            kind: MigrationKind::Up,
        },
    ];

    // Initialize structured logging
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "focustap=info".into()),
        )
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:focustap.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_licenseseat::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            use tauri::menu::{Menu, MenuItem};
            use tauri::tray::TrayIconBuilder;

            app.manage(FocusState {
                recently_shown: Arc::new(AtomicBool::new(false)),
            });

            let show = MenuItem::with_id(app, "show", "Show FocusTap", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("FocusTap — Quick Tasks")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            show_window(&window);
                        }
                    }
                    other => {
                        info!(id = %other, "unknown tray menu event");
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    use tauri::tray::{MouseButton, MouseButtonState, TrayIconEvent};
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            toggle_window(&window);
                        }
                    }
                })
                .build(app)?;

            let handle = app.handle().clone();
            let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::Space);
            app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    if let Some(window) = handle.get_webview_window("main") {
                        toggle_window(&window);
                    }
                }
            })?;

            Ok(())
        })
        .on_window_event(|window, event| {
            match event {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    api.prevent_close();
                    let _ = window.hide();
                }
                tauri::WindowEvent::Focused(false) => {
                    // Don't hide on focus loss — user complained they "can't reach" the app.
                    // They can minimize via the app's close button or tray -> Quit.
                }
                other => {
                    info!(?other, "unknown window event");
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
