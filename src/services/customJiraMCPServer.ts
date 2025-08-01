/**
 * Custom Jira MCP Server
 * Implements our own MCP-compatible server for Jira using API tokens
 * This gives us full control and avoids the complexity of Atlassian's Remote MCP Server
 */

export interface JiraCredentials {
  email: string;
  apiToken: string;
  serverUrl: string; // e.g., https://your-domain.atlassian.net
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

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  description?: string;
  lead?: {
    displayName: string;
    emailAddress: string;
  };
  issueTypes: Array<{
    id: string;
    name: string;
    description: string;
  }>;
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
    key?: string;
    status?: string;
    priority?: string;
    project?: string;
    issueType?: string;
    labels?: string[];
    [key: string]: any;
  };
}

export interface JiraSearchOptions {
  maxResults?: number;
  startAt?: number;
  project?: string;
  issueType?: string;
  status?: string;
  assignee?: string;
  orderBy?: 'created' | 'updated' | 'priority' | 'status';
}

class CustomJiraMCPServer {
  private credentials: JiraCredentials | null = null;
  private baseUrl = '';
  private isConnected = false;
  private eventListeners: Map<string, Function[]> = new Map();

  /**
   * Add event listener
   */
  addEventListener(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Dispatch event
   */
  private dispatchEvent(event: string, data?: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('Event listener error:', error);
        }
      });
    }
  }

  /**
   * Set Jira credentials and establish connection
   */
  async connect(credentials: JiraCredentials): Promise<boolean> {
    try {
      this.credentials = credentials;
      this.baseUrl = credentials.serverUrl.replace(/\/$/, '');
      
      console.log('🔌 Connecting to Jira MCP Server:', this.baseUrl);
      
      // Test connection
      const isValid = await this.testConnection();
      if (isValid) {
        this.isConnected = true;
        this.dispatchEvent('connected', { server: this.baseUrl });
        console.log('✅ Jira MCP Server connected successfully');
        return true;
      } else {
        throw new Error('Connection test failed');
      }
    } catch (error) {
      console.error('❌ Failed to connect to Jira MCP Server:', error);
      this.isConnected = false;
      
      // If CORS error, still mark as "connected" for demo purposes
      // This allows the UI to show the CORS error message in search results
      if (error instanceof Error && error.message.includes('CORS_ERROR')) {
        console.warn('🌐 CORS detected - enabling demo mode for error display');
        this.isConnected = true; // Allow "connection" so user sees helpful error
        this.dispatchEvent('cors-error', { server: this.baseUrl, error });
        return true;
      }
      
      this.dispatchEvent('error', { error });
      return false;
    }
  }

  /**
   * Disconnect from Jira
   */
  disconnect(): void {
    this.isConnected = false;
    this.credentials = null;
    this.baseUrl = '';
    this.dispatchEvent('disconnected');
    console.log('🔌 Jira MCP Server disconnected');
  }

  /**
   * Check if connected
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Test connection to Jira using /myself endpoint
   * This follows Atlassian's recommended approach for testing API token auth
   */
  async testConnection(): Promise<boolean> {
    if (!this.credentials) {
      return false;
    }

    try {
      console.log('🔧 Testing Jira connection...');
      const response = await this.makeRequest('/rest/api/3/myself');
      
      if (response.ok) {
        const user = await response.json();
        console.log(`✅ Jira connection successful!`);
        console.log(`   User: ${user.displayName} (${user.emailAddress})`);
        console.log(`   Account ID: ${user.accountId}`);
        console.log(`   Timezone: ${user.timeZone || 'Default'}`);
        return true;
      } else {
        const errorText = await response.text();
        console.error(`❌ Jira connection failed: ${response.status} ${response.statusText}`);
        console.error(`   Response: ${errorText}`);
        
        if (response.status === 401) {
          console.error(`   🔑 Authentication failed - check your email and API token`);
        } else if (response.status === 403) {
          console.error(`   🚫 Access forbidden - check your permissions`);
        }
        
        return false;
      }
    } catch (error) {
      console.error('❌ Jira connection test error:', error);
      
      // Enhanced CORS error detection and guidance
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('cors') || 
            errorMessage.includes('cross-origin') || 
            errorMessage.includes('access-control-allow-origin') ||
            errorMessage.includes('err_failed') ||
            errorMessage.includes('network error') ||
            errorMessage.includes('fetch')) {
          
          console.warn(`
🌐 CORS/Network Error Detected!

🔧 Solutions available:
1. ✅ CORS Proxy Server (Recommended): 
   - Make sure 'cors-proxy.cjs' is running on port 3001
   - The system will automatically use the proxy for API calls
   
2. 🌍 Browser Extensions (Development only):
   - Install "CORS Unblock" or similar extension
   - Enable it temporarily for development
   
3. 🖥️ Alternative Methods:
   - Use Jira's web interface directly
   - Consider using Postman for API testing
   - Deploy this app with a backend proxy

ℹ️  The proxy server at localhost:3001 should handle CORS issues automatically.
          `);
          
          // Throw specific CORS error
          throw new Error('CORS_ERROR: Browser security blocking direct API access. Proxy server recommended.');
        }
      }
      
      throw error;
    }
  }

  /**
   * Make authenticated request to Jira API with CORS handling
   * Implements Basic Authentication as per Atlassian documentation:
   * https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    if (!this.credentials) {
      throw new Error('Jira MCP Server not connected');
    }

    const directUrl = `${this.baseUrl}${endpoint}`;
    const proxyUrl = `http://localhost:3001/jira-proxy${endpoint}`;
    
    // Create Basic Auth header as per Atlassian docs:
    // Base64 encode "email:api_token"
    const authString = `${this.credentials.email}:${this.credentials.apiToken}`;
    const encodedAuth = btoa(authString);
    
    const requestOptions = {
      ...options,
      method: options.method || 'GET',
      headers: {
        'Authorization': `Basic ${encodedAuth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        // Important: Include X-Atlassian-Token for some operations
        'X-Atlassian-Token': 'no-check',
        ...options.headers
      },
      mode: 'cors' as RequestMode,
      credentials: 'omit' as RequestCredentials
    };

    try {
      // First, try direct request
      console.log(`🔗 Attempting direct request to: ${directUrl}`);
      const response = await fetch(directUrl, requestOptions);
      console.log(`✅ Direct request successful: ${response.status}`);
      return response;
    } catch (error) {
      console.warn(`❌ Direct request failed:`, error);
      
      try {
        // Fallback to CORS proxy
        console.log(`🔄 Attempting proxy request to: ${proxyUrl}`);
        const proxyResponse = await fetch(proxyUrl, requestOptions);
        console.log(`✅ Proxy request successful: ${proxyResponse.status}`);
        return proxyResponse;
      } catch (proxyError) {
        console.error(`❌ Both direct and proxy requests failed`);
        console.error('Direct error:', error);
        console.error('Proxy error:', proxyError);
        
        // Throw a helpful error message
        throw new Error(`CORS_ERROR: Unable to connect to Jira API. 
        
🌐 CORS proxy server should be running at http://localhost:3001
        
Please ensure:
1. The CORS proxy server is running (node cors-proxy.cjs)
2. Your Jira server URL is correct: ${this.baseUrl}
3. Your API credentials are valid

Direct error: ${error instanceof Error ? error.message : 'Unknown error'}
Proxy error: ${proxyError instanceof Error ? proxyError.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Enhanced search that supports multiple content sources
   */
  async searchContent(query: string, options: JiraSearchOptions = {}): Promise<JiraSearchResult[]> {
    if (!this.isConnected) {
      throw new Error('Jira MCP Server not connected');
    }

    try {
      console.log(`🔍 Enhanced Jira search: "${query}"`);
      
      // Search issues first
      const issueResults = await this.searchIssues(query, options);
      
      // Search projects if query seems project-related
      let projectResults: JiraSearchResult[] = [];
      if (query.toLowerCase().includes('project') || query.length < 5) {
        try {
          const projects = await this.getProjects();
          projectResults = projects
            .filter(project => 
              project.name.toLowerCase().includes(query.toLowerCase()) ||
              project.key.toLowerCase().includes(query.toLowerCase()) ||
              (project.description && project.description.toLowerCase().includes(query.toLowerCase()))
            )
            .map(project => ({
              id: project.id,
              title: `Project: ${project.name} (${project.key})`,
              content: project.description || `Jira project with ${project.issueTypes.length} issue types`,
              url: `${this.baseUrl}/projects/${project.key}`,
              author: project.lead?.displayName || 'System',
              date: new Date().toISOString(),
              relevanceScore: 0.6,
              metadata: {
                projectKey: project.key,
                projectName: project.name,
                type: 'project'
              }
            }));
        } catch (error) {
          console.warn('Could not fetch projects for search:', error);
        }
      }
      
      // Combine and sort results by relevance
      const allResults = [...issueResults, ...projectResults];
      
      // Enhanced relevance scoring
      allResults.forEach(result => {
        let score = result.relevanceScore;
        
        // Boost exact matches in title
        if (result.title.toLowerCase().includes(query.toLowerCase())) {
          score += 0.3;
        }
        
        // Boost recent items
        const daysSinceUpdate = (Date.now() - new Date(result.date).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate < 7) score += 0.2;
        else if (daysSinceUpdate < 30) score += 0.1;
        
        result.relevanceScore = Math.min(1.0, score);
      });
      
      // Sort by relevance score
      allResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      console.log(`✅ Enhanced search found ${allResults.length} results`);
      return allResults;
      
    } catch (error) {
      console.error('❌ Enhanced Jira search failed:', error);
      throw error;
    }
  }

  /**
   * Search Jira issues using JQL (Jira Query Language)
   */
  async searchIssues(query: string, options: JiraSearchOptions = {}): Promise<JiraSearchResult[]> {
    if (!this.isConnected) {
      throw new Error('Jira MCP Server not connected');
    }

    try {
      console.log(`🔍 Searching Jira issues: "${query}"`);
      
      // Build JQL query
      let jql = '';
      
      // If query looks like a JQL query, use it directly
      if (query.includes('=') || query.includes('ORDER BY') || query.includes('AND') || query.includes('OR')) {
        jql = query;
      } else {
        // Build JQL from natural language query and options
        const conditions: string[] = [];
        
        // Add text search
        if (query.trim()) {
          conditions.push(`(summary ~ "${query}" OR description ~ "${query}" OR comment ~ "${query}")`);
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
          if (options.assignee === 'currentUser()' || options.assignee === '@me') {
            conditions.push('assignee = currentUser()');
          } else {
            conditions.push(`assignee = "${options.assignee}"`);
          }
        }
        
        jql = conditions.join(' AND ');
        
        // Add ordering
        if (options.orderBy) {
          jql += ` ORDER BY ${options.orderBy} DESC`;
        } else {
          jql += ' ORDER BY updated DESC';
        }
      }

      console.log(`📝 Generated JQL: ${jql}`);

      // Execute search
      const searchParams = new URLSearchParams({
        jql,
        maxResults: (options.maxResults || 50).toString(),
        startAt: (options.startAt || 0).toString(),
        fields: 'id,key,summary,description,status,priority,assignee,reporter,project,issuetype,created,updated,labels'
      });

      const response = await this.makeRequest(`/rest/api/3/search?${searchParams}`);
      
      if (!response.ok) {
        throw new Error(`Jira search failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Found ${data.issues?.length || 0} Jira issues`);

      return this.convertIssues(data.issues || []);
    } catch (error) {
      console.error('❌ Jira search failed:', error);
      throw error;
    }
  }

  /**
   * Get user's assigned issues
   */
  async getMyIssues(options: Omit<JiraSearchOptions, 'assignee'> = {}): Promise<JiraSearchResult[]> {
    return this.searchIssues('assignee = currentUser()', {
      ...options,
      assignee: 'currentUser()'
    });
  }

  /**
   * Get recent issues (updated in last N days)
   */
  async getRecentIssues(days: number = 7, options: JiraSearchOptions = {}): Promise<JiraSearchResult[]> {
    const jql = `updated >= -${days}d ORDER BY updated DESC`;
    return this.searchIssues(jql, options);
  }

  /**
   * Get specific issue by key
   */
  async getIssue(issueKey: string): Promise<JiraSearchResult | null> {
    if (!this.isConnected) {
      throw new Error('Jira MCP Server not connected');
    }

    try {
      console.log(`🎫 Fetching issue: ${issueKey}`);
      
      const response = await this.makeRequest(`/rest/api/3/issue/${issueKey}?fields=id,key,summary,description,status,priority,assignee,reporter,project,issuetype,created,updated,labels`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Issue ${issueKey} not found`);
          return null;
        }
        throw new Error(`Failed to fetch issue: ${response.status} ${response.statusText}`);
      }

      const issue = await response.json();
      const converted = this.convertIssues([issue]);
      return converted[0] || null;
    } catch (error) {
      console.error(`❌ Failed to fetch issue ${issueKey}:`, error);
      throw error;
    }
  }

  /**
   * Get projects
   */
  async getProjects(): Promise<JiraProject[]> {
    if (!this.isConnected) {
      throw new Error('Jira MCP Server not connected');
    }

    try {
      console.log('📁 Fetching Jira projects');
      
      const response = await this.makeRequest('/rest/api/3/project');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
      }

      const projects = await response.json();
      console.log(`✅ Found ${projects.length} projects`);

      return projects.map((project: any) => ({
        id: project.id,
        key: project.key,
        name: project.name,
        description: project.description,
        lead: project.lead ? {
          displayName: project.lead.displayName,
          emailAddress: project.lead.emailAddress
        } : undefined,
        issueTypes: project.issueTypes || []
      }));
    } catch (error) {
      console.error('❌ Failed to fetch projects:', error);
      throw error;
    }
  }

  /**
   * Convert Jira issues to our search result format
   */
  private convertIssues(issues: any[]): JiraSearchResult[] {
    return issues.map(issue => {
      const summary = issue.fields?.summary || issue.summary || 'Untitled Issue';
      const description = issue.fields?.description || issue.description || '';
      const status = issue.fields?.status?.name || issue.status?.name || 'Unknown';
      const priority = issue.fields?.priority?.name || issue.priority?.name || 'Medium';
      const project = issue.fields?.project || issue.project || {};
      const assignee = issue.fields?.assignee || issue.assignee;
      const issueType = issue.fields?.issuetype || issue.issuetype || {};
      
      // Create content from description and key details
      let content = '';
      if (description) {
        // Extract plain text from description (remove Atlassian markup)
        content = this.extractPlainText(description);
      }
      content += `\n\nStatus: ${status}\nPriority: ${priority}\nProject: ${project.name || project.key}`;
      if (assignee) {
        content += `\nAssignee: ${assignee.displayName}`;
      }
      
      return {
        id: issue.id,
        title: `${issue.key}: ${summary}`,
        content: content.trim(),
        url: `${this.baseUrl}/browse/${issue.key}`,
        author: assignee?.displayName || 'Unassigned',
        date: issue.fields?.updated || issue.updated || issue.fields?.created || issue.created || new Date().toISOString(),
        relevanceScore: 0.8, // Base relevance, can be adjusted based on query matching
        metadata: {
          key: issue.key,
          status,
          priority,
          project: project.key,
          issueType: issueType.name,
          labels: issue.fields?.labels || issue.labels || [],
          projectName: project.name,
          assigneeEmail: assignee?.emailAddress
        }
      };
    });
  }

  /**
   * Extract plain text from Atlassian Document Format or other markup
   */
  private extractPlainText(content: any): string {
    if (typeof content === 'string') {
      return content;
    }
    
    if (content && typeof content === 'object') {
      // Handle Atlassian Document Format (ADF)
      if (content.content && Array.isArray(content.content)) {
        return this.extractTextFromADF(content.content);
      }
      
      // Handle other object formats
      return JSON.stringify(content);
    }
    
    return String(content || '');
  }

  /**
   * Extract text from Atlassian Document Format (ADF)
   */
  private extractTextFromADF(content: any[]): string {
    let text = '';
    
    for (const node of content) {
      if (node.type === 'paragraph' && node.content) {
        for (const textNode of node.content) {
          if (textNode.type === 'text' && textNode.text) {
            text += textNode.text + ' ';
          }
        }
        text += '\n';
      } else if (node.type === 'text' && node.text) {
        text += node.text + ' ';
      } else if (node.content) {
        text += this.extractTextFromADF(node.content) + ' ';
      }
    }
    
    return text.trim();
  }
}

export const customJiraMCPServer = new CustomJiraMCPServer();
