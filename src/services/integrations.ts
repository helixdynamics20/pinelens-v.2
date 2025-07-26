/**
 * Service Integration APIs
 * Handles communication with various enterprise services
 */

import { MCPServerConfig } from './mcpClient';

export interface ServiceCredentials {
  type: 'token' | 'basic' | 'oauth' | 'api_key' | 'bot_token';
  token?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface SearchQuery {
  query: string;
  filters?: {
    dateRange?: { start: string; end: string };
    author?: string;
    project?: string;
    status?: string;
    type?: string;
    labels?: string[];
  };
  limit?: number;
  offset?: number;
}

export interface ServiceSearchResult {
  id: string;
  title: string;
  content: string;
  url: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, any>;
}

// Abstract base class for service integrations
abstract class ServiceIntegration {
  protected baseUrl: string;
  protected credentials: ServiceCredentials;
  protected config: MCPServerConfig;

  constructor(config: MCPServerConfig, credentials: ServiceCredentials) {
    this.baseUrl = config.serverUrl.replace(/\/$/, '');
    this.credentials = credentials;
    this.config = config;
  }

  abstract search(query: SearchQuery): Promise<ServiceSearchResult[]>;
  abstract testConnection(): Promise<boolean>;
  abstract getHeaders(): Record<string, string>;

  protected async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...this.getHeaders(),
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers,
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response;
  }
}

// GitHub Integration
export class GitHubIntegration extends ServiceIntegration {
  getHeaders(): Record<string, string> {
    return {
      'Authorization': `token ${this.credentials.token}`,
      'Accept': 'application/vnd.github.v3+json'
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/user');
      return response.ok;
    } catch {
      return false;
    }
  }

