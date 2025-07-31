/**
 * Jira MCP Service - Direct Atlassian API Integration
 * Provides MCP-compatible interface for Jira search functionality
 */

export interface JiraCredentials {
  email: string;
  apiToken: string;
  serverUrl: string; // e.g., https://your-domain.atlassian.net
}

export interface JiraSearchOptions {
  maxResults?: number;
  startAt?: number;
  project?: string;
  issueType?: string;
  status?: string;
  assignee?: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  description?: string;
  status: {
    name: string;
    statusCategory: {
      name: string;
    };
  };
  priority?: {
    name: string;
  };
  assignee?: {
    displayName: string;
    emailAddress: string;
  };
  reporter?: {
    displayName: string;
    emailAddress: string;
  };
  project: {
    key: string;
    name: string;
  };
  issuetype: {
    name: string;
  };
  created: string;
  updated: string;
  labels: string[];
}

export interface JiraSearchResult {
  id: string;
  title: string;
  content: string;
  url: string;
  author: string;
  date: string;
  relevanceScore: number;
  metadata: {
    key: string;
    status: string;
    priority?: string;
    assignee?: string;
    project: string;
    issueType: string;
    labels: string[];
    statusCategory: string;
  };
}

class JiraMCPService {
  private credentials: JiraCredentials | null = null;
  private baseUrl = '';

  /**
   * Set Jira credentials
   */
  setCredentials(credentials: JiraCredentials): void {
    // Validate credentials
    if (!credentials.email || !credentials.apiToken || !credentials.serverUrl) {
      throw new Error('Invalid Jira credentials: email, apiToken, and serverUrl are required');
    }

    // Ensure serverUrl doesn't end with slash and is properly formatted
    let serverUrl = credentials.serverUrl.trim();
    if (serverUrl.endsWith('/')) {
      serverUrl = serverUrl.slice(0, -1);
    }
    
    // Ensure it starts with https:// if no protocol specified
    if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
      serverUrl = `https://${serverUrl}`;
    }

    // Remove any wiki paths that might be in the URL
    serverUrl = serverUrl.replace('/wiki', '');

    this.credentials = {
      ...credentials,
      serverUrl,
      email: credentials.email.trim(),
      apiToken: credentials.apiToken.trim()
    };
    
