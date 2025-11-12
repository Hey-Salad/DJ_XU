// src/components/DjXu/VoiceControls.tsx
import React, { useState } from 'react';
import { Mic, Loader2 } from 'lucide-react';
import { useConversation } from '@11labs/react';
import type { VoiceControlProps } from './types';

type TranscriptMessage = {
  text: string;
  source: 'user' | 'agent';
  timestamp: number;
};

export const VoiceControls: React.FC<VoiceControlProps> = ({
  isMicActive,
  isProcessing,
  onVoiceInput,
  onMicToggle
}) => {
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);

  const debugLog = (type: string, message: unknown): void => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type}]`, message);
  };

  const conversation = useConversation({
    onConnect: () => {
      debugLog('Agent', 'Connected and listening');
      setTranscript(prev => [...prev, {
        text: "I'm your DJ XU assistant. What would you like to play?",
        source: 'agent',
        timestamp: Date.now()
      }]);
    },
    onDisconnect: () => {
      debugLog('Agent', 'Disconnected');
    },
    onMessage: (message: { message: string; source: string }) => {
      debugLog('Message', {
        content: message.message,
        source: message.source
      });

      setTranscript(prev => [...prev, {
        text: message.message,
        source: message.source === 'human' ? 'user' : 'agent',
        timestamp: Date.now()
      }]);

      if (message.source === 'human') {
        onVoiceInput(message.message);
      }
    },
    onError: (error: string) => {
      debugLog('Error', error);
      onMicToggle();
    }
  });

  const handleMicClick = async () => {
    debugLog('Action', isMicActive ? 'Stopping conversation' : 'Starting conversation');
    
    try {
      if (isMicActive) {
        await conversation.endSession();
      } else {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        await conversation.startSession({
          agentId: import.meta.env.VITE_11LABS_AGENT_ID
        });
      }
      onMicToggle();
    } catch (err) {
      debugLog('Error', err);
    }
  };

  return (
    <button
      onClick={handleMicClick}
      disabled={isProcessing}
      className={`w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-110 disabled:opacity-50 ${
        isMicActive 
          ? 'bg-red-600 hover:bg-red-700 text-white' 
          : 'bg-white hover:bg-gray-100 text-black'
      }`}
      aria-label={isMicActive ? 'Stop Recording' : 'Start Recording'}
    >
      {isProcessing ? (
        <Loader2 size={32} className="animate-spin" />
      ) : (
        <Mic size={32} className={isMicActive ? "animate-pulse" : ""} />
      )}
    </button>
  );
};