import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
	type CalendarProvider,
	type CalendarToken,
	deleteCalendarToken,
	getCalendarToken,
	insertCalendarToken,
	listCalendarTokens,
	updateCalendarToken,
} from "./db";

const TOKEN_ENDPOINTS = {
	google: "https://oauth2.googleapis.com/token",
	microsoft: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
} as const;

const AUTHORIZE_ENDPOINTS = {
	google: "https://accounts.google.com/o/oauth2/v2/auth",
	microsoft: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
} as const;

const DEFAULT_SCOPES = {
	google: [
		"https://www.googleapis.com/auth/calendar.events",
		"https://www.googleapis.com/auth/calendar.readonly",
		"openid",
		"email",
	],
	microsoft: [
		"https://graph.microsoft.com/Calendars.ReadWrite",
		"offline_access",
		"openid",
		"email",
		"profile",
	],
} as const;

interface OAuthCallback {
	code: string;
	state: string;
	error: string | null;
}

interface TokenResponse {
	access_token: string;
	refresh_token?: string | null;
	expires_in: number;
	token_type: string;
	scope: string;
	id_token?: string;
}

export interface StoredTokens {
	accessToken: string;
	refreshToken: string | null;
	expiresAt: string | null;
	scope: string | null;
}

function getClientId(provider: CalendarProvider): string {
	const key =
		provider === "google"
			? "VITE_GOOGLE_CLIENT_ID"
			: "VITE_MICROSOFT_CLIENT_ID";
	const value = import.meta.env[key] as string | undefined;
	if (!value) {
		throw new Error(
			`${key} is not set. Add it to your .env file (see .env.example).`,
		);
	}
	return value;
}

