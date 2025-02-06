/**
 * @fileoverview Custom hook for Vertex AI service interactions.
 */

import { useState, useCallback } from 'react';
import { VertexAIService } from '../services/ai';
import type { AIRequest } from '../types/ai';

/**
 * Configuration for Vertex AI service.
 */
const VERTEX_CONFIG = {
  projectId: import.meta.env.VITE_GOOGLE_PROJECT_ID,
  location: 'us-central1',
  model: 'gemini-pro'
} as const;

/**
 * Hook return type definition.
 */
interface UseVertexAIReturn {
  /** Function to process user input */
  processInput: (request: AIRequest) => Promise<any>;
  /** Whether the AI is currently processing a request */
  isProcessing: boolean;
  /** Any error that occurred during processing */
  error: Error | null;
}

/**
 * Hook for interacting with Vertex AI service.
 * 
 * @returns {UseVertexAIReturn} Hook methods and state
 */
export function useVertexAI(): UseVertexAIReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const service = new VertexAIService(VERTEX_CONFIG);

  const processInput = useCallback(async (request: AIRequest) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await service.processRequest(request);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    processInput,
    isProcessing,
    error
  };
}