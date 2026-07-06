import { CheckCircle, ListChecks, Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../lib/auth-store";

export function AuthPage() {
	const { t } = useTranslation();
	const { login, loading, error, clearError } = useAuthStore();
	const [email, setEmail] = useState("");
	const [sent, setSent] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email.trim()) return;
		clearError();
		try {
			await login(email.trim());
			setSent(true);
		} catch {
			// error handled by store
		}
	};

	if (sent) {
		return (
			<div className="h-full flex items-center justify-center bg-surface-primary px-6">
				<div className="flex flex-col items-center text-center max-w-sm gap-4">
					<div className="w-12 h-12 rounded-full bg-accent-subtle flex items-center justify-center">
						<CheckCircle size={24} className="text-accent-primary" />
					</div>
					<h1 className="text-lg font-semibold text-text-primary">
						{t("auth.check_email")}
					</h1>
					<p className="text-sm text-text-secondary leading-relaxed">
						{t("auth.check_email_desc", { email })}
					</p>
					<button
						type="button"
						onClick={() => setSent(false)}
						className="text-xs text-accent-primary hover:underline cursor-pointer"
					>
						{t("auth.use_different_email")}
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="h-full flex items-center justify-center bg-surface-primary px-6">
			<div className="flex flex-col items-center text-center max-w-sm w-full gap-6">
				{/* Logo */}
				<div className="flex items-center gap-2">
					<ListChecks size={20} className="text-accent-primary" />
					<span className="text-sm font-medium text-text-primary">
						{t("app.name")}
					</span>
				</div>

				<div className="flex flex-col gap-1">
					<h1 className="text-lg font-semibold text-text-primary">
						{t("auth.welcome")}
					</h1>
					<p className="text-sm text-text-secondary">
						{t("auth.welcome_desc")}
					</p>
				</div>

				<form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
					<div className="relative">
						<Mail
							size={14}
							className="absolute left-3 top-1/2 -translate-y-1/2 text-text-quaternary"
						/>
						<input
							type="email"
							value={email}
							onChange={(e) => {
								setEmail(e.target.value);
								clearError();
							}}
							placeholder={t("auth.email_placeholder")}
							required
							disabled={loading}
							className="w-full h-10 pl-9 pr-3 text-sm bg-surface-deep border border-border-subtle rounded-[6px] text-text-primary placeholder:text-text-quaternary outline-none focus:border-accent-primary transition-colors disabled:opacity-50"
						/>
					</div>

					{error && <p className="text-xs text-red-400 text-left">{error}</p>}

					<button
						type="submit"
						disabled={loading || !email.trim()}
						className="h-10 flex items-center justify-center gap-2 text-sm font-medium bg-accent-primary text-white rounded-[6px] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
					>
						{loading && <Loader2 size={14} className="animate-spin" />}
						{t("auth.send_magic_link")}
					</button>
				</form>

				<p className="text-xs text-text-quaternary max-w-[280px] leading-relaxed">
					{t("auth.magic_link_hint")}
				</p>
			</div>
		</div>
	);
}
