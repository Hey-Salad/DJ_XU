/**
 * Hook for managing broadcast sessions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { BroadcastService } from '../services/broadcast/broadcastService';
import type { StartBroadcastResponse } from '../types/broadcast';

export interface UseBroadcastOptions {
  performanceSessionId: string;
  broadcastService: BroadcastService;
  onBroadcastStart?: (response: StartBroadcastResponse) => void;
  onBroadcastEnd?: () => void;
  autoCaptionAI?: boolean;
}

export function useBroadcast({
  performanceSessionId,
  broadcastService,
  onBroadcastStart,
  onBroadcastEnd,
  autoCaptionAI = true
}: UseBroadcastOptions) {
  const [isLive, setIsLive] = useState(false);
  const [broadcastData, setBroadcastData] = useState<StartBroadcastResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const broadcastTokenRef = useRef<string | null>(null);

  const startBroadcast = useCallback(async () => {
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
      broadcastTokenRef.current = response.broadcastToken;
      onBroadcastStart?.(response);
    } catch (err) {
      console.error('Failed to start broadcast:', err);
      setError(err instanceof Error ? err.message : 'Failed to start broadcast');
    } finally {
      setIsLoading(false);
    }
  }, [performanceSessionId, broadcastService, onBroadcastStart]);

  const endBroadcast = useCallback(async () => {
    if (!broadcastData) return;

    setIsLoading(true);
    setError(null);

    try {
      await broadcastService.endBroadcast(broadcastData.broadcastToken);
      setIsLive(false);
      setBroadcastData(null);
      broadcastTokenRef.current = null;
      onBroadcastEnd?.();
    } catch (err) {
      console.error('Failed to end broadcast:', err);
      setError(err instanceof Error ? err.message : 'Failed to end broadcast');
    } finally {
      setIsLoading(false);
    }
  }, [broadcastData, broadcastService, onBroadcastEnd]);

  const sendCaption = useCallback(async (
    text: string,
    speaker: 'DJ_XU' | 'USER' | 'SYSTEM' = 'DJ_XU',
    options?: { audioUrl?: string; detectedLanguage?: string; confidence?: number }
  ) => {
    if (!broadcastTokenRef.current || !isLive) {
      console.warn('Attempted to send caption while broadcast is not live');
      return;
    }

    try {
      await broadcastService.sendCaption({
        broadcastToken: broadcastTokenRef.current,
        text,
        speaker,
        ...options
      });
    } catch (err) {
      console.error('Failed to send caption:', err);
      // Don't set error state for caption failures to avoid disrupting broadcast
    }
  }, [isLive, broadcastService]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isLive && broadcastTokenRef.current) {
        broadcastService.endBroadcast(broadcastTokenRef.current).catch(console.error);
      }
    };
  }, [isLive, broadcastService]);

  const broadcastTrack = useCallback(async (track: {
    name: string;
    artist: string;
    album?: string;
    albumArtUrl?: string;
    id?: string;
  }) => {
    if (!broadcastTokenRef.current || !isLive) {
      console.warn('Attempted to broadcast track while broadcast is not live');
      return;
    }

    try {
      await broadcastService.broadcastTrack(broadcastTokenRef.current, track);
    } catch (err) {
      console.error('Failed to broadcast track:', err);
      // Don't set error state to avoid disrupting broadcast
    }
  }, [isLive, broadcastService]);

  return {
    isLive,
    broadcastData,
    isLoading,
    error,
    startBroadcast,
    endBroadcast,
    sendCaption,
    broadcastTrack
  };
}
