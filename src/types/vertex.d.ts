// src/types/vertex.d.ts
declare module 'firebase/vertexai' {
    import { FirebaseApp } from 'firebase/app';
  
    export interface VertexAI {
      generateContent(prompt: string): Promise<any>;
    }
  
    export interface GenerativeModel {
      generateContent(prompt: string): Promise<{
        response: {
          text(): string;
        };
      }>;
    }
  
    export function getVertexAI(app: FirebaseApp): VertexAI;
    export function getGenerativeModel(vertexAI: VertexAI, config: { model: string }): GenerativeModel;
  }
  
  // src/config/firebase.ts
  import { initializeApp } from "firebase/app";
  import { getAnalytics } from "firebase/analytics";
  
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  };
  
  export const app = initializeApp(firebaseConfig);
  export const analytics = getAnalytics(app);
  
  // src/services/ai/vertex.ts
  import { getVertexAI, getGenerativeModel } from "firebase/vertexai";
  import { app } from '../../config/firebase';
  import type { AIRequest, AIResponse, AIServiceConfig } from '../../types/ai';
  
  export class VertexAIService {
    private model: any;
  
    constructor(config: AIServiceConfig) {
      const vertexAI = getVertexAI(app);
      this.model = getGenerativeModel(vertexAI, { model: config.model });
    }
  
    async processRequest(request: AIRequest): Promise<AIResponse> {
      try {
        const prompt = this.constructPrompt(request);
        const result = await this.model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
  
        return {
          content: text,
          metadata: {
            source: 'vertex-ai',
            timestamp: Date.now()
          }
        };
      } catch (error) {
        console.error('Vertex AI request failed:', error);
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