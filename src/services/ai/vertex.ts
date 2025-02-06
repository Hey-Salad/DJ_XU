/**
 * @fileoverview Vertex AI service implementation for DJ XU.
 * @author DJ XU Team
 */

import { 
    VertexAI, 
    GenerateContentResult 
  } from '@google-cloud/vertexai/build/src/index.js';
  import type { AIResponse, AIRequest, AIServiceConfig } from '../../types/ai';
  
  /**
   * Service class for handling Vertex AI interactions.
   */
  export class VertexAIService {
    private vertexai: any; // Using any temporarily until types are properly resolved
    private model: string;
    private location: string;
    private projectId: string;
  
    /**
     * Creates a new instance of VertexAIService.
     * 
     * @param {AIServiceConfig} config - Configuration for the service
     */
    constructor(config: AIServiceConfig) {
      this.projectId = config.projectId;
      this.location = config.location;
      this.model = config.model;
  
      // Initialize Vertex AI
      this.initializeVertexAI();
    }
  
    /**
     * Initializes the Vertex AI client.
     * 
     * @private
     */
    private initializeVertexAI(): void {
      try {
        this.vertexai = new VertexAI({
          project: this.projectId,
          location: this.location,
        });
      } catch (error) {
        console.error('Failed to initialize Vertex AI:', error);
        throw new Error('Vertex AI initialization failed');
      }
    }
  
    /**
     * Processes a user request through Vertex AI.
     * 
     * @param {AIRequest} request - The request containing user input and context
     * @returns {Promise<AIResponse>} The AI-generated response
     * @throws {Error} If the API request fails
     */
    async processRequest(request: AIRequest): Promise<AIResponse> {
      try {
        // Get the generative model
        const generativeModel = this.vertexai.getGenerativeModel({
          model: this.model,
          generationConfig: {
            maxOutputTokens: 1024,
            temperature: 0.7,
            topP: 0.95,
          },
        });
  
        // Construct the prompt with context
        const prompt = this.constructPrompt(request);
  
        // Generate content
        const result = await generativeModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });
  
        // Validate and process response
        return this.processResponse(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Vertex AI request failed:', errorMessage);
        throw new Error(`Failed to process AI request: ${errorMessage}`);
      }
    }
  
    /**
     * Processes the raw response from Vertex AI.
     * 
     * @param {GenerateContentResult} result - The raw response from Vertex AI
     * @returns {AIResponse} The processed response
     * @private
     */
    private processResponse(result: GenerateContentResult): AIResponse {
      if (!result?.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response format from Vertex AI');
      }
  
      return {
        content: result.response.candidates[0].content.parts[0].text,
        metadata: {
          confidence: this.calculateConfidence(result),
          source: 'vertex-ai',
          timestamp: Date.now(),
        },
      };
    }
  
    /**
     * Calculates confidence score from response.
     * 
     * @param {GenerateContentResult} result - The raw response
     * @returns {number | undefined} The calculated confidence score
     * @private
     */
    private calculateConfidence(result: GenerateContentResult): number | undefined {
      const safetyRating = result.response?.candidates?.[0]?.safetyRatings?.[0];
      return safetyRating?.probability ? Number(safetyRating.probability) : undefined;
    }
  
    /**
     * Constructs a prompt from the request data.
     * 
     * @param {AIRequest} request - The request to construct a prompt from
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
  }