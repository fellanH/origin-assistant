"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangleIcon, RefreshCwIcon, ChevronDownIcon } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

type FallbackSize = "inline" | "compact" | "full";

type ErrorBoundaryProps = {
  children: ReactNode;
  /** Custom fallback UI to render on error */
  fallback?: ReactNode;
  /** Size/style of the default fallback */
  size?: FallbackSize;
  /** Label shown in the error UI */
  label?: string;
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Key to reset the boundary (change this to reset) */
  resetKey?: string | number;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
};

// ============================================================================
// Default Fallback Components
// ============================================================================

type DefaultFallbackProps = {
  size: FallbackSize;
  label?: string;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onRetry: () => void;
  showDetails: boolean;
  onToggleDetails: () => void;
};

function DefaultFallback({
  size,
  label,
  error,
  onRetry,
  showDetails,
  onToggleDetails,
}: DefaultFallbackProps) {
  const errorMessage = error?.message || "An unexpected error occurred";

  // Inline: minimal, single line
  if (size === "inline") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded">
        <AlertTriangleIcon className="w-3 h-3 flex-shrink-0" />
        <span className="truncate max-w-[200px]">
          {label ? `${label}: Error` : "Error rendering"}
        </span>
        <button
          onClick={onRetry}
          className="ml-1 p-0.5 hover:bg-amber-500/20 rounded transition-colors"
          title="Retry"
        >
          <RefreshCwIcon className="w-3 h-3" />
        </button>
      </span>
    );
  }

  // Compact: small card
  if (size === "compact") {
    return (
      <div className="p-3 border border-amber-500/30 bg-amber-500/5 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertTriangleIcon className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {label ? `${label} failed to load` : "Something went wrong"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {errorMessage}
            </p>
          </div>
          <button
            onClick={onRetry}
            className="p-1.5 rounded-md hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 transition-colors flex-shrink-0"
            title="Retry"
          >
            <RefreshCwIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Full: detailed error card with optional stack trace
  return (
    <div className="p-4 border border-destructive/30 bg-destructive/5 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
          <AlertTriangleIcon className="w-5 h-5 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">
            {label ? `${label} Error` : "Something went wrong"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {errorMessage}
          </p>
          
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <RefreshCwIcon className="w-3.5 h-3.5" />
              Try Again
            </button>
            <button
              onClick={onToggleDetails}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-colors"
            >
              Details
              <ChevronDownIcon
                className={`w-3.5 h-3.5 transition-transform ${showDetails ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {showDetails && error?.stack && (
            <pre className="mt-3 p-3 text-xs bg-muted/50 rounded-lg overflow-x-auto font-mono text-muted-foreground max-h-48 overflow-y-auto">
              {error.stack}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ErrorBoundary Class Component
// ============================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to console for debugging
    console.error("[ErrorBoundary] Caught error:", error);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);

    this.setState({ errorInfo });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset the error state when resetKey changes
    if (
      this.state.hasError &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        showDetails: false,
      });
    }
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  handleToggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Use default fallback
      return (
        <DefaultFallback
          size={this.props.size ?? "compact"}
          label={this.props.label}
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
          showDetails={this.state.showDetails}
          onToggleDetails={this.handleToggleDetails}
        />
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Convenience Wrapper Components
// ============================================================================

type BoundaryWrapperProps = {
  children: ReactNode;
  label?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
};

/** Inline error boundary for small, inline elements */
export function InlineErrorBoundary({ children, label, onError }: BoundaryWrapperProps) {
  return (
    <ErrorBoundary size="inline" label={label} onError={onError}>
      {children}
    </ErrorBoundary>
  );
}

/** Compact error boundary for cards and list items */
export function CompactErrorBoundary({ children, label, onError }: BoundaryWrapperProps) {
  return (
    <ErrorBoundary size="compact" label={label} onError={onError}>
      {children}
    </ErrorBoundary>
  );
}

/** Full error boundary for larger UI sections */
export function SectionErrorBoundary({ children, label, onError }: BoundaryWrapperProps) {
  return (
    <ErrorBoundary size="full" label={label} onError={onError}>
      {children}
    </ErrorBoundary>
  );
}
