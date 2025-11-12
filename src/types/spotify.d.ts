/**
* @fileoverview Type definitions for Spotify Web Playback SDK.
*/

declare namespace Spotify {
  interface PlaybackState {
      paused: boolean;
      track_window?: {
          current_track?: {
              name: string;
              artists: Array<{ name: string }>;
              album: {
                  name: string;
                  images: Array<{ url: string }>;
              };
          };
      };
  }

  interface DeviceReady {
      device_id: string;
  }

  /**
   * Interface for Spotify Player instance.
   */
  interface Player {
      /** Connects to Spotify services */
      connect(): Promise<boolean>;
      /** Disconnects from Spotify services */
      disconnect(): void;
      /** Adds event listener for player state changes */
      addListener(eventName: string, callback: (state: any) => void): void;
      /** Removes event listener */
      removeListener(event: string, callback: (state: any) => void): void;
      /** Toggles playback state */
      togglePlay(): Promise<void>;
      /** Seeks to position in currently playing track */
      seek(position_ms: number): Promise<void>;
      /** Sets the volume */
      setVolume(volume: number): Promise<void>;
      /** Skip to previous track */
      previousTrack(): Promise<void>;
      /** Skip to next track */
      nextTrack(): Promise<void>;
      /** Gets current playback state */
      getCurrentState(): Promise<PlaybackState | null>;
      /** Activates element for mobile playback */
      activateElement(): Promise<void>;
  }

  /**
   * Constructor options for Spotify Player.
   */
  interface PlayerInit {
      /** Name of the player instance */
      name: string;
      /** Callback to retrieve OAuth token */
      getOAuthToken: (cb: (token: string) => void) => void;
      /** Initial volume level (0.0 to 1.0) */
      volume: number;
  }

  interface ErrorEvent {
      message: string;
  }
}

interface Window {
  Spotify: {
      Player: new (config: Spotify.PlayerInit) => Spotify.Player;
  };
  onSpotifyWebPlaybackSDKReady: () => void;
}

export type { Spotify };