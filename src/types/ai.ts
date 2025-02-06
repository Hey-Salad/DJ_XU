/**
 * @fileoverview Type definitions for AI service interfaces.
 */

export interface AIResponse {
    /** Generated text content */
    content: string;
    /** Additional metadata about the response */
    metadata?: {
      /** Confidence score of the response */
      confidence?: number;
      /** Source of the response */
      source: 'vertex-ai' | 'deepseek';
      /** Timestamp of the response */
      timestamp: number;
    };
  }
  
  export interface AIRequest {
    /** User input text */
    input: string;
    /** Optional context for the request */
    context?: {
      /** Current playing track info */
      currentTrack?: string;
      /** Previous messages in conversation */
      conversationHistory?: string[];
      /** User preferences */
      userPreferences?: Record<string, unknown>;
    };
  }
  
  export interface AIServiceConfig {
    /** Project ID for Google Cloud */
    projectId: string;
    /** Location for API endpoints */
    location: string;
    /** Model name to use */
    model: string;
  }