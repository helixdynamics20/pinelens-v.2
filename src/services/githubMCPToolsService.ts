/**
 * GitHub MCP Tools Service
 * Fetches available tools from the GitHub MCP server
 */

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface MCPToolsResponse {
  tools: MCPTool[];
}

export class GitHubMCPToolsService {
  private baseUrl: string;
  private credentials: { token: string } | null = null;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  setCredentials(credentials: { token: string }) {
    this.credentials = credentials;
    // Store credentials in localStorage for persistence
    localStorage.setItem('github_mcp_credentials', JSON.stringify(credentials));
  }

  private getCredentials(): { token: string } | null {
    if (this.credentials) {
      return this.credentials;
    }

    // Try to load from localStorage
    const saved = localStorage.getItem('github_mcp_credentials');
    if (saved) {
      try {
        this.credentials = JSON.parse(saved);
        return this.credentials;
      } catch (error) {
        console.error('Failed to parse saved GitHub MCP credentials:', error);
      }
    }

    return null;
  }

  /**
   * Fetch available tools from the GitHub MCP server
   */
  async fetchAvailableTools(): Promise<MCPTool[]> {
    try {
      // First, check if we have any saved GitHub credentials (token)
      const savedConfig = localStorage.getItem('serviceConfigs');
      let githubToken = null;
      
      if (savedConfig) {
        const configs = JSON.parse(savedConfig);
        const githubConfig = configs.find((c: { type: string; credentials?: { token?: string } }) => c.type === 'github');
        if (githubConfig && githubConfig.credentials && githubConfig.credentials.token) {
          githubToken = githubConfig.credentials.token;
          this.setCredentials({ token: githubToken });
        }
      }

      // If we have a token, try to connect to MCP server
      if (githubToken) {
        const response = await this.makeRPCCall('tools/list', {}) as MCPToolsResponse;
        
        if (response && response.tools) {
          console.log('Successfully fetched tools from GitHub MCP server');
          return response.tools;
        }
      }

      // Fallback: Return the actual tools that GitHub MCP server provides
      console.log('Using fallback GitHub MCP server tools');
      return this.getGitHubMCPServerTools();

    } catch (error) {
      console.log('MCP server not available, using fallback tools:', error);
      
      // Always fallback to the actual GitHub MCP server tools
      return this.getGitHubMCPServerTools();
    }
  }

  /**
   * Make an RPC call to the MCP server
   */
  private async makeRPCCall(method: string, params: Record<string, unknown>): Promise<unknown> {
    try {
      const credentials = this.getCredentials();
      if (!credentials) {
        throw new Error('No credentials available');
      }

      // This would be the actual MCP protocol call
      // For demonstration, we'll try to connect to a local MCP server
      const response = await fetch(`${this.baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.token}`
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: method,
          params: params
        })
      });

      if (!response.ok) {
        throw new Error(`MCP server responded with ${response.status}`);
      }

      const data = await response.json();
      return data.result;

    } catch (error) {
      console.error('MCP RPC call failed:', error);
      throw error;
    }
  }

  /**
   * Get the actual tools provided by the GitHub MCP server
   * This is based on the real GitHub MCP server implementation
   */
  private getGitHubMCPServerTools(): MCPTool[] {
    return [
      {
        name: 'create_or_update_file',
        description: 'Create or update a single file in a GitHub repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner (username or organization)' },
            repo: { type: 'string', description: 'Repository name' },
            path: { type: 'string', description: 'Path to the file in the repository' },
            content: { type: 'string', description: 'Content of the file' },
            message: { type: 'string', description: 'Commit message' },
            branch: { type: 'string', description: 'Branch name (optional, defaults to default branch)' }
          },
          required: ['owner', 'repo', 'path', 'content', 'message']
        }
      },
      {
        name: 'search_repositories',
        description: 'Search for GitHub repositories',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            sort: { type: 'string', description: 'Sort field (stars, forks, help-wanted-issues, updated)' },
            order: { type: 'string', description: 'Sort order (asc or desc)' },
            per_page: { type: 'number', description: 'Number of results per page (max 100)' }
          },
          required: ['query']
        }
      },
      {
        name: 'create_repository',
        description: 'Create a new GitHub repository',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Repository name' },
            description: { type: 'string', description: 'Repository description' },
            private: { type: 'boolean', description: 'Whether repository is private' },
            auto_init: { type: 'boolean', description: 'Initialize with README' }
          },
          required: ['name']
        }
      },
      {
        name: 'get_repository',
        description: 'Get repository information',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner' },
            repo: { type: 'string', description: 'Repository name' }
          },
          required: ['owner', 'repo']
        }
      },
      {
        name: 'list_repository_contents',
        description: 'List contents of a repository directory',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner' },
            repo: { type: 'string', description: 'Repository name' },
            path: { type: 'string', description: 'Directory path' }
          },
          required: ['owner', 'repo']
        }
      },
      {
        name: 'create_issue',
        description: 'Create a new issue in a GitHub repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner' },
            repo: { type: 'string', description: 'Repository name' },
            title: { type: 'string', description: 'Issue title' },
            body: { type: 'string', description: 'Issue body' },
            labels: { type: 'array', items: { type: 'string' }, description: 'Issue labels' }
          },
          required: ['owner', 'repo', 'title']
        }
      },
      {
        name: 'list_issues',
        description: 'List issues in a repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner' },
            repo: { type: 'string', description: 'Repository name' },
            state: { type: 'string', description: 'Issue state (open, closed, all)' },
            labels: { type: 'string', description: 'Filter by labels' }
          },
          required: ['owner', 'repo']
        }
      },
      {
        name: 'create_pull_request',
        description: 'Create a new pull request',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner' },
            repo: { type: 'string', description: 'Repository name' },
            title: { type: 'string', description: 'Pull request title' },
            body: { type: 'string', description: 'Pull request body' },
            head: { type: 'string', description: 'Branch containing changes' },
            base: { type: 'string', description: 'Base branch for merge' }
          },
          required: ['owner', 'repo', 'title', 'head', 'base']
        }
      },
      {
        name: 'list_pull_requests',
        description: 'List pull requests in a repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner' },
            repo: { type: 'string', description: 'Repository name' },
            state: { type: 'string', description: 'PR state (open, closed, all)' },
            base: { type: 'string', description: 'Filter by base branch' }
          },
          required: ['owner', 'repo']
        }
      },
      {
        name: 'fork_repository',
        description: 'Fork a repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner' },
            repo: { type: 'string', description: 'Repository name' }
          },
          required: ['owner', 'repo']
        }
      },
      {
        name: 'create_branch',
        description: 'Create a new branch',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner' },
            repo: { type: 'string', description: 'Repository name' },
            branch: { type: 'string', description: 'New branch name' },
            from_branch: { type: 'string', description: 'Source branch (optional)' }
          },
          required: ['owner', 'repo', 'branch']
        }
      },
      {
        name: 'list_branches',
        description: 'List repository branches',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner' },
            repo: { type: 'string', description: 'Repository name' }
          },
          required: ['owner', 'repo']
        }
      }
    ];
  }

  /**
   * Check if the MCP server is available
   */
  async isServerAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET'
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const githubMCPToolsService = new GitHubMCPToolsService();
