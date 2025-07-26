/**
 * Enhanced MCP Integration Service
 * Handles Model Context Protocol servers for better integration
 * Use MCP when available, fallback to direct APIs
 */

export interface MCPServerConfig {
  id: string;
  name: string;
  type: 'github' | 'bitbucket' | 'jira' | 'confluence' | 'slack' | 'teams' | 'custom';
  status: 'disconnected' | 'connected' | 'connecting' | 'error';
  endpoint: string;
  credentials?: {
    token?: string;
    username?: string;
    password?: string;
  };
  capabilities: string[];
  lastSync?: string;
  itemCount?: number;
  metadata?: Record<string, any>;
}

export interface MCPSearchResult {
  id: string;
  title: string;
  content: string;
  source: string;
  sourceType: string;
  author: string;
  date: string;
  url: string;
  relevanceScore: number;
  mcpMetadata: {
    serverId: string;
    serverName: string;
    capabilities: string[];
    [key: string]: any;
  };
}

class EnhancedMCPService {
  private servers: MCPServerConfig[] = [];
  private connections: Map<string, WebSocket> = new Map();

  constructor() {
    this.loadServerConfigs();
  }

  private loadServerConfigs(): void {
    const stored = localStorage.getItem('mcp_server_configs');
    if (stored) {
      try {
        this.servers = JSON.parse(stored);
      } catch (error) {
        console.error('Failed to load MCP server configs:', error);
        this.servers = [];
      }
    }
  }

  private saveServerConfigs(): void {
    localStorage.setItem('mcp_server_configs', JSON.stringify(this.servers));
  }

  /**
   * Add or update MCP server configuration
   */
  addServer(config: MCPServerConfig): void {
    const existingIndex = this.servers.findIndex(s => s.id === config.id);
    if (existingIndex >= 0) {
      this.servers[existingIndex] = config;
    } else {
      this.servers.push(config);
    }
    this.saveServerConfigs();
  }

  /**
   * Remove MCP server
   */
  removeServer(serverId: string): void {
    const connection = this.connections.get(serverId);
    if (connection) {
      connection.close();
      this.connections.delete(serverId);
    }
    
    this.servers = this.servers.filter(s => s.id !== serverId);
    this.saveServerConfigs();
  }

  /**
   * Get all configured servers
   */
  getServers(): MCPServerConfig[] {
    return [...this.servers];
  }

  /**
   * Get connected servers
   */
  getConnectedServers(): MCPServerConfig[] {
    return this.servers.filter(s => s.status === 'connected');
  }

