/**
 * Real API Service
 * Handles direct API calls to various services without mock data
 */

export interface ServiceConfig {
  name: string;
  type: 'github' | 'bitbucket' | 'jira' | 'confluence' | 'slack' | 'teams';
  enabled: boolean;
  status: 'disconnected' | 'connected' | 'error';
  credentials: {
    token?: string;
    username?: string;
    password?: string;
    domain?: string;
    workspace?: string;
  };
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  source: string;
  sourceType: string;
  author: string;
  date: string;
  url: string;
  relevanceScore: number;
  metadata: Record<string, any>;
}

class RealAPIService {
  private configs: ServiceConfig[] = [];

  constructor() {
    this.loadConfigs();
    this.autoConfigureServices();
  }

  /**
   * Auto-configure services based on available tokens
   */
  private autoConfigureServices(): void {
    console.log('🔧 Auto-configuring services...');
    
    // Auto-configure GitHub if token exists
    const githubToken = localStorage.getItem('github_token');
    console.log('🔍 GitHub token check:', githubToken ? 'Found' : 'Not found');
    
    if (githubToken) {
      const existingGitHub = this.configs.find(c => c.type === 'github');
      if (!existingGitHub) {
        console.log('✅ Auto-configuring GitHub service from stored token');
        this.addServiceConfig({
          name: 'GitHub',
          type: 'github',
          enabled: true,
          status: 'connected',
          credentials: {
            token: githubToken
          }
        });
      } else if (existingGitHub.credentials.token !== githubToken) {
        // Update token if changed
        console.log('🔄 Updating GitHub service token');
        existingGitHub.credentials.token = githubToken;
        existingGitHub.status = 'connected';
        existingGitHub.enabled = true;
        this.saveConfigs();
      } else {
        console.log('✅ GitHub service already configured');
        // Ensure it's enabled and connected
        existingGitHub.enabled = true;
        existingGitHub.status = 'connected';
        this.saveConfigs();
      }
    }

    // Auto-configure other services based on their tokens
    const services = [
      { type: 'jira', tokenKey: 'jira_token', usernameKey: 'jira_username', domainKey: 'jira_domain' },
      { type: 'confluence', tokenKey: 'confluence_token', usernameKey: 'confluence_username', domainKey: 'confluence_domain' },
      { type: 'bitbucket', tokenKey: 'bitbucket_token', usernameKey: 'bitbucket_username', workspaceKey: 'bitbucket_workspace' },
      { type: 'slack', tokenKey: 'slack_token' },
      { type: 'teams', tokenKey: 'teams_token' }
    ];

    services.forEach(service => {
      const token = localStorage.getItem(service.tokenKey);
      if (token) {
        const existing = this.configs.find(c => c.type === service.type as any);
        const credentials: any = { token };

        if (service.usernameKey) {
          credentials.username = localStorage.getItem(service.usernameKey);
        }
        if (service.domainKey) {
          credentials.domain = localStorage.getItem(service.domainKey);
        }
        if (service.workspaceKey) {
          credentials.workspace = localStorage.getItem(service.workspaceKey);
        }

        if (!existing) {
          this.addServiceConfig({
            name: service.type.charAt(0).toUpperCase() + service.type.slice(1),
            type: service.type as any,
            enabled: true,
            status: 'connected',
            credentials
          });
        } else {
          existing.credentials = credentials;
          existing.status = 'connected';
          existing.enabled = true;
          this.saveConfigs();
        }
      }
    });
  }

  /**
   * Refresh configurations - called externally to trigger auto-configuration
   */
  refreshConfigs(): void {
    this.autoConfigureServices();
  }

  /**
   * Auto-configure service from a specific token (used for dynamic configuration)
   */
  autoConfigureFromToken(type: string, token: string): void {
    let serviceName = type.charAt(0).toUpperCase() + type.slice(1);
    
    const existingService = this.configs.find(c => c.type === type);
    if (!existingService) {
      this.addServiceConfig({
        name: serviceName,
        type: type as any,
        enabled: true,
        status: 'connected',
        credentials: { token }
      });
    } else {
      existingService.credentials.token = token;
      existingService.status = 'connected';
      existingService.enabled = true;
      this.saveConfigs();
    }
  }

