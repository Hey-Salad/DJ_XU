/**
 * @fileoverview Type definitions for Vertex AI integration.
 */

declare module '@google-cloud/vertexai' {
    export interface VertexAIConfig {
      project: string;
      location: string;
    }
  
    export interface GenerationConfig {
      maxOutputTokens?: number;
      temperature?: number;
      topP?: number;
    }
  
    export interface GenerateContentResult {
      response?: {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              text?: string;
            }>;
          };
          safetyRatings?: Array<{
            probability?: number;
          }>;
        }>;
      };
    }
  
    export class VertexAI {
      constructor(config: VertexAIConfig);
      getGenerativeModel(config: { 
        model: string; 
        generationConfig?: GenerationConfig;
      }): {
        generateContent(params: any): Promise<GenerateContentResult>;
      };
    }
  }