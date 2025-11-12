/**
 * @fileoverview Root application component with routing setup.
 */


import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DjXu from './components/DjXu';
import SpotifyCallback from './components/SpotifyCallback';
import SupabaseAuth from './components/SupabaseAuth';
import WatchBroadcast from './pages/WatchBroadcast';

/**
 * Root application component.
 * @return {JSX.Element} The rendered application
 */
export default function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DjXu />} />
        <Route path="/auth" element={<SupabaseAuth />} />
        <Route path="/callback" element={<SpotifyCallback />} />
        <Route path="/watch/:token" element={<WatchBroadcast />} />
      </Routes>
    </BrowserRouter>
  );
}
