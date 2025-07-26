/**
 * Free AI Models Service
 * Provides access to free AI models without requiring paid subscriptions
 * Supports local models, open-source APIs, and free tier services
 */

interface FreeModel {
  id: string;
  name: string;
  provider: string;
  type: 'local' | 'api' | 'hosted';
  description: string;
  apiEndpoint?: string;
  capabilities: string[];
  contextLength: number;
  requiresApiKey: boolean;
  setupInstructions?: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  model: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

class FreeModelsService {
  private apiKeys: Map<string, string> = new Map();

  constructor() {
    // Load API keys from localStorage
    this.loadApiKeys();
  }

  /**
   * Get all available free models
   */
  getAvailableModels(): FreeModel[] {
    return [
      // Hugging Face Inference API (Free tier)
      {
        id: 'huggingface/microsoft/DialoGPT-medium',
        name: 'DialoGPT Medium',
        provider: 'Hugging Face',
        type: 'api',
        description: 'Microsoft conversational AI model (Free)',
        apiEndpoint: 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
        capabilities: ['text-generation', 'conversation'],
        contextLength: 1024,
        requiresApiKey: true,
        setupInstructions: 'Get free API key from huggingface.co/settings/tokens'
      },
      {
        id: 'huggingface/google/flan-t5-base',
        name: 'FLAN-T5 Base',
        provider: 'Hugging Face',
        type: 'api',
        description: 'Google Text-to-Text Transfer Transformer (Free)',
        apiEndpoint: 'https://api-inference.huggingface.co/models/google/flan-t5-base',
        capabilities: ['text-generation', 'question-answering'],
        contextLength: 512,
        requiresApiKey: true,
        setupInstructions: 'Get free API key from huggingface.co/settings/tokens'
      },
      {
        id: 'huggingface/microsoft/CodeBERT-base',
        name: 'CodeBERT Base',
        provider: 'Hugging Face',
        type: 'api',
        description: 'Microsoft code understanding model (Free)',
        apiEndpoint: 'https://api-inference.huggingface.co/models/microsoft/codebert-base',
        capabilities: ['code-understanding', 'text-analysis'],
        contextLength: 512,
        requiresApiKey: true,
        setupInstructions: 'Get free API key from huggingface.co/settings/tokens'
      },
      
      // Ollama Local Models (Completely free)
      {
        id: 'ollama/llama2:7b',
        name: 'Llama 2 7B',
        provider: 'Ollama',
        type: 'local',
        description: 'Meta Llama 2 7B model running locally (Free)',
        apiEndpoint: 'http://localhost:11434/api/generate',
        capabilities: ['text-generation', 'conversation', 'code-assistance'],
        contextLength: 4096,
        requiresApiKey: false,
        setupInstructions: 'Install Ollama and run: ollama pull llama2:7b'
      },
      {
        id: 'ollama/codellama:7b',
        name: 'Code Llama 7B',
        provider: 'Ollama',
        type: 'local',
        description: 'Meta Code Llama 7B for coding tasks (Free)',
        apiEndpoint: 'http://localhost:11434/api/generate',
        capabilities: ['code-generation', 'code-explanation', 'debugging'],
        contextLength: 4096,
        requiresApiKey: false,
        setupInstructions: 'Install Ollama and run: ollama pull codellama:7b'
      },
      {
        id: 'ollama/mistral:7b',
        name: 'Mistral 7B',
        provider: 'Ollama',
        type: 'local',
        description: 'Mistral 7B model running locally (Free)',
        apiEndpoint: 'http://localhost:11434/api/generate',
        capabilities: ['text-generation', 'conversation', 'analysis'],
        contextLength: 8192,
        requiresApiKey: false,
        setupInstructions: 'Install Ollama and run: ollama pull mistral:7b'
      },
      {
        id: 'ollama/phi3:mini',
        name: 'Phi-3 Mini',
        provider: 'Ollama',
        type: 'local',
        description: 'Microsoft Phi-3 Mini model (Free)',
        apiEndpoint: 'http://localhost:11434/api/generate',
        capabilities: ['text-generation', 'reasoning', 'conversation'],
        contextLength: 4096,
        requiresApiKey: false,
        setupInstructions: 'Install Ollama and run: ollama pull phi3:mini'
      },

      // Groq (Free tier)
      {
        id: 'groq/llama2-70b-4096',
        name: 'Llama 2 70B',
        provider: 'Groq',
        type: 'api',
        description: 'Fast Llama 2 70B inference (Free tier available)',
        apiEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
        capabilities: ['text-generation', 'conversation', 'analysis'],
        contextLength: 4096,
        requiresApiKey: true,
        setupInstructions: 'Get free API key from console.groq.com'
      },
      {
        id: 'groq/mixtral-8x7b-32768',
        name: 'Mixtral 8x7B',
        provider: 'Groq',
        type: 'api',
        description: 'Fast Mixtral 8x7B inference (Free tier)',
        apiEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
        capabilities: ['text-generation', 'conversation', 'multilingual'],
        contextLength: 32768,
        requiresApiKey: true,
        setupInstructions: 'Get free API key from console.groq.com'
      },

      // Together AI (Free tier)
      {
        id: 'together/llama-2-7b-chat',
        name: 'Llama 2 7B Chat',
        provider: 'Together AI',
        type: 'api',
        description: 'Llama 2 7B Chat model (Free tier)',
        apiEndpoint: 'https://api.together.xyz/inference',
        capabilities: ['conversation', 'text-generation'],
        contextLength: 4096,
        requiresApiKey: true,
        setupInstructions: 'Get free credits from api.together.xyz'
      }
    ];
  }

