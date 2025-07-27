import { searchProcessor, ProcessedSearchResult } from './searchProcessor';
import { ServiceFactory, ServiceCredentials } from './integrations';
import { webSearchService } from './webSearch';
import { aiSearchService } from './aiSearch';
import { githubMCPService, GitHubCredentials, GitHubSearchResult } from './githubMCPService';
import { aiQueryProcessor, QueryIntent, MCPAction } from './aiQueryProcessor';

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  source: string;
  sourceType: 'bitbucket' | 'jira' | 'teams' | 'confluence' | 'github' | 'slack' | 'web' | 'ai';
  author: string;
  date: string;
  url: string;
  relevanceScore: number;
  starred?: boolean;
  metadata?: Record<string, unknown>;
}

// Browser-compatible EventEmitter implementation
class EventEmitter {
  private events: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
    return this;
  }

  emit(event: string, ...args: unknown[]): boolean {
    const listeners = this.events.get(event);
    if (!listeners) return false;
    
    listeners.forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    });
    
    return true;
  }

  removeListener(event: string, listener: Function): this {
    const listeners = this.events.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
    return this;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }
}

export interface MCPServer {
  id: string;
  name: string;
  type: 'bitbucket' | 'jira' | 'teams' | 'confluence' | 'github' | 'slack';
  status: 'connected' | 'connecting' | 'error' | 'disconnected';
  config: MCPServerConfig;
  lastSync?: string;
  itemCount?: number;
}

export interface MCPServerConfig {
  serverUrl: string;
  apiKey?: string;
  username?: string;
  password?: string;
  token?: string;
  workspace?: string;
  project?: string;
}

export interface SearchRequest {
  query: string;
  sources: string[];
  model: string;
  filters?: {
    dateRange?: { start: string; end: string };
    author?: string;
    type?: string;
  };
  searchMode?: 'web' | 'ai' | 'apps' | 'unified';
  webRestrictions?: {
    allowedDomains?: string[];
    blockedDomains?: string[];
    contentTypes?: string[];
    safeSearch?: boolean;
    complianceLevel?: 'strict' | 'moderate' | 'relaxed';
  };
  aiOptions?: {
    models?: string[];
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };
  appSources?: string[];
  companyPolicies?: string[];
}

class MCPClient extends EventEmitter {
  private servers: Map<string, MCPServer> = new Map();
  private connections: Map<string, WebSocket> = new Map();
  private httpConnections: Map<string, string> = new Map(); // Store base URLs for HTTP connections

  async addServer(config: {
    name: string;
    type: MCPServer['type'];
    serverConfig: MCPServerConfig;
  }): Promise<string> {
    const serverId = `${config.type}-${Date.now()}`;
    
    const server: MCPServer = {
      id: serverId,
      name: config.name,
      type: config.type,
      status: 'disconnected',
      config: config.serverConfig
    };

    this.servers.set(serverId, server);
    this.emit('serverAdded', server);
    
    return serverId;
  }

  async connectServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    server.status = 'connecting';
    this.emit('serverStatusChanged', server);

