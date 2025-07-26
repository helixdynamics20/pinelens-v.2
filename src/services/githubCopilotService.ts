/**
 * GitHub Models API Service  
 * Handles GitHub Models API access for AI-powered search functionality
 * Uses GitHub token to access AI models via GitHub Copilot Pro subscription
 */

interface GitHubAPIResponse {
  login: string;
  id: number;
  name: string;
  email: string;
}

interface GitHubModel {
  id: string;
  name: string;
  publisher: string;
  summary: string;
  rate_limit_tier: string;
  supported_input_modalities: string[];
  supported_output_modalities: string[];
  tags: string[];
  registry: string;
  version: string;
  capabilities: string[];
  limits: {
    max_input_tokens: number;
    max_output_tokens: number;
  };
  html_url: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionRequest {
  messages: ChatMessage[];
  model: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class GitHubModelsService {
  private githubToken: string | null = null;

  constructor() {
    this.githubToken = localStorage.getItem('github_token');
  }

  /**
   * Check if GitHub token is valid and can access GitHub Models API
   */
  async checkCopilotProStatus(): Promise<boolean> {
    if (!this.githubToken) return false;

    try {
      // Check if token works with GitHub API (using fine-grained token format)
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${this.githubToken}`, // Fine-grained tokens use Bearer
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'PineLens-Search-App'
        }
      });

      if (response.ok) {
        const userData: GitHubAPIResponse = await response.json();
        console.log('✅ GitHub token is valid for API access');
        console.log(`👤 Connected as: ${userData.name || userData.login}`);
        
        // Test GitHub Models API access by trying to fetch available models
        try {
          const modelsResponse = await fetch('/api/github-models/catalog/models', {
            headers: {
              'Authorization': `Bearer ${this.githubToken}`,
              'Accept': 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
              'User-Agent': 'PineLens-Search-App'
            }
          });
          
          if (modelsResponse.ok) {
            console.log('✅ GitHub Models API access confirmed');
            return true;
          } else {
            console.log('ℹ️ GitHub Models API access not available with current token');
            return false;
          }
        } catch (error) {
          console.log('ℹ️ Unable to access GitHub Models API:', error);
          return false;
        }
      } else {
        console.log('❌ GitHub token validation failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Error checking GitHub token:', error);
      return false;
    }
  }

  /**
   * Generate AI response using GitHub Models API
   */
  async generateResponse(query: string, model: string, options?: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<string> {
    if (!this.githubToken) {
      throw new Error('GitHub token not configured. Please add your GitHub token first.');
    }

    if (!model) {
      throw new Error('Model not specified. Please select a model from the available options.');
    }

    try {
      console.debug(`🤖 Generating response with model: ${model}`);
      
      const messages: ChatMessage[] = [];
      
      // Add system prompt if provided
      if (options?.systemPrompt) {
        messages.push({
          role: 'system',
          content: options.systemPrompt
        });
      }
      
      // Add user query
      messages.push({
        role: 'user',
        content: query
      });

      const requestBody: ChatCompletionRequest = {
        model: model,
        messages: messages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 1000
      };

      const response = await fetch('/api/github-models/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.githubToken}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'PineLens-Search-App'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ GitHub Models API error:', response.status, errorText);
        
        if (response.status === 401) {
          throw new Error('Authentication failed. Please check your GitHub token permissions.');
        } else if (response.status === 403) {
          throw new Error('Access denied. You may need GitHub Copilot subscription or proper permissions.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else {
          throw new Error(`GitHub Models API error: ${response.status} ${response.statusText}`);
        }
      }

      const result: ChatCompletionResponse = await response.json();
      
      if (result.choices && result.choices.length > 0) {
        const content = result.choices[0].message.content;
        console.log('✅ Successfully generated AI response');
        return content;
      } else {
        throw new Error('No response generated from the model');
      }
    } catch (error) {
      console.error('❌ Error generating response:', error);
      throw error;
    }
  }

  /**
   * Get available models from GitHub Models API (user's authorized models only)
   */
  async getAvailableModels(): Promise<string[]> {
    if (!this.githubToken) {
      console.debug('❌ No GitHub token configured for Models API access');
      return [];
    }

    try {
      console.debug('🔍 Fetching available models from GitHub Models API...');
      
      const response = await fetch('/api/github-models/catalog/models', {
        headers: {
          'Authorization': `Bearer ${this.githubToken}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'PineLens-Search-App'
        }
      });

      if (!response.ok) {
        console.error('❌ Failed to fetch models:', response.status, response.statusText);
        if (response.status === 401) {
          console.error('❌ Authentication failed. Please check your GitHub token permissions.');
        } else if (response.status === 403) {
          console.error('❌ Access denied. You may need GitHub Copilot subscription.');
          console.log('💡 Get GitHub Copilot Pro at: https://github.com/settings/copilot');
        }
        
        // Return empty array if no access
        return [];
      }

      const models: GitHubModel[] = await response.json();
      console.log(`✅ Found ${models.length} available models from GitHub Models API`);
      
      // Extract model IDs and log available models
      const modelIds = models.map(model => {
        console.debug(`✅ Available model: ${model.id} (${model.name}) by ${model.publisher}`);
        return model.id;
      });

      return modelIds;
    } catch (error) {
      console.error('❌ Error fetching GitHub Models:', error);
      return [];
    }
  }

  /**
   * Get detailed model information from GitHub Models API
   */
  async getModelDetails(): Promise<GitHubModel[]> {
    if (!this.githubToken) {
      console.debug('❌ No GitHub token configured for Models API access');
      return [];
    }

    try {
      console.debug('🔍 Fetching detailed model information from GitHub Models API...');
      
      const response = await fetch('/api/github-models/catalog/models', {
        headers: {
          'Authorization': `Bearer ${this.githubToken}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'PineLens-Search-App'
        }
      });

      if (!response.ok) {
        console.error('❌ Failed to fetch model details:', response.status, response.statusText);
        return [];
      }

      const models: GitHubModel[] = await response.json();
      console.log(`✅ Retrieved detailed information for ${models.length} models`);
      
      return models;
    } catch (error) {
      console.error('❌ Error fetching model details:', error);
      return [];
    }
  }

  /**
   * Update GitHub token
   */
  updateToken(token: string): void {
    this.githubToken = token;
    localStorage.setItem('github_token', token);
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!this.githubToken;
  }
}

export const githubCopilotService = new GitHubModelsService();