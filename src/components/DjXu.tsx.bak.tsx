/**
 * @fileoverview Main component for the DJ XU application providing AI-powered
 * music experience with voice interaction capabilities.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Pause, Play, Loader2 } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpotify } from '@fortawesome/free-brands-svg-icons';
import { useLanguage, useTranslations } from '../contexts/LanguageContext';
import { LanguageSwitch } from './LanguageSwitch';
import { useVertexAI } from '../hooks/useVertexAI';

// Asset imports
import LogoEN from '../assets/DJ_XU_EN.svg';
import LogoCN from '../assets/DJ_XU_CN.svg';

/**
 * Interface for the player's state.
 */
interface PlayerState {
  isPlaying: boolean;
  currentTrack: string;
  isAuthorized: boolean;
  isMicActive: boolean;
  isProcessing: boolean;
}

/**
 * Initial state for the player.
 */
const INITIAL_STATE: PlayerState = {
  isPlaying: false,
  currentTrack: '',
  isAuthorized: false,
  isMicActive: false,
  isProcessing: false,
};

/**
 * Main DjXu component.
 *
 * @return {JSX.Element} The rendered component
 */
const DjXu: React.FC = () => {
  // State management
  const [playerState, setPlayerState] = useState<PlayerState>(INITIAL_STATE);
  const [error, setError] = useState<string>('');
  const [player, setPlayer] = useState<Spotify.Player | null>(null);
  const playerInitialized = useRef<boolean>(false);
  
  // Service hooks and state management
  const { processInput } = useVertexAI();
  const { language } = useLanguage();
  const t = useTranslations();
  
  // Speech recognition setup
  const recognition = useRef<any>(null);
  const isRecognitionSupported = 'webkitSpeechRecognition' in window;

  /**
   * Initializes speech recognition system.
   */
  useEffect(() => {
    if (!isRecognitionSupported) return;

    const SpeechRecognition = window.webkitSpeechRecognition;
    recognition.current = new SpeechRecognition();
    
    if (recognition.current) {
      recognition.current.continuous = true;
      recognition.current.interimResults = false;

      recognition.current.onresult = async (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        await handleVoiceInput(transcript);
      };

      recognition.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setError(t.microphoneError);
        setPlayerState(prev => ({ ...prev, isMicActive: false }));
      };
    }

    return () => {
      if (recognition.current) {
        recognition.current.stop();
      }
    };
  }, [t]);

  /**
   * Handles voice input processing through AI services.
   */
  /**
   * Processes voice input through AI services and handles the response.
   * 
   * @param {string} transcript - The transcribed voice input to process
   * @throws {Error} If processing fails or AI service is unavailable
   */
  const handleVoiceInput = async (transcript: string): Promise<void> => {
    setPlayerState(prev => ({ ...prev, isProcessing: true }));
    
    try {
      const aiResponse = await processInput({
        input: transcript,
        context: {
          currentTrack: playerState.currentTrack,
          userPreferences: { language }
        }
      });

      // Process AI response and update state accordingly
      if (aiResponse?.content) {
        // TODO: Implement response handling based on AI content
        console.log('Processing AI response:', aiResponse.content);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Voice processing error:', errorMessage);
      setError(t.voiceProcessingError);
    } finally {
      setPlayerState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  /**
   * Initiates Spotify authentication flow.
   */
  const handleSpotifyConnect = (): void => {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
    const scope = [
      'streaming',
      'user-read-email',
      'user-read-private',
      'user-read-playback-state',
      'user-modify-playback-state'
    ].join(' ');

    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
    window.location.href = authUrl;
  };

  /**
   * Initializes Spotify Web Playback SDK.
   */
  const initializeSpotifyPlayer = (token: string): void => {
    if (playerInitialized.current) return;
    playerInitialized.current = true;

    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const spotifyPlayer = new window.Spotify.Player({
        name: 'DJ XU Web Player',
        getOAuthToken: (cb: (token: string) => void) => cb(token),
        volume: 0.5
      });

      spotifyPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
        console.log('Player ready:', device_id);
        setPlayer(spotifyPlayer);
      });

      spotifyPlayer.addListener('player_state_changed', (state: any) => {
        if (!state) return;
        
        setPlayerState(prev => ({
          ...prev,
          isPlaying: !state.paused,
          currentTrack: state.track_window?.current_track 
            ? `${state.track_window.current_track.name} - ${state.track_window.current_track.artists[0].name}`
            : prev.currentTrack
        }));
      });

      spotifyPlayer.connect();
    };
  };

  /**
   * Toggles music playback state.
   */
  const togglePlayback = async (): Promise<void> => {
    if (player) {
      await player.togglePlay();
    }
  };

  /**
   * Toggles microphone input state.
   */
  const toggleMicrophone = async (): Promise<void> => {
    if (!isRecognitionSupported) {
      setError(t.browserNotSupported);
      return;
    }

    if (!playerState.isMicActive) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        recognition.current?.start();
        setPlayerState(prev => ({ ...prev, isMicActive: true }));
        setError('');
      } catch (err) {
        console.error('Microphone error:', err);
        setError(t.microphoneAccessError);
      }
    } else {
      recognition.current?.stop();
      setPlayerState(prev => ({ ...prev, isMicActive: false }));
    }
  };

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const token = hash
        .substring(1)
        .split('&')
        .find(elem => elem.startsWith('access_token'))
        ?.split('=')[1];

      if (token) {
        localStorage.setItem('spotify_token', token);
        setPlayerState(prev => ({ ...prev, isAuthorized: true }));
        initializeSpotifyPlayer(token);
        window.location.hash = '';
      }
    }

    const existingToken = localStorage.getItem('spotify_token');
    if (existingToken) {
      setPlayerState(prev => ({ ...prev, isAuthorized: true }));
      initializeSpotifyPlayer(existingToken);
    }

    return () => {
      if (player) {
        player.disconnect();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Language Switch */}
      <LanguageSwitch />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[90vh]">
          {/* Spinning Record */}
          <div className="mb-16">
            <img 
              src={language === 'en' ? LogoEN : LogoCN}
              alt="DJ XU Logo"
              className="w-96 h-96 logo-spin cursor-pointer"
              onClick={!playerState.isAuthorized ? handleSpotifyConnect : undefined}
            />
          </div>
          
          {/* Main Card */}
          <div className="w-full max-w-md bg-black rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-8">
              <h2 className="text-4xl font-bold text-white mb-4 text-center">
                {t.title}
              </h2>
              <p className="text-gray-300 mb-8 text-center">
                {t.subtitle}
              </p>
              
              {/* Error Display */}
              {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-6">
                  <span>{error}</span>
                </div>
              )}

              {/* Authentication State */}
              {!playerState.isAuthorized ? (
                <button 
                  onClick={handleSpotifyConnect}
                  className="w-full bg-black border-2 border-white hover:bg-white hover:text-black text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center gap-3 transition-all hover:scale-105"
                >
                  <FontAwesomeIcon icon={faSpotify} className="text-2xl" />
                  <span>{t.connectSpotify}</span>
                </button>
              ) : (
                <div className="space-y-6">
                  {/* Playback Controls */}
                  <div className="flex justify-center gap-6">
                    <button
                      onClick={togglePlayback}
                      disabled={playerState.isProcessing}
                      className="w-16 h-16 bg-white hover:bg-gray-100 text-black rounded-full flex items-center justify-center transition-all hover:scale-110 disabled:opacity-50"
                    >
                      {playerState.isPlaying ? <Pause size={32} /> : <Play size={32} />}
                    </button>
                    <button
                      onClick={toggleMicrophone}
                      disabled={playerState.isProcessing}
                      className={`w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-110 disabled:opacity-50 ${
                        playerState.isMicActive 
                          ? 'bg-red-600 hover:bg-red-700 text-white' 
                          : 'bg-white hover:bg-gray-100 text-black'
                      }`}
                    >
                      {playerState.isProcessing ? (
                        <Loader2 size={32} className="animate-spin" />
                      ) : (
                        <Mic size={32} />
                      )}
                    </button>
                  </div>
                  
                  {/* Now Playing */}
                  {playerState.currentTrack && (
                    <div className="text-center">
                      <div className="text-sm text-gray-400 mb-1">
                        {t.nowPlaying}
                      </div>
                      <div className="text-white font-medium truncate">
                        {playerState.currentTrack}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DjXu;