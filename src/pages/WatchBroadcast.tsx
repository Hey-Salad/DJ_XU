import React, { type PropsWithChildren } from 'react';
import { useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';

import BroadcastViewer from '../components/Viewer/BroadcastViewer';
import { useBroadcastAccess } from '../hooks/useBroadcastAccess';

class BroadcastErrorBoundary extends React.Component<PropsWithChildren<unknown>, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Broadcast viewer crashed', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
          <div className="rounded-2xl border border-white/20 bg-white/5 p-6 text-center">
            <p className="text-xl font-semibold">Something went wrong</p>
            <p className="text-sm text-white/60">
              We ran into an issue displaying the broadcast. Please refresh the page.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function WatchBroadcast(): JSX.Element {
  const { token } = useParams<{ token: string }>();

  if (!token) {
    return <Navigate to="/" replace />;
  }

  const access = useBroadcastAccess(token);

  const errorCopy = useMemo(() => {
    if (access.reason) {
      return access.reason;
    }
    if (access.error) {
      return access.error;
    }
    return 'Unable to join broadcast, please try again.';
  }, [access.reason, access.error]);

  if (access.status === 'loading' || access.status === 'idle') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="animate-pulse rounded-2xl border border-white/20 bg-white/5 px-6 py-4 text-center">
          Connecting to DJ Xu broadcast…
        </div>
      </div>
    );
  }

  if (access.status === 'error' || !access.session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-4 text-white">
        <div className="rounded-2xl border border-white/20 bg-white/5 px-6 py-5 text-center">
          <p className="text-lg font-semibold">Broadcast unavailable</p>
          <p className="text-sm text-white/60">{errorCopy}</p>
          <button
            type="button"
            className="mt-4 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold transition hover:border-white"
            onClick={() => {
              access.refresh();
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <BroadcastErrorBoundary>
      <BroadcastViewer
        session={access.session}
        viewer={access.viewer}
        status={access.status}
        refresh={access.refresh}
      />
    </BroadcastErrorBoundary>
  );
}
