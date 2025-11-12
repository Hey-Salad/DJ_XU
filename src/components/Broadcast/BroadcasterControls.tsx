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
        enableTranslations: true
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

    try {
      await navigator.clipboard.writeText(broadcastData.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      setError('Failed to copy link');
    }
  }, [broadcastData]);

  if (!isLive) {
    return (
      <div className="bg-gray-900 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-medium text-lg">Live Broadcast</h3>
            <p className="text-gray-400 text-sm">Share your DJ session with viewers</p>
          </div>
          <button
            onClick={handleStartBroadcast}
            disabled={isLoading}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
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
        {error && (
          <div className="mt-3 p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4 border-2 border-red-600">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
            </span>
            <span className="text-white font-bold text-lg">LIVE</span>
          </div>
          <div className="text-gray-400 text-sm">
            Broadcast active
          </div>
        </div>
        <button
          onClick={handleEndBroadcast}
          disabled={isLoading}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white font-medium rounded-lg transition-colors"
        >
          {isLoading ? 'Ending...' : 'End Broadcast'}
        </button>
      </div>

      {broadcastData && (
        <div className="space-y-3">
          <div className="bg-gray-800 rounded-lg p-3">
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
                value={broadcastData.shareUrl}
                readOnly
                className="flex-1 bg-gray-900 text-white px-3 py-2 rounded border border-gray-700 text-sm font-mono"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {showQR && (
            <div className="bg-white p-4 rounded-lg flex justify-center">
              <QRCodeSVG
                value={broadcastData.shareUrl}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Viewers</span>
            <span className="text-white font-medium">{viewerCount}</span>
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
