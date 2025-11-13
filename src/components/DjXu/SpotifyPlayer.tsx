// src/components/DjXu/SpotifyPlayer.tsx
import React, { useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpotify } from '@fortawesome/free-brands-svg-icons';
import { useTranslations } from '../../contexts/LanguageContext';
import type { SpotifyPlayerProps, SpotifyTrack } from './types';

export const SpotifyPlayer: React.FC<SpotifyPlayerProps> = ({
 onStateChange,
 onPlaybackToggle,
 isPlaying,
 isAuthorized
}) => {
 const playerRef = useRef<Spotify.Player | null>(null);
 const t = useTranslations();

 const handleSpotifyConnect = () => {
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

 useEffect(() => {
   if (!isAuthorized) return;

   const script = document.createElement('script');
   script.src = 'https://sdk.scdn.co/spotify-player.js';
   script.async = true;
   document.body.appendChild(script);

   window.onSpotifyWebPlaybackSDKReady = () => {
     const token = localStorage.getItem('spotify_token');
     if (!token) return;

     const player = new window.Spotify.Player({
       name: 'DJ XU Web Player',
       getOAuthToken: cb => cb(token),
       volume: 0.5
     });

     player.addListener('ready', ({ device_id }) => {
       console.log('Ready with Device ID', device_id);
       playerRef.current = player;
     });

     player.addListener('not_ready', ({ device_id }) => {
       console.log('Device ID has gone offline', device_id);
     });

     player.addListener('player_state_changed', state => {
       if (!state) return;

       const currentTrack = state.track_window.current_track;
       const track: SpotifyTrack = {
         name: currentTrack.name,
         artists: currentTrack.artists,
         album: {
           name: currentTrack.album.name,
           images: currentTrack.album.images
         }
       };
       
       onStateChange({
         isPlaying: !state.paused,
         currentTrack: track,
         isAuthorized: true,
         isMicActive: false,
         isProcessing: false
       });
     });

     player.addListener('initialization_error', ({ message }) => {
       console.error('Failed to initialize', message);
     });

     player.addListener('authentication_error', ({ message }) => {
       console.error('Failed to authenticate', message);
       localStorage.removeItem('spotify_token');
     });

     player.addListener('account_error', ({ message }) => {
       console.error('Failed to validate Spotify account', message);
     });

     player.connect()
       .then(success => {
         if (!success) {
           throw new Error('Failed to connect to Spotify');
         }
       });
   };

   return () => {
     if (playerRef.current) {
       playerRef.current.disconnect();
     }
   };
 }, [isAuthorized, onStateChange]);

 if (!isAuthorized) {
    return (
      <button
        onClick={handleSpotifyConnect}
        className="w-full rounded-lg bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-4 text-white font-bold shadow-lg transition duration-200 hover:opacity-90 hover:-translate-y-0.5 flex items-center justify-center gap-3"
      >
        <FontAwesomeIcon icon={faSpotify} className="text-2xl" />
        <span>{t.connectSpotify}</span>
      </button>
    );
  }

  return (
    <button
      onClick={onPlaybackToggle}
      className="w-16 h-16 rounded-full bg-slate-900 text-white flex items-center justify-center transition-all hover:scale-110 disabled:opacity-50 shadow-[0_8px_25px_rgba(15,23,42,0.3)]"
      aria-label={isPlaying ? 'Pause' : 'Play'}
    >
     {isPlaying ? <Pause size={32} /> : <Play size={32} />}
   </button>
 );
};