function base64UrlEncode(bytes: Uint8Array): string {
	let str = "";
	for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
	const b64 = btoa(str);
	return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomBase64Url(byteLength: number): string {
	const random = new Uint8Array(byteLength);
	crypto.getRandomValues(random);
	return base64UrlEncode(random);
}

async function sha256(input: string): Promise<Uint8Array> {
	const data = new TextEncoder().encode(input);
	const hash = await crypto.subtle.digest("SHA-256", data);
	return new Uint8Array(hash);
}

export async function generatePkce(): Promise<{
	verifier: string;
	challenge: string;
}> {
	const verifier = randomBase64Url(32);
	const challenge = base64UrlEncode(await sha256(verifier));
	return { verifier, challenge };
}

export function makeState(): string {
	return randomBase64Url(16);
}

function buildAuthorizeUrl(
	provider: CalendarProvider,
	clientId: string,
	redirectUri: string,
	scopes: readonly string[],
	state: string,
	challenge: string,
	prompt?: "consent" | "select_account",
): string {
	const params = new URLSearchParams({
		client_id: clientId,
		response_type: "code",
		redirect_uri: redirectUri,
		scope: scopes.join(" "),
		state,
		code_challenge: challenge,
		code_challenge_method: "S256",
		access_type: "offline",
	});
	if (prompt === "consent") params.set("prompt", "consent");
	if (prompt === "select_account") params.set("prompt", "select_account");
	if (provider === "microsoft") {
		params.delete("access_type");
		params.set("response_mode", "query");
	}
	const base = AUTHORIZE_ENDPOINTS[provider];
	return `${base}?${params.toString()}`;
}

function parseExpiresAt(expiresIn: number): string {
	const d = new Date(Date.now() + expiresIn * 1000);
	return d.toISOString();
}

function parseTokenResponse(raw: unknown): TokenResponse {
	const obj = (raw ?? {}) as Record<string, unknown>;
	const accessToken = obj.access_token;
	if (typeof accessToken !== "string" || accessToken.length === 0) {
		throw new Error(
			`token response missing access_token: ${JSON.stringify(raw).slice(0, 200)}`,
		);
	}
	const expiresInNum =
		typeof obj.expires_in === "number"
			? obj.expires_in
			: Number.parseInt(String(obj.expires_in ?? "0"), 10);
	return {
		access_token: accessToken,
		refresh_token:
			typeof obj.refresh_token === "string" ? obj.refresh_token : null,
		expires_in: Number.isFinite(expiresInNum) ? expiresInNum : 3600,
		token_type: typeof obj.token_type === "string" ? obj.token_type : "Bearer",
		scope: typeof obj.scope === "string" ? obj.scope : "",
		id_token: typeof obj.id_token === "string" ? obj.id_token : undefined,
	};
}

async function exchangeCode(
	provider: CalendarProvider,
	redirectUri: string,
	code: string,
	verifier: string,
): Promise<TokenResponse> {
	const clientId = getClientId(provider);
	const body = new URLSearchParams({
		client_id: clientId,
		grant_type: "authorization_code",
		code,
		redirect_uri: redirectUri,
		code_verifier: verifier,
	});
	const res = await fetch(TOKEN_ENDPOINTS[provider], {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body,
	});
	const json = await res.json();
	if (!res.ok) {
		const msg =
			(json && typeof json === "object" && "error_description" in json
				? String((json as Record<string, unknown>).error_description)
				: `token exchange failed (HTTP ${res.status})`) ?? "unknown error";
		throw new Error(msg);
	}
	return parseTokenResponse(json);
}

async function refreshAccessToken(
	provider: CalendarProvider,
	refreshToken: string,
): Promise<TokenResponse> {
	const clientId = getClientId(provider);
	const body = new URLSearchParams({
		client_id: clientId,
		grant_type: "refresh_token",
		refresh_token: refreshToken,
		scope: DEFAULT_SCOPES[provider].join(" "),
	});
	const res = await fetch(TOKEN_ENDPOINTS[provider], {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body,
	});
	const json = await res.json();
	if (!res.ok) {
		const errObj = json as Record<string, unknown> | null;
		const code = errObj && typeof errObj.error === "string" ? errObj.error : "";
		if (code === "invalid_grant") {
			throw new Error("Refresh token revoked or expired — re-auth required.");
		}
		const msg =
			errObj && typeof errObj.error_description === "string"
				? errObj.error_description
				: `Refresh failed (HTTP ${res.status})`;
		throw new Error(msg);
	}
	return parseTokenResponse(json);
}

async function fetchAccountEmail(
	provider: CalendarProvider,
	accessToken: string,
	idToken?: string,
): Promise<string | null> {
	if (idToken) {
		const parts = idToken.split(".");
		if (parts.length >= 2) {
			try {
				const payload = JSON.parse(
					atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
				) as Record<string, unknown>;
				if (typeof payload.email === "string") return payload.email;
			} catch {
				// fall through to userinfo call below
			}
		}
	}
	const url =
		provider === "google"
			? "https://www.googleapis.com/oauth2/v3/userinfo"
			: "https://graph.microsoft.com/v1.0/me";
	const res = await fetch(url, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!res.ok) return null;
	const obj = (await res.json()) as Record<string, unknown>;
	if (typeof obj.email === "string") return obj.email;
	if (typeof obj.mail === "string" && obj.mail.length > 0) return obj.mail;
	if (typeof obj.userPrincipalName === "string") return obj.userPrincipalName;
	return null;
}

export async function connectProvider(
	provider: CalendarProvider,
	prompt?: "consent" | "select_account",
): Promise<CalendarToken> {
	if (
		typeof window !== "undefined" &&
		"__TAURI_INTERNALS__" in window === false
	) {
		throw new Error(
			"Calendar connect requires the Tauri desktop runtime — unavailable in browser dev mode.",
		);
	}

	const port = await invoke<number>("start_oauth_listener");
	const redirectUri = `http://localhost:${port}/`;
	const clientId = getClientId(provider);
	const scopes = DEFAULT_SCOPES[provider];
	const state = makeState();
	const { verifier, challenge } = await generatePkce();
	const url = buildAuthorizeUrl(
		provider,
		clientId,
		redirectUri,
		scopes,
		state,
		challenge,
		prompt,
	);

	await openUrl(url);

	const cb = await invoke<OAuthCallback>("await_oauth_callback", { port });
	if (cb.error) throw new Error(`OAuth error: ${cb.error}`);
	if (cb.state !== state) {
		throw new Error("OAuth state mismatch — possible CSRF attack aborted.");
	}
	if (!cb.code) throw new Error("OAuth callback missing authorization code.");

	const tokens = await exchangeCode(provider, redirectUri, cb.code, verifier);
	const email = await fetchAccountEmail(
		provider,
		tokens.access_token,
		tokens.id_token,
	);
	if (!email) {
		throw new Error(
			`Could not determine account email from ${provider} token response.`,
		);
	}

	await insertCalendarToken(
		provider,
		email,
		tokens.access_token,
		tokens.refresh_token ?? null,
		parseExpiresAt(tokens.expires_in),
		tokens.scope || null,
	);

	const row = await getCalendarToken(provider, email);
	if (!row) {
		throw new Error(
			"Token insert reported success but row could not be loaded.",
		);
	}
	return row;
}

export async function refreshProvider(
	provider: CalendarProvider,
): Promise<void> {
	const tokens = await listAllTokensForProvider(provider);
	if (tokens.length === 0) {
		throw new Error(`No connected ${provider} accounts to refresh.`);
	}
	for (const token of tokens) {
		if (!token.refresh_token) continue;
		const refreshed = await refreshAccessToken(provider, token.refresh_token);
		await updateCalendarToken(
			token.id,
			refreshed.access_token,
			refreshed.refresh_token ?? token.refresh_token,
			parseExpiresAt(refreshed.expires_in),
		);
	}
}

export async function refreshProviderForEmail(
	provider: CalendarProvider,
	email: string,
): Promise<CalendarToken> {
	const token = await getCalendarToken(provider, email);
	if (!token) throw new Error(`No ${provider} account for ${email}.`);
	if (!token.refresh_token) {
		throw new Error(`No refresh token stored for ${email}.`);
	}
	const refreshed = await refreshAccessToken(provider, token.refresh_token);
	await updateCalendarToken(
		token.id,
		refreshed.access_token,
		refreshed.refresh_token ?? token.refresh_token,
		parseExpiresAt(refreshed.expires_in),
	);
	const row = await getCalendarToken(provider, email);
	if (!row) {
		throw new Error("Token updated but row vanished.");
	}
	return row;
}

export async function disconnectProvider(
	provider: CalendarProvider,
	email: string,
): Promise<void> {
	const token = await getCalendarToken(provider, email);
	if (token?.refresh_token) {
		const endpoint =
			provider === "google"
				? "https://oauth2.googleapis.com/revoke"
				: "https://login.microsoftonline.com/common/oauth2/v2.0/logout";
		try {
			if (provider === "google") {
				await fetch(endpoint, {
					method: "POST",
					headers: { "Content-Type": "application/x-www-form-urlencoded" },
					body: new URLSearchParams({ token: token.refresh_token }),
				});
			} else {
				await fetch(endpoint, { method: "POST" });
			}
		} catch {
			// Best-effort — proceed to drop local token regardless.
		}
	}
	await deleteCalendarToken(provider, email);
}

export async function getValidAccessToken(
	provider: CalendarProvider,
	email: string,
): Promise<string> {
	const token = await getCalendarToken(provider, email);
	if (!token) {
		throw new Error(`No ${provider} account connected for ${email}.`);
	}
	const now = Date.now();
	const expiresAtMs = token.expires_at ? Date.parse(token.expires_at) : 0;
	const needsRefresh =
		!expiresAtMs || expiresAtMs - now < 60_000 || !token.access_token;
	if (!needsRefresh) return token.access_token;
	if (!token.refresh_token) {
		throw new Error(
			`Access token expired and no refresh token for ${email}. Reconnect required.`,
		);
	}
	const refreshed = await refreshProviderForEmail(provider, email);
	return refreshed.access_token;
}

export async function listAllTokensForProvider(
	provider: CalendarProvider,
): Promise<CalendarToken[]> {
	const all = await listCalendarTokens();
	return all.filter((t) => t.provider === provider);
}
