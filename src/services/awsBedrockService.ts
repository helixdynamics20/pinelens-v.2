import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput
} from '@aws-sdk/client-bedrock-runtime';

export interface BedrockModelConfig {
  modelId: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
}

export interface BedrockResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

class AWSBedrockService {
  private client: BedrockRuntimeClient | null = null; // Explicitly initialize to null
  private isConfigured = false;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    try {
      // AWS credentials from environment variables
      const region = process.env.AWS_BEDROCK_REGION || process.env.AWS_DEFAULT_REGION || 'ap-south-1';
      
      this.client = new BedrockRuntimeClient({
        region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
        }
      });

      this.isConfigured = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
    } catch (error) {
      console.error('Failed to initialize AWS Bedrock client:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Check if the service is properly configured
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Generate response using Claude models
   */
  async generateWithClaude(
    prompt: string,
    config: Partial<BedrockModelConfig> = {},
    queryType: 'analysis' | 'code' | 'general' | 'structured' = 'general'
  ): Promise<BedrockResponse> {
    const modelConfig: BedrockModelConfig = {
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0', // Available in ap-south-1
      temperature: queryType === 'code' ? 0.1 : 0.3,
      maxTokens: 4000,
      topP: 0.9,
      ...config
    };

    // Construct messages with system guidance based on query type
    const messages = [];
    
    // Add system-like guidance as the first user message for code requests
    if (queryType === 'code') {
      messages.push({
        role: "user",
        content: "You are an expert programmer. When asked for code, always provide complete, working code examples with explanations. Be helpful and provide practical implementations."
      });
      messages.push({
        role: "assistant", 
        content: "I understand. I'll provide complete, working code examples when requested. How can I help you with programming?"
      });
    }
    
    messages.push({
      role: "user",
      content: prompt
    });

    const body = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: modelConfig.maxTokens,
      temperature: modelConfig.temperature,
      top_p: modelConfig.topP,
      messages
    };

    return this.invokeModel(modelConfig.modelId, body);
  }

  /**
   * Generate response using Amazon Titan models
   */
  async generateWithTitan(
    prompt: string,
    config: Partial<BedrockModelConfig> = {}
  ): Promise<BedrockResponse> {
    const modelConfig: BedrockModelConfig = {
      modelId: 'amazon.titan-text-express-v1', // Available in ap-south-1
      temperature: 0.1,
      maxTokens: 4000,
      topP: 0.9,
      ...config
    };

    const body = {
      inputText: prompt,
      textGenerationConfig: {
        maxTokenCount: modelConfig.maxTokens,
        temperature: modelConfig.temperature,
        topP: modelConfig.topP,
        stopSequences: []
      }
    };

    return this.invokeModel(modelConfig.modelId, body);
  }

  /**
   * Generate response using Meta Llama models
   */
  async generateWithLlama(
    prompt: string,
    config: Partial<BedrockModelConfig> = {}
  ): Promise<BedrockResponse> {
    const modelConfig: BedrockModelConfig = {
      modelId: 'meta.llama3-8b-instruct-v1:0', // Available in ap-south-1
      temperature: 0.1,
      maxTokens: 4000,
      topP: 0.9,
      ...config
    };

    const body = {
      prompt,
      max_gen_len: modelConfig.maxTokens,
      temperature: modelConfig.temperature,
      top_p: modelConfig.topP,
    };

    return this.invokeModel(modelConfig.modelId, body);
  }

  /**
   * Generate response using Mistral AI models
   */
  async generateWithMistral(
    prompt: string,
    config: Partial<BedrockModelConfig> = {}
  ): Promise<BedrockResponse> {
    const modelConfig: BedrockModelConfig = {
      modelId: 'mistral.mistral-7b-instruct-v0:2', // Available in ap-south-1
      temperature: 0.1,
      maxTokens: 4000,
      topP: 0.9,
      ...config
    };

    const body = {
      prompt,
      max_tokens: modelConfig.maxTokens,
      temperature: modelConfig.temperature,
      top_p: modelConfig.topP,
    };

    return this.invokeModel(modelConfig.modelId, body);
  }

  /**
   * Smart model selection based on query type - optimized for ap-south-1 region
   */
  async generateResponse(
    prompt: string,
    queryType: 'analysis' | 'code' | 'general' | 'structured' = 'general',
    config: Partial<BedrockModelConfig> = {}
  ): Promise<BedrockResponse> {
    if (!this.isAvailable()) {
      throw new Error('AWS Bedrock service is not properly configured');
    }

    try {
      // Prioritize Claude 3 Haiku for structured/analysis tasks, Titan for general tasks
      if (queryType === 'structured' || queryType === 'analysis' || queryType === 'code') {
        try {
          return await this.generateWithClaude(prompt, config, queryType);
        } catch (claudeError) {
          console.warn('Claude model not available, trying Titan:', claudeError);
          return await this.generateWithTitan(prompt, config);
        }
      } else {
        // For general queries, try Titan first (faster and cheaper), then Claude
        try {
          return await this.generateWithTitan(prompt, config);
        } catch (titanError) {
          console.warn('Titan model not available, trying Claude:', titanError);
          return await this.generateWithClaude(prompt, config, queryType);
        }
      }
    } catch (error) {
      console.error('Error generating response with AWS Bedrock:', error);
      throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generic method to invoke any Bedrock model
   */
  private async invokeModel(modelId: string, body: Record<string, unknown>): Promise<BedrockResponse> {
    if (!this.client) {
      throw new Error('Bedrock client not initialized');
    }

    try {
      const input: InvokeModelCommandInput = {
        modelId,
        body: JSON.stringify(body),
        contentType: 'application/json',
        accept: 'application/json'
      };

      const command = new InvokeModelCommand(input);
      const response = await this.client.send(command);

      if (!response.body) {
        throw new Error('No response body received from Bedrock');
      }

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      // Parse response based on model type
      let content = '';
      let usage = undefined;

      if (modelId.includes('anthropic.claude')) {
        content = responseBody.content?.[0]?.text || '';
        usage = responseBody.usage ? {
          inputTokens: responseBody.usage.input_tokens,
          outputTokens: responseBody.usage.output_tokens
        } : undefined;
      } else if (modelId.includes('amazon.titan')) {
        content = responseBody.results?.[0]?.outputText || '';
        usage = responseBody.inputTextTokenCount ? {
          inputTokens: responseBody.inputTextTokenCount,
          outputTokens: responseBody.results?.[0]?.tokenCount || 0
        } : undefined;
      } else if (modelId.includes('meta.llama')) {
        content = responseBody.generation || '';
      } else if (modelId.includes('mistral')) {
        content = responseBody.outputs?.[0]?.text || '';
      }

      return {
        content: content.trim(),
        usage
      };
    } catch (error) {
      console.error(`Error invoking model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * List available models in ap-south-1 region
   */
  getAvailableModels(): string[] {
    return [
      'anthropic.claude-3-haiku-20240307-v1:0', // Available in ap-south-1
      'amazon.titan-text-express-v1', // Available in ap-south-1
      'amazon.titan-text-lite-v1', // Available in ap-south-1
      'meta.llama3-8b-instruct-v1:0', // Available in ap-south-1
      'mistral.mistral-7b-instruct-v0:2' // Available in ap-south-1
    ];
  }

  /**
   * Get model information
   */
  getModelInfo(modelId: string): { provider: string; capabilities: string[] } {
    if (modelId.includes('anthropic.claude')) {
      return {
        provider: 'Anthropic',
        capabilities: ['text-generation', 'analysis', 'code', 'structured-output']
      };
    } else if (modelId.includes('amazon.titan')) {
      return {
        provider: 'Amazon',
        capabilities: ['text-generation', 'summarization']
      };
    } else if (modelId.includes('meta.llama')) {
      return {
        provider: 'Meta',
        capabilities: ['text-generation', 'conversation', 'code']
      };
    } else if (modelId.includes('mistral')) {
      return {
        provider: 'Mistral AI',
        capabilities: ['text-generation', 'conversation', 'multilingual']
      };
    }
    
    return {
      provider: 'Unknown',
      capabilities: ['text-generation']
    };
  }
}

export const awsBedrockService = new AWSBedrockService();