  /**
   * Connect to MCP server
   */
  async connectToServer(serverId: string): Promise<boolean> {
    const server = this.servers.find(s => s.id === serverId);
    if (!server) {
      throw new Error(`Server not found: ${serverId}`);
    }

    try {
      server.status = 'connecting';
      this.saveServerConfigs();

      // For HTTP-based MCP servers, test the connection
      if (server.endpoint.startsWith('http')) {
        const response = await fetch(`${server.endpoint}/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(server.credentials?.token && {
              'Authorization': `Bearer ${server.credentials.token}`
            })
          }
        });

        if (response.ok) {
          server.status = 'connected';
          server.lastSync = new Date().toISOString();
          this.saveServerConfigs();
          return true;
        }
      }

      // For WebSocket-based MCP servers
      if (server.endpoint.startsWith('ws')) {
        return new Promise((resolve, reject) => {
          const ws = new WebSocket(server.endpoint);
          
          ws.onopen = () => {
            server.status = 'connected';
            server.lastSync = new Date().toISOString();
            this.connections.set(serverId, ws);
            this.saveServerConfigs();
            resolve(true);
          };

          ws.onerror = (error) => {
            server.status = 'error';
            this.saveServerConfigs();
            reject(new Error(`WebSocket connection failed: ${error}`));
          };

          ws.onclose = () => {
            server.status = 'disconnected';
            this.connections.delete(serverId);
            this.saveServerConfigs();
          };
        });
      }

      server.status = 'error';
      this.saveServerConfigs();
      return false;

    } catch (error) {
      console.error(`Failed to connect to MCP server ${serverId}:`, error);
      server.status = 'error';
      this.saveServerConfigs();
      return false;
    }
  }

  /**
   * Disconnect from MCP server
   */
  async disconnectFromServer(serverId: string): Promise<void> {
    const server = this.servers.find(s => s.id === serverId);
    if (!server) return;

    const connection = this.connections.get(serverId);
    if (connection) {
      connection.close();
      this.connections.delete(serverId);
    }

    server.status = 'disconnected';
    this.saveServerConfigs();
  }

  /**
   * Search across connected MCP servers
   */
  async searchMCPServers(query: string, serverIds?: string[]): Promise<MCPSearchResult[]> {
    const serversToSearch = serverIds 
      ? this.servers.filter(s => serverIds.includes(s.id) && s.status === 'connected')
      : this.getConnectedServers();

    if (serversToSearch.length === 0) {
      return [];
    }

    const searchPromises = serversToSearch.map(server => this.searchServer(server, query));
    const results = await Promise.allSettled(searchPromises);

    const allResults: MCPSearchResult[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allResults.push(...result.value);
      } else {
        console.error(`MCP search failed for ${serversToSearch[index].name}:`, result.reason);
      }
    });

    return allResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Search a specific MCP server
   */
  private async searchServer(server: MCPServerConfig, query: string): Promise<MCPSearchResult[]> {
    try {
      // For HTTP-based MCP servers
      if (server.endpoint.startsWith('http')) {
        const response = await fetch(`${server.endpoint}/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(server.credentials?.token && {
              'Authorization': `Bearer ${server.credentials.token}`
            })
          },
          body: JSON.stringify({ query, limit: 20 })
        });

        if (response.ok) {
          const data = await response.json();
          return data.results?.map((result: any) => ({
            ...result,
            mcpMetadata: {
              serverId: server.id,
              serverName: server.name,
              capabilities: server.capabilities,
              endpoint: server.endpoint
            }
          })) || [];
        }
      }

      // For WebSocket-based MCP servers
      const connection = this.connections.get(server.id);
      if (connection && connection.readyState === WebSocket.OPEN) {
        return new Promise((resolve, reject) => {
          const requestId = Date.now().toString();
          
          const messageHandler = (event: MessageEvent) => {
            try {
              const response = JSON.parse(event.data);
              if (response.id === requestId) {
                connection.removeEventListener('message', messageHandler);
                const results = response.result?.results?.map((result: any) => ({
                  ...result,
                  mcpMetadata: {
                    serverId: server.id,
                    serverName: server.name,
                    capabilities: server.capabilities,
                    endpoint: server.endpoint
                  }
                })) || [];
                resolve(results);
              }
            } catch (error) {
              connection.removeEventListener('message', messageHandler);
              reject(error);
            }
          };

          connection.addEventListener('message', messageHandler);
          connection.send(JSON.stringify({
            id: requestId,
            method: 'search',
            params: { query, limit: 20 }
          }));

          // Timeout after 10 seconds
          setTimeout(() => {
            connection.removeEventListener('message', messageHandler);
            reject(new Error('MCP search timeout'));
          }, 10000);
        });
      }

