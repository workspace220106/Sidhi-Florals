import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props { children: ReactNode }
interface State { error: Error | null }

/**
 * Catches render errors so a single bad page can never blank the whole app.
 * Shows a recovery card instead of a white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Sidhi Florals] render error:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="card p-8 max-w-md text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl">Something went wrong</h1>
            <p className="text-muted mt-2 text-sm">
              This screen hit an unexpected error. Your saved bills and stock are safe — nothing was lost.
            </p>
          </div>
          <pre className="text-left text-xs bg-background p-3 rounded-lg border border-border overflow-x-auto text-muted">
            {error.message}
          </pre>
          <div className="flex gap-3 justify-center">
            <button onClick={() => this.setState({ error: null })} className="btn-outline">
              <RotateCcw className="w-4 h-4" /> Try again
            </button>
            <button onClick={() => window.location.assign("/")} className="btn-primary">
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
}
