/**
 * Unified Search Service
 * Handles search across Apps, Web, and AI modes with proper access control
 */

import { realAPIService } from './realAPIService';
import { searchProcessor } from './searchProcessor';
import { githubCopilotService } from './githubCopilotService';

export type SearchMode = 'unified' | 'apps' | 'web' | 'ai';

export interface UnifiedSearchOptions {
  searchMode: SearchMode;
  maxResults?: number;
  
  // App-specific options
  appSources?: string[];
  includePrivateRepos?: boolean;
  repositoryTypes?: ('owned' | 'member' | 'organization')[];
  
  // Web search options
  webRestrictions?: {
    allowedDomains?: string[];
    blockedDomains?: string[];
    safeSearch?: boolean;
    regionRestriction?: string;
  };
  
  // AI options
  aiModels?: string[];
  temperature?: number;
  systemPrompt?: string;
  includeContext?: boolean;
}

export interface UserAccessInfo {
  github?: {
    username: string;
    repositories: {
      owned: number;
      member: number;
      organization: number;
      private: number;
      public: number;
    };
    permissions: string[];
    organizations: string[];
  };
  jira?: {
    projects: string[];
    permissions: string[];
  };
  confluence?: {
    spaces: string[];
    permissions: string[];
  };
  slack?: {
    workspaces: string[];
    channels: string[];
  };
  teams?: {
    tenants: string[];
    permissions: string[];
  };
}

export interface UnifiedSearchResult {
  id: string;
  title: string;
  content: string;
  source: string;
  sourceType: string;
  author: string;
  date: string;
  url: string;
  relevanceScore: number;
  searchMode: SearchMode;
  starred?: boolean;
  metadata: {
    type: string;
    [key: string]: any;
  };
  // Enhanced metadata
  summary?: string;
  keyPoints?: string[];
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  accessLevel?: 'public' | 'private' | 'restricted';
}

class UnifiedSearchService {
  private userAccess: UserAccessInfo = {};

  constructor() {
    this.loadUserAccess();
  }

  private loadUserAccess(): void {
    const stored = localStorage.getItem('user_access_info');
    if (stored) {
      try {
        this.userAccess = JSON.parse(stored);
      } catch (error) {
        console.error('Failed to load user access info:', error);
      }
    }
  }

  private saveUserAccess(): void {
    localStorage.setItem('user_access_info', JSON.stringify(this.userAccess));
  }

  /**
   * Main unified search method
   */
  async search(query: string, options: UnifiedSearchOptions): Promise<UnifiedSearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    let results: UnifiedSearchResult[] = [];

