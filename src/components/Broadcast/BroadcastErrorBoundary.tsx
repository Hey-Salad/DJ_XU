import React, { type ReactNode } from 'react';

export interface BroadcastErrorBoundaryProps {
  children: ReactNode;
}

interface BroadcastErrorBoundaryState {
  hasError: boolean;
}

export class BroadcastErrorBoundary extends React.Component<
  BroadcastErrorBoundaryProps,
  BroadcastErrorBoundaryState
> {
  state: BroadcastErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): BroadcastErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('Broadcast UI error', error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[250px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white">
          <div>
            <p className="text-lg font-semibold">Unable to load broadcast controls.</p>
            <p className="text-sm text-white/60 mb-4">Try refreshing to continue streaming.</p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white transition hover:border-white"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
