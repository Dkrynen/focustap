import type { User } from "@supabase/supabase-js";
import { create } from "zustand";
import { getCurrentSession, signInWithMagicLink, signOut } from "./supabase";

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

export const useAuthStore = create<AuthState>((set) => ({
	user: null,
	loading: false,
	initialized: false,
	error: null,

	checkSession: async () => {
		if (import.meta.env.VITE_SUPABASE_URL) {
			try {
				const session = await getCurrentSession();
				if (session?.user) {
					set({ user: session.user, initialized: true });
					return;
				}
			} catch {
				// Not configured or offline — stay unauthenticated
			}
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
