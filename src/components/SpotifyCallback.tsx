import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SpotifyCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = () => {
      const hash = window.location.hash;
      if (hash) {
        const token = hash
          .substring(1)
          .split('&')
          .find(elem => elem.startsWith('access_token'))
          ?.split('=')[1];

        if (token) {
          localStorage.setItem('spotify_token', token);
          navigate('/');
        }
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl mb-4">Connecting to Spotify...</h2>
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    </div>
  );
};

export default SpotifyCallback;