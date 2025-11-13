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
import { Settings, Sun, Moon, Heart, MessageSquare, Zap, Headphones, Flame, Star } from 'lucide-react';
import type { StartBroadcastResponse } from '../../types/broadcast';

import LogoEN from '../../assets/DJ_XU_EN.svg';
import LogoCN from '../../assets/DJ_XU_CN.svg';

const INITIAL_STATE: PlayerState = {
  isPlaying: false,
  currentTrack: null,
  isAuthorized: false,
  isMicActive: false,
  isProcessing: false,
};

const REACTION_SAMPLES = [
  { id: 'r1', user: 'Lumen', Icon: Heart, message: 'That bassline is so immersive.' },
  { id: 'r2', user: 'Kai', Icon: Flame, message: 'Drop it! This mix slaps.' },
  { id: 'r3', user: 'Nova', Icon: Star, message: 'Cloud nine energy—never leave.' },
];

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

  const [broadcastSummary, setBroadcastSummary] = useState<StartBroadcastResponse | null>(null);
  const [isBroadcastLive, setIsBroadcastLive] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  const liveReactions = useMemo(() => {
    const trackMessage = playerState.currentTrack
      ? `Now playing ${playerState.currentTrack.name} · ${playerState.currentTrack.artists[0]?.name ?? 'DJ Xu'}`
      : 'Your audience is waiting for the next drop.';

    const baseReactions = [
      {
        id: 'live',
        user: isBroadcastLive ? 'Live room' : 'Studio',
        Icon: isBroadcastLive ? Zap : Moon,
        message: isBroadcastLive
          ? 'The crowd is lit—keep the energy going.'
          : 'Ready to go live? Stand by for audience reactions.',
      },
      ...REACTION_SAMPLES,
    ];

    if (playerState.currentTrack) {
      baseReactions.unshift({
        id: 'track',
        user: 'Auto-caption',
        Icon: Headphones,
        message: trackMessage,
      });
    }

    return baseReactions;
  }, [isBroadcastLive, playerState.currentTrack]);

  const transcriptionLines = useMemo(() => {
    const lines = [
      {
        id: 'ready',
        label: 'Studio whisper',
        text: 'DJ Xu is listening—give it a command anytime.',
      },
    ];

    if (playerState.currentTrack) {
      lines.unshift({
        id: 'currentTrack',
        label: 'Transcription',
        text: `${playerState.currentTrack.name} · ${playerState.currentTrack.artists[0]?.name ?? 'Unknown artist'}`,
      });
    }

    return lines;
  }, [playerState.currentTrack]);

  const rootThemeClass = isDarkMode ? 'bg-black text-white' : 'bg-white text-slate-900';

  return (
    <div className={`min-h-screen ${rootThemeClass} transition-colors duration-300 relative`}>
      <div className="absolute right-4 top-4">
        <LanguageSwitch />
      </div>

      <div className="absolute left-4 top-4 flex items-center gap-3">
          <button
            onClick={() => setSettingsOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-900 shadow-md transition hover:bg-slate-100"
            aria-label="Open settings"
          >
            <Settings size={20} />
          </button>
        {settingsOpen && (
          <div className="absolute left-0 top-12 z-30 w-56 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl transition">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase text-slate-500">Appearance</p>
              <span className="text-xs text-slate-400">beta</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Dark mode</p>
              <button
                onClick={() => setIsDarkMode((prev) => !prev)}
                className={`flex h-9 w-16 items-center justify-between rounded-full border px-1 transition ${
                  isDarkMode ? 'border-slate-800 bg-black text-white' : 'border-slate-300 bg-white text-slate-900'
                }`}
              >
                <Sun size={16} className={`${isDarkMode ? 'opacity-40' : 'opacity-100'}`} />
                <Moon size={16} className={`${isDarkMode ? 'opacity-100' : 'opacity-40'}`} />
              </button>
            </div>
            <div className="mt-4 space-y-2">
              <button className="w-full rounded-xl border border-slate-300 px-3 py-2 text-left text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
                Logout
              </button>
              <button className="w-full rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-left text-sm font-semibold text-red-600 transition hover:bg-red-100">
                Delete account
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="container mx-auto flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-6xl gap-8 md:grid-cols-2 xl:grid-cols-3">
          <section className="flex flex-col gap-8">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="flex h-64 w-64 items-center justify-center rounded-full border border-slate-300 bg-white">
                <img
                  src={language === 'en' ? LogoEN : LogoCN}
                  alt="DJ XU Logo"
                  className={`w-48 ${playerState.isPlaying ? 'logo-spin' : ''}`}
                  onClick={!playerState.isAuthorized ? () => setError(t.clickToConnect) : undefined}
                />
              </div>
              <p className="text-xs uppercase tracking-[0.5em] text-slate-500">AI-powered music experience</p>
            </div>

            <div className="w-full rounded-[24px] bg-white ring-1 ring-slate-300">
              <div className="space-y-6 p-8 text-slate-900">
                <div className="text-center">
                  <h2 className="text-3xl font-bold">{t.title}</h2>
                  <p className="text-sm text-slate-500">{t.subtitle}</p>
                </div>

                <ErrorDisplay error={error} onDismiss={() => setError(null)} />

                <SpotifyPlayer
                  onStateChange={handleStateChange}
                  onPlaybackToggle={handlePlaybackToggle}
                  isPlaying={playerState.isPlaying}
                  isAuthorized={playerState.isAuthorized}
                />

                {playerState.isAuthorized && playerState.currentTrack && (
                  <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4 text-center text-sm uppercase tracking-[0.3em] text-slate-500">
                    <p>Now Playing</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">{playerState.currentTrack.name}</p>
                    <p className="text-xs text-slate-500">
                      {playerState.currentTrack.artists[0]?.name ?? 'Unknown artist'}
                    </p>
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
                  </>
                )}
              </div>
            </div>

            {!playerState.isAuthorized && (
              <div className="text-center text-sm text-slate-600">
                Don’t have an account?{' '}
                <Link to="/auth" className="text-[#ff4b2b] font-semibold hover:underline">
                  Sign up
                </Link>
              </div>
            )}
          </section>

          <section className="flex flex-col gap-6">
            <div className="rounded-[24px] bg-white p-6 ring-1 ring-slate-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Broadcast studio</p>
                  <h3 className="text-2xl font-semibold text-slate-900">
                    {isBroadcastLive ? 'The room is live' : 'Stand by to broadcast'}
                  </h3>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    isBroadcastLive ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {isBroadcastLive ? 'Live' : 'Offline'}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                {isBroadcastLive
                  ? 'Viewers are tuned in—share the vibe and watch the reaction roll.'
                  : 'Connect Spotify and go live when you are ready.'}
              </p>

              <div className="mt-6">
                {playerState.isAuthorized ? (
                  <BroadcastErrorBoundary>
                    <BroadcasterControls
                      performanceSessionId={performanceSessionId}
                      broadcastService={broadcastService}
                      onBroadcastStart={(response) => {
                        setBroadcastSummary(response);
                        setIsBroadcastLive(true);
                      }}
                      onBroadcastEnd={() => {
                        setBroadcastSummary(null);
                        setIsBroadcastLive(false);
                      }}
                    />
                  </BroadcastErrorBoundary>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
                    Connect Spotify first to unlock multi-track broadcasting.
                  </div>
                )}
              </div>

              {broadcastSummary?.broadcastToken && (
                <p className="mt-4 text-xs text-slate-500">
                  Share link{' '}
                  <span className="font-mono text-slate-900 break-all">
                    {(() => {
                      try {
                        return new URL(`/watch/${broadcastSummary.broadcastToken}`, window.location.origin).toString();
                      } catch {
                        return broadcastSummary.shareUrl;
                      }
                    })()}
                  </span>
                </p>
              )}
            </div>

          </section>

          <section className="flex flex-col gap-6">
            <div className="rounded-[24px] bg-white p-6 ring-1 ring-slate-300">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Live audience</p>
                  <h3 className="text-xl font-semibold text-slate-900">Reactions + captions</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button aria-label="Like" className="rounded-full border border-slate-200 bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200">
                    <Heart size={16} />
                  </button>
                  <button aria-label="Comment" className="rounded-full border border-slate-200 bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200">
                    <MessageSquare size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {liveReactions.map((reaction) => (
                  <div
                    key={reaction.id}
                    className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 shadow-sm"
                  >
                    {reaction.Icon ? <reaction.Icon className="h-5 w-5 text-slate-600" /> : null}
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.5em] text-slate-500">
                        {reaction.user}
                      </p>
                      <p className="text-sm text-slate-900">{reaction.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] uppercase tracking-[0.5em] text-slate-400">
                  Transcript
                </p>
                <div className="mt-3 space-y-1 text-[13px] leading-snug">
                  {transcriptionLines.map((line) => (
                    <p key={line.id} className="text-slate-600">
                      <span className="font-semibold text-slate-900">{line.label}:</span>{' '}
                      {line.text}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {!playerState.isAuthorized && (
          <div className="mt-8 text-center text-sm text-slate-600">
            Don’t have an account?{' '}
            <Link to="/auth" className="text-[#ff4b2b] font-semibold hover:underline">
              Sign up
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default DjXu;
