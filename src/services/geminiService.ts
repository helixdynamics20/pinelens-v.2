/**
 * Google Gemini AI Service
 * Handles Google Gemini API integration for AI-powered search functionality
 */

interface GeminiModel {
  id: string;
  name: string;
  displayName: string;
  description: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  supportedGenerationMethods: string[];
}

interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface GeminiRequest {
  contents: GeminiMessage[];
  generationConfig?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
    index: number;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  promptFeedback?: {
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  };
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

class GeminiService {
  private apiKey: string | null = null;
  private baseURL = 'https://generativelanguage.googleapis.com/v1beta';

  constructor() {
    this.apiKey = localStorage.getItem('google_api_key');
  }

  /**
   * Available Gemini models
   */
  getAvailableModels(): Array<{
    id: string;
    name: string;
    provider: string;
    tier: string;
    capabilities: string[];
    summary: string;
    contextLength: number;
  }> {
    return [
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: 'Google AI',
        tier: 'standard',
        capabilities: ['text-generation', 'conversation', 'fast-response'],
        summary: 'Fast and efficient Gemini model',
        contextLength: 1000000 // 1M tokens
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'Google AI',
        tier: 'premium',
        capabilities: ['text-generation', 'conversation', 'reasoning', 'code-assistance', 'analysis'],
        summary: 'Most capable Gemini model with advanced reasoning',
        contextLength: 1000000 // 1M tokens
      },
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        provider: 'Google AI',
        tier: 'standard',
        capabilities: ['text-generation', 'conversation', 'reasoning'],
        summary: 'Balanced performance and capability (legacy)',
        contextLength: 30720 // ~30k tokens
      }
    ];
  }

  /**
   * Check if Gemini API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Update API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    localStorage.setItem('google_api_key', apiKey);
  }

  /**
   * Get current API key
   */
  getApiKey(): string | null {
    return this.apiKey;
  }

  /**
   * Test API key validity
   */
  async testApiKey(): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      console.log('🔑 Testing Gemini API key...');
      
      // Try with the latest model first
      const response = await fetch(`${this.baseURL}/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'Hello' }]
          }],
          generationConfig: {
            maxOutputTokens: 10
          }
        })
      });

      if (response.ok) {
        console.log('✅ API key test successful with gemini-1.5-flash');
        return true;
      }

      console.log(`⚠️ gemini-1.5-flash failed with status: ${response.status}, trying gemini-pro...`);
      
      // If that fails, try with gemini-pro as fallback
      const fallbackResponse = await fetch(`${this.baseURL}/models/gemini-pro:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'Hello' }]
          }],
          generationConfig: {
            maxOutputTokens: 10
          }
        })
      });

      if (fallbackResponse.ok) {
        console.log('✅ API key test successful with gemini-pro');
        return true;
      } else {
        console.error(`❌ API key test failed with status: ${fallbackResponse.status}`);
        const errorText = await fallbackResponse.text();
        console.error('Error response:', errorText);
        return false;
      }
    } catch (error) {
      console.error('Gemini API key test failed:', error);
      return false;
    }
  }

  /**
   * Generate AI response using Gemini
   */
  async generateResponse(
    model: string,
    query: string,
    options?: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured. Please add your Google AI API key in settings.');
    }

    const endpoint = `${this.baseURL}/models/${model}:generateContent?key=${this.apiKey}`;

    try {
      console.debug(`🤖 Generating response with Gemini model: ${model}`);

      const contents: GeminiMessage[] = [];

      // Add system prompt as user message if provided
      if (options?.systemPrompt) {
        contents.push({
          role: 'user',
          parts: [{ text: `System: ${options.systemPrompt}\n\nUser: ${query}` }]
        });
      } else {
        contents.push({
          role: 'user',
          parts: [{ text: query }]
        });
      }

      const requestBody: GeminiRequest = {
        contents,
        generationConfig: {
          temperature: options?.temperature || 0.7,
          maxOutputTokens: options?.maxTokens || 2048,
          topK: 40,
          topP: 0.95
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Gemini API error:', response.status, errorText);
        
        if (response.status === 400) {
          throw new Error('Invalid request to Gemini API. Please check your query and try again.');
        } else if (response.status === 401) {
          throw new Error('Invalid Gemini API key. Please check your Google AI API key in settings.');
        } else if (response.status === 403) {
          throw new Error('Gemini API access denied. Please verify your API key permissions.');
        } else if (response.status === 429) {
          throw new Error('Gemini API rate limit exceeded. Please try again later.');
        } else {
          throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }
      }

      const result: GeminiResponse = await response.json();
      
      if (result.candidates && result.candidates.length > 0) {
        const content = result.candidates[0].content;
        if (content && content.parts && content.parts.length > 0) {
          const responseText = content.parts[0].text;
          console.log('✅ Successfully generated Gemini response');
          
          // Log usage if available
          if (result.usageMetadata) {
            console.debug(`📊 Token usage - Prompt: ${result.usageMetadata.promptTokenCount}, Response: ${result.usageMetadata.candidatesTokenCount}, Total: ${result.usageMetadata.totalTokenCount}`);
          }
          
          return responseText;
        }
      }
      
      throw new Error('No response generated from Gemini model');
    } catch (error) {
      console.error('❌ Error generating Gemini response:', error);
      throw error;
    }
  }

  /**
   * Get model information
   */
  async getModelInfo(modelId: string): Promise<GeminiModel | null> {
    if (!this.apiKey) return null;

    try {
      const response = await fetch(`${this.baseURL}/models/${modelId}?key=${this.apiKey}`);
      
      if (response.ok) {
        return await response.json();
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching Gemini model info:', error);
      return null;
    }
  }

  /**
   * List all available models from Gemini API
   */
  async listAvailableModels(): Promise<GeminiModel[]> {
    if (!this.apiKey) return [];

    try {
      const response = await fetch(`${this.baseURL}/models?key=${this.apiKey}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.models || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error listing Gemini models:', error);
      return [];
    }
  }
}

export const geminiService = new GeminiService();
