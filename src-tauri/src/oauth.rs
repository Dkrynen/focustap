use std::collections::HashMap;
use std::time::Duration;

use tauri::{AppHandle, Manager};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio::sync::oneshot;
use tracing::{error, warn};

#[derive(serde::Serialize, Clone, Debug)]
pub struct OAuthCallback {
	pub code: String,
	pub state: String,
	pub error: Option<String>,
}

#[derive(Default)]
pub struct OAuthAwaiters {
	pub waiters: tokio::sync::Mutex<HashMap<u16, oneshot::Receiver<OAuthCallback>>>,
}

const CALLBACK_TIMEOUT_SECS: u64 = 300;
const SUCCESS_BODY: &str = "<!doctype html><html><head><title>FocusTap</title></head><body style=\"font-family:system-ui;padding:40px;text-align:center\"><h1>Authorization complete</h1><p>You can close this window and return to FocusTap.</p></body></html>";

fn percent_decode(input: &str) -> String {
	let bytes = input.as_bytes();
	let mut out: Vec<u8> = Vec::with_capacity(bytes.len());
	let mut i = 0;
	while i < bytes.len() {
		if bytes[i] == b'%' && i + 2 < bytes.len() {
			if let (Some(h), Some(l)) = (hex(bytes[i + 1]), hex(bytes[i + 2])) {
				out.push((h << 4) | l);
				i += 3;
				continue;
			}
		}
		if bytes[i] == b'+' {
			out.push(b' ');
		} else {
			out.push(bytes[i]);
		}
		i += 1;
	}
	String::from_utf8_lossy(&out).into_owned()
}

fn hex(b: u8) -> Option<u8> {
	match b {
		b'0'..=b'9' => Some(b - b'0'),
		b'a'..=b'f' => Some(b - b'a' + 10),
		b'A'..=b'F' => Some(b - b'A' + 10),
		_ => None,
	}
}

fn parse_callback(request: &str) -> OAuthCallback {
	let first_line = request.lines().next().unwrap_or("");
	let path = first_line.split_whitespace().nth(1).unwrap_or("");
	let query = path.split('?').nth(1).unwrap_or("");

	let mut code = String::new();
	let mut state = String::new();
	let mut error: Option<String> = None;

	for pair in query.split('&') {
		let mut parts = pair.splitn(2, '=');
		let key = parts.next().unwrap_or("");
		let raw = parts.next().unwrap_or("");
		let value = percent_decode(raw);
		match key {
			"code" => code = value,
			"state" => state = value,
			"error" => error = Some(value),
			_ => {}
		}
	}

	OAuthCallback { code, state, error }
}

#[tauri::command]
pub async fn start_oauth_listener(app: AppHandle) -> Result<u16, String> {
	let listener = TcpListener::bind("127.0.0.1:0")
		.await
		.map_err(|e| format!("bind failed: {e}"))?;
	let port = listener
		.local_addr()
		.map_err(|e| format!("local_addr failed: {e}"))?
		.port();

	let (tx, rx) = oneshot::channel::<OAuthCallback>();
	{
		let state = app.state::<OAuthAwaiters>();
		let mut waiters = state.waiters.lock().await;
		waiters.insert(port, rx);
	}

	let app_handle = app.clone();
	tokio::spawn(async move {
		let accept = tokio::time::timeout(
			Duration::from_secs(CALLBACK_TIMEOUT_SECS),
			listener.accept(),
		)
		.await;

		let (mut stream, _addr) = match accept {
			Ok(Ok(pair)) => pair,
			Ok(Err(e)) => {
				error!(?e, port, "oauth accept failed");
				let state = app_handle.state::<OAuthAwaiters>();
				let mut waiters = state.waiters.lock().await;
				waiters.remove(&port);
				return;
			}
			Err(_) => {
				warn!(port, "oauth listener timed out waiting for callback");
				let state = app_handle.state::<OAuthAwaiters>();
				let mut waiters = state.waiters.lock().await;
				waiters.remove(&port);
				return;
			}
		};

		let mut buf = [0u8; 8192];
		let n = stream.read(&mut buf).await.unwrap_or(0);
		let req = String::from_utf8_lossy(&buf[..n]);
		let cb = parse_callback(&req);

		let resp = format!(
			"HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
			SUCCESS_BODY.len(),
			SUCCESS_BODY
		);
		let _ = stream.write_all(resp.as_bytes()).await;
		let _ = stream.flush().await;
		let _ = stream.shutdown().await;

		let _ = tx.send(cb);
	});

	Ok(port)
}

#[tauri::command]
pub async fn await_oauth_callback(app: AppHandle, port: u16) -> Result<OAuthCallback, String> {
	let rx = {
		let state = app.state::<OAuthAwaiters>();
		let mut waiters = state.waiters.lock().await;
		waiters
			.remove(&port)
			.ok_or_else(|| format!("no listener registered for port {port}"))?
	};

	match tokio::time::timeout(Duration::from_secs(CALLBACK_TIMEOUT_SECS), rx).await {
		Ok(Ok(cb)) => Ok(cb),
		Ok(Err(_)) => Err("oauth sender dropped before callback".to_string()),
		Err(_) => Err("oauth callback timed out".to_string()),
	}
}