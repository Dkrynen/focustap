import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
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
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] px-6 text-center gap-4">
          <AlertTriangle size={32} className="text-red-400" />
          <h2 className="text-base font-semibold text-text-primary">Something went wrong</h2>
          <p className="text-xs text-text-tertiary max-w-[280px] leading-relaxed">
            FocusTap encountered an unexpected error. You can try reloading, or check Settings for updates.
          </p>
          <p className="text-[10px] text-text-quaternary font-mono max-w-[300px] truncate">
            {this.state.error?.message}
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-accent-primary/20 hover:bg-accent-primary/30 text-accent-primary text-xs font-medium rounded-[8px] transition-colors cursor-pointer"
          >
            <RefreshCw size={14} />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
