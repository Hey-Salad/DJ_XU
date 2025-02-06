/**
 * @fileoverview Root application component with routing setup.
 */


import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DjXu from './components/DjXu';
import SpotifyCallback from './components/SpotifyCallback';

/**
 * Root application component.
 * @return {JSX.Element} The rendered application
 */
export default function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DjXu />} />
        <Route path="/callback" element={<SpotifyCallback />} />
      </Routes>
    </BrowserRouter>
  );
}