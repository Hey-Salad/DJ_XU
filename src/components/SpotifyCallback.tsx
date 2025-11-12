// src/components/SpotifyCallback.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SpotifyCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    console.log("SpotifyCallback mounted");
    const hash = window.location.hash;
    console.log("Current hash:", hash); // Debug log

    if (hash) {
      const token = hash
        .substring(1)
        .split('&')
        .find(elem => elem.startsWith('access_token'))
        ?.split('=')[1];

      console.log("Extracted token:", token); // Debug log

      if (token) {
        localStorage.setItem('spotify_token', token);
        console.log("Token saved to localStorage"); // Debug log
        
        // Clear the hash and force a proper state reset
        window.location.hash = '';
        
        // Force a page reload to ensure Spotify SDK reinitializes
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
        
        return; // Prevent navigate from firing immediately
      }
    }

    // Only navigate if no token was found
    console.log("No token found, redirecting to home"); // Debug log
    navigate('/');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-pulse text-white text-xl">
          Connecting to Spotify...
        </div>
        <div className="text-gray-400 text-sm">
          Please wait while we authorize your account
        </div>
      </div>
    </div>
  );
}