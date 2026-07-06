import { AlertTriangle, RefreshCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { withTranslation } from "react-i18next";
import type { WithTranslation } from "react-i18next";

interface Props extends WithTranslation {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

class ErrorBoundaryInner extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("[ErrorBoundary]", error.message, info.componentStack);
		// Attempt to report to analytics if available
		try {
			import("../lib/analytics").then(({ trackEvent }) => {
				trackEvent("error_boundary_caught", {
					error: error.message,
					componentStack: info.componentStack?.slice(0, 500),
				});
			});
		} catch {
			// Analytics unavailable — no-op
		}
	}

	handleReset = () => {
		this.setState({ hasError: false, error: null });
	};

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<div className="flex flex-col items-center justify-center min-h-screen bg-surface-primary px-6 text-center gap-4">
					<AlertTriangle size={32} className="text-red-400" />
					<h2 className="text-base font-semibold text-text-primary">
						{this.props.t("errors.error_boundary_title")}
					</h2>
					<p className="text-xs text-text-tertiary max-w-[280px] leading-relaxed">
						{this.props.t("errors.error_boundary_desc")}
					</p>
					<p className="text-[10px] text-text-quaternary font-mono max-w-[300px] truncate">
						{this.state.error?.message}
					</p>
					<button
						onClick={this.handleReset}
						className="flex items-center gap-2 px-4 py-2 bg-accent-primary/20 hover:bg-accent-primary/30 text-accent-primary text-xs font-medium rounded-[8px] transition-colors cursor-pointer
						   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]
						   focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-primary)]"
					>
						<RefreshCw size={14} />
						{this.props.t("common.retry")}
					</button>
				</div>
			);
		}

		return this.props.children;
	}
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryInner);
