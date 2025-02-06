/**
 * Type definitions for DJ XU application.
 * @fileoverview Contains type definitions for Spotify SDK and Web Speech API.
 */

// Window augmentation for global types
declare global {
    // Define the base SpeechRecognition interface
    interface SpeechRecognition extends EventTarget {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onresult: (event: any) => void;
      onerror: (event: any) => void;
      onend: () => void;
      onstart: () => void;
      start: () => void;
      stop: () => void;
      abort: () => void;
    }
  
    // Extend Window interface
    interface Window {
      Spotify: {
        Player: new (config: SpotifyPlayerConfig) => SpotifyPlayer;
      };
      onSpotifyWebPlaybackSDKReady: () => void;
      webkitSpeechRecognition: new () => SpeechRecognition;
    }
  }
  
  /**
   * Configuration interface for Spotify Player.
   */
  export interface SpotifyPlayerConfig {
    /** Name of the player instance */
    name: string;
    /** Callback to retrieve OAuth token */
    getOAuthToken: (cb: (token: string) => void) => void;
    /** Initial volume level (0.0 to 1.0) */
    volume: number;
  }
  
  /**
   * Interface for Spotify Player instance.
   */
  export interface SpotifyPlayer {
    /** Connects to Spotify services */
    connect(): Promise<boolean>;
    /** Disconnects from Spotify services */
    disconnect(): void;
    /** Adds event listener for player state changes */
    addListener(eventName: string, callback: (state: any) => void): void;
    /** Toggles playback state */
    togglePlay(): Promise<void>;
  }
  
  /**
   * State interface for the player component.
   */
  export interface PlayerState {
    /** Whether music is currently playing */
    isPlaying: boolean;
    /** Current track information */
    currentTrack: string;
    /** Whether user is authorized with Spotify */
    isAuthorized: boolean;
    /** Whether microphone is active */
    isMicActive: boolean;
    /** Whether processing voice input */
    isProcessing: boolean;
  }
  
  export {};