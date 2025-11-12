// src/hooks/useVertexAI.ts
import { useState, useCallback, useMemo } from 'react';
import { DeepSeekService } from '../services/ai';
import type { AIRequest, AIResponse } from '../types/ai';

const DEFAULT_ENDPOINT = import.meta.env.VITE_AI_PROXY_URL || '/api/deepseek';

interface UseVertexAIReturn {
  processInput: (request: AIRequest) => Promise<AIResponse>;
  isProcessing: boolean;
  error: Error | null;
}

export function useVertexAI(): UseVertexAIReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const service = useMemo(
    () =>
      new DeepSeekService({
        endpoint: DEFAULT_ENDPOINT,
      }),
    []
  );

  const processInput = useCallback(async (request: AIRequest) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await service.processRequest(request);
      return response;
    } catch (err) {
      const normalizedError =
        err instanceof Error ? err : new Error(String(err));
      setError(normalizedError);
      throw normalizedError;
    } finally {
      setIsProcessing(false);
    }
  }, [service]);

  return {
    processInput,
    isProcessing,
    error,
  };
}