  /**
   * Manually set GitHub token and configure service
   */
  configureGitHubToken(token: string, username?: string): boolean {
    try {
      console.log('🔧 Manually configuring GitHub token...');
      
      // Store the token
      localStorage.setItem('github_token', token);
      if (username) {
        localStorage.setItem('github_username', username);
      }
      
      // Configure the service
      this.addServiceConfig({
        name: 'GitHub',
        type: 'github',
        enabled: true,
        status: 'connected',
        credentials: {
          token: token,
          username: username
        }
      });
      
      console.log('✅ GitHub service configured successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to configure GitHub token:', error);
      return false;
    }
  }

  /**
   * Check if GitHub token exists and is configured
   */
  checkGitHubConfiguration(): { hasToken: boolean; hasService: boolean; isEnabled: boolean } {
    const token = localStorage.getItem('github_token');
    const service = this.configs.find(c => c.type === 'github');
    
    return {
      hasToken: !!token,
      hasService: !!service,
      isEnabled: service?.enabled && service?.status === 'connected'
    };
  }

  private loadConfigs(): void {
    const stored = localStorage.getItem('api_service_configs');
    if (stored) {
      try {
        this.configs = JSON.parse(stored);
        console.log('📥 Loaded service configs:', this.configs);
      } catch (error) {
        console.error('Failed to load service configs:', error);
        this.configs = [];
      }
    } else {
      console.log('📝 No existing service configs found, starting fresh');
      this.configs = [];
    }
  }

  private saveConfigs(): void {
    localStorage.setItem('api_service_configs', JSON.stringify(this.configs));
  }

  addServiceConfig(config: ServiceConfig): void {
    const existingIndex = this.configs.findIndex(c => c.name === config.name && c.type === config.type);
    if (existingIndex >= 0) {
      this.configs[existingIndex] = config;
    } else {
      this.configs.push(config);
    }
    this.saveConfigs();
  }

  getServiceConfigs(): ServiceConfig[] {
    return [...this.configs];
  }

  removeServiceConfig(name: string, type: string): void {
    this.configs = this.configs.filter(c => !(c.name === name && c.type === type));
    this.saveConfigs();
  }

  getEnabledServices(): ServiceConfig[] {
    return this.configs.filter(config => config.enabled && config.status === 'connected');
  }

  getServiceStatus(): { total: number; connected: number; available: string[] } {
    const availableServices = ['github', 'bitbucket', 'jira', 'confluence', 'slack', 'teams'];
    const connectedServices = this.getEnabledServices();
    
    return {
      total: this.configs.length,
      connected: connectedServices.length,
      available: availableServices
    };
  }