    try {
      switch (options.searchMode) {
        case 'apps':
          results = await this.searchApps(query, options);
          break;
        case 'web':
          results = await this.searchWeb(query, options);
          break;
        case 'ai':
          results = await this.searchAI(query, options);
          break;
        case 'unified':
          results = await this.searchUnified(query, options);
          break;
        default:
          throw new Error(`Unsupported search mode: ${options.searchMode}`);
      }

      // Process results through the search processor
      const processedResults = await searchProcessor.processResults(
        results.map(r => ({
          id: r.id,
          title: r.title,
          content: r.content,
          source: r.source,
          sourceType: r.sourceType,
          author: r.author,
          date: r.date,
          url: r.url,
          metadata: r.metadata
        })),
        {
          query,
          model: 'default',
          searchMode: options.searchMode,
          maxResults: options.maxResults,
          appSources: options.appSources,
          webRestrictions: options.webRestrictions,
          aiModels: options.aiModels
        }
      );

      // Convert back to unified results
      return processedResults.map(result => ({
        ...result,
        searchMode: options.searchMode === 'unified' ? 'apps' : options.searchMode as 'apps' | 'web' | 'ai',
        metadata: {
          type: result.metadata?.type || 'general',
          ...result.metadata
        },
        accessLevel: this.determineAccessLevel(result),
        summary: result.summary,
        keyPoints: result.keyPoints,
        tags: result.tags,
        priority: result.priority
      }));

    } catch (error) {
      console.error('Unified search failed:', error);
      throw error;
    }
  }

  /**
   * Search across connected apps/services
   */
  private async searchApps(query: string, options: UnifiedSearchOptions): Promise<UnifiedSearchResult[]> {
    try {
      console.log('🔍 Starting app search with query:', query);
      
      // Auto-configure services if tokens exist
      this.autoConfigureServicesFromTokens();
      
      // Check if any services are configured
      const enabledServices = realAPIService.getEnabledServices();
      console.log('📱 Enabled services:', enabledServices.map(s => `${s.name} (${s.type})`));
      
      if (enabledServices.length === 0) {
        throw new Error('No services configured. Please configure your GitHub token or other API credentials in the Integrations section.');
      }

      const appResults = await realAPIService.searchAllServices(query);
      console.log(`📊 Found ${appResults.length} app results`);
      
      return appResults.map(result => ({
        ...result,
        searchMode: 'apps' as SearchMode,
        metadata: {
          type: result.metadata?.type || 'unknown',
          ...result.metadata
        }
      }));
    } catch (error) {
      console.error('❌ Apps search failed:', error);
      throw error; // Re-throw to show user-friendly error message
    }
  }

  /**
   * Auto-configure services from stored tokens
   */
  private autoConfigureServicesFromTokens(): void {
    const githubToken = localStorage.getItem('github_token');
    if (githubToken) {
      console.log('🔧 GitHub token found, ensuring service is configured...');
      realAPIService.addServiceConfig({
        name: 'GitHub',
        type: 'github',
        enabled: true,
        status: 'connected',
        credentials: { token: githubToken }
      });
    }

    // Add other services as needed
    const services = [
      { tokenKey: 'jira_token', type: 'jira', name: 'Jira' },
      { tokenKey: 'confluence_token', type: 'confluence', name: 'Confluence' },
      { tokenKey: 'bitbucket_token', type: 'bitbucket', name: 'Bitbucket' },
      { tokenKey: 'slack_token', type: 'slack', name: 'Slack' },
      { tokenKey: 'teams_token', type: 'teams', name: 'Teams' }
    ];

    services.forEach(service => {
      const token = localStorage.getItem(service.tokenKey);
      if (token) {
        console.log(`🔧 ${service.name} token found, configuring service...`);
        realAPIService.addServiceConfig({
          name: service.name,
          type: service.type as any,
          enabled: true,
          status: 'connected',
          credentials: { token }
        });
      }
    });
  }

  /**
   * Search the web with restrictions
   */
  private async searchWeb(query: string, options: UnifiedSearchOptions): Promise<UnifiedSearchResult[]> {
    try {
      console.log('🌐 Starting web search with query:', query);
      
      // For demo purposes, return some web-like results
      // In production, integrate with services like Bing API, Google Custom Search, etc.
      const webResults: UnifiedSearchResult[] = [
        {
          id: 'web-1',
          title: `Web Search: ${query} - Stack Overflow`,
          content: `Stack Overflow discussion about ${query}. This would be a real web search result in production.`,
          source: 'Stack Overflow',
          sourceType: 'web',
          author: 'community',
          date: new Date(Date.now() - 86400000).toISOString(),
          url: `https://stackoverflow.com/search?q=${encodeURIComponent(query)}`,
          relevanceScore: 0.85,
          searchMode: 'web' as SearchMode,
          metadata: {
            type: 'web',
            domain: 'stackoverflow.com',
            contentType: 'forum'
          },
          accessLevel: 'public'
        },
        {
          id: 'web-2',
          title: `${query} - Documentation`,
          content: `Official documentation and guides related to ${query}. This represents documentation search results.`,
          source: 'Documentation',
          sourceType: 'web',
          author: 'docs-team',
          date: new Date(Date.now() - 172800000).toISOString(),
          url: `https://docs.example.com/search?q=${encodeURIComponent(query)}`,
          relevanceScore: 0.9,
          searchMode: 'web' as SearchMode,
          metadata: {
            type: 'web',
            domain: 'docs.example.com',
            contentType: 'documentation'
          },
          accessLevel: 'public'
        }
      ];

      console.log(`🌐 Found ${webResults.length} web results (demo)`);
      return webResults;
    } catch (error) {
      console.error('❌ Web search failed:', error);
      return [];
    }
  }

  /**
   * AI-powered search and responses
   */
  private async searchAI(query: string, options: UnifiedSearchOptions): Promise<UnifiedSearchResult[]> {
    try {
      console.log('🤖 Starting AI search with query:', query);
      
      const aiResults: UnifiedSearchResult[] = [];
      const availableModels = await this.getAvailableAIModels();
      const modelsToUse = options.aiModels || [availableModels[0]?.id] || ['demo-gpt-3.5'];
      
      console.log('🤖 Using AI models:', modelsToUse);

      for (const modelId of modelsToUse) {
        const model = availableModels.find(m => m.id === modelId);
        const modelName = model?.name || modelId;
        const provider = model?.provider || 'Demo';
        
        try {
          // Generate AI response using the selected model
          const response = await this.generateAIResponse(query, modelId, options);
          
          aiResults.push({
            id: `ai-${modelId}-${Date.now()}`,
            title: `AI Analysis: ${query}`,
            content: response,
            source: `${modelName}`,
            sourceType: 'ai',
            author: provider,
            date: new Date().toISOString(),
            url: '#ai-response',
            relevanceScore: 0.95,
            searchMode: 'ai' as SearchMode,
            metadata: {
              type: 'ai_response',
              model: modelId,
              modelName,
              provider,
              query,
              temperature: options.temperature || 0.7
            },
            accessLevel: 'public'
          });
        } catch (modelError) {
          console.error(`❌ AI model ${modelId} failed:`, modelError);
          // Add error result
          aiResults.push({
            id: `ai-error-${modelId}-${Date.now()}`,
            title: `AI Model Error: ${modelName}`,
            content: `Failed to generate response using ${modelName}. This might be due to API limits, configuration issues, or model unavailability.`,
            source: `${modelName} (Error)`,
            sourceType: 'ai',
            author: provider,
            date: new Date().toISOString(),
            url: '#ai-error',
            relevanceScore: 0.1,
            searchMode: 'ai' as SearchMode,
            metadata: {
              type: 'ai_error',
              model: modelId,
              modelName,
              provider,
              error: true
            },
            accessLevel: 'public'
          });
        }
      }

      console.log(`🤖 Generated ${aiResults.length} AI results`);
      return aiResults;
    } catch (error) {
      console.error('❌ AI search failed:', error);
      return [];
    }
  }

  /**
   * Unified search across all modes
   */
  private async searchUnified(query: string, options: UnifiedSearchOptions): Promise<UnifiedSearchResult[]> {
    const results: UnifiedSearchResult[] = [];

    // Search apps
    try {
      const appResults = await this.searchApps(query, { ...options, searchMode: 'apps' });
      results.push(...appResults.slice(0, 10)); // Limit apps results
    } catch (error) {
      console.error('Apps search in unified mode failed:', error);
    }

    // Search AI
    try {
      const aiResults = await this.searchAI(query, { ...options, searchMode: 'ai' });
      results.push(...aiResults.slice(0, 2)); // Limit AI results
    } catch (error) {
      console.error('AI search in unified mode failed:', error);
    }

    // Search web (when implemented)
    try {
      const webResults = await this.searchWeb(query, { ...options, searchMode: 'web' });
      results.push(...webResults.slice(0, 5)); // Limit web results
    } catch (error) {
      console.error('Web search in unified mode failed:', error);
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Get user's accessible repositories and permissions
   */
  async getUserAccess(): Promise<UserAccessInfo> {
    try {
      const services = realAPIService.getEnabledServices();
      
      for (const service of services) {
        switch (service.type) {
          case 'github':
            this.userAccess.github = await this.getGitHubAccess(service);
            break;
          case 'jira':
            this.userAccess.jira = await this.getJiraAccess(service);
            break;
          case 'confluence':
            this.userAccess.confluence = await this.getConfluenceAccess(service);
            break;
          case 'slack':
            this.userAccess.slack = await this.getSlackAccess(service);
            break;
          case 'teams':
            this.userAccess.teams = await this.getTeamsAccess(service);
            break;
        }
      }

      this.saveUserAccess();
      return this.userAccess;
    } catch (error) {
      console.error('Failed to get user access:', error);
      return this.userAccess;
    }
  }

  /**
   * Get available AI models based on user's actual access
   */
  async getAvailableAIModels(): Promise<{ id: string; name: string; provider: string }[]> {
    const openaiKey = localStorage.getItem('openai_api_key');
    const anthropicKey = localStorage.getItem('anthropic_api_key');
    const googleKey = localStorage.getItem('google_api_key');
    
    const availableModels: { 
      id: string; 
      name: string; 
      provider: string; 
      tier?: string; 
      capabilities?: string[];
      summary?: string;
      contextLength?: number;
    }[] = [];

    console.debug('Loading available AI models...');

    // Get GitHub Models API models
    try {
      const githubModels = await githubCopilotService.getAvailableModels();
      const githubModelDetails = await githubCopilotService.getModelDetails();
      
      // Map actual GitHub Models API models with their enhanced details
      githubModels.forEach(modelId => {
        const modelDetail = githubModelDetails.find(detail => detail.id === modelId);
        if (modelDetail) {
          // Create a more descriptive provider name with tier info
          const tierInfo = modelDetail.rate_limit_tier === 'low' ? '🟢' : 
                          modelDetail.rate_limit_tier === 'high' ? '🟡' : 
                          modelDetail.rate_limit_tier === 'custom' ? '🔵' : '⚪';
          
          availableModels.push({
            id: modelId,
            name: `${tierInfo} ${modelDetail.name}`,
            provider: `${modelDetail.publisher}`,
            tier: modelDetail.rate_limit_tier,
            capabilities: modelDetail.capabilities,
            summary: modelDetail.summary,
            contextLength: modelDetail.limits.max_input_tokens
          });
          
          console.debug(`✅ Added GitHub Model: ${modelDetail.name} by ${modelDetail.publisher} (${modelDetail.rate_limit_tier} tier)`);
        } else {
          // Fallback for models without details
          availableModels.push({
            id: modelId,
            name: modelId,
            provider: 'GitHub Models'
          });
        }
      });
      
      if (githubModels.length > 0) {
        console.log(`✅ Loaded ${githubModels.length} models from GitHub Models API:`);
        
        // Group models by publisher for better overview
        const modelsByPublisher = githubModelDetails.reduce((acc, model) => {
          if (!acc[model.publisher]) acc[model.publisher] = [];
          acc[model.publisher].push(model.name);
          return acc;
        }, {} as Record<string, string[]>);
        
        Object.entries(modelsByPublisher).forEach(([publisher, models]) => {
          console.log(`  📦 ${publisher}: ${models.length} models (${models.slice(0, 3).join(', ')}${models.length > 3 ? '...' : ''})`);
        });
        console.log(`✅ Loaded ${githubModels.length} models from GitHub Models API`);
      } else {
        console.log('ℹ️ No GitHub Models API models available (check token permissions)');
      }
    } catch (error) {
      console.debug('GitHub Models API not available:', error);
    }

    // Add standard API models only if API keys are present
    if (openaiKey) {
      availableModels.push(
        { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' }
      );
      console.debug('✅ Added OpenAI models');
    }

    if (anthropicKey) {
      availableModels.push(
        { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic' },
        { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic' },
        { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic' }
      );
      console.debug('✅ Added Anthropic models');
    }

    if (googleKey) {
      availableModels.push(
        { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google' },
        { id: 'gemini-ultra', name: 'Gemini Ultra', provider: 'Google' }
      );
      console.debug('✅ Added Google models');
    }

    // If user has GitHub token but no Copilot Pro, suggest alternatives
    const hasGitHubToken = localStorage.getItem('github_token');
    if (availableModels.length === 0 && hasGitHubToken) {
      console.debug('ℹ️ You have a GitHub token but no AI models available. Consider:');
      console.debug('   - Getting GitHub Copilot Pro: https://github.com/settings/copilot');
      console.debug('   - Adding an OpenAI API key for GPT models');
      console.debug('   - Adding an Anthropic API key for Claude models');
      
      // Provide a basic fallback that explains the situation
      availableModels.push({
        id: 'setup-required',
        name: 'Setup Required - Add API Key or Get Copilot Pro',
        provider: 'Setup'
      });
    }

    // Only add demo model if no GitHub token exists at all
    if (availableModels.length === 0 && !hasGitHubToken) {
      availableModels.push({
        id: 'demo-gpt-3.5',
        name: 'GPT-3.5 Turbo (Demo)',
        provider: 'Demo'
      });
      console.debug('ℹ️ No API access detected, using demo model');
    }

    console.debug(`Total available models: ${availableModels.length}`);
    return availableModels;
  }

  /**
   * Check if user has GitHub Copilot Pro access
   */
  private checkGitHubCopilotProAccess(): boolean {
    // Check if GitHub Copilot service is configured
    return githubCopilotService.isConfigured();
  }

  // Private helper methods
  private async getGitHubAccess(service: any): Promise<any> {
    try {
      const userResponse = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `token ${service.credentials.token}` }
      });
      
      const reposResponse = await fetch('https://api.github.com/user/repos?per_page=100', {
        headers: { 'Authorization': `token ${service.credentials.token}` }
      });

      if (userResponse.ok && reposResponse.ok) {
        const user = await userResponse.json();
        const repos = await reposResponse.json();

        const owned = repos.filter((r: any) => r.owner.login === user.login).length;
        const member = repos.filter((r: any) => r.owner.login !== user.login && !r.fork).length;
        const privateRepos = repos.filter((r: any) => r.private).length;
        const publicRepos = repos.filter((r: any) => !r.private).length;

        return {
          username: user.login,
          repositories: {
            owned,
            member,
            organization: member, // Approximation
            private: privateRepos,
            public: publicRepos
          },
          permissions: user.permissions || [],
          organizations: [] // Would need separate API call
        };
      }
    } catch (error) {
      console.error('Failed to get GitHub access:', error);
    }
    return null;
  }

  private async getJiraAccess(service: any): Promise<any> {
    // Implement Jira access check
    return { projects: [], permissions: [] };
  }

  private async getConfluenceAccess(service: any): Promise<any> {
    // Implement Confluence access check
    return { spaces: [], permissions: [] };
  }

  private async getSlackAccess(service: any): Promise<any> {
    // Implement Slack access check
    return { workspaces: [], channels: [] };
  }

  private async getTeamsAccess(service: any): Promise<any> {
    // Implement Teams access check
    return { tenants: [], permissions: [] };
  }

  private async generateAIResponse(query: string, modelId: string, options: UnifiedSearchOptions): Promise<string> {
    try {
      // Check if it's a GitHub Copilot Pro model
      if (modelId.startsWith('github-copilot-')) {
        try {
          const response = await githubCopilotService.generateResponse(query, modelId);
          return response;
        } catch (error) {
          console.error(`GitHub Copilot model ${modelId} failed:`, error);
          throw error;
        }
      }

      // Handle other AI models (OpenAI, Anthropic, Google, etc.)
      if (modelId.startsWith('gpt-')) {
        const openaiKey = localStorage.getItem('openai_api_key');
        if (openaiKey) {
          // In production, make actual OpenAI API call
          // For now, return a simulated response
          await new Promise(resolve => setTimeout(resolve, 1500));
          return `OpenAI ${modelId} Analysis of "${query}": This comprehensive analysis leverages advanced reasoning capabilities to provide detailed insights, practical recommendations, and contextual understanding based on your specific requirements and access permissions.`;
        } else {
          throw new Error('OpenAI API key not configured');
        }
      }

      if (modelId.startsWith('claude-')) {
        const anthropicKey = localStorage.getItem('anthropic_api_key');
        if (anthropicKey) {
          // In production, make actual Anthropic API call
          await new Promise(resolve => setTimeout(resolve, 1200));
          return `Anthropic ${modelId} Response to "${query}": Through careful analysis and reasoning, this response provides accurate, nuanced insights while maintaining safety and reliability standards. The analysis considers multiple perspectives and potential implications.`;
        } else {
          throw new Error('Anthropic API key not configured');
        }
      }

      if (modelId.startsWith('gemini-')) {
        const googleKey = localStorage.getItem('google_api_key');
        if (googleKey) {
          // In production, make actual Google AI API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          return `Google ${modelId} Analysis of "${query}": Utilizing multimodal understanding and advanced reasoning, this response integrates information from various sources to provide comprehensive insights and actionable recommendations.`;
        } else {
          throw new Error('Google AI API key not configured');
        }
      }

      // Setup required model - provide guidance
      if (modelId === 'setup-required') {
        await new Promise(resolve => setTimeout(resolve, 500));
        return `AI Setup Required for "${query}":

To get AI-powered search results, you have several options:

🚀 **GitHub Copilot Pro** (Recommended)
   • Get access to GPT-4, Claude 3.5 Sonnet, and more
   • Subscribe at: https://github.com/settings/copilot
   • Your GitHub token is already configured!

🔑 **API Keys** (Alternative)
   • OpenAI API Key → Add to get GPT-4, GPT-3.5 Turbo
   • Anthropic API Key → Add to get Claude models  
   • Google API Key → Add to get Gemini models

💡 **Next Steps:**
   1. Get GitHub Copilot Pro subscription, OR
   2. Add API keys in the Integrations section
   3. Refresh the page to see available models

Your GitHub integration is working great for Apps search! Add AI capabilities to complete your search experience.`;
      }

      // Demo model fallback
      if (modelId === 'demo-gpt-3.5') {
        await new Promise(resolve => setTimeout(resolve, 800));
        return `Demo AI Response to "${query}": This is a demonstration response showing how AI analysis would work. In a real implementation, this would connect to actual AI services like OpenAI, Anthropic, Google, or your GitHub Copilot Pro subscription to provide intelligent insights and analysis.`;
      }

      // Unknown model
      throw new Error(`Unknown AI model: ${modelId}`);

    } catch (error) {
      console.error(`AI response generation failed for model ${modelId}:`, error);
      throw error;
    }
  }

  private determineAccessLevel(result: any): 'public' | 'private' | 'restricted' {
    if (result.metadata?.private === true) return 'private';
    if (result.metadata?.permissions && result.metadata.permissions.length > 0) return 'restricted';
    return 'public';
  }
}

export const unifiedSearchService = new UnifiedSearchService();
