// src/components/DjXu/AIResponseHandler.tsx
// AIResponseHandler.tsx
import React, { useEffect } from 'react';
import { AIResponseHandlerProps } from './types';

export const AIResponseHandler: React.FC<AIResponseHandlerProps> = ({
  onResponse,
  currentTrack,
}) => {
  const elevenLabs = {
    apiKey: import.meta.env.VITE_11LABS_API_KEY,
    voiceId: import.meta.env.VITE_11LABS_AGENT_ID
  };

  const handleAIResponse = async (text: string) => {
   try {
     const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'xi-api-key': elevenLabs.apiKey
       },
       body: JSON.stringify({
         text,
         voice_id: elevenLabs.voiceId,
         model_id: 'eleven_monolingual_v1'
       })
     });

     if (!response.ok) throw new Error('Failed to convert text to speech');

     const audioBlob = await response.blob();
     const audioUrl = URL.createObjectURL(audioBlob);

      onResponse({
        text,
        audioUrl,
        confidence: 1.0
      });
    } catch (error) {
      console.error('Failed to process AI response:', error);
      onResponse({ text });
    }
  };

  useEffect(() => {
    if (currentTrack) {
      handleAIResponse(
        `Now playing ${currentTrack.name} by ${currentTrack.artists[0].name}`
      );
    }
  }, [currentTrack]);

  return null;
};
