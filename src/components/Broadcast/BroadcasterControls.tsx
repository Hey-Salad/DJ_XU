import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BroadcastService } from '../../services/broadcast/broadcastService';
import { getSupabaseClient } from '../../services/data/supabaseClient';
import type { StartBroadcastResponse } from '../../types/broadcast';
import { QRCodeSVG } from 'qrcode.react';

interface BroadcasterControlsProps {
  performanceSessionId: string;
  onBroadcastStart?: (response: StartBroadcastResponse) => void;
  onBroadcastEnd?: () => void;
  broadcastService: BroadcastService;
}

export const BroadcasterControls: React.FC<BroadcasterControlsProps> = ({
  performanceSessionId,
  onBroadcastStart,
  onBroadcastEnd,
  broadcastService
}) => {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [isLive, setIsLive] = useState(false);
  const [broadcastData, setBroadcastData] = useState<StartBroadcastResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [title, setTitle] = useState<string>('Live Broadcast');

  useEffect(() => {
    if (!broadcastData?.broadcastId) {
      setViewerCount(0);
      return undefined;
    }

    const channel = supabase
      .channel(`broadcast:${broadcastData.broadcastId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'broadcast_sessions',
          filter: `id=eq.${broadcastData.broadcastId}`,
        },
        (payload) => {
          const newCount = payload.new?.viewer_count as number | undefined;
          if (typeof newCount === 'number') {
            setViewerCount(newCount);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [broadcastData?.broadcastId, supabase]);

  const handleStartBroadcast = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await broadcastService.startBroadcast({
        performanceSessionId,
        maxViewers: 100,
        captionLanguage: 'en',
        enableTranslations: true,
        watchBaseUrl: window.location.origin,
        title,
      });

      setBroadcastData(response);
      setIsLive(true);
      onBroadcastStart?.(response);
    } catch (err) {
      console.error('Failed to start broadcast:', err);
      setError(err instanceof Error ? err.message : 'Failed to start broadcast');
    } finally {
      setIsLoading(false);
    }
  }, [performanceSessionId, broadcastService, onBroadcastStart]);

  const handleEndBroadcast = useCallback(async () => {
    if (!broadcastData) return;

    setIsLoading(true);
    setError(null);

    try {
      await broadcastService.endBroadcast(broadcastData.broadcastToken);
      setIsLive(false);
      setBroadcastData(null);
      setShowQR(false);
      onBroadcastEnd?.();
    } catch (err) {
      console.error('Failed to end broadcast:', err);
      setError(err instanceof Error ? err.message : 'Failed to end broadcast');
    } finally {
      setIsLoading(false);
    }
  }, [broadcastData, broadcastService, onBroadcastEnd]);

  const handleCopyLink = useCallback(async () => {
    if (!broadcastData) return;

    const computedShareUrl = (() => {
      try {
        return new URL(`/watch/${broadcastData.broadcastToken}`, window.location.origin).toString();
      } catch {
        return broadcastData.shareUrl;
      }
    })();

    try {
      await navigator.clipboard.writeText(computedShareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      setError('Failed to copy link');
    }
  }, [broadcastData]);

  if (!isLive) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-slate-900 font-medium text-lg">Live Broadcast</h3>
            <p className="text-slate-500 text-sm">Share your DJ session with viewers</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Broadcast name"
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900"
            />
          <button
            onClick={handleStartBroadcast}
            disabled={isLoading}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-lg"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <span className="w-3 h-3 rounded-full bg-white animate-pulse" />
                Go Live
              </>
            )}
          </button>
          </div>
        </div>
        {error && (
          <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-red-600 bg-white p-4 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
            </span>
            <span className="text-slate-900 font-bold text-lg">LIVE</span>
          </div>
          <div className="text-slate-500 text-sm">
            Broadcast active
          </div>
        </div>
        <button
          onClick={handleEndBroadcast}
          disabled={isLoading}
          className="px-4 py-2 bg-slate-900 text-white font-medium rounded-lg transition-colors hover:bg-slate-800 disabled:bg-slate-400"
        >
          {isLoading ? 'Ending...' : 'End Broadcast'}
        </button>
      </div>

          {broadcastData && (
            <div className="space-y-3">
              <div className="bg-slate-100 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm font-medium">Share Link</span>
                  <button
                    onClick={() => setShowQR(!showQR)}
                    className="text-blue-400 hover:text-blue-300 text-xs font-medium"
                  >
                    {showQR ? 'Hide QR' : 'Show QR'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={(function computeShareUrl() {
                      try {
                        return new URL(`/watch/${broadcastData.broadcastToken}`, window.location.origin).toString();
                      } catch {
                        return broadcastData.shareUrl;
                      }
                    })()}
                    readOnly
                    className="flex-1 bg-slate-200 text-slate-900 px-3 py-2 rounded border border-slate-300 text-sm font-mono"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm transition-colors shadow"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {showQR && (
              <div className="bg-slate-50 p-4 rounded-lg flex justify-center">
            <QRCodeSVG
              value={(function computeShareUrl() {
                try {
                  return new URL(`/watch/${broadcastData.broadcastToken}`, window.location.origin).toString();
                } catch {
                  return broadcastData.shareUrl;
                }
              })()}
              size={200}
              level="H"
              includeMargin={true}
            />
              </div>
              )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Viewers</span>
            <span className="text-slate-900 font-medium">{viewerCount}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};
