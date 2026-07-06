type PostHogInstance = {
	capture: (event: string, properties?: Record<string, unknown>) => void;
	identify: (distinctId: string, properties?: Record<string, unknown>) => void;
	reset: () => void;
	opt_out_capturing: () => void;
	opt_in_capturing: () => void;
	has_opted_out_capturing: () => boolean;
};

let _client: PostHogInstance | null = null;
let _initialized = false;
let _enabled = false;

function getVersion(): string {
	try {
		return import.meta.env.VITE_APP_VERSION || "0.1.0";
	} catch {
		return "0.1.0";
	}
}

export async function initAnalytics(): Promise<void> {
	if (_initialized) return;
	_initialized = true;

	const key = import.meta.env.VITE_POSTHOG_KEY as string;
	const host = import.meta.env.VITE_POSTHOG_HOST as string;

	// No-op if placeholder key — analytics not configured
	if (!key || key === "phc_placeholder" || !host) {
		return;
	}

	try {
		const { posthog } = await import("posthog-js");
		posthog.init(key, {
			api_host: host,
			autocapture: false,
			capture_pageview: false,
			capture_pageleave: false,
			disable_session_recording: true,
			persistence: "localStorage",
			loaded: (ph: PostHogInstance) => {
				_client = ph;
				// Start opted-out by default; only enable if user has opted in
				ph.opt_out_capturing();
			},
		});
	} catch {
		// Analytics unavailable — silently no-op
	}
}

export function setAnalyticsEnabled(enabled: boolean): void {
	_enabled = enabled;
	if (_client) {
		if (enabled) {
			_client.opt_in_capturing();
		} else {
			_client.opt_out_capturing();
		}
	}
}

export function isAnalyticsEnabled(): boolean {
	if (!_client) return false;
	return !_client.has_opted_out_capturing();
}

export function trackEvent(
	event: string,
	properties?: Record<string, unknown>,
): void {
	if (!_enabled || !_client) return;

	// Never track personal data — strip known PII keys
	const {
		text: _t,
		content: _c,
		email: _e,
		user: _u,
		...rest
	} = properties ?? {};
	const safeProperties: Record<string, unknown> = {
		...rest,
		app_version: getVersion(),
	};

	try {
		_client.capture(event, safeProperties);
	} catch {
		// Silent fail — analytics should never break the app
	}
}

export function resetAnalytics(): void {
	if (_client) {
		_client.reset();
	}
	_enabled = false;
}
