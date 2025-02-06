/**
 * @fileoverview Type definitions for Spotify Web Playback SDK.
 */

declare namespace Spotify {
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
      /** Toggles playback state */
      togglePlay(): Promise<void>;
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
  }
  
  interface Window {
    Spotify: {
      Player: new (config: Spotify.PlayerInit) => Spotify.Player;
    };
    onSpotifyWebPlaybackSDKReady: () => void;
  }