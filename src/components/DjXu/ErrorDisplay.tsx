// src/components/DjXu/ErrorDisplay.tsx
import React from 'react';
import { XCircle } from 'lucide-react';
import type { ErrorDisplayProps } from './types';

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onDismiss }) => {
  if (!error) return null;

  return (
    <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
      <span>{error}</span>
      <button
        onClick={onDismiss}
        className="ml-3 text-red-500 hover:text-red-700 transition-colors"
      >
        <XCircle size={20} />
      </button>
    </div>
  );
};