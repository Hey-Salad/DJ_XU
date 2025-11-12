// src/components/DjXu/types.ts

// Global window augmentation for speech/Spotify helpers.
declare global {
  interface Window {
    Spotify: {
      Player: new (config: SpotifyPlayerConfig) => SpotifyPlayer;
    };
    onSpotifyWebPlaybackSDKReady: () => void;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  onstart: () => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
    length: number;
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

/**
 * Configuration interface for Spotify Player.
 */
export interface SpotifyPlayerConfig {
  name: string;
  getOAuthToken: (cb: (token: string) => void) => void;
  volume: number;
}

export interface SpotifyPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(eventName: string, callback: (state: any) => void): void;
  togglePlay(): Promise<void>;
  previousTrack(): Promise<void>;
  nextTrack(): Promise<void>;
  setVolume(volume: number): Promise<void>;
}

export interface PlayerState {
  isPlaying: boolean;
  currentTrack: SpotifyTrack | null;
  isAuthorized: boolean;
  isMicActive: boolean;
  isProcessing: boolean;
}

export interface SpotifyTrack {
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
}

export interface SpotifyPlayerProps {
  onStateChange: (state: PlayerState) => void;
  onPlaybackToggle: () => Promise<void>;
  isPlaying: boolean;
  isAuthorized: boolean;
}

export interface VoiceControlProps {
  isMicActive: boolean;
  isProcessing: boolean;
  onVoiceInput: (transcript: string) => Promise<void>;
  onMicToggle: () => Promise<void>;
}

export interface ErrorDisplayProps {
  error: string | null;
  onDismiss: () => void;
}

export interface AIResponse {
  text: string;
  audioUrl?: string;
  confidence?: number;
  metadata?: {
    confidence?: number;
    source?: string;
    timestamp?: number;
  };
}

export interface AIResponseHandlerProps {
  onResponse: (response: AIResponse) => void;
  isProcessing: boolean;
  currentTrack?: SpotifyTrack | null;
}
