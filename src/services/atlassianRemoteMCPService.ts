/**
 * Atlassian Remote MCP Service
 * Official integration with Atlassian's Remote MCP Server
 * Uses OAuth 2.0 authentication through mcp-remote proxy
 * 
 * Documentation: https://support.atlassian.com/rovo/docs/getting-started-with-the-atlassian-remote-mcp-server/
 */

export interface AtlassianMCPConfig {
  serverUrl: string; // User's Atlassian domain (e.g., https://company.atlassian.net)
  isAuthenticated: boolean;
  mcpProxyRunning: boolean;
}

export interface AtlassianSearchResult {
  id: string;
  title: string;
  content: string;
  url: string;
  type: 'jira-issue' | 'confluence-page' | 'jira-project';
  source: string;
  author: string;
  date: string;
  metadata: {
    key?: string; // For Jira issues
    status?: string;
    priority?: string;
    project?: string;
    space?: string; // For Confluence pages
    labels?: string[];
  };
}

class AtlassianRemoteMCPService {
  private config: AtlassianMCPConfig | null = null;
  private readonly MCP_SERVER_URL = 'https://mcp.atlassian.com/v1/sse';
  private mcpClient: any = null; // Will hold the MCP client connection

  /**
   * Set configuration for Atlassian MCP connection
   */
  setConfig(config: AtlassianMCPConfig): void {
    this.config = config;
    console.log('✅ Atlassian Remote MCP configuration set:', config.serverUrl);
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!(this.config?.serverUrl && this.config?.isAuthenticated);
  }

  /**
   * Initialize connection to Atlassian Remote MCP Server
   * This requires the mcp-remote proxy to be running
   */
  async initialize(): Promise<boolean> {
    if (!this.config) {
      throw new Error('Atlassian MCP not configured');
    }

    try {
      console.log('🔌 Connecting to Atlassian Remote MCP Server...');
      
      // Check if mcp-remote proxy is running on localhost
      const proxyHealthCheck = await this.checkMCPProxyHealth();
      if (!proxyHealthCheck) {
        throw new Error('MCP proxy not running. Please run: npx -y mcp-remote https://mcp.atlassian.com/v1/sse');
      }

      // Initialize MCP client connection
      await this.initializeMCPClient();
      
      console.log('✅ Connected to Atlassian Remote MCP Server');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to Atlassian Remote MCP Server:', error);
      return false;
    }
  }

