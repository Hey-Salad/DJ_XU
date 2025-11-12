import { useEffect, useMemo, useRef, useState } from 'react';

import type { LiveCaption } from '../../types/broadcast';

type CaptionSize = 'small' | 'medium' | 'large';
type CaptionPosition = 'bottom' | 'overlay';

interface CaptionDisplayProps {
  captions: LiveCaption[];
  sessionStart?: string;
  translationLanguage?: string;
}

const SIZE_CLASSES: Record<CaptionSize, string> = {
  small: 'text-sm max-h-36',
  medium: 'text-base max-h-48',
  large: 'text-lg max-h-64',
};

const POSITION_CLASSES: Record<CaptionPosition, string> = {
  bottom: 'relative',
  overlay: 'absolute inset-x-4 bottom-6 md:bottom-12',
};

const formatRelativeTime = (timestampMs?: number): string => {
  if (timestampMs == null) {
    return '';
  }

  const totalSeconds = Math.max(0, Math.floor(timestampMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const captionSpeakerLabel = (speaker: string) => {
  if (speaker === 'USER') {
    return 'Command';
  }
  if (speaker === 'DJ_XU') {
    return 'DJ XU';
  }
  return speaker;
};

export default function CaptionDisplay({
  captions,
  sessionStart,
  translationLanguage,
}: CaptionDisplayProps): JSX.Element {
  const [size, setSize] = useState<CaptionSize>('medium');
  const [position, setPosition] = useState<CaptionPosition>('bottom');
  const containerRef = useRef<HTMLDivElement>(null);

  const renderedCaptions = useMemo(() => captions.slice(-60), [captions]);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [renderedCaptions.length, size, position]);

  const translationHint = useMemo(() => {
    if (!translationLanguage) {
      return '';
    }
    return `Chrome translation overlay ready for ${translationLanguage.toUpperCase()}`;
  }, [translationLanguage]);

  const positionClass = POSITION_CLASSES[position];

  return (
    <section
      aria-live="polite"
      className={`w-full ${positionClass} flex flex-col gap-3 text-white`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/20 bg-black/70 p-3 text-xs uppercase tracking-wide text-gray-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={`rounded-full px-3 py-1 transition-colors ${
              size === 'small' ? 'bg-white text-black' : 'bg-white/10 text-white'
            }`}
            onClick={() => setSize('small')}
          >
            Small
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 transition-colors ${
              size === 'medium' ? 'bg-white text-black' : 'bg-white/10 text-white'
            }`}
            onClick={() => setSize('medium')}
          >
            Medium
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 transition-colors ${
              size === 'large' ? 'bg-white text-black' : 'bg-white/10 text-white'
            }`}
            onClick={() => setSize('large')}
          >
            Large
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">Position</span>
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-[11px] transition-colors ${
              position === 'bottom' ? 'bg-white text-black' : 'bg-white/10 text-white'
            }`}
            onClick={() => setPosition('bottom')}
          >
            Docked
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-[11px] transition-colors ${
              position === 'overlay' ? 'bg-white text-black' : 'bg-white/10 text-white'
            }`}
            onClick={() => setPosition('overlay')}
          >
            Overlay
          </button>
        </div>
      </div>

      {sessionStart && (
        <p className="text-[11px] text-white/60">
          Session started at {new Date(sessionStart).toLocaleTimeString()}
        </p>
      )}

      <div
        ref={containerRef}
        className={`overflow-y-auto rounded-2xl border border-white/20 bg-black/60 p-4 shadow-lg ${SIZE_CLASSES[size]}`}
      >
        {renderedCaptions.length === 0 && (
          <p className="text-sm text-white/60">Waiting for live captions...</p>
        )}
        {renderedCaptions.map((caption) => (
          <article
            key={caption.id}
            className="caption-entry mb-3 flex flex-col gap-1 rounded-lg bg-white/5 p-3 transition-shadow hover:bg-white/10"
            aria-label={`${captionSpeakerLabel(caption.speaker)}: ${caption.original_text}`}
          >
            <div className="flex items-center justify-between text-xs uppercase tracking-wider text-gray-400">
              <span>{captionSpeakerLabel(caption.speaker)}</span>
              <span>{formatRelativeTime(caption.timestamp_ms)}</span>
            </div>
            <p className="text-current leading-relaxed">{caption.original_text}</p>
            <div className="flex items-center justify-between text-[10px] text-gray-400">
              <span>
                Confidence: {Math.round((caption.confidence ?? 0) * 100)}%
              </span>
            </div>
            {translationLanguage && (
              <div className="mt-2 rounded-md border border-dashed border-white/30 bg-white/5 p-2 text-[11px] text-white/80">
                Translation overlay ready ({translationLanguage.toUpperCase()})
              </div>
            )}
          </article>
        ))}
      </div>

      {translationHint && (
        <p className="text-[11px] text-blue-200">{translationHint}</p>
      )}
    </section>
  );
}
