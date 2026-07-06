import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastProvider } from "./components/Toast";
import "./lib/i18n";
import { initSentry } from "./lib/sentry";
import "./index.css";

// Initialize error tracking (safe no-op if DSN not configured)
initSentry();

// Detect system theme preference for initial load before React renders
(function applyInitialTheme() {
	try {
		const stored = localStorage.getItem("focustap-theme");
		if (stored === "light" || stored === "dark") {
			if (stored === "light") document.documentElement.classList.add("light");
			return;
		}
		// System preference
		if (window.matchMedia("(prefers-color-scheme: light)").matches) {
			document.documentElement.classList.add("light");
		}
	} catch {
		// localStorage unavailable — no-op
	}
})();

// Catch unhandled promise rejections globally
window.addEventListener("unhandledrejection", (event) => {
	console.error("[UnhandledRejection]", event.reason);
	event.preventDefault();
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<ErrorBoundary>
			<ToastProvider>
				<App />
			</ToastProvider>
		</ErrorBoundary>
	</React.StrictMode>,
);
