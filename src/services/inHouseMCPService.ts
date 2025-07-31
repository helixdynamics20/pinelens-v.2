/**
 * In-House MCP Integration Service
 * Browser-compatible client for communicating with local MCP servers via HTTP
 */

interface MCPServerConfig {
  name: string;
  command: string;
  args: string[];
  cwd: string;
}

interface MCPMessage {
  jsonrpc: string;
  id?: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: any;
}

export class InHouseMCPService extends EventEmitter {
  private servers: Map<string, ChildProcess> = new Map();
  private messageIdCounter = 0;
  private pendingRequests: Map<string | number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();

  constructor() {
    super();
  }

  /**
   * Start the Jira MCP Server
   */
  async startJiraServer(): Promise<void> {
    const config: MCPServerConfig = {
      name: 'jira',
      command: 'node',
      args: ['jira-inhouse-server.js'],
      cwd: './mcp-servers'
    };

    await this.startServer(config);
  }

  /**
   * Start the Bitbucket MCP Server
   */
  async startBitbucketServer(): Promise<void> {
    const config: MCPServerConfig = {
      name: 'bitbucket',
      command: 'node',
      args: ['bitbucket-inhouse-server.js'],
      cwd: './mcp-servers'
    };

    await this.startServer(config);
  }

  /**
   * Start both servers
   */
  async startAllServers(): Promise<void> {
    await Promise.all([
      this.startJiraServer(),
      this.startBitbucketServer()
    ]);
  }

  /**
   * Configure Jira connection
   */
  async configureJira(config: {
    baseUrl: string;
    email: string;
    apiToken: string;
  }): Promise<any> {
    return this.callTool('jira', 'jira_configure', config);
  }

  /**
   * Configure Bitbucket connection
   */
  async configureBitbucket(config: {
    baseUrl: string;
    username: string;
    appPassword: string;
    workspace?: string;
  }): Promise<any> {
    return this.callTool('bitbucket', 'bitbucket_configure', config);
  }

  /**
   * Search Jira issues
   */
  async searchJiraIssues(params: {
    query: string;
    maxResults?: number;
    project?: string;
    status?: string;
    assignee?: string;
  }): Promise<any> {
    return this.callTool('jira', 'jira_search_issues', params);
  }

  /**
   * Get specific Jira issue
   */
  async getJiraIssue(issueKey: string): Promise<any> {
    return this.callTool('jira', 'jira_get_issue', { issueKey });
  }

  /**
   * Get Jira projects
   */
  async getJiraProjects(): Promise<any> {
    return this.callTool('jira', 'jira_get_projects', {});
  }

  /**
   * Get user's Jira issues
   */
  async getJiraUserIssues(maxResults?: number): Promise<any> {
    return this.callTool('jira', 'jira_get_user_issues', { maxResults });
  }

  /**
   * Search Bitbucket repositories
   */
  async searchBitbucketRepositories(params: {
    query?: string;
    limit?: number;
  }): Promise<any> {
    return this.callTool('bitbucket', 'bitbucket_search_repositories', params);
  }

  /**
   * Get specific Bitbucket repository
   */
  async getBitbucketRepository(repoSlug: string): Promise<any> {
    return this.callTool('bitbucket', 'bitbucket_get_repository', { repoSlug });
  }

  /**
   * Get Bitbucket repository branches
   */
  async getBitbucketBranches(repoSlug: string, limit?: number): Promise<any> {
    return this.callTool('bitbucket', 'bitbucket_get_branches', { repoSlug, limit });
  }

  /**
   * Get Bitbucket repository commits
   */
  async getBitbucketCommits(params: {
    repoSlug: string;
    branch?: string;
    limit?: number;
  }): Promise<any> {
    return this.callTool('bitbucket', 'bitbucket_get_commits', params);
  }

  /**
   * Get Bitbucket pull requests
   */
  async getBitbucketPullRequests(params: {
    repoSlug: string;
    state?: 'OPEN' | 'MERGED' | 'DECLINED';
    limit?: number;
  }): Promise<any> {
    return this.callTool('bitbucket', 'bitbucket_get_pull_requests', params);
  }

  /**
   * Search code in Bitbucket
   */
  async searchBitbucketCode(params: {
    query: string;
    repoSlug?: string;
    limit?: number;
  }): Promise<any> {
    return this.callTool('bitbucket', 'bitbucket_search_code', params);
  }

  /**
   * Get file content from Bitbucket
   */
  async getBitbucketFileContent(params: {
    repoSlug: string;
    filePath: string;
    branch?: string;
  }): Promise<any> {
    return this.callTool('bitbucket', 'bitbucket_get_file_content', params);
  }

  /**
   * Generic search method for both services
   */
  async search(query: string, service?: 'jira' | 'bitbucket'): Promise<{
    jira?: any;
    bitbucket?: any;
  }> {
    const results: any = {};

    if (!service || service === 'jira') {
      try {
        results.jira = await this.searchJiraIssues({ query });
      } catch (error) {
        console.warn('Jira search failed:', error);
      }
    }

    if (!service || service === 'bitbucket') {
      try {
        results.bitbucket = await this.searchBitbucketRepositories({ query });
      } catch (error) {
        console.warn('Bitbucket search failed:', error);
      }
    }

    return results;
  }

  /**
   * Check server status
   */
  getServerStatus(): { [key: string]: boolean } {
    const status: { [key: string]: boolean } = {};
    
    for (const [name, process] of this.servers) {
      status[name] = !process.killed && process.exitCode === null;
    }

    return status;
  }

  /**
   * Stop all servers
   */
  async stopAllServers(): Promise<void> {
    const stopPromises = Array.from(this.servers.entries()).map(([name, process]) => {
      return new Promise<void>((resolve) => {
        if (process.killed || process.exitCode !== null) {
          resolve();
          return;
        }

        process.once('exit', () => {
          console.log(`MCP Server ${name} stopped`);
          resolve();
        });

        process.kill('SIGTERM');
        
        // Force kill after 5 seconds
        setTimeout(() => {
          if (!process.killed) {
            process.kill('SIGKILL');
          }
          resolve();
        }, 5000);
      });
    });

    await Promise.all(stopPromises);
    this.servers.clear();
    this.pendingRequests.clear();
  }

  private async startServer(config: MCPServerConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`Starting MCP Server: ${config.name}`);
      
      const process = spawn(config.command, config.args, {
        cwd: config.cwd,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let isInitialized = false;

      process.stdout?.on('data', (data) => {
        try {
          const lines = data.toString().split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const message = JSON.parse(line) as MCPMessage;
              this.handleMessage(config.name, message);
            } catch (e) {
              // Not JSON, might be initialization message
              if (line.includes('running on stdio') && !isInitialized) {
                isInitialized = true;
                console.log(`MCP Server ${config.name} initialized`);
                resolve();
              }
            }
          }
        } catch (error) {
          console.error(`Error processing stdout from ${config.name}:`, error);
        }
      });

      process.stderr?.on('data', (data) => {
        const message = data.toString();
        if (message.includes('running on stdio') && !isInitialized) {
          isInitialized = true;
          console.log(`MCP Server ${config.name} initialized`);
          resolve();
        } else {
          console.error(`MCP Server ${config.name} stderr:`, message);
        }
      });

      process.on('error', (error) => {
        console.error(`MCP Server ${config.name} error:`, error);
        if (!isInitialized) {
          reject(error);
        }
      });

      process.on('exit', (code) => {
        console.log(`MCP Server ${config.name} exited with code ${code}`);
        this.servers.delete(config.name);
        this.emit('serverExit', config.name, code);
      });

      this.servers.set(config.name, process);

      // Initialize timeout
      setTimeout(() => {
        if (!isInitialized) {
          reject(new Error(`MCP Server ${config.name} failed to initialize within timeout`));
        }
      }, 10000);
    });
  }

  private async callTool(serverName: string, toolName: string, params: any): Promise<any> {
    const server = this.servers.get(serverName);
    if (!server) {
      throw new Error(`MCP Server ${serverName} not running`);
    }

    const id = ++this.messageIdCounter;
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: params
      }
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout for ${toolName}`));
      }, 30000);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      server.stdin?.write(JSON.stringify(message) + '\n');
    });
  }

  private handleMessage(serverName: string, message: MCPMessage): void {
    if (message.id && this.pendingRequests.has(message.id)) {
      const request = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);
      clearTimeout(request.timeout);

      if (message.error) {
        request.reject(new Error(message.error.message || 'MCP Error'));
      } else {
        request.resolve(message.result);
      }
    } else {
      // Handle notifications or other messages
      this.emit('message', serverName, message);
    }
  }
}

// Singleton instance
export const inHouseMCPService = new InHouseMCPService();
