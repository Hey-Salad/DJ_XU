import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage, useTranslations } from '../../contexts/LanguageContext';
import { SpotifyPlayer } from './SpotifyPlayer';
import { VoiceControls } from './VoiceControls';
import { ErrorDisplay } from './ErrorDisplay';
import { AIResponseHandler } from './AIResponseHandler';
import { PlayerState, AIResponse } from './types';
import type { Spotify } from '../../types/spotify';
import { LanguageSwitch } from '../LanguageSwitch';
import { Link } from 'react-router-dom';
import { BroadcasterControls } from '../Broadcast/BroadcasterControls';
import { BroadcastErrorBoundary } from '../Broadcast/BroadcastErrorBoundary';
import { BroadcastService } from '../../services/broadcast/broadcastService';
import { useBroadcast } from '../../hooks/useBroadcast';

import LogoEN from '../../assets/DJ_XU_EN.svg';
import LogoCN from '../../assets/DJ_XU_CN.svg';

const INITIAL_STATE: PlayerState = {
  isPlaying: false,
  currentTrack: null,
  isAuthorized: false,
  isMicActive: false,
  isProcessing: false,
};

const DjXu: React.FC = () => {
  const [playerState, setPlayerState] = useState<PlayerState>(INITIAL_STATE);
  const [error, setError] = useState<string | null>(null);
  const [performanceSessionId] = useState(() => crypto.randomUUID());
  const { language } = useLanguage();
  const t = useTranslations();
  const spotifyPlayer = useRef<Spotify.Player | null>(null);

  const broadcastService = useMemo(
    () =>
      new BroadcastService({
        workerEndpoint: import.meta.env.VITE_WORKER_URL || 'http://localhost:8787',
      }),
    []
  );

  const { isLive, sendCaption } = useBroadcast({
    performanceSessionId,
    broadcastService,
  });

  useEffect(() => {
    const token = localStorage.getItem('spotify_token');
    if (!token) {
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: 'DJ XU Web Player',
        getOAuthToken: (cb) => cb(token),
        volume: 0.5,
      });

      player.addListener('ready', () => {
        spotifyPlayer.current = player as Spotify.Player;
      });

      player.addListener('player_state_changed', (state: Spotify.PlaybackState | null) => {
        if (!state) {
          return;
        }
        setPlayerState((prev) => ({
          ...prev,
          isPlaying: !state.paused,
          currentTrack: state.track_window?.current_track
            ? {
                name: state.track_window.current_track.name,
                artists: state.track_window.current_track.artists,
                album: {
                  name: state.track_window.current_track.album.name,
                  images: state.track_window.current_track.album.images,
                },
              }
            : null,
        }));
      });

      player
        .connect()
        .then((success) => {
          if (success) {
            setPlayerState((prev) => ({ ...prev, isAuthorized: true }));
          }
        })
        .catch((connectError) => {
          console.error('Unable to connect Spotify player', connectError);
          setError('Failed to connect to Spotify');
        });
    };

    return () => {
      if (spotifyPlayer.current) {
        spotifyPlayer.current.disconnect();
      }
    };
  }, []);

  const handleStateChange = (newState: PlayerState) => {
    setPlayerState(newState);
  };

  const handlePlaybackToggle = async () => {
    try {
      if (spotifyPlayer.current) {
        await spotifyPlayer.current.togglePlay();
      }
    } catch (playbackError) {
      console.error('Playback toggle failed', playbackError);
      setError('Failed to toggle playback');
    }
  };

  const handleVoiceInput = async (input: string) => {
    setPlayerState((prev) => ({ ...prev, isProcessing: true }));
    try {
      if (input.toLowerCase().includes('play')) {
        await spotifyPlayer.current?.togglePlay();
      }
      if (input.toLowerCase().includes('next')) {
        await spotifyPlayer.current?.nextTrack();
      }
      if (input.toLowerCase().includes('previous') || input.toLowerCase().includes('back')) {
        await spotifyPlayer.current?.previousTrack();
      }
    } catch (voiceError) {
      console.error('Voice command failed', voiceError);
      setError('Failed to process voice command');
    } finally {
      setPlayerState((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  const handleMicToggle = async () => {
    setPlayerState((prev) => ({ ...prev, isMicActive: !prev.isMicActive }));
  };

  const handleAIResponse = (response: AIResponse) => {
    if (response.audioUrl) {
      const audio = new Audio(response.audioUrl);
      void audio.play().catch((audioError) => {
        console.error('Failed to play AI audio', audioError);
      });
    }
    if (isLive && response.text) {
      sendCaption(response.text, 'DJ_XU', {
        audioUrl: response.audioUrl,
        confidence: response.confidence,
      });
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="absolute right-4 top-4">
        <LanguageSwitch />
      </div>

      <div className="container mx-auto flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <div className="space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-64 w-64 items-center justify-center rounded-full border-8 border-black/30 bg-black/5">
              <img
                src={language === 'en' ? LogoEN : LogoCN}
                alt="DJ XU Logo"
                className={`w-48 ${playerState.isPlaying ? 'logo-spin' : ''}`}
                onClick={!playerState.isAuthorized ? () => setError(t.clickToConnect) : undefined}
              />
            </div>
            <p className="text-xs uppercase tracking-[0.5em] text-gray-600">AI-powered music experience</p>
          </div>

          <div className="w-full max-w-md rounded-[32px] bg-black shadow-2xl">
            <div className="space-y-6 p-8 text-white">
              <div className="text-center">
                <h2 className="text-3xl font-bold">{t.title}</h2>
                <p className="text-sm text-white/60">{t.subtitle}</p>
              </div>

              <ErrorDisplay error={error} onDismiss={() => setError(null)} />

              <SpotifyPlayer
                onStateChange={handleStateChange}
                onPlaybackToggle={handlePlaybackToggle}
                isPlaying={playerState.isPlaying}
                isAuthorized={playerState.isAuthorized}
              />

              {playerState.isAuthorized && playerState.currentTrack && (
                <div className="rounded-2xl border border-white/20 bg-white/5 p-4 text-center text-sm uppercase tracking-[0.3em] text-white/70">
                  <p>Now Playing</p>
                  <p className="mt-1 text-base font-semibold text-white">{playerState.currentTrack.name}</p>
                  <p className="text-xs text-white/60">{playerState.currentTrack.artists[0].name}</p>
                </div>
              )}

              {playerState.isAuthorized && (
                <>
                  <div className="flex justify-center gap-6">
                    <VoiceControls
                      isMicActive={playerState.isMicActive}
                      isProcessing={playerState.isProcessing}
                      onVoiceInput={handleVoiceInput}
                      onMicToggle={handleMicToggle}
                    />
                  </div>

                  <AIResponseHandler
                    onResponse={handleAIResponse}
                    isProcessing={playerState.isProcessing}
                    currentTrack={playerState.currentTrack}
                  />

                  <BroadcastErrorBoundary>
                    <BroadcasterControls
                      performanceSessionId={performanceSessionId}
                      broadcastService={broadcastService}
                    />
                  </BroadcastErrorBoundary>
                </>
              )}
            </div>
          </div>

          {!playerState.isAuthorized && (
            <div className="text-center text-sm text-gray-600">
              Don’t have an account?{' '}
              <Link to="/auth" className="text-[#ff4b2b] font-semibold hover:underline">
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DjXu;
