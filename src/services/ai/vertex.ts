// src/services/ai/vertex.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIRequest, AIResponse, AIServiceConfig } from '../../types/ai';

export class VertexAIService {
  private model: any;

  constructor(config: AIServiceConfig) {
    const genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = genAI.getGenerativeModel({ model: config.model });
  }

  async processRequest(request: AIRequest): Promise<AIResponse> {
    try {
      const prompt = this.constructPrompt(request);
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();

      return {
        content: text,
        metadata: {
          source: 'vertex-ai',
          timestamp: Date.now()
        }
      };
    } catch (error) {
      console.error('Gemini API request failed:', error);
      throw error;
    }
  }

  private constructPrompt(request: AIRequest): string {
    const { input, context } = request;
    const parts = [
      'You are DJ XU, a British-Hong Kong AI DJ.',
      `User request: ${input}`
    ];

    if (context?.currentTrack) {
      parts.push(`Currently playing: ${context.currentTrack}`);
    }

    if (context?.conversationHistory?.length) {
      parts.push(`Previous conversation:\n${context.conversationHistory.join('\n')}`);
    }

    return parts.join('\n');
  }
}