  async search(query: SearchQuery): Promise<ServiceSearchResult[]> {
    const results: ServiceSearchResult[] = [];

    try {
      // Search repositories
      const repoResults = await this.searchRepositories(query);
      results.push(...repoResults);

      // Search issues
      const issueResults = await this.searchIssues(query);
      results.push(...issueResults);

      // Search pull requests
      const prResults = await this.searchPullRequests(query);
      results.push(...prResults);

      // Search code (if specific repo is specified)
      if (query.filters?.project) {
        const codeResults = await this.searchCode(query);
        results.push(...codeResults);
      }

      return results.slice(0, query.limit || 20);
    } catch (error) {
      console.error('GitHub search failed:', error);
      // Don't return empty array, throw error to let caller handle it
      throw new Error(`GitHub API search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async searchRepositories(query: SearchQuery): Promise<ServiceSearchResult[]> {
    const searchQuery = this.buildGitHubQuery(query.query, 'repo');
    const response = await this.makeRequest(`/search/repositories?q=${encodeURIComponent(searchQuery)}&per_page=${query.limit || 20}`);
    const data = await response.json();

    return data.items?.map((repo: any) => ({
      id: `repo-${repo.id}`,
      title: repo.full_name,
      content: repo.description || '',
      url: repo.html_url,
      author: repo.owner.login,
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      metadata: {
        type: 'repository',
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        private: repo.private
      }
    })) || [];
  }

  private async searchIssues(query: SearchQuery): Promise<ServiceSearchResult[]> {
    const searchQuery = this.buildGitHubQuery(query.query, 'issue');
    const response = await this.makeRequest(`/search/issues?q=${encodeURIComponent(searchQuery)}&per_page=${query.limit || 20}`);
    const data = await response.json();

    return data.items?.map((issue: any) => ({
      id: `issue-${issue.id}`,
      title: issue.title,
      content: issue.body || '',
      url: issue.html_url,
      author: issue.user.login,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      metadata: {
        type: 'issue',
        state: issue.state,
        labels: issue.labels.map((l: any) => l.name),
        assignees: issue.assignees.map((a: any) => a.login),
        milestone: issue.milestone?.title
      }
    })) || [];
  }

  private async searchPullRequests(query: SearchQuery): Promise<ServiceSearchResult[]> {
    const searchQuery = this.buildGitHubQuery(query.query, 'pr');
    const response = await this.makeRequest(`/search/issues?q=${encodeURIComponent(searchQuery)}&per_page=${query.limit || 20}`);
    const data = await response.json();

    return data.items?.filter((item: any) => item.pull_request).map((pr: any) => ({
      id: `pr-${pr.id}`,
      title: pr.title,
      content: pr.body || '',
      url: pr.html_url,
      author: pr.user.login,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      metadata: {
        type: 'pull_request',
        state: pr.state,
        labels: pr.labels.map((l: any) => l.name),
        assignees: pr.assignees.map((a: any) => a.login),
        draft: pr.draft
      }
    })) || [];
  }

  private async searchCode(query: SearchQuery): Promise<ServiceSearchResult[]> {
    const repo = query.filters?.project;
    if (!repo) return [];

    const searchQuery = `${query.query} repo:${repo}`;
    const response = await this.makeRequest(`/search/code?q=${encodeURIComponent(searchQuery)}&per_page=${query.limit || 20}`);
    const data = await response.json();

    return data.items?.map((code: any) => ({
      id: `code-${code.sha}`,
      title: `${code.name} - ${code.repository.full_name}`,
      content: code.text_matches?.[0]?.fragment || '',
      url: code.html_url,
      author: code.repository.owner.login,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        type: 'code',
        path: code.path,
        repository: code.repository.full_name,
        language: code.name.split('.').pop()
      }
    })) || [];
  }

  private buildGitHubQuery(query: string, type: 'repo' | 'issue' | 'pr'): string {
    let searchQuery = query;
    
    if (this.config.workspace) {
      searchQuery += ` org:${this.config.workspace}`;
    }

    if (type === 'issue') {
      searchQuery += ' is:issue';
    } else if (type === 'pr') {
      searchQuery += ' is:pr';
    }

    return searchQuery;
  }
}

// Jira Integration
export class JiraIntegration extends ServiceIntegration {
  getHeaders(): Record<string, string> {
    const auth = btoa(`${this.credentials.username}:${this.credentials.password}`);
    return {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json'
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/rest/api/3/myself');
      return response.ok;
    } catch {
      return false;
    }
  }

  async search(query: SearchQuery): Promise<ServiceSearchResult[]> {
    try {
      const jql = this.buildJiraQuery(query);
      const response = await this.makeRequest(`/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=${query.limit || 50}`);
      const data = await response.json();

      return data.issues?.map((issue: any) => ({
        id: `jira-${issue.key}`,
        title: `${issue.key}: ${issue.fields.summary}`,
        content: issue.fields.description || '',
        url: `${this.baseUrl}/browse/${issue.key}`,
        author: issue.fields.reporter?.displayName || 'Unknown',
        createdAt: issue.fields.created,
        updatedAt: issue.fields.updated,
        metadata: {
          type: 'jira_issue',
          key: issue.key,
          status: issue.fields.status?.name,
          priority: issue.fields.priority?.name,
          assignee: issue.fields.assignee?.displayName,
          project: issue.fields.project?.name,
          issueType: issue.fields.issuetype?.name,
          labels: issue.fields.labels || []
        }
      })) || [];
    } catch (error) {
      console.error('Jira search failed:', error);
      return [];
    }
  }

  private buildJiraQuery(query: SearchQuery): string {
    let jql = `text ~ "${query.query}"`;

    if (query.filters?.project) {
      jql += ` AND project = "${query.filters.project}"`;
    }

    if (query.filters?.status) {
      jql += ` AND status = "${query.filters.status}"`;
    }

    if (query.filters?.author) {
      jql += ` AND reporter = "${query.filters.author}"`;
    }

    if (query.filters?.dateRange) {
      jql += ` AND created >= "${query.filters.dateRange.start}" AND created <= "${query.filters.dateRange.end}"`;
    }

    jql += ' ORDER BY updated DESC';

    return jql;
  }
}

// Confluence Integration
export class ConfluenceIntegration extends ServiceIntegration {
  getHeaders(): Record<string, string> {
    const auth = btoa(`${this.credentials.username}:${this.credentials.apiKey}`);
    return {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json'
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/rest/api/user/current');
      return response.ok;
    } catch {
      return false;
    }
  }

  async search(query: SearchQuery): Promise<ServiceSearchResult[]> {
    try {
      const cql = this.buildConfluenceQuery(query);
      const response = await this.makeRequest(`/rest/api/content/search?cql=${encodeURIComponent(cql)}&limit=${query.limit || 25}`);
      const data = await response.json();

      return data.results?.map((content: any) => ({
        id: `confluence-${content.id}`,
        title: content.title,
        content: content.excerpt || content.body?.storage?.value || '',
        url: `${this.baseUrl}${content._links.webui}`,
        author: content.history?.createdBy?.displayName || 'Unknown',
        createdAt: content.history?.createdDate || new Date().toISOString(),
        updatedAt: content.version?.when || new Date().toISOString(),
        metadata: {
          type: 'confluence_page',
          space: content.space?.name,
          contentType: content.type,
          version: content.version?.number,
          status: content.status
        }
      })) || [];
    } catch (error) {
      console.error('Confluence search failed:', error);
      return [];
    }
  }

  private buildConfluenceQuery(query: SearchQuery): string {
    let cql = `text ~ "${query.query}"`;

    if (query.filters?.project) {  // Using project as space name
      cql += ` AND space = "${query.filters.project}"`;
    }

    if (query.filters?.author) {
      cql += ` AND creator = "${query.filters.author}"`;
    }

    if (query.filters?.type) {
      cql += ` AND type = "${query.filters.type}"`;
    }

    return cql;
  }
}

// Slack Integration
export class SlackIntegration extends ServiceIntegration {
  getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.credentials.token}`,
      'Content-Type': 'application/json'
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/api/auth.test');
      const data = await response.json();
      return data.ok;
    } catch {
      return false;
    }
  }

  async search(query: SearchQuery): Promise<ServiceSearchResult[]> {
    try {
      const searchQuery = this.buildSlackQuery(query);
      const response = await this.makeRequest(`/api/search.messages?query=${encodeURIComponent(searchQuery)}&count=${query.limit || 20}`);
      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || 'Slack search failed');
      }

      return data.messages?.matches?.map((message: any) => ({
        id: `slack-${message.ts}`,
        title: `Message in #${message.channel?.name || 'unknown'}`,
        content: message.text || '',
        url: message.permalink || '#',
        author: message.user || message.username || 'Unknown',
        createdAt: new Date(parseFloat(message.ts) * 1000).toISOString(),
        updatedAt: new Date(parseFloat(message.ts) * 1000).toISOString(),
        metadata: {
          type: 'slack_message',
          channel: message.channel?.name,
          channelId: message.channel?.id,
          timestamp: message.ts,
          team: message.team
        }
      })) || [];
    } catch (error) {
      console.error('Slack search failed:', error);
      return [];
    }
  }

  private buildSlackQuery(query: SearchQuery): string {
    let searchQuery = query.query;

    if (query.filters?.dateRange) {
      const start = new Date(query.filters.dateRange.start);
      const end = new Date(query.filters.dateRange.end);
      searchQuery += ` after:${start.toISOString().split('T')[0]} before:${end.toISOString().split('T')[0]}`;
    }

    if (query.filters?.author) {
      searchQuery += ` from:${query.filters.author}`;
    }

    return searchQuery;
  }
}