    this.baseUrl = serverUrl;
    console.log('✅ Jira credentials configured for:', serverUrl);
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!(this.credentials?.email && this.credentials?.apiToken && this.credentials?.serverUrl);
  }

  /**
   * Get authentication headers
   */
  private getAuthHeaders(): Record<string, string> {
    if (!this.credentials) {
      throw new Error('Jira credentials not configured');
    }

    const auth = btoa(`${this.credentials.email}:${this.credentials.apiToken}`);
    return {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  }

  /**
   * Make authenticated request to Jira API
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    if (!this.credentials) {
      throw new Error('Jira credentials not configured');
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`Jira API error: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  /**
   * Test connection to Jira
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        console.error('Jira not configured');
        return false;
      }

      console.log('Testing Jira connection to:', this.baseUrl);
      const response = await this.makeRequest('/rest/api/3/myself');
      
      if (response.ok) {
        const user = await response.json();
        console.log('✅ Jira connection successful. User:', user.displayName);
        return true;
      } else {
        console.error('❌ Jira connection failed:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('❌ Jira connection test failed:', error);
      return false;
    }
  }

  /**
   * Build JQL (Jira Query Language) from search parameters
   */
  private buildJQL(query: string, options: JiraSearchOptions = {}): string {
    const conditions: string[] = [];

    // Text search
    if (query.trim()) {
      conditions.push(`text ~ "${query}"`);
    }

    // Add filters
    if (options.project) {
      conditions.push(`project = "${options.project}"`);
    }

    if (options.issueType) {
      conditions.push(`issuetype = "${options.issueType}"`);
    }

    if (options.status) {
      conditions.push(`status = "${options.status}"`);
    }

    if (options.assignee) {
      if (options.assignee === '@me' && this.credentials) {
        conditions.push(`assignee = "${this.credentials.email}"`);
      } else {
        conditions.push(`assignee = "${options.assignee}"`);
      }
    }

    // Default to show recent issues if no conditions
    if (conditions.length === 0) {
      conditions.push('created >= -30d'); // Last 30 days
    }

    const jql = conditions.join(' AND ') + ' ORDER BY updated DESC';
    console.log('🔍 Generated JQL:', jql);
    return jql;
  }

  /**
   * Search Jira issues
   */
  async searchIssues(query: string, options: JiraSearchOptions = {}): Promise<JiraSearchResult[]> {
    if (!this.isConfigured()) {
      throw new Error('Jira service not configured');
    }

    try {
      const jql = this.buildJQL(query, options);
      const maxResults = options.maxResults || 50;
      const startAt = options.startAt || 0;

      const endpoint = `/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&startAt=${startAt}&fields=key,summary,description,status,priority,assignee,reporter,project,issuetype,created,updated,labels`;
      
      console.log('🌐 Jira API request:', `${this.baseUrl}${endpoint}`);
      
      const response = await this.makeRequest(endpoint);
      const data = await response.json();

      console.log(`📊 Jira API response: ${data.total} total issues, ${data.issues?.length || 0} returned`);

      if (!data.issues || data.issues.length === 0) {
        return [];
      }

      return data.issues.map((issue: JiraIssue) => this.transformIssueToSearchResult(issue, query));
    } catch (error) {
      console.error('Jira search failed:', error);
      throw new Error(`Jira search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Transform Jira issue to search result format
   */
  private transformIssueToSearchResult(issue: JiraIssue, query: string): JiraSearchResult {
    const issueUrl = `${this.baseUrl}/browse/${issue.key}`;
    const content = issue.description || issue.summary;
    
    // Calculate relevance score
    const relevanceScore = this.calculateRelevance(issue.summary, content, query);

    return {
      id: `jira-${issue.key}`,
      title: `${issue.key}: ${issue.summary}`,
      content: content,
      url: issueUrl,
      author: issue.reporter?.displayName || 'Unknown',
      date: issue.updated,
      relevanceScore,
      metadata: {
        key: issue.key,
        status: issue.status.name,
        priority: issue.priority?.name,
        assignee: issue.assignee?.displayName,
        project: issue.project.name,
        issueType: issue.issuetype.name,
        labels: issue.labels || [],
        statusCategory: issue.status.statusCategory.name
      }
    };
  }

  /**
   * Calculate relevance score for search results
   */
  private calculateRelevance(title: string, content: string, query: string): number {
    if (!query.trim()) return 0.5;

    const queryLower = query.toLowerCase();
    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();

    let score = 0;

    // Title matches
    if (titleLower.includes(queryLower)) {
      score += 0.8;
    }

    // Content matches
    if (contentLower.includes(queryLower)) {
      score += 0.4;
    }

    // Word matches
    const queryWords = queryLower.split(' ').filter(word => word.length > 2);
    const titleWords = titleLower.split(' ');
    const contentWords = contentLower.split(' ');

    queryWords.forEach(word => {
      if (titleWords.includes(word)) score += 0.3;
      if (contentWords.includes(word)) score += 0.1;
    });

    // Normalize to 0-1 range
    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * Get my assigned issues
   */
  async getMyIssues(options: JiraSearchOptions = {}): Promise<JiraSearchResult[]> {
    return this.searchIssues('', { ...options, assignee: '@me' });
  }

  /**
   * Get recent issues
   */
  async getRecentIssues(days: number = 7, options: JiraSearchOptions = {}): Promise<JiraSearchResult[]> {
    const query = `created >= -${days}d OR updated >= -${days}d`;
    return this.searchIssues(query, options);
  }

  /**
   * Search issues by project
   */
  async searchProjectIssues(projectKey: string, query: string = '', options: JiraSearchOptions = {}): Promise<JiraSearchResult[]> {
    return this.searchIssues(query, { ...options, project: projectKey });
  }

  /**
   * Get issue by key
   */
  async getIssue(issueKey: string): Promise<JiraSearchResult | null> {
    try {
      const endpoint = `/rest/api/3/issue/${issueKey}`;
      const response = await this.makeRequest(endpoint);
      const issue: JiraIssue = await response.json();
      
      return this.transformIssueToSearchResult(issue, issueKey);
    } catch (error) {
      console.error(`Failed to get Jira issue ${issueKey}:`, error);
      return null;
    }
  }

  /**
   * Get available projects
   */
  async getProjects(): Promise<Array<{ key: string; name: string }>> {
    try {
      const response = await this.makeRequest('/rest/api/3/project');
      const projects = await response.json();
      
      return projects.map((project: { key: string; name: string }) => ({
        key: project.key,
        name: project.name
      }));
    } catch (error) {
      console.error('Failed to get Jira projects:', error);
      return [];
    }
  }
}

export const jiraMCPService = new JiraMCPService();
