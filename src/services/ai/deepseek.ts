/**
 * @fileoverview Client for the DeepSeek proxy hosted on Cloudflare Workers.
 */

import type { AIRequest, AIResponse } from '../../types/ai';

export interface DeepSeekServiceConfig {
  /** URL of the Cloudflare Worker endpoint (e.g., /api/deepseek). */
  endpoint: string;
}

export class DeepSeekService {
  private readonly endpoint: string;

  constructor(config: DeepSeekServiceConfig) {
    this.endpoint = config.endpoint;
  }

  async processRequest(request: AIRequest): Promise<AIResponse> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `DeepSeek proxy request failed (${response.status}): ${errorText}`
      );
    }

    const data = (await response.json()) as AIResponse & { error?: string };
    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  }
}