      return [];

    } catch (error) {
      console.error(`MCP server search failed for ${server.name}:`, error);
      return [];
    }
  }

  /**
   * Get server capabilities
   */
  async getServerCapabilities(serverId: string): Promise<string[]> {
    const server = this.servers.find(s => s.id === serverId);
    if (!server || server.status !== 'connected') {
      return [];
    }

    try {
      if (server.endpoint.startsWith('http')) {
        const response = await fetch(`${server.endpoint}/capabilities`, {
          headers: {
            ...(server.credentials?.token && {
              'Authorization': `Bearer ${server.credentials.token}`
            })
          }
        });

        if (response.ok) {
          const data = await response.json();
          server.capabilities = data.capabilities || [];
          this.saveServerConfigs();
          return server.capabilities;
        }
      }

      return server.capabilities || [];

    } catch (error) {
      console.error(`Failed to get capabilities for ${server.name}:`, error);
      return server.capabilities || [];
    }
  }

  /**
   * Test server connection
   */
  async testConnection(config: MCPServerConfig): Promise<boolean> {
    try {
      if (config.endpoint.startsWith('http')) {
        const response = await fetch(`${config.endpoint}/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(config.credentials?.token && {
              'Authorization': `Bearer ${config.credentials.token}`
            })
          }
        });
        return response.ok;
      }

      if (config.endpoint.startsWith('ws')) {
        return new Promise((resolve) => {
          const ws = new WebSocket(config.endpoint);
          const timeout = setTimeout(() => {
            ws.close();
            resolve(false);
          }, 5000);

          ws.onopen = () => {
            clearTimeout(timeout);
            ws.close();
            resolve(true);
          };

          ws.onerror = () => {
            clearTimeout(timeout);
            resolve(false);
          };
        });
      }

      return false;

    } catch (error) {
      console.error('MCP connection test failed:', error);
      return false;
    }
  }

  /**
   * Get predefined MCP server templates
   */
  getServerTemplates(): Partial<MCPServerConfig>[] {
    return [
      {
        name: 'GitHub MCP Server',
        type: 'github',
        endpoint: 'ws://localhost:3001/mcp',
        capabilities: ['search', 'repositories', 'issues', 'pull_requests'],
        metadata: {
          description: 'Local GitHub MCP server for repository management',
          requirements: ['GitHub token', 'Local MCP server running']
        }
      },
      {
        name: 'Jira MCP Server',
        type: 'jira',
        endpoint: 'http://localhost:3002/mcp',
        capabilities: ['search', 'issues', 'projects', 'users'],
        metadata: {
          description: 'Jira MCP server for issue tracking',
          requirements: ['Jira credentials', 'MCP server setup']
        }
      },
      {
        name: 'Confluence MCP Server',
        type: 'confluence',
        endpoint: 'http://localhost:3003/mcp',
        capabilities: ['search', 'pages', 'spaces', 'content'],
        metadata: {
          description: 'Confluence MCP server for wiki content',
          requirements: ['Confluence credentials', 'MCP server setup']
        }
      },
      {
        name: 'Slack MCP Server',
        type: 'slack',
        endpoint: 'ws://localhost:3004/mcp',
        capabilities: ['search', 'messages', 'channels', 'users'],
        metadata: {
          description: 'Slack MCP server for team communication',
          requirements: ['Slack bot token', 'MCP server running']
        }
      },
      {
        name: 'Custom MCP Server',
        type: 'custom',
        endpoint: '',
        capabilities: [],
        metadata: {
          description: 'Custom MCP server configuration',
          requirements: ['Custom endpoint', 'Server-specific credentials']
        }
      }
    ];
  }

  /**
   * Sync data from MCP server
   */
  async syncServer(serverId: string): Promise<void> {
    const server = this.servers.find(s => s.id === serverId);
    if (!server || server.status !== 'connected') {
      throw new Error('Server not connected');
    }

    try {
      if (server.endpoint.startsWith('http')) {
        const response = await fetch(`${server.endpoint}/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(server.credentials?.token && {
              'Authorization': `Bearer ${server.credentials.token}`
            })
          }
        });

        if (response.ok) {
          const data = await response.json();
          server.lastSync = new Date().toISOString();
          server.itemCount = data.itemCount || server.itemCount;
          this.saveServerConfigs();
        }
      }
    } catch (error) {
      console.error(`Failed to sync MCP server ${serverId}:`, error);
      throw error;
    }
  }
}

export const enhancedMCPService = new EnhancedMCPService();
