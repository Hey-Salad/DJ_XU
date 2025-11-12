// src/types/ai.ts
export interface AIResponse {
    content: string;
    metadata: {
      confidence?: number;
      source: 'vertex-ai' | 'deepseek';
      timestamp: number;
    };
  }
  
  export interface AIRequest {
    input: string;
    context?: {
      currentTrack?: string;
      conversationHistory?: string[];
      userPreferences?: Record<string, unknown>;
    };
  }
  
  export interface AIServiceConfig {
    projectId: string;
    location: string;
    model: string;
    apiKey: string;
  }