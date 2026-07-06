import * as Sentry from "@sentry/react";

let _initialized = false;

export function initSentry(): void {
	if (_initialized) return;

	const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
	if (!dsn) {
		// Sentry not configured — silently skip
		return;
	}

	try {
		Sentry.init({
			dsn,
			environment: import.meta.env.PROD ? "production" : "development",
			release: `focustap@${import.meta.env.VITE_APP_VERSION || "0.1.0"}`,
			integrations: [
				Sentry.browserTracingIntegration(),
				Sentry.replayIntegration({
					maskAllText: true,
					blockAllMedia: true,
				}),
			],
			// Sample rate: 1.0 in prod, 0.1 in dev
			tracesSampleRate: import.meta.env.PROD ? 1.0 : 0.1,
			// Session replay: only in production
			replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 0.0,
			replaysOnErrorSampleRate: import.meta.env.PROD ? 1.0 : 0.0,
			// Never send PII
			beforeSend(event) {
				if (event.request?.url) {
					// Strip query params that might contain sensitive data
					try {
						const url = new URL(event.request.url);
						url.search = "";
						event.request.url = url.toString();
					} catch {
						// ignore parse failures
					}
				}
				return event;
			},
		});
		_initialized = true;
	} catch (e) {
		console.error("Sentry init failed:", e);
	}
}

export function getSentry() {
	return _initialized ? Sentry : null;
}