  async searchAllServices(query: string): Promise<SearchResult[]> {
    const enabledServices = this.getEnabledServices();
    
    if (enabledServices.length === 0) {
      // Check if user wants to try demo mode
      const useDemoMode = localStorage.getItem('use_demo_mode') === 'true';
      if (useDemoMode) {
        return this.getDemoResults(query);
      }
      
      throw new Error('No services configured. Please go to Integrations → App Integrations to configure your API credentials.');
    }

    const searchPromises = enabledServices.map(service => this.searchService(service, query));
    const results = await Promise.allSettled(searchPromises);
    
    const allResults: SearchResult[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allResults.push(...result.value);
      } else {
        console.error(`Search failed for ${enabledServices[index].name}:`, result.reason);
      }
    });

    return allResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private getDemoResults(query: string): SearchResult[] {
    const demoResults: SearchResult[] = [
      {
        id: 'demo-1',
        title: `Demo: ${query} in GitHub Repository`,
        content: `This is a demo result showing how ${query} would appear in a GitHub repository. In a real implementation, this would show actual search results from your connected GitHub repositories.`,
        source: 'GitHub Demo',
        sourceType: 'github',
        author: 'demo-user',
        date: new Date().toISOString(),
        url: 'https://github.com/demo/repo',
        relevanceScore: 0.9,
        metadata: {
          type: 'repository',
          demo: true,
          language: 'TypeScript'
        }
      },
      {
        id: 'demo-2',
        title: `Demo: ${query} Issue in Jira`,
        content: `This is a demo Jira issue related to ${query}. When configured, this would show real issues from your Jira projects.`,
        source: 'Jira Demo',
        sourceType: 'jira',
        author: 'demo-reporter',
        date: new Date(Date.now() - 86400000).toISOString(),
        url: 'https://demo.atlassian.net/browse/DEMO-123',
        relevanceScore: 0.8,
        metadata: {
          type: 'issue',
          demo: true,
          priority: 'High',
          status: 'In Progress'
        }
      },
      {
        id: 'demo-3',
        title: `Demo: ${query} Documentation`,
        content: `This is a demo Confluence page about ${query}. Configure Confluence to see real documentation from your workspace.`,
        source: 'Confluence Demo',
        sourceType: 'confluence',
        author: 'demo-author',
        date: new Date(Date.now() - 172800000).toISOString(),
        url: 'https://demo.atlassian.net/wiki/spaces/DEMO/pages/123456',
        relevanceScore: 0.7,
        metadata: {
          type: 'page',
          demo: true,
          space: 'Demo Space'
        }
      }
    ];

    return demoResults;
  }

  private async searchService(config: ServiceConfig, query: string): Promise<SearchResult[]> {
    switch (config.type) {
      case 'github':
        return this.searchGitHub(config, query);
      case 'bitbucket':
        return this.searchBitbucket(config, query);
      case 'jira':
        return this.searchJira(config, query);
      case 'confluence':
        return this.searchConfluence(config, query);
      case 'slack':
        return this.searchSlack(config, query);
      case 'teams':
        return this.searchTeams(config, query);
      default:
        return [];
    }
  }

  private async searchGitHub(config: ServiceConfig, query: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    try {
      // Use Bearer authentication for fine-grained tokens (github_pat_*) or token for classic (ghp_*)
      const authHeader = config.credentials.token?.startsWith('github_pat_') 
        ? `Bearer ${config.credentials.token}`
        : `token ${config.credentials.token}`;
      
      // First, get user's accessible repositories (owned + member of)
      const userReposResponse = await fetch('https://api.github.com/user/repos?type=all&per_page=100&sort=updated', {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'PineLens-Search-App'
        },
      });

      let userRepos: any[] = [];
      if (userReposResponse.ok) {
        userRepos = await userReposResponse.json();
        // Filter user's repos by search query
        const matchingRepos = userRepos.filter((repo: any) => {
          const searchText = `${repo.full_name} ${repo.description || ''} ${repo.topics?.join(' ') || ''}`.toLowerCase();
          const queryWords = query.toLowerCase().split(/\s+/);
          return queryWords.some(word => searchText.includes(word));
        });

        const relevantRepos = matchingRepos.filter((repo: any) => {
          const relevanceScore = this.calculateRelevance(query, repo.full_name + ' ' + (repo.description || ''));
          return relevanceScore > 0.2; // Lower threshold since these are user's own repos
        }).slice(0, 5); // Limit to 5 most relevant

        results.push(...relevantRepos.map((repo: any) => ({
          id: `github-repo-${repo.id}`,
          title: repo.full_name,
          content: repo.description || 'No description',
          source: config.name,
          sourceType: 'github',
          author: repo.owner.login,
          date: repo.updated_at,
          url: repo.html_url,
          relevanceScore: this.calculateRelevance(query, repo.full_name + ' ' + (repo.description || '')),
          metadata: {
            type: 'repository',
            language: repo.language,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            private: repo.private,
            permissions: repo.permissions
          }
        })));
      }

      // Search issues in user's accessible repositories only
      let repoQuery = '';
      if (userRepos.length > 0) {
        const repoNames = userRepos.slice(0, 10).map((repo: any) => `repo:${repo.full_name}`).join(' ');
        repoQuery = repoNames ? ` ${repoNames}` : '';
      }

      const issuesResponse = await fetch(`https://api.github.com/search/issues?q=${encodeURIComponent(`${query} type:issue${repoQuery}`)}&sort=relevance&per_page=8`, {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'PineLens-Search-App'
        },
      });

      if (issuesResponse.ok) {
        const issuesData = await issuesResponse.json();
        const relevantIssues = issuesData.items?.filter((issue: any) => {
          const relevanceScore = this.calculateRelevance(query, issue.title + ' ' + (issue.body || ''));
          return relevanceScore > 0.2;
        }) || [];

        results.push(...relevantIssues.map((issue: any) => ({
          id: `github-issue-${issue.id}`,
          title: issue.title,
          content: issue.body || 'No description',
          source: config.name,
          sourceType: 'github',
          author: issue.user.login,
          date: issue.updated_at,
          url: issue.html_url,
          relevanceScore: this.calculateRelevance(query, issue.title + ' ' + (issue.body || '')),
          metadata: {
            type: 'issue',
            state: issue.state,
            number: issue.number,
            labels: issue.labels?.map((l: any) => l.name) || [],
            assignees: issue.assignees?.map((a: any) => a.login) || []
          }
        })));
      }

      // Search pull requests in user's accessible repositories only
      const prResponse = await fetch(`https://api.github.com/search/issues?q=${encodeURIComponent(`${query} type:pr${repoQuery}`)}&sort=relevance&per_page=5`, {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'PineLens-Search-App'
        },
      });

      if (prResponse.ok) {
        const prData = await prResponse.json();
        const relevantPRs = prData.items?.filter((pr: any) => {
          const relevanceScore = this.calculateRelevance(query, pr.title + ' ' + (pr.body || ''));
          return relevanceScore > 0.2;
        }) || [];

        results.push(...relevantPRs.map((pr: any) => ({
          id: `github-pr-${pr.id}`,
          title: `PR: ${pr.title}`,
          content: pr.body || 'No description',
          source: config.name,
          sourceType: 'github',
          author: pr.user.login,
          date: pr.updated_at,
          url: pr.html_url,
          relevanceScore: this.calculateRelevance(query, pr.title + ' ' + (pr.body || '')),
          metadata: {
            type: 'pull_request',
            state: pr.state,
            number: pr.number,
            labels: pr.labels?.map((l: any) => l.name) || []
          }
        })));
      }

      return results;
    } catch (error) {
      console.error('GitHub search error:', error);
      throw new Error(`GitHub search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async searchBitbucket(config: ServiceConfig, query: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    try {
      // Note: Bitbucket API requires workspace name, using a default or from config
      const workspace = config.credentials.workspace || 'your-workspace';
      
      const response = await fetch(`https://api.bitbucket.org/2.0/repositories/${workspace}?q=name~"${encodeURIComponent(query)}"&pagelen=10`, {
        headers: {
          'Authorization': `Bearer ${config.credentials.token}`,
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        results.push(...(data.values?.map((repo: any) => ({
          id: `bitbucket-repo-${repo.uuid}`,
          title: repo.full_name,
          content: repo.description || 'No description',
          source: config.name,
          sourceType: 'bitbucket',
          author: repo.owner.display_name,
          date: repo.updated_on,
          url: repo.links.html.href,
          relevanceScore: this.calculateRelevance(query, repo.full_name + ' ' + (repo.description || '')),
          metadata: {
            type: 'repository',
            language: repo.language,
            size: repo.size,
            private: repo.is_private
          }
        })) || []));
      }

      return results;
    } catch (error) {
      console.error('Bitbucket search error:', error);
      throw new Error(`Bitbucket search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async searchJira(config: ServiceConfig, query: string): Promise<SearchResult[]> {
    try {
      const auth = btoa(`${config.credentials.username}:${config.credentials.password}`);
      const jql = `text ~ "${query}" ORDER BY updated DESC`;
      
      const response = await fetch(`https://${config.credentials.domain}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=20`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.issues?.map((issue: any) => ({
          id: `jira-${issue.key}`,
          title: `${issue.key}: ${issue.fields.summary}`,
          content: issue.fields.description || 'No description',
          source: config.name,
          sourceType: 'jira',
          author: issue.fields.reporter?.displayName || 'Unknown',
          date: issue.fields.updated,
          url: `https://${config.credentials.domain}/browse/${issue.key}`,
          relevanceScore: this.calculateRelevance(query, issue.fields.summary + ' ' + (issue.fields.description || '')),
          metadata: {
            type: issue.fields.issuetype?.name || 'Issue',
            status: issue.fields.status?.name,
            priority: issue.fields.priority?.name,
            assignee: issue.fields.assignee?.displayName,
            project: issue.fields.project?.name
          }
        })) || [];
      } else {
        throw new Error(`Jira API returned ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Jira search error:', error);
      throw new Error(`Jira search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async searchConfluence(config: ServiceConfig, query: string): Promise<SearchResult[]> {
    try {
      const auth = btoa(`${config.credentials.username}:${config.credentials.password}`);
      
      const response = await fetch(`https://${config.credentials.domain}/wiki/rest/api/content/search?cql=text~"${encodeURIComponent(query)}"&limit=20`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.results?.map((content: any) => ({
          id: `confluence-${content.id}`,
          title: content.title,
          content: content.excerpt || 'No excerpt available',
          source: config.name,
          sourceType: 'confluence',
          author: content.version?.by?.displayName || 'Unknown',
          date: content.version?.when || content.history?.lastUpdated?.when,
          url: `https://${config.credentials.domain}/wiki${content._links?.webui}`,
          relevanceScore: this.calculateRelevance(query, content.title + ' ' + (content.excerpt || '')),
          metadata: {
            type: content.type,
            space: content.space?.name,
            version: content.version?.number
          }
        })) || [];
      } else {
        throw new Error(`Confluence API returned ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Confluence search error:', error);
      throw new Error(`Confluence search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async searchSlack(config: ServiceConfig, query: string): Promise<SearchResult[]> {
    try {
      const response = await fetch(`https://slack.com/api/search.messages?query=${encodeURIComponent(query)}&count=20`, {
        headers: {
          'Authorization': `Bearer ${config.credentials.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          return data.messages?.matches?.map((message: any) => ({
            id: `slack-${message.ts}`,
            title: `Message in #${message.channel?.name || 'unknown'}`,
            content: message.text || 'No content',
            source: config.name,
            sourceType: 'slack',
            author: message.user || message.username || 'Unknown',
            date: new Date(parseFloat(message.ts) * 1000).toISOString(),
            url: message.permalink || '#',
            relevanceScore: this.calculateRelevance(query, message.text || ''),
            metadata: {
              type: 'message',
              channel: message.channel?.name,
              timestamp: message.ts
            }
          })) || [];
        } else {
          throw new Error(`Slack API error: ${data.error}`);
        }
      } else {
        throw new Error(`Slack API returned ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Slack search error:', error);
      throw new Error(`Slack search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async searchTeams(config: ServiceConfig, query: string): Promise<SearchResult[]> {
    try {
      // Microsoft Graph API search
      const response = await fetch(`https://graph.microsoft.com/v1.0/me/messages?$search="${encodeURIComponent(query)}"&$top=20`, {
        headers: {
          'Authorization': `Bearer ${config.credentials.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.value?.map((message: any) => ({
          id: `teams-${message.id}`,
          title: message.subject || 'Teams Message',
          content: message.bodyPreview || message.body?.content || 'No content',
          source: config.name,
          sourceType: 'teams',
          author: message.from?.emailAddress?.name || 'Unknown',
          date: message.receivedDateTime,
          url: message.webLink || '#',
          relevanceScore: this.calculateRelevance(query, (message.subject || '') + ' ' + (message.bodyPreview || '')),
          metadata: {
            type: 'message',
            hasAttachments: message.hasAttachments,
            importance: message.importance
          }
        })) || [];
      } else {
        throw new Error(`Teams API returned ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Teams search error:', error);
      throw new Error(`Teams search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private calculateRelevance(query: string, text: string): number {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const textLower = text.toLowerCase();
    
    if (queryWords.length === 0) return 0.5;

    const matches = queryWords.filter(word => textLower.includes(word));
    const exactMatches = queryWords.filter(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(text);
    });

    // Weight exact matches higher
    return Math.min((matches.length * 0.5 + exactMatches.length * 1.0) / (queryWords.length * 1.5), 1.0);
  }

  async testServiceConnection(config: ServiceConfig): Promise<boolean> {
    try {
      switch (config.type) {
        case 'github': {
          const githubResponse = await fetch('https://api.github.com/user', {
            headers: {
              'Authorization': `token ${config.credentials.token}`,
              'Accept': 'application/vnd.github.v3+json',
            },
          });
          return githubResponse.ok;
        }

        case 'bitbucket': {
          const bitbucketResponse = await fetch('https://api.bitbucket.org/2.0/user', {
            headers: {
              'Authorization': `Bearer ${config.credentials.token}`,
            },
          });
          return bitbucketResponse.ok;
        }

        case 'jira': {
          const auth = btoa(`${config.credentials.username}:${config.credentials.password}`);
          const jiraResponse = await fetch(`https://${config.credentials.domain}/rest/api/3/myself`, {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Accept': 'application/json',
            },
          });
          return jiraResponse.ok;
        }

        case 'confluence': {
          const confAuth = btoa(`${config.credentials.username}:${config.credentials.password}`);
          const confluenceResponse = await fetch(`https://${config.credentials.domain}/wiki/rest/api/user/current`, {
            headers: {
              'Authorization': `Basic ${confAuth}`,
              'Accept': 'application/json',
            },
          });
          return confluenceResponse.ok;
        }

        case 'slack': {
          const slackResponse = await fetch('https://slack.com/api/auth.test', {
            headers: {
              'Authorization': `Bearer ${config.credentials.token}`,
            },
          });
          const slackData = await slackResponse.json();
          return slackResponse.ok && slackData.ok;
        }

        case 'teams': {
          const teamsResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: {
              'Authorization': `Bearer ${config.credentials.token}`,
            },
          });
          return teamsResponse.ok;
        }

        default:
          return false;
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

export const realAPIService = new RealAPIService();
