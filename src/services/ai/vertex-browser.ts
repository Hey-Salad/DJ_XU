/**
 * @fileoverview Browser-compatible Vertex AI service implementation.
 */

import type { AIResponse, AIRequest, AIServiceConfig } from '../../types/ai';

/**
 * Configuration for the generative model.
 */
interface GenerationConfig {
  /** Maximum number of tokens to generate */
  maxOutputTokens: number;
  /** Temperature for randomness in generation */
  temperature: number;
  /** Top-p sampling parameter */
  topP: number;
}

/**
 * Browser-compatible Vertex AI service.
 */
export class VertexAIService {
  private readonly projectId: string;
  private readonly location: string;
  private readonly model: string;

  /**
   * Creates a new VertexAIService instance.
   * 
   * @param {AIServiceConfig} config - Service configuration
   */
  constructor(config: AIServiceConfig) {
    this.projectId = config.projectId;
    this.location = config.location;
    this.model = config.model;
  }

  /**
   * Makes an authenticated request to Vertex AI.
   * 
   * @param {string} prompt - The input prompt
   * @param {GenerationConfig} config - Generation configuration
   * @returns {Promise<AIResponse>} The generated response
   * @private
   */
  private async makeRequest(prompt: string, config: GenerationConfig): Promise<AIResponse> {
    const endpoint = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.model}:predict`;
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAccessToken()}`,
        },
        body: JSON.stringify({
          instances: [{
            content: prompt,
          }],
          parameters: {
            temperature: config.temperature,
            maxOutputTokens: config.maxOutputTokens,
            topP: config.topP,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Vertex AI request failed: ${response.statusText}`);
      }

      const result = await response.json();
      return this.processResponse(result);
    } catch (error) {
      console.error('Vertex AI error:', error);
      throw error;
    }
  }

  /**
   * Gets the Google Cloud access token.
   * 
   * @returns {Promise<string>} The access token
   * @private
   */
  private async getAccessToken(): Promise<string> {
    // In a real implementation, you would get this from your backend
    // For now, we'll use environment variables
    return process.env.GOOGLE_ACCESS_TOKEN || '';
  }

  /**
   * Processes a user request.
   * 
   * @param {AIRequest} request - The user request
   * @returns {Promise<AIResponse>} The AI response
   */
  async processRequest(request: AIRequest): Promise<AIResponse> {
    const prompt = this.constructPrompt(request);
    
    return await this.makeRequest(prompt, {
      maxOutputTokens: 1024,
      temperature: 0.7,
      topP: 0.95,
    });
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
    let prompt = `As DJ XU, a British-Hong Kong AI DJ, respond to: "${input}"`;

    if (context?.currentTrack) {
      prompt += `\nCurrently playing: ${context.currentTrack}`;
    }

    if (context?.conversationHistory?.length) {
      prompt += `\nPrevious conversation:\n${context.conversationHistory.join('\n')}`;
    }

    return prompt;
  }

  /**
   * Processes the raw API response.
   * 
   * @param {any} response - The raw API response
   * @returns {AIResponse} The processed response
   * @private
   */
  private processResponse(response: any): AIResponse {
    return {
      content: response.predictions[0].content,
      metadata: {
        confidence: response.predictions[0].safetyAttributes?.scores[0],
        source: 'vertex-ai',
        timestamp: Date.now(),
      },
    };
  }
}