    try {
      // Check if server supports WebSocket or HTTP
      if (this.isWebSocketServer(server.config.serverUrl)) {
        await this.connectWebSocketServer(serverId, server);
      } else {
        await this.connectHttpServer(serverId, server);
      }

    } catch (error) {
      server.status = 'error';
      this.emit('serverStatusChanged', server);
      throw error;
    }
  }

  private isWebSocketServer(url: string): boolean {
    return url.startsWith('ws://') || url.startsWith('wss://');
  }

  private async connectWebSocketServer(serverId: string, server: MCPServer): Promise<void> {
    const ws = new WebSocket(this.getMCPWebSocketUrl(server));
    
    ws.onopen = () => {
      this.connections.set(serverId, ws);
      server.status = 'connected';
      server.lastSync = new Date().toISOString();
      this.servers.set(serverId, server); // Ensure updated status is stored
      this.emit('serverStatusChanged', server);
      this.initializeServerConnection(serverId);
    };

    ws.onerror = (error) => {
      server.status = 'error';
      this.emit('serverStatusChanged', server);
      console.error(`MCP WebSocket connection error for ${serverId}:`, error);
    };

    ws.onclose = () => {
      this.connections.delete(serverId);
      server.status = 'disconnected';
      this.emit('serverStatusChanged', server);
    };

    ws.onmessage = (event) => {
      this.handleServerMessage(serverId, JSON.parse(event.data));
    };
  }

  private async connectHttpServer(serverId: string, server: MCPServer): Promise<void> {
    try {
      // For GitHub, use a different health check endpoint
      let healthUrl: string;
      if (server.type === 'github') {
        // Use GitHub's user endpoint as health check
        healthUrl = `${server.config.serverUrl.replace(/\/$/, '')}/user`;
      } else {
        // Use standard health endpoint for other services
        healthUrl = `${server.config.serverUrl.replace(/\/$/, '')}/health`;
      }

      // Create timeout controller for better browser compatibility
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(healthUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...this.getHttpHeaders(server)
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          this.httpConnections.set(serverId, server.config.serverUrl);
          server.status = 'connected';
          server.lastSync = new Date().toISOString();
          this.servers.set(serverId, server); // Ensure updated status is stored
          this.emit('serverStatusChanged', server);
          
          // For GitHub, we don't need to sync like other MCP servers
          if (server.type !== 'github') {
            await this.syncHttpServer(serverId, server);
          } else {
            // For GitHub, just get a count of user repositories
            try {
              const repoResponse = await fetch(`${server.config.serverUrl}/user/repos?per_page=1`, {
                headers: this.getHttpHeaders(server)
              });
              if (repoResponse.ok) {
                const totalCount = repoResponse.headers.get('X-Total-Count') || '0';
                server.itemCount = parseInt(totalCount) || 0;
                this.emit('serverSynced', server);
              }
            } catch (error) {
              console.warn('Failed to get GitHub repo count:', error);
              server.itemCount = 0;
            }
          }
        } else {
          throw new Error(`HTTP connection failed: ${response.status} - ${response.statusText}`);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        
        // Handle network errors gracefully
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new Error(`Connection timeout: Unable to reach ${server.config.serverUrl}`);
          } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            throw new Error(`Network error: Unable to connect to ${server.config.serverUrl}. Please check if the server is running and accessible.`);
          }
        }
        throw error;
      }
    } catch (error) {
      console.error(`HTTP connection error for ${serverId}:`, error);
      server.status = 'error';
      this.emit('serverStatusChanged', server);
      
      // Provide user-friendly error message
      let errorMessage = `Failed to connect to ${server.name}`;
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }
      throw new Error(errorMessage);
    }
  }

  private async syncHttpServer(serverId: string, server: MCPServer): Promise<void> {
    try {
      const syncUrl = `${server.config.serverUrl.replace(/\/$/, '')}/sync`;
      const response = await fetch(syncUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getHttpHeaders(server)
        },
        body: JSON.stringify({
          timestamp: server.lastSync || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Last 24 hours
        }),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        server.itemCount = data.itemCount || data.count || 0;
        server.lastSync = new Date().toISOString();
        this.servers.set(serverId, server);
        this.emit('serverSynced', server);
        this.emit('serverStatusChanged', server);
      }
    } catch (error) {
      console.error(`Sync failed for ${serverId}:`, error);
    }
  }

  private getHttpHeaders(server: MCPServer): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'PineLens-MCP-Client/1.0'
    };
    const credentials = this.getServerCredentials(server);

    switch (credentials.type) {
      case 'token': {
        // For GitHub, use Bearer instead of token
        if (server.type === 'github') {
          headers['Authorization'] = `Bearer ${credentials.token}`;
        } else {
          headers['Authorization'] = `token ${credentials.token}`;
        }
        break;
      }
      case 'basic': {
        const basicAuth = btoa(`${credentials.username}:${credentials.password}`);
        headers['Authorization'] = `Basic ${basicAuth}`;
        break;
      }
      case 'oauth': {
        headers['Authorization'] = `Bearer ${credentials.token}`;
        break;
      }
      case 'api_key': {
        headers['Authorization'] = `Bearer ${credentials.apiKey}`;
        break;
      }
      case 'bot_token': {
        headers['Authorization'] = `Bearer ${credentials.token}`;
        break;
      }
    }

    return headers;
  }

  async disconnectServer(serverId: string): Promise<void> {
    const connection = this.connections.get(serverId);
    if (connection) {
      connection.close();
    }
    
    this.httpConnections.delete(serverId);
    
    const server = this.servers.get(serverId);
    if (server) {
      server.status = 'disconnected';
      this.emit('serverStatusChanged', server);
    }
  }

  async search(request: SearchRequest): Promise<SearchResult[]> {
    // Handle different search modes
    switch (request.searchMode) {
      case 'web':
        return await this.performWebSearch(request);
      case 'ai':
        return await this.performAISearch(request);
      case 'apps':
        return await this.performAppSearch(request);
      case 'unified':
      default:
        return await this.performUnifiedSearch(request);
    }
  }

  /**
   * Perform web-only search with company policy restrictions
   */
  private async performWebSearch(request: SearchRequest): Promise<SearchResult[]> {
    try {
      const webResults = await webSearchService.search(request.query, request.webRestrictions);
      
      const rawResults = webResults.map(result => ({
        id: result.id,
        title: result.title,
        content: result.content,
        source: result.source,
        sourceType: result.sourceType,
        author: result.author,
        date: result.date,
        url: result.url,
        metadata: result.metadata || {}
      }));

      const processedResults = await searchProcessor.processResults(rawResults, {
        query: request.query,
        model: request.model,
        maxResults: 50,
        includeAnalysis: true,
        searchMode: 'web',
        webRestrictions: request.webRestrictions,
        companyPolicies: request.companyPolicies
      });

      return this.convertToSearchResults(processedResults);
    } catch (error) {
      console.error('Web search failed:', error);
      return [];
    }
  }

  /**
   * Perform AI-only search
   */
  private async performAISearch(request: SearchRequest): Promise<SearchResult[]> {
    try {
      const aiOptions = {
        models: request.aiOptions?.models || ['gpt-4', 'claude-3-sonnet'],
        temperature: request.aiOptions?.temperature,
        maxTokens: request.aiOptions?.maxTokens,
        systemPrompt: request.aiOptions?.systemPrompt
      };

      const aiResults = await aiSearchService.search(request.query, aiOptions);
      
      const rawResults = aiResults.map(result => ({
        id: result.id,
        title: result.title,
        content: result.content,
        source: result.source,
        sourceType: result.sourceType,
        author: result.author,
        date: result.date,
        url: result.url,
        metadata: result.metadata || {}
      }));

      const processedResults = await searchProcessor.processResults(rawResults, {
        query: request.query,
        model: request.model,
        maxResults: 20,
        includeAnalysis: true,
        searchMode: 'ai',
        aiModels: aiOptions.models
      });

      return this.convertToSearchResults(processedResults);
    } catch (error) {
      console.error('AI search failed:', error);
      return [];
    }
  }

  /**
   * Perform app-specific search with AI query processing (VS Code MCP style)
   */
  private async performAppSearch(request: SearchRequest): Promise<SearchResult[]> {
    try {
      console.log('🔍 Starting AI-powered MCP search (VS Code style)...');
      
      // Debug: Print all servers and their statuses before filtering
      const allServers = Array.from(this.servers.values());
      console.log('🛠️ All MCP servers:', allServers.map(s => ({ id: s.id, name: s.name, status: s.status })));
      // Get connected MCP servers
      const connectedServers = allServers.filter(server => server.status === 'connected');
      console.log(`📱 Found ${connectedServers.length} connected MCP servers`);
      
      if (connectedServers.length === 0) {
        console.warn('❌ No MCP servers connected, providing setup guidance');
        
        // Return helpful guidance instead of throwing an error
        return [{
          id: 'mcp-setup-guide',
          title: 'Set up MCP Connections',
          content: `To search your connected services, you need to configure MCP servers first. Go to the Integrations tab to connect services like GitHub, Jira, Slack, or Bitbucket. Once connected, you'll be able to search across all your tools from here.`,
          source: 'PineLens Setup',
          sourceType: 'ai',
          author: 'System',
          date: new Date().toISOString(),
          url: '#integrations',
          relevanceScore: 1.0,
          starred: false,
          metadata: {
            type: 'setup_guide',
            action: 'configure_mcp_servers'
          }
        }];
      }

      // Step 1: Use AI to process the natural language query
      const availableServers = connectedServers.map(s => s.type);
      console.log(`🤖 Processing query with AI: "${request.query}"`);
      console.log(`Available servers: ${availableServers.join(', ')}`);
      
      const queryIntent: QueryIntent = await aiQueryProcessor.processQuery(request.query, availableServers);
      console.log(`🎯 AI Intent Analysis:`, {
        intent: queryIntent.intent,
        confidence: queryIntent.confidence,
        actions: queryIntent.actions.length
      });

      if (queryIntent.actions.length === 0) {
        console.warn('❌ AI found no suitable actions for this query');
        
        // Return helpful suggestion instead of throwing an error
        return [{
          id: 'query-help',
          title: 'Try a different search approach',
          content: `I couldn't find a specific way to search for "${request.query}" in your connected services (${availableServers.join(', ')}). Try being more specific, like "find my GitHub repositories" or "show recent Jira tickets".`,
          source: 'PineLens AI',
          sourceType: 'ai',
          author: 'Search Assistant',
          date: new Date().toISOString(),
          url: '',
          relevanceScore: 0.8,
          starred: false,
          metadata: {
            type: 'search_suggestion',
            availableServices: availableServers
          }
        }];
      }

      // Step 2: Execute MCP actions based on AI recommendations
      const allResults: SearchResult[] = [];
      
      for (const action of queryIntent.actions.slice(0, 3)) { // Limit to top 3 actions
        try {
          console.log(`� Executing action: ${action.server}.${action.action} (priority: ${action.priority})`);
          
          const server = connectedServers.find(s => s.type === action.server);
          if (!server) {
            console.warn(`⚠️ Server ${action.server} not connected, skipping action`);
            continue;
          }

          const actionResults = await this.executeAIAction(server, action, request);
          console.log(`✅ Action ${action.server}.${action.action} returned ${actionResults.length} results`);
          
          allResults.push(...actionResults);
        } catch (error) {
          console.warn(`❌ Action ${action.server}.${action.action} failed:`, error);
          // Continue with other actions even if one fails
        }
      }

      if (allResults.length === 0) {
        // Return helpful message instead of throwing an error
        return [{
          id: 'no-results',
          title: 'No results found',
          content: `The search for "${request.query}" completed successfully but didn't find any matching items in your connected services. This could mean the search terms don't match any content, or the services might need time to sync. Try different keywords or check your service connections.`,
          source: 'PineLens Search',
          sourceType: 'ai',
          author: 'Search Engine',
          date: new Date().toISOString(),
          url: '#integrations',
          relevanceScore: 0.6,
          starred: false,
          metadata: {
            type: 'search_result',
            searchQuery: request.query,
            connectedServices: availableServers
          }
        }];
      }

      console.log(`📊 Total AI-powered MCP search results: ${allResults.length}`);
      
      // Step 3: Sort by relevance and action priority
      const sortedResults = allResults.sort((a, b) => {
        // First by relevance score
        const relevanceDiff = b.relevanceScore - a.relevanceScore;
        if (Math.abs(relevanceDiff) > 0.1) return relevanceDiff;
        
        // Then by recency
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }).slice(0, 50);

      return sortedResults;
      
    } catch (error) {
      console.error('❌ AI-powered MCP search failed:', error);
      
      // Return error information as a search result instead of throwing
      return [{
        id: 'search-error',
        title: 'Search Error',
        content: `There was an error performing the search: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or check your service connections in the Integrations tab.`,
        source: 'PineLens Error Handler',
        sourceType: 'ai',
        author: 'System',
        date: new Date().toISOString(),
        url: '#integrations',
        relevanceScore: 0.5,
        starred: false,
        metadata: {
          type: 'error',
          originalQuery: request.query,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      }];
    }
  }

  /**
   * Execute a specific AI-recommended action on an MCP server
   */
  private async executeAIAction(server: MCPServer, action: MCPAction, request: SearchRequest): Promise<SearchResult[]> {
    switch (server.type) {
      case 'github':
        return await this.executeGitHubAction(server, action, request);
      
      case 'jira':
      case 'confluence':
      case 'slack':
      case 'teams':
      case 'bitbucket':
        // Use generic MCP search for other services
        return await this.searchMCPServer(server.id, request);
      
      default:
        console.warn(`Unknown server type: ${server.type}`);
        return [];
    }
  }

  /**
   * Execute GitHub-specific actions based on AI recommendations
   */
  private async executeGitHubAction(server: MCPServer, action: MCPAction, request: SearchRequest): Promise<SearchResult[]> {
    try {
      // Set up GitHub credentials
      const credentials: GitHubCredentials = {
        username: server.config.username || '',
        token: server.config.token || ''
      };

      githubMCPService.setCredentials(credentials);

      switch (action.action) {
        case 'get_user_repos': {
          console.log('📦 Fetching user repositories...');
          const userRepos = await githubMCPService.getUserRepositories(1, 30);
          return this.convertGitHubResults(userRepos, server);
        }

        case 'search_repositories': {
          console.log(`🔍 Searching repositories with: ${JSON.stringify(action.parameters)}`);
          let repoQuery = action.parameters.query as string || request.query;
          
          // Apply AI-recommended parameters
          if (action.parameters.language) {
            repoQuery += ` language:${action.parameters.language}`;
          }
          if (action.parameters.user) {
            repoQuery += ` user:${action.parameters.user}`;
          }

          const repoResults = await githubMCPService.search(repoQuery, {
            types: ['repositories'],
            limit: 20,
            sort: 'best-match',
            order: 'desc'
          });
          return this.convertGitHubResults(repoResults, server);
        }

        case 'search_issues': {
          console.log(`🐛 Searching issues with: ${JSON.stringify(action.parameters)}`);
          let issueQuery = action.parameters.query as string || request.query;
          
          // Apply AI-recommended parameters
          if (action.parameters.assignee === '@me') {
            issueQuery += ` assignee:${credentials.username}`;
          }
          if (action.parameters.state) {
            issueQuery += ` state:${action.parameters.state}`;
          }

          const issueResults = await githubMCPService.search(issueQuery, {
            types: ['issues'],
            limit: 15,
            sort: 'updated',
            order: 'desc'
          });
          return this.convertGitHubResults(issueResults, server);
        }

        case 'search_code': {
          console.log(`� Searching code with: ${JSON.stringify(action.parameters)}`);
          const codeResults = await githubMCPService.search(request.query, {
            types: ['code'],
            limit: 10,
            sort: 'best-match',
            order: 'desc'
          });
          return this.convertGitHubResults(codeResults, server);
        }

        case 'search_commits': {
          console.log(`📝 Searching commits with: ${JSON.stringify(action.parameters)}`);
          const commitResults = await githubMCPService.search(request.query, {
            types: ['commits'],
            limit: 10,
            sort: 'best-match',
            order: 'desc'
          });
          return this.convertGitHubResults(commitResults, server);
        }

        default: {
          console.warn(`Unknown GitHub action: ${action.action}`);
          // Fallback to general search
          const fallbackResults = await githubMCPService.search(request.query, {
            limit: 20,
            sort: 'best-match',
            order: 'desc'
          });
          return this.convertGitHubResults(fallbackResults, server);
        }
      }
    } catch (error) {
      console.error(`GitHub MCP action failed for ${server.name}:`, error);
      throw error;
    }
  }

  /**
   * Convert GitHub MCP results to SearchResult format
   */
  private convertGitHubResults(githubResults: GitHubSearchResult[], server: MCPServer): SearchResult[] {
    return githubResults.map(result => ({
      id: result.id,
      title: result.title,
      content: result.content,
      source: server.name,
      sourceType: 'github' as const,
      author: result.author,
      date: result.date,
      url: result.url,
      relevanceScore: this.calculateRelevance(result.title, result.content, ''), // Will be recalculated
      starred: false,
      metadata: {
        ...result.metadata,
        mcpServer: server.id,
        searchType: 'ai-powered-mcp'
      }
    }));
  }

  /**
   * Search GitHub using MCP service (VS Code style - direct query processing)
   */
  private async searchGitHubMCP(server: MCPServer, request: SearchRequest): Promise<SearchResult[]> {
    try {
      // Set up GitHub credentials
      const credentials: GitHubCredentials = {
        username: server.config.username || '',
        token: server.config.token || ''
      };

      githubMCPService.setCredentials(credentials);

      // Let GitHub MCP service intelligently handle the query like VS Code does
      // Don't pre-process or extract types - pass the query directly
      const githubResults = await githubMCPService.search(request.query, {
        types: ['repositories', 'issues', 'code', 'commits'], // Search all types by default
        limit: 30,
        sort: 'best-match', 
        order: 'desc'
      });

      console.log(`🔍 GitHub MCP found ${githubResults.length} results for: "${request.query}"`);

      // Convert GitHub results to SearchResult format
      return githubResults.map(result => ({
        id: result.id,
        title: result.title,
        content: result.content,
        source: server.name,
        sourceType: 'github' as const,
        author: result.author,
        date: result.date,
        url: result.url,
        relevanceScore: this.calculateRelevance(result.title, result.content, request.query),
        starred: false,
        metadata: {
          ...result.metadata,
          mcpServer: server.id,
          searchType: 'github-mcp'
        }
      }));
    } catch (error) {
      console.error(`GitHub MCP search failed for ${server.name}:`, error);
      throw new Error(`GitHub search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search a generic MCP server
   */
  private async searchMCPServer(serverId: string, request: SearchRequest): Promise<SearchResult[]> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    try {
      // Check if it's a WebSocket or HTTP server
      if (this.connections.has(serverId)) {
        return await this.searchServer(serverId, request);
      } else if (this.httpConnections.has(serverId)) {
        return await this.searchHttpServer(serverId, request);
      } else {
        throw new Error(`Server ${serverId} not connected`);
      }
    } catch (error) {
      console.error(`MCP server search failed for ${serverId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate relevance score for search results
   */
  private calculateRelevance(title: string, content: string, query: string): number {
    const queryLower = query.toLowerCase();
    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();

    let score = 0;

    // Title exact match
    if (titleLower === queryLower) score += 1.0;
    // Title contains query
    else if (titleLower.includes(queryLower)) score += 0.8;
    // Title words match
    else if (queryLower.split(' ').some(word => titleLower.includes(word))) score += 0.6;

    // Content match
    if (contentLower.includes(queryLower)) score += 0.4;
    else if (queryLower.split(' ').some(word => contentLower.includes(word))) score += 0.2;

    // Normalize score to 0-1 range
    return Math.min(score, 1.0);
  }

  /**
   * Perform unified search across all sources
   */
  private async performUnifiedSearch(request: SearchRequest): Promise<SearchResult[]> {
    try {
      // Perform all types of searches in parallel
      const [webResults, aiResults, appResults] = await Promise.allSettled([
        this.performWebSearch({ ...request, searchMode: 'web' }),
        this.performAISearch({ ...request, searchMode: 'ai' }),
        this.performAppSearch({ ...request, searchMode: 'apps' })
      ]);

      const allResults: SearchResult[] = [];

      // Collect results from all sources
      if (webResults.status === 'fulfilled') {
        allResults.push(...webResults.value);
      }
      if (aiResults.status === 'fulfilled') {
        allResults.push(...aiResults.value);
      }
      if (appResults.status === 'fulfilled') {
        allResults.push(...appResults.value);
      }

      // Re-rank and deduplicate unified results
      const rawResults = allResults.map(result => ({
        id: result.id,
        title: result.title,
        content: result.content,
        source: result.source,
        sourceType: result.sourceType,
        author: result.author,
        date: result.date,
        url: result.url,
        metadata: result.metadata || {}
      }));

      const processedResults = await searchProcessor.processResults(rawResults, {
        query: request.query,
        model: request.model,
        maxResults: 100,
        includeAnalysis: true
      });

      return this.convertToSearchResults(processedResults)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, request.filters?.type === 'all' ? 100 : 50);
    } catch (error) {
      console.error('Unified search failed:', error);
      return [];
    }
  }

  /**
   * Get mock search results for apps search mode demo
   */
  private getMockAppSearchResults(query: string): SearchResult[] {
    const mockResults = [
      {
        id: 'app-bitbucket-1',
        title: 'User Authentication API Enhancement',
        content: 'Implementation of OAuth 2.0 authentication system with JWT tokens and refresh token rotation. This pull request includes comprehensive security improvements and backward compatibility.',
        source: 'Company Bitbucket',
        sourceType: 'bitbucket' as const,
        author: 'Alice Johnson',
        date: '2024-01-15T10:30:00Z',
        url: 'https://bitbucket.company.com/projects/AUTH/repos/api-auth/pull-requests/123',
        relevanceScore: 0.92,
        starred: false,
        metadata: {
          type: 'pull_request',
          status: 'approved',
          reviewers: ['john.doe', 'sarah.smith'],
          branch: 'feature/oauth2-enhancement'
        }
      },
      {
        id: 'app-jira-1',
        title: `TASK-456: ${query} Integration Bug`,
        content: `Critical bug reported in the ${query} integration affecting user login flows. High priority issue needs immediate attention from the development team.`,
        source: 'Project Jira',
        sourceType: 'jira' as const,
        author: 'Mike Chen',
        date: '2024-01-14T14:20:00Z',
        url: 'https://company.atlassian.net/browse/TASK-456',
        relevanceScore: 0.88,
        starred: true,
        metadata: {
          type: 'bug',
          priority: 'high',
          status: 'in-progress',
          assignee: 'alice.johnson',
          sprint: 'Sprint 2024-01'
        }
      },
      {
        id: 'app-slack-1',
        title: `Discussion: ${query} Implementation`,
        content: `Team discussion about implementing ${query} features in the next sprint. Includes technical requirements, timeline estimates, and resource allocation planning.`,
        source: 'Team Slack',
        sourceType: 'slack' as const,
        author: 'Sarah Smith',
        date: '2024-01-13T16:45:00Z',
        url: 'https://teamworkspace.slack.com/archives/C123456/p1642089900',
        relevanceScore: 0.75,
        starred: false,
        metadata: {
          type: 'message',
          channel: '#development',
          thread_ts: '1642089900.123456',
          reactions: { '+1': 5, 'eyes': 2 }
        }
      },
      {
        id: 'app-bitbucket-2',
        title: 'Database Migration Script for User Management',
        content: 'SQL migration scripts for updating user management schema. Includes rollback procedures and data validation checks for production deployment.',
        source: 'Company Bitbucket',
        sourceType: 'bitbucket' as const,
        author: 'David Wilson',
        date: '2024-01-12T09:15:00Z',
        url: 'https://bitbucket.company.com/projects/DB/repos/migrations/browse/migrations/2024-01-12-user-mgmt.sql',
        relevanceScore: 0.82,
        starred: false,
        metadata: {
          type: 'file',
          path: 'migrations/2024-01-12-user-mgmt.sql',
          size: '2.3KB',
          language: 'sql'
        }
      },
      {
        id: 'app-jira-2',
        title: 'STORY-789: Enhanced Search Functionality',
        content: 'User story for implementing advanced search capabilities across all connected services. Includes acceptance criteria and technical specifications.',
        source: 'Project Jira',
        sourceType: 'jira' as const,
        author: 'Lisa Anderson',
        date: '2024-01-11T11:30:00Z',
        url: 'https://company.atlassian.net/browse/STORY-789',
        relevanceScore: 0.79,
        starred: false,
        metadata: {
          type: 'story',
          priority: 'medium',
          status: 'ready-for-development',
          story_points: 8,
          epic: 'EPIC-100'
        }
      }
    ];

    // Filter results based on query relevance
    return mockResults.filter(result => 
      result.title.toLowerCase().includes(query.toLowerCase()) ||
      result.content.toLowerCase().includes(query.toLowerCase())
    ).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Convert processed results back to SearchResult format
   */
  private convertToSearchResults(processedResults: ProcessedSearchResult[]): SearchResult[] {
    return processedResults.map(result => ({
      id: result.id,
      title: result.title,
      content: result.content,
      source: result.source,
      sourceType: result.sourceType as 'bitbucket' | 'jira' | 'teams' | 'confluence' | 'github' | 'slack',
      author: result.author,
      date: result.date,
      url: result.url,
      relevanceScore: result.relevanceScore,
      starred: false,
      metadata: {
        ...result.metadata,
        summary: result.summary,
        keyPoints: result.keyPoints,
        tags: result.tags,
        priority: result.priority,
        sentiment: result.sentiment
      }
    }));
  }

  private async searchWithServiceIntegration(
    server: MCPServer,
    request: SearchRequest
  ): Promise<SearchResult[]> {
    try {
      // Try using service integration first
      const credentials = this.getServiceCredentials(server);
      const service = ServiceFactory.createService(server.type, server.config, credentials);
      
      const searchQuery = {
        query: request.query,
        filters: {
          dateRange: request.filters?.dateRange,
          author: request.filters?.author,
          type: request.filters?.type
        },
        limit: 25
      };

      const serviceResults = await service.search(searchQuery);
      
      return serviceResults.map(result => ({
        id: result.id,
        title: result.title,
        content: result.content,
        source: server.name,
        sourceType: server.type,
        author: result.author,
        date: result.createdAt,
        url: result.url,
        relevanceScore: 0.5, // Will be calculated by search processor
        starred: false,
        metadata: result.metadata
      }));

    } catch (error) {
      console.error(`Service integration failed for ${server.id}, falling back to MCP:`, error);
      
      // Fallback to original MCP search
      if (this.httpConnections.has(server.id)) {
        return this.searchHttpServer(server.id, request);
      } else {
        return this.searchServer(server.id, request);
      }
    }
  }

  private getServiceCredentials(server: MCPServer): ServiceCredentials {
    const { config } = server;
    
    switch (server.type) {
      case 'bitbucket':
      case 'github':
        return {
          type: 'token',
          token: config.token,
          username: config.username
        };
      
      case 'jira':
        return {
          type: 'basic',
          username: config.username || '',
          password: config.password || ''
        };
      
      case 'teams':
        return {
          type: 'oauth',
          token: config.token || ''
        };
      
      case 'confluence':
        return {
          type: 'api_key',
          apiKey: config.apiKey || '',
          username: config.username || ''
        };
      
      case 'slack':
        return {
          type: 'bot_token',
          token: config.token || ''
        };
      
      default:
        return { type: 'token' };
    }
  }

  private getMCPWebSocketUrl(server: MCPServer): string {
    // Convert HTTP/HTTPS URLs to WebSocket URLs
    const baseUrl = server.config.serverUrl.replace(/^https?:\/\//, '');
    const protocol = server.config.serverUrl.startsWith('https') ? 'wss' : 'ws';
    return `${protocol}://${baseUrl}/mcp`;
  }

  private async initializeServerConnection(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    const connection = this.connections.get(serverId);
    
    if (!server || !connection) return;

    // Send authentication message
    const authMessage = {
      type: 'auth',
      credentials: this.getServerCredentials(server)
    };

    connection.send(JSON.stringify(authMessage));

    // Request initial sync
    const syncMessage = {
      type: 'sync',
      timestamp: server.lastSync || new Date(0).toISOString()
    };

    connection.send(JSON.stringify(syncMessage));
  }

  private getServerCredentials(server: MCPServer): Record<string, any> {
    const { config } = server;
    
    switch (server.type) {
      case 'bitbucket':
      case 'github':
        return {
          type: 'token',
          token: config.token,
          username: config.username
        };
      
      case 'jira':
        return {
          type: 'basic',
          username: config.username,
          password: config.password
        };
      
      case 'teams':
        return {
          type: 'oauth',
          token: config.token
        };
      
      case 'confluence':
        return {
          type: 'api_key',
          apiKey: config.apiKey,
          username: config.username
        };
      
      case 'slack':
        return {
          type: 'bot_token',
          token: config.token
        };
      
      default:
        return {};
    }
  }

  private async searchServer(serverId: string, request: SearchRequest): Promise<SearchResult[]> {
    const connection = this.connections.get(serverId);
    const server = this.servers.get(serverId);
    
    if (!connection || !server) {
      throw new Error(`Server ${serverId} not connected`);
    }

    return new Promise((resolve, reject) => {
      const requestId = `search-${Date.now()}-${Math.random()}`;
      
      const searchMessage = {
        type: 'search',
        id: requestId,
        query: request.query,
        filters: request.filters,
        model: request.model
      };

      // Set up response handler
      const responseHandler = (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'search_response' && data.id === requestId) {
          connection.removeEventListener('message', responseHandler);
          
          if (data.error) {
            reject(new Error(data.error));
          } else {
            const results = data.results.map((result: any) => ({
              ...result,
              source: server.name,
              sourceType: server.type
            }));
            resolve(results);
          }
        }
      };

      connection.addEventListener('message', responseHandler);
      connection.send(JSON.stringify(searchMessage));

      // Timeout after 30 seconds
      setTimeout(() => {
        connection.removeEventListener('message', responseHandler);
        reject(new Error('Search timeout'));
      }, 30000);
    });
  }

  private async searchHttpServer(serverId: string, request: SearchRequest): Promise<SearchResult[]> {
    const baseUrl = this.httpConnections.get(serverId);
    const server = this.servers.get(serverId);
    
    if (!baseUrl || !server) {
      throw new Error(`Server ${serverId} not connected`);
    }

    try {
      const searchUrl = `${baseUrl.replace(/\/$/, '')}/search`;
      const response = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getHttpHeaders(server)
        },
        body: JSON.stringify({
          query: request.query,
          model: request.model,
          filters: request.filters || {}
        }),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Search failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const results = data.results || data.items || [];
      return results.map((result: any) => ({
        ...result,
        source: server.name,
        sourceType: server.type,
        // Ensure required fields are present
        id: result.id || `${serverId}-${Date.now()}-${Math.random()}`,
        title: result.title || result.name || 'Untitled',
        content: result.content || result.description || result.body || '',
        author: result.author || result.user || result.owner || 'Unknown',
        date: result.date || result.created_at || result.updated_at || new Date().toISOString(),
        url: result.url || result.html_url || '#',
        relevanceScore: result.relevanceScore || result.score || 0.5
      }));
    } catch (error) {
      console.error(`HTTP search failed for ${serverId}:`, error);
      throw error;
    }
  }

  private handleServerMessage(serverId: string, message: any): void {
    const server = this.servers.get(serverId);
    if (!server) return;

    switch (message.type) {
      case 'sync_complete':
        server.itemCount = message.itemCount;
        server.lastSync = new Date().toISOString();
        this.emit('serverSynced', server);
        break;
      
      case 'error':
        console.error(`Server ${serverId} error:`, message.error);
        this.emit('serverError', { server, error: message.error });
        break;
      
      case 'status':
        this.emit('serverStatus', { server, status: message.status });
        break;
    }
  }

  getServers(): MCPServer[] {
    return Array.from(this.servers.values());
  }

  getServer(serverId: string): MCPServer | undefined {
    return this.servers.get(serverId);
  }

  removeServer(serverId: string): void {
    const server = this.servers.get(serverId);
    const serverName = server?.name || serverId;
    
    this.disconnectServer(serverId);
    this.servers.delete(serverId);
    this.emit('serverRemoved', serverId, serverName);
  }
}

export const mcpClient = new MCPClient();