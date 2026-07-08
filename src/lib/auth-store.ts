import type { User } from "@supabase/supabase-js";
import { create } from "zustand";
import {
	getCurrentSession,
	getSupabase,
	signInWithMagicLink,
	signOut,
} from "./supabase";

interface AuthState {
	user: User | null;
	loading: boolean;
	initialized: boolean;
	error: string | null;
	checkSession: () => Promise<void>;
	login: (email: string) => Promise<void>;
	logout: () => Promise<void>;
	clearError: () => void;
}

let listenerSetup = false;

export const useAuthStore = create<AuthState>((set) => ({
	user: null,
	loading: false,
	initialized: false,
	error: null,

	checkSession: async () => {
		if (!import.meta.env.VITE_SUPABASE_URL) {
			set({ initialized: true });
			return;
		}

		try {
			const supabase = getSupabase();

			// Set up onAuthStateChange listener ONCE
			// This catches magic link redirects that detectSessionInUrl processes asynchronously
			if (!listenerSetup) {
				listenerSetup = true;
				const { data } = supabase.auth.onAuthStateChange((_event, session) => {
					if (session?.user) {
						set({ user: session.user, initialized: true });
					} else {
						set({ user: null });
					}
				});
				if (data?.subscription && typeof window !== "undefined") {
					window.addEventListener("beforeunload", () => {
						data.subscription.unsubscribe();
					});
				}
			}

			const session = await getCurrentSession();
			if (session?.user) {
				set({ user: session.user, initialized: true });
				return;
			}
		} catch {
			// Not configured or offline — stay unauthenticated
		}
		set({ initialized: true });
	},

	login: async (email: string) => {
		set({ loading: true, error: null });
		try {
			await signInWithMagicLink(email);
			set({ loading: false, error: null });
		} catch (e) {
			const message =
				e instanceof Error ? e.message : "Failed to send magic link";
			set({ loading: false, error: message });
			throw e;
		}
	},

	logout: async () => {
		try {
			await signOut();
		} finally {
			set({ user: null });
		}
	},

	clearError: () => set({ error: null }),
}));