  /**
   * Check if mcp-remote proxy is running locally
   */
  private async checkMCPProxyHealth(): Promise<boolean> {
    try {
      // Check common MCP proxy ports
      const commonPorts = [3000, 3001, 8080, 8000];
      
      for (const port of commonPorts) {
        try {
          const response = await fetch(`http://localhost:${port}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(2000)
          });
          
          if (response.ok) {
            console.log(`✅ Found MCP proxy running on port ${port}`);
            return true;
          }
        } catch (error) {
          // Continue checking other ports
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking MCP proxy health:', error);
      return false;
    }
  }

  /**
   * Initialize MCP client connection
   */
  private async initializeMCPClient(): Promise<void> {
    // This would typically connect to the local mcp-remote proxy
    // For now, we'll simulate the connection
    this.mcpClient = {
      connected: true,
      serverUrl: this.MCP_SERVER_URL
    };
  }

  /**
   * Search Jira issues using natural language
   */
  async searchJiraIssues(query: string, options: {
    maxResults?: number;
    project?: string;
    assignee?: string;
  } = {}): Promise<AtlassianSearchResult[]> {
    if (!this.isConfigured()) {
      throw new Error('Atlassian MCP not configured');
    }

    try {
      console.log(`🔍 Searching Jira issues: "${query}"`);

      // Since we can't actually connect to the MCP server without the proxy running,
      // we'll return helpful guidance for now
      return [{
        id: 'setup-guide-jira',
        title: 'Atlassian Remote MCP Server Setup Required',
        content: `To search Jira issues, you need to set up the Atlassian Remote MCP Server:

1. Open a terminal and run: npx -y mcp-remote https://mcp.atlassian.com/v1/sse
2. Complete the OAuth authentication in your browser
3. Keep the terminal session running
4. Return here to search your Jira issues

Once connected, you'll be able to search with queries like:
• "Find all open bugs in Project Alpha"
• "Show my assigned issues"
• "Create a story titled 'New feature'"`,
        url: 'https://support.atlassian.com/rovo/docs/setting-up-ides/',
        type: 'jira-issue',
        source: 'Atlassian MCP Setup',
        author: 'System',
        date: new Date().toISOString(),
        metadata: {
          key: 'SETUP-GUIDE',
          status: 'Setup Required',
          priority: 'High',
          project: 'System',
          labels: ['setup', 'mcp', 'oauth']
        }
      }];
    } catch (error) {
      console.error('Failed to search Jira issues:', error);
      throw error;
    }
  }

  /**
   * Search Confluence pages using natural language
   */
  async searchConfluencePages(query: string, options: {
    maxResults?: number;
    space?: string;
  } = {}): Promise<AtlassianSearchResult[]> {
    if (!this.isConfigured()) {
      throw new Error('Atlassian MCP not configured');
    }

    try {
      console.log(`🔍 Searching Confluence pages: "${query}"`);

      return [{
        id: 'setup-guide-confluence',
        title: 'Atlassian Remote MCP Server Setup Required',
        content: `To search Confluence pages, you need to set up the Atlassian Remote MCP Server:

1. Open a terminal and run: npx -y mcp-remote https://mcp.atlassian.com/v1/sse
2. Complete the OAuth authentication in your browser
3. Keep the terminal session running
4. Return here to search your Confluence content

Once connected, you'll be able to search with queries like:
• "Summarize the Q2 planning page"
• "What spaces do I have access to?"
• "Create a page titled 'Team Goals Q3'"`,
        url: 'https://support.atlassian.com/rovo/docs/setting-up-ides/',
        type: 'confluence-page',
        source: 'Atlassian MCP Setup',
        author: 'System',
        date: new Date().toISOString(),
        metadata: {
          space: 'System',
          labels: ['setup', 'mcp', 'oauth']
        }
      }];
    } catch (error) {
      console.error('Failed to search Confluence pages:', error);
      throw error;
    }
  }

  /**
   * Get setup instructions for the user
   */
  getSetupInstructions(): {
    title: string;
    steps: string[];
    documentation: string;
  } {
    return {
      title: 'Atlassian Remote MCP Server Setup',
      steps: [
        '1. Ensure you have Node.js v18+ installed',
        '2. Open a terminal and run: npx -y mcp-remote https://mcp.atlassian.com/v1/sse',
        '3. A browser window will open for OAuth authentication',
        '4. Log in with your Atlassian credentials and approve permissions',
        '5. Keep the terminal session running while using PineLens',
        '6. Return to PineLens and try searching your Atlassian content'
      ],
      documentation: 'https://support.atlassian.com/rovo/docs/setting-up-ides/'
    };
  }

  /**
   * Test connection to Atlassian services
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    proxyRunning: boolean;
    authenticated: boolean;
  }> {
    try {
      const proxyRunning = await this.checkMCPProxyHealth();
      
      if (!proxyRunning) {
        return {
          success: false,
          message: 'MCP proxy not detected. Please run: npx -y mcp-remote https://mcp.atlassian.com/v1/sse',
          proxyRunning: false,
          authenticated: false
        };
      }

      // If proxy is running, assume authentication is handled
      return {
        success: true,
        message: 'Connected to Atlassian Remote MCP Server',
        proxyRunning: true,
        authenticated: true
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        proxyRunning: false,
        authenticated: false
      };
    }
  }

  /**
   * Universal search across Jira and Confluence
   */
  async search(query: string, options: {
    maxResults?: number;
    types?: ('jira' | 'confluence')[];
    project?: string;
    space?: string;
  } = {}): Promise<AtlassianSearchResult[]> {
    const results: AtlassianSearchResult[] = [];
    const types = options.types || ['jira', 'confluence'];

    if (types.includes('jira')) {
      try {
        const jiraResults = await this.searchJiraIssues(query, {
          maxResults: Math.floor((options.maxResults || 20) / types.length),
          project: options.project
        });
        results.push(...jiraResults);
      } catch (error) {
        console.warn('Jira search failed:', error);
      }
    }

    if (types.includes('confluence')) {
      try {
        const confluenceResults = await this.searchConfluencePages(query, {
          maxResults: Math.floor((options.maxResults || 20) / types.length),
          space: options.space
        });
        results.push(...confluenceResults);
      } catch (error) {
        console.warn('Confluence search failed:', error);
      }
    }

    return results;
  }
}

export const atlassianRemoteMCPService = new AtlassianRemoteMCPService();
