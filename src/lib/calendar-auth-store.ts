import { create } from "zustand";
import {
	connectProvider,
	disconnectProvider,
	refreshProvider,
	refreshProviderForEmail,
} from "./calendar-auth";
import { pullAll, type SyncResult, summarizeSync } from "./calendar-sync";
import {
	type CalendarProvider,
	type CalendarToken,
	deleteCalendarToken,
	listCalendarTokens,
} from "./db";

interface CalendarAuthState {
	connectedAccounts: CalendarToken[];
	loading: boolean;
	authInProgress: boolean;
	authError: string | null;
	lastConnectedAt: string | null;
	syncInProgress: boolean;
	lastSyncAt: string | null;
	lastSyncSummary: {
		totalPulled: number;
		totalDeleted: number;
		totalErrors: number;
		messages: string[];
	} | null;

	loadConnectedAccounts: () => Promise<void>;
	connect: (provider: CalendarProvider) => Promise<CalendarToken | null>;
	disconnect: (provider: CalendarProvider, email: string) => Promise<void>;
	refreshOne: (provider: CalendarProvider, email: string) => Promise<void>;
	refreshAll: (provider: CalendarProvider) => Promise<void>;
	pullSyncAll: () => Promise<SyncResult[]>;
	clearError: () => void;
}

export const useCalendarAuthStore = create<CalendarAuthState>((set, get) => ({
	connectedAccounts: [],
	loading: false,
	authInProgress: false,
	authError: null,
	lastConnectedAt: null,
	syncInProgress: false,
	lastSyncAt: null,
	lastSyncSummary: null,

	loadConnectedAccounts: async () => {
		set({ loading: true });
		try {
			const rows = await listCalendarTokens();
			set({
				connectedAccounts: rows,
				loading: false,
				authError: null,
			});
		} catch (e) {
			set({
				loading: false,
				authError:
					e instanceof Error ? e.message : "Failed to load connected calendars",
			});
		}
	},

	connect: async (provider) => {
		set({ authInProgress: true, authError: null });
		try {
			const token = await connectProvider(provider, "consent");
			const rows = await listCalendarTokens();
			set({
				connectedAccounts: rows,
				authInProgress: false,
				lastConnectedAt: new Date().toISOString(),
			});
			return token;
		} catch (e) {
			const message =
				e instanceof Error ? e.message : `Failed to connect ${provider}`;
			set({ authInProgress: false, authError: message });
			return null;
		}
	},

	disconnect: async (provider, email) => {
		set({ loading: true, authError: null });
		try {
			await disconnectProvider(provider, email);
			const remaining = get().connectedAccounts.filter(
				(t) => !(t.provider === provider && t.account_email === email),
			);
			set({ connectedAccounts: remaining, loading: false });
		} catch (e) {
			set({
				loading: false,
				authError:
					e instanceof Error ? e.message : `Failed to disconnect ${email}`,
			});
		}
	},

	refreshOne: async (provider, email) => {
		try {
			await refreshProviderForEmail(provider, email);
			const rows = await listCalendarTokens();
			set({ connectedAccounts: rows, authError: null });
		} catch (e) {
			set({
				authError:
					e instanceof Error ? e.message : `Failed to refresh ${email}`,
			});
			if (
				e instanceof Error &&
				/revoke|expired|invalid_grant/i.test(e.message)
			) {
				await deleteCalendarToken(provider, email);
				const remaining = get().connectedAccounts.filter(
					(t) => !(t.provider === provider && t.account_email === email),
				);
				set({ connectedAccounts: remaining });
			}
		}
	},

	refreshAll: async (provider) => {
		set({ loading: true });
		try {
			await refreshProvider(provider);
			const rows = await listCalendarTokens();
			set({ connectedAccounts: rows, loading: false, authError: null });
		} catch (e) {
			set({
				loading: false,
				authError:
					e instanceof Error ? e.message : `Failed to refresh ${provider}`,
			});
		}
	},

	pullSyncAll: async () => {
		set({ syncInProgress: true, authError: null });
		try {
			const results = await pullAll();
			const summary = summarizeSync(results);
			set({
				syncInProgress: false,
				lastSyncAt: new Date().toISOString(),
				lastSyncSummary: summary,
			});
			return results;
		} catch (e) {
			set({
				syncInProgress: false,
				authError: e instanceof Error ? e.message : "Pull sync failed",
			});
			return [];
		}
	},

	clearError: () => set({ authError: null }),
}));