  /**
   * Generate response using a free model
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
    const modelConfig = this.getAvailableModels().find(m => m.id === model);
    if (!modelConfig) {
      throw new Error(`Model ${model} not found`);
    }

    if (modelConfig.requiresApiKey && !this.apiKeys.has(modelConfig.provider)) {
      throw new Error(`API key required for ${modelConfig.provider}. ${modelConfig.setupInstructions}`);
    }

    const messages: ChatMessage[] = [];
    
    if (options?.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt
      });
    }
    
    messages.push({
      role: 'user',
      content: query
    });

    try {
      if (modelConfig.provider === 'Ollama') {
        return await this.generateOllamaResponse(modelConfig, query, options);
      } else if (modelConfig.provider === 'Hugging Face') {
        return await this.generateHuggingFaceResponse(modelConfig, query, options);
      } else if (modelConfig.provider === 'Groq') {
        return await this.generateGroqResponse(modelConfig, messages, options);
      } else if (modelConfig.provider === 'Together AI') {
        return await this.generateTogetherResponse(modelConfig, messages, options);
      } else {
        throw new Error(`Provider ${modelConfig.provider} not implemented`);
      }
    } catch (error) {
      console.error(`Error generating response with ${model}:`, error);
      throw error;
    }
  }

  /**
   * Generate response using Ollama local model
   */
  private async generateOllamaResponse(
    model: FreeModel, 
    prompt: string, 
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    try {
      const modelName = model.id.split('/')[1]; // Extract model name from ID
      
      const response = await fetch(model.apiEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName,
          prompt: prompt,
          stream: false,
          options: {
            temperature: options?.temperature || 0.7,
            num_predict: options?.maxTokens || 1000
          }
        })
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Ollama server not running or model '${modelName}' not installed. Run: ollama pull ${modelName}`);
        }
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result.response || 'No response generated';
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Ollama server not running. Please start Ollama and ensure the model is installed.');
      }
      throw error;
    }
  }

  /**
   * Generate response using Hugging Face Inference API
   */
  private async generateHuggingFaceResponse(
    model: FreeModel,
    prompt: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    const apiKey = this.apiKeys.get('Hugging Face');
    if (!apiKey) {
      throw new Error('Hugging Face API key required. Get it from huggingface.co/settings/tokens');
    }

    const response = await fetch(model.apiEndpoint!, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          temperature: options?.temperature || 0.7,
          max_new_tokens: options?.maxTokens || 512,
          return_full_text: false
        },
        options: {
          wait_for_model: true
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hugging Face API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    if (Array.isArray(result) && result.length > 0) {
      return result[0].generated_text || result[0].text || 'No response generated';
    }
    return 'No response generated';
  }

  /**
   * Generate response using Groq API
   */
  private async generateGroqResponse(
    model: FreeModel,
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    const apiKey = this.apiKeys.get('Groq');
    if (!apiKey) {
      throw new Error('Groq API key required. Get it from console.groq.com');
    }

    const modelName = model.id.split('/')[1]; // Extract model name
    
    const response = await fetch(model.apiEndpoint!, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelName,
        messages: messages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return result.choices?.[0]?.message?.content || 'No response generated';
  }

  /**
   * Generate response using Together AI
   */
  private async generateTogetherResponse(
    model: FreeModel,
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    const apiKey = this.apiKeys.get('Together AI');
    if (!apiKey) {
      throw new Error('Together AI API key required. Get free credits from api.together.xyz');
    }

    const response = await fetch(model.apiEndpoint!, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model.id.split('/')[1],
        prompt: messages.map(m => `${m.role}: ${m.content}`).join('\n'),
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Together AI error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return result.output?.choices?.[0]?.text || 'No response generated';
  }

  /**
   * Set API key for a provider
   */
  setApiKey(provider: string, apiKey: string): void {
    this.apiKeys.set(provider, apiKey);
    this.saveApiKeys();
  }

  /**
   * Get API key for a provider
   */
  getApiKey(provider: string): string | undefined {
    return this.apiKeys.get(provider);
  }

  /**
   * Check if a model is available (for local models, check if service is running)
   */
  async checkModelAvailability(modelId: string): Promise<boolean> {
    const model = this.getAvailableModels().find(m => m.id === modelId);
    if (!model) return false;

    if (model.provider === 'Ollama') {
      try {
        const response = await fetch('http://localhost:11434/api/tags', {
          method: 'GET'
        });
        
        if (response.ok) {
          const data = await response.json();
          const modelName = model.id.split('/')[1];
          return data.models?.some((m: any) => m.name.includes(modelName.split(':')[0])) || false;
        }
        return false;
      } catch {
        return false;
      }
    }

    if (model.requiresApiKey) {
      return this.apiKeys.has(model.provider);
    }

    return true;
  }

  /**
   * Get setup instructions for a model
   */
  getSetupInstructions(modelId: string): string | undefined {
    const model = this.getAvailableModels().find(m => m.id === modelId);
    return model?.setupInstructions;
  }

  /**
   * Save API keys to localStorage
   */
  private saveApiKeys(): void {
    const keysObject = Object.fromEntries(this.apiKeys);
    localStorage.setItem('free_model_api_keys', JSON.stringify(keysObject));
  }

  /**
   * Load API keys from localStorage
   */
  private loadApiKeys(): void {
    try {
      const stored = localStorage.getItem('free_model_api_keys');
      if (stored) {
        const keysObject = JSON.parse(stored);
        this.apiKeys = new Map(Object.entries(keysObject));
      }
    } catch (error) {
      console.warn('Failed to load API keys from localStorage:', error);
    }
  }
}

export const freeModelsService = new FreeModelsService();
