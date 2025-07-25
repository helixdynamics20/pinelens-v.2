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

  emit(event: string, ...args: any[]): boolean {
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
  metadata?: Record<string, any>;
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
      // Test connection with a health check
      const healthUrl = `${server.config.serverUrl.replace(/\/$/, '')}/health`;
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getHttpHeaders(server)
        },
        // Add timeout and error handling
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (response.ok) {
        this.httpConnections.set(serverId, server.config.serverUrl);
        server.status = 'connected';
        server.lastSync = new Date().toISOString();
        this.emit('serverStatusChanged', server);
        
        // Initialize with sync
        await this.syncHttpServer(serverId, server);
      } else {
        throw new Error(`HTTP connection failed: ${response.status}`);
      }
    } catch (error) {
      console.error(`HTTP connection error for ${serverId}:`, error);
      server.status = 'error';
      this.emit('serverStatusChanged', server);
      throw error;
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
    const headers: Record<string, string> = {};
    const credentials = this.getServerCredentials(server);

    switch (credentials.type) {
      case 'token':
        headers['Authorization'] = `token ${credentials.token}`;
        break;
      case 'basic':
        const basicAuth = btoa(`${credentials.username}:${credentials.password}`);
        headers['Authorization'] = `Basic ${basicAuth}`;
        break;
      case 'oauth':
        headers['Authorization'] = `Bearer ${credentials.token}`;
        break;
      case 'api_key':
        headers['Authorization'] = `Bearer ${credentials.apiKey}`;
        break;
      case 'bot_token':
        headers['Authorization'] = `Bearer ${credentials.token}`;
        break;
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
    const results: SearchResult[] = [];
    
    // Get connected servers that match the requested sources
    const connectedServers = Array.from(this.servers.values())
      .filter(server => 
        server.status === 'connected' && 
        (request.sources.length === 0 || request.sources.includes(server.type))
      );

    if (connectedServers.length === 0) {
      console.warn('No connected servers found for search');
      return [];
    }

    // Send search requests to all connected servers
    const searchPromises = connectedServers.map(server => 
      this.httpConnections.has(server.id) 
        ? this.searchHttpServer(server.id, request)
        : this.searchServer(server.id, request)
    );

    try {
      const serverResults = await Promise.allSettled(searchPromises);
      
      serverResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(...result.value);
        } else {
          console.error(`Search failed for server ${connectedServers[index].id}:`, result.reason);
        }
      });

      // Sort by relevance score
      return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } catch (error) {
      console.error('Search error:', error);
      throw error;
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
    this.disconnectServer(serverId);
    this.servers.delete(serverId);
    this.emit('serverRemoved', serverId);
  }
}

export const mcpClient = new MCPClient();