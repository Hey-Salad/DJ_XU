/**
 * @fileoverview Browser-compatible Vertex AI client implementation.
 * @author DJ XU Team
 */

import type { AIRequest, AIResponse } from '../../types/ai';

/**
 * Configuration options for the Vertex AI client.
 */
interface VertexClientConfig {
  /** Google Cloud project ID */
  projectId: string;
  /** API region (e.g., 'us-central1') */
  location: string;
  /** Model identifier */
  modelId: string;
}

/**
 * Browser-compatible Vertex AI client.
 */
export class VertexClient {
  private readonly config: VertexClientConfig;
  private readonly baseUrl: string;

  /**
   * Initializes the Vertex AI client.
   * 
   * @param {VertexClientConfig} config - Client configuration
   */
  constructor(config: VertexClientConfig) {
    this.config = config;
    this.baseUrl = `/api/vertex/projects/${config.projectId}/locations/${config.location}`;
  }

  /**
   * Generates content using the Vertex AI API.
   * 
   * @param {AIRequest} request - The generation request
   * @returns {Promise<AIResponse>} The generated response
   * @throws {Error} If the request fails
   */
  async generateContent(request: AIRequest): Promise<AIResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/publishers/google/models/${this.config.modelId}:predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [{
            prompt: this.constructPrompt(request),
          }],
          parameters: {
            temperature: 0.7,
            maxOutputTokens: 1024,
            topP: 0.8,
            topK: 40,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Vertex AI request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return this.processResponse(data);
    } catch (error) {
      console.error('Vertex AI error:', error);
      throw error;
    }
  }

  /**
   * Constructs a prompt from the request data.
   * 
   * @param {AIRequest} request - The request data
   * @returns {string} The constructed prompt
   * @private
   */
  private constructPrompt(request: AIRequest): string {
    const { input, context } = request;
    const prompt = [
      'You are DJ XU, a British-Hong Kong AI DJ.',
      `User request: ${input}`,
      context?.currentTrack && `Currently playing: ${context.currentTrack}`,
      context?.conversationHistory?.length && 
        `Previous conversation:\n${context.conversationHistory.join('\n')}`,
    ].filter(Boolean).join('\n');

    return prompt;
  }

  /**
   * Processes the raw API response.
   * 
   * @param {any} data - The raw API response
   * @returns {AIResponse} The processed response
   * @private
   */
  private processResponse(data: any): AIResponse {
    if (!data.predictions?.[0]?.text) {
      throw new Error('Invalid response format from Vertex AI');
    }

    return {
      content: data.predictions[0].text,
      metadata: {
        confidence: data.predictions[0].safetyAttributes?.scores?.[0],
        source: 'vertex-ai',
        timestamp: Date.now(),
      },
    };
  }
}