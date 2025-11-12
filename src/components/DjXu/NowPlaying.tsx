// src/components/DjXu/NowPlaying.tsx
import React, { useRef, useEffect } from 'react';
import { useTranslations } from '../../contexts/LanguageContext';
import type { NowPlayingProps } from './types';

export const NowPlaying: React.FC<NowPlayingProps> = ({ track, isPlaying }) => {
 const canvasRef = useRef<HTMLCanvasElement>(null);
 const animationRef = useRef<number>();
 const t = useTranslations();

 useEffect(() => {
   if (!isPlaying || !canvasRef.current) return;

   const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
   const analyser = audioContext.createAnalyser();
   analyser.fftSize = 256;

   const canvas = canvasRef.current;
   const ctx = canvas.getContext('2d')!;
   const bufferLength = analyser.frequencyBinCount;
   const dataArray = new Uint8Array(bufferLength);

   const draw = () => {
     animationRef.current = requestAnimationFrame(draw);
     analyser.getByteFrequencyData(dataArray);

     ctx.fillStyle = 'rgb(0, 0, 0)';
     ctx.fillRect(0, 0, canvas.width, canvas.height);

     const barWidth = (canvas.width / bufferLength) * 2.5;
     let x = 0;

     for (let i = 0; i < bufferLength; i++) {
       const barHeight = (dataArray[i] / 255) * canvas.height;
       ctx.fillStyle = `rgb(255, ${dataArray[i]}, 50)`;
       ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
       x += barWidth + 1;
     }
   };

   draw();

   return () => {
     if (animationRef.current) {
       cancelAnimationFrame(animationRef.current);
     }
     audioContext.close();
   };
 }, [isPlaying]);

 return (
   <div className="text-center space-y-4">
     {track && (
       <>
         <div className="text-sm text-gray-400 mb-1">
           {t.nowPlaying}
         </div>
         <div className="text-white font-medium truncate">
           {track.name} - {track.artists[0].name}
         </div>
         <canvas 
           ref={canvasRef}
           className="w-full h-32 rounded-lg"
           width={300}
           height={100}
         />
       </>
     )}
   </div>
 );
};