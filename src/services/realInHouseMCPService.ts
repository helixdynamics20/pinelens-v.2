/**
 * Real In-House MCP Service
 * Connects to actual MCP servers for production use
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';

interface MCPResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

interface MCPServer {
  process: ChildProcess | null;
  connected: boolean;
  name: string;
}

export class RealInHouseMCPService {
  private jiraServer: MCPServer = { process: null, connected: false, name: 'jira' };
  private bitbucketServer: MCPServer = { process: null, connected: false, name: 'bitbucket' };
  
  private jiraConfig: {
    baseUrl: string;
    email: string;
    apiToken: string;
  } | null = null;

  private bitbucketConfig: {
    baseUrl: string;
    username: string;
    appPassword: string;
    workspace?: string;
  } | null = null;

  /**
   * Start the MCP servers
   */
  async startAllServers(): Promise<void> {
    const mcpServersPath = path.join(process.cwd(), 'mcp-servers');
    
    try {
      // Start Jira server
      console.log('Starting Jira MCP server...');
      this.jiraServer.process = spawn('node', ['jira-inhouse-server.js'], {
        cwd: mcpServersPath,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      this.jiraServer.process.on('error', (error) => {
        console.error('Jira server error:', error);
        this.jiraServer.connected = false;
      });
      
      this.jiraServer.process.on('spawn', () => {
        console.log('Jira MCP server started successfully');
        this.jiraServer.connected = true;
      });

      // Start Bitbucket server
      console.log('Starting Bitbucket MCP server...');
      this.bitbucketServer.process = spawn('node', ['bitbucket-inhouse-server.js'], {
        cwd: mcpServersPath,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      this.bitbucketServer.process.on('error', (error) => {
        console.error('Bitbucket server error:', error);
        this.bitbucketServer.connected = false;
      });
      
      this.bitbucketServer.process.on('spawn', () => {
        console.log('Bitbucket MCP server started successfully');
        this.bitbucketServer.connected = true;
      });

      // Wait a moment for servers to initialize
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      throw new Error(`Failed to start MCP servers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stop all MCP servers
   */
  async stopAllServers(): Promise<void> {
    if (this.jiraServer.process) {
      this.jiraServer.process.kill();
      this.jiraServer.connected = false;
    }
    
    if (this.bitbucketServer.process) {
      this.bitbucketServer.process.kill();
      this.bitbucketServer.connected = false;
    }
  }

  /**
   * Configure Jira connection with real credentials
   */
  async configureJira(config: {
    baseUrl: string;
    email: string;
    apiToken: string;
  }): Promise<MCPResponse> {
    if (!this.jiraServer.connected) {
      throw new Error('Jira server is not running. Please start servers first.');
    }

    this.jiraConfig = config;

    try {
      // Send configuration to the actual MCP server
      const response = await this.sendMCPRequest(this.jiraServer, 'jira_configure', {
        baseUrl: config.baseUrl,
        email: config.email,
        apiToken: config.apiToken
      });

      return response;
    } catch (error) {
      this.jiraConfig = null;
      throw error;
    }
  }

  /**
   * Configure Bitbucket connection with real credentials
   */
  async configureBitbucket(config: {
    baseUrl: string;
    username: string;
    appPassword: string;
    workspace?: string;
  }): Promise<MCPResponse> {
    if (!this.bitbucketServer.connected) {
      throw new Error('Bitbucket server is not running. Please start servers first.');
    }

    this.bitbucketConfig = config;

    try {
      // Send configuration to the actual MCP server
      const response = await this.sendMCPRequest(this.bitbucketServer, 'bitbucket_configure', {
        baseUrl: config.baseUrl,
        username: config.username,
        appPassword: config.appPassword,
        workspace: config.workspace
      });

      return response;
    } catch (error) {
      this.bitbucketConfig = null;
      throw error;
    }
  }

  /**
   * Search Jira issues with real API
   */
  async searchJiraIssues(params: {
    query: string;
    maxResults?: number;
    project?: string;
    status?: string;
    assignee?: string;
  }): Promise<MCPResponse> {
    if (!this.jiraServer.connected || !this.jiraConfig) {
      throw new Error('Jira not configured. Please configure Jira first.');
    }

    // Convert search query to JQL
    let jql = `text ~ "${params.query}"`;
    
    if (params.project) {
      jql += ` AND project = "${params.project}"`;
    }
    if (params.status) {
      jql += ` AND status = "${params.status}"`;
    }
    if (params.assignee) {
      jql += ` AND assignee = "${params.assignee}"`;
    }

    return await this.sendMCPRequest(this.jiraServer, 'jira_search_issues', {
      jql: jql,
      maxResults: params.maxResults || 50
    });
  }

  /**
   * Get specific Jira issue
   */
  async getJiraIssue(issueKey: string): Promise<MCPResponse> {
    if (!this.jiraServer.connected) {
      throw new Error('Jira not configured. Please configure Jira first.');
    }

    return await this.sendMCPRequest(this.jiraServer, 'jira_get_issue', {
      issueKey: issueKey
    });
  }

  /**
   * Get Jira projects
   */
  async getJiraProjects(): Promise<MCPResponse> {
    if (!this.jiraServer.connected) {
      throw new Error('Jira not configured. Please configure Jira first.');
    }

    return await this.sendMCPRequest(this.jiraServer, 'jira_get_projects', {});
  }

  /**
   * Search Bitbucket repositories
   */
  async searchBitbucketRepositories(params: {
    query?: string;
    limit?: number;
  }): Promise<MCPResponse> {
    if (!this.bitbucketServer.connected || !this.bitbucketConfig) {
      throw new Error('Bitbucket not configured. Please configure Bitbucket first.');
    }

    return await this.sendMCPRequest(this.bitbucketServer, 'bitbucket_search_repositories', {
      query: params.query,
      limit: params.limit || 50
    });
  }

  /**
   * Get server status
   */
  getServerStatus(): { [key: string]: boolean } {
    return {
      jira: this.jiraServer.connected,
      bitbucket: this.bitbucketServer.connected
    };
  }

  /**
   * Send request to MCP server via stdin/stdout
   */
  private async sendMCPRequest(server: MCPServer, tool: string, args: any): Promise<MCPResponse> {
    return new Promise((resolve, reject) => {
      if (!server.process || !server.connected) {
        reject(new Error(`${server.name} server is not running`));
        return;
      }

      const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: tool,
          arguments: args
        }
      };

      const timeout = setTimeout(() => {
        reject(new Error(`Timeout waiting for ${server.name} server response`));
      }, 30000);

      let responseData = '';
      
      const onData = (data: Buffer) => {
        responseData += data.toString();
        
        try {
          const lines = responseData.split('\n').filter(line => line.trim());
          for (const line of lines) {
            const response = JSON.parse(line);
            if (response.id === request.id) {
              clearTimeout(timeout);
              server.process!.stdout!.off('data', onData);
              
              if (response.error) {
                reject(new Error(response.error.message || 'MCP server error'));
              } else {
                resolve(response.result);
              }
              return;
            }
          }
        } catch (error) {
          // Still collecting response data
        }
      };

      server.process.stdout!.on('data', onData);
      server.process.stdin!.write(JSON.stringify(request) + '\n');
    });
  }
}

// Create singleton instance for Node.js environment
export const realInHouseMCPService = new RealInHouseMCPService();