// Microsoft Teams Integration (simplified - would need Microsoft Graph API)
export class TeamsIntegration extends ServiceIntegration {
  getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.credentials.token}`,
      'Content-Type': 'application/json'
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      // This would use Microsoft Graph API
      const response = await this.makeRequest('/v1.0/me');
      return response.ok;
    } catch {
      return false;
    }
  }

  async search(query: SearchQuery): Promise<ServiceSearchResult[]> {
    try {
      // This is a simplified implementation
      // In reality, you'd use Microsoft Graph API to search Teams messages, files, etc.
      const response = await this.makeRequest(`/v1.0/search/query`, {
        method: 'POST',
        body: JSON.stringify({
          requests: [{
            entityTypes: ['message', 'chatMessage'],
            query: {
              queryString: query.query
            },
            from: query.offset || 0,
            size: query.limit || 25
          }]
        })
      });
      
      const data = await response.json();
      
      return data.value?.[0]?.hitsContainers?.[0]?.hits?.map((hit: any) => ({
        id: `teams-${hit.hitId}`,
        title: hit.resource.subject || 'Teams Message',
        content: hit.resource.body?.content || hit.summary || '',
        url: hit.resource.webUrl || '#',
        author: hit.resource.from?.user?.displayName || 'Unknown',
        createdAt: hit.resource.createdDateTime || new Date().toISOString(),
        updatedAt: hit.resource.lastModifiedDateTime || new Date().toISOString(),
        metadata: {
          type: 'teams_message',
          chatId: hit.resource.chatId,
          channelId: hit.resource.channelIdentity?.channelId,
          importance: hit.resource.importance
        }
      })) || [];
    } catch (error) {
      console.error('Teams search failed:', error);
      return [];
    }
  }
}

// Bitbucket Integration
export class BitbucketIntegration extends ServiceIntegration {
  getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.credentials.token}`,
      'Accept': 'application/json'
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/2.0/user');
      return response.ok;
    } catch {
      return false;
    }
  }

  async search(query: SearchQuery): Promise<ServiceSearchResult[]> {
    const results: ServiceSearchResult[] = [];

    try {
      // Search repositories
      const repoResults = await this.searchRepositories(query);
      results.push(...repoResults);

      // Search issues
      const issueResults = await this.searchIssues(query);
      results.push(...issueResults);

      // Search pull requests
      const prResults = await this.searchPullRequests(query);
      results.push(...prResults);

      return results;
    } catch (error) {
      console.error('Bitbucket search failed:', error);
      return [];
    }
  }

  private async searchRepositories(query: SearchQuery): Promise<ServiceSearchResult[]> {
    const workspace = this.config.workspace || '';
    const q = `name~"${query.query}"`;
    
    const response = await this.makeRequest(`/2.0/repositories/${workspace}?q=${encodeURIComponent(q)}&pagelen=${query.limit || 20}`);
    const data = await response.json();

    return data.values?.map((repo: any) => ({
      id: `bitbucket-repo-${repo.uuid}`,
      title: repo.full_name,
      content: repo.description || '',
      url: repo.links.html.href,
      author: repo.owner.display_name,
      createdAt: repo.created_on,
      updatedAt: repo.updated_on,
      metadata: {
        type: 'repository',
        language: repo.language,
        private: repo.is_private,
        size: repo.size
      }
    })) || [];
  }

  private async searchIssues(query: SearchQuery): Promise<ServiceSearchResult[]> {
    const workspace = this.config.workspace || '';
    const repo = query.filters?.project || '';
    
    if (!repo) return [];

    const q = `title~"${query.query}" OR content~"${query.query}"`;
    const response = await this.makeRequest(`/2.0/repositories/${workspace}/${repo}/issues?q=${encodeURIComponent(q)}&pagelen=${query.limit || 20}`);
    const data = await response.json();

    return data.values?.map((issue: any) => ({
      id: `bitbucket-issue-${issue.id}`,
      title: `#${issue.id}: ${issue.title}`,
      content: issue.content?.raw || '',
      url: issue.links.html.href,
      author: issue.reporter.display_name,
      createdAt: issue.created_on,
      updatedAt: issue.updated_on,
      metadata: {
        type: 'issue',
        state: issue.state,
        priority: issue.priority,
        assignee: issue.assignee?.display_name
      }
    })) || [];
  }

  private async searchPullRequests(query: SearchQuery): Promise<ServiceSearchResult[]> {
    const workspace = this.config.workspace || '';
    const repo = query.filters?.project || '';
    
    if (!repo) return [];

    const q = `title~"${query.query}" OR description~"${query.query}"`;
    const response = await this.makeRequest(`/2.0/repositories/${workspace}/${repo}/pullrequests?q=${encodeURIComponent(q)}&pagelen=${query.limit || 20}`);
    const data = await response.json();

    return data.values?.map((pr: any) => ({
      id: `bitbucket-pr-${pr.id}`,
      title: `PR #${pr.id}: ${pr.title}`,
      content: pr.description || '',
      url: pr.links.html.href,
      author: pr.author.display_name,
      createdAt: pr.created_on,
      updatedAt: pr.updated_on,
      metadata: {
        type: 'pull_request',
        state: pr.state,
        source: pr.source.branch.name,
        destination: pr.destination.branch.name
      }
    })) || [];
  }
}

// Service Factory
export class ServiceFactory {
  static createService(
    type: string,
    config: MCPServerConfig,
    credentials: ServiceCredentials
  ): ServiceIntegration {
    switch (type) {
      case 'github':
        return new GitHubIntegration(config, credentials);
      case 'jira':
        return new JiraIntegration(config, credentials);
      case 'confluence':
        return new ConfluenceIntegration(config, credentials);
      case 'slack':
        return new SlackIntegration(config, credentials);
      case 'teams':
        return new TeamsIntegration(config, credentials);
      case 'bitbucket':
        return new BitbucketIntegration(config, credentials);
      default:
        throw new Error(`Unsupported service type: ${type}`);
    }
  }
}
