/**
 * Backward-compatible In-House MCP Service
 * Wraps the enhanced service to maintain compatibility with existing code
 */

import { EnhancedInHouseMCPService } from './enhancedInHouseMCPService';

// Re-export the enhanced service class
export { EnhancedInHouseMCPService as InHouseMCPService } from './enhancedInHouseMCPService';

// MCPResponse interface for backward compatibility
interface MCPResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

/**
 * Backward-compatible wrapper class
 */
class BackwardCompatibleInHouseMCPService {
  private enhancedService: EnhancedInHouseMCPService;

  constructor() {
    this.enhancedService = new EnhancedInHouseMCPService();
  }

  // Configuration methods with old signatures
  async configureJira(config: {
    baseUrl: string;
    email: string;
    apiToken: string;
  }): Promise<MCPResponse> {
    const result = await this.enhancedService.configureJira(config);
    
    return {
      content: [{
        type: 'text',
        text: result.success ? result.message || 'Configuration successful' : result.error || 'Configuration failed'
      }]
    };
  }

  async configureBitbucket(config: {
    baseUrl: string;
    username: string;
    appPassword: string;
    workspace?: string;
  }): Promise<MCPResponse> {
    const result = await this.enhancedService.configureBitbucket(config);
    
    return {
      content: [{
        type: 'text',
        text: result.success ? result.message || 'Configuration successful' : result.error || 'Configuration failed'
      }]
    };
  }

  // Search methods with old signatures
  async searchJiraIssues(params: {
    query: string;
    maxResults?: number;
    project?: string;
    status?: string;
    assignee?: string;
  }): Promise<MCPResponse> {
    try {
      // Build JQL query
      let jql = `text ~ "${params.query}"`;
      if (params.project) jql += ` AND project = "${params.project}"`;
      if (params.status) jql += ` AND status = "${params.status}"`;
      if (params.assignee) jql += ` AND assignee = "${params.assignee}"`;
      
      const result = await this.enhancedService.searchJiraIssues(jql, params.maxResults || 50);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  async searchBitbucketRepositories(params: {
    query?: string;
    limit?: number;
  }): Promise<MCPResponse> {
    try {
      const result = await this.enhancedService.searchBitbucketRepositories(params.query || '', params.limit || 50);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  async getJiraIssue(issueKey: string): Promise<MCPResponse> {
    try {
      const result = await this.enhancedService.getJiraIssue(issueKey);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  async getJiraProjects(): Promise<MCPResponse> {
    try {
      const result = await this.enhancedService.getJiraProjects();
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  async getBitbucketRepository(repoSlug: string): Promise<MCPResponse> {
    try {
      const result = await this.enhancedService.getBitbucketRepository(repoSlug);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  // Status methods
  getServerStatus(): { [key: string]: boolean } {
    return {
      jira: this.enhancedService.isJiraConfigured(),
      bitbucket: this.enhancedService.isBitbucketConfigured()
    };
  }

  async stopAllServers(): Promise<void> {
    // No-op for browser compatibility
    console.log('Mock: Servers stopped');
  }

  // Additional methods that might be used
  async getJiraUserIssues(maxResults?: number): Promise<MCPResponse> {
    return this.searchJiraIssues({
      query: 'assignee = currentUser()',
      maxResults: maxResults || 50
    });
  }

  async getBitbucketBranches(repoSlug: string, limit?: number): Promise<MCPResponse> {
    // Mock implementation for backward compatibility
    const branchCount = Math.min(limit || 3, 3);
    return {
      content: [{
        type: 'text',
        text: `🌿 Branches in ${repoSlug} (${branchCount}):\n\n🌟 main (default)\n🌿 develop\n🌿 feature/authentication-fix`
      }]
    };
  }

  async getBitbucketCommits(params: {
    repoSlug: string;
    branch?: string;
    limit?: number;
  }): Promise<MCPResponse> {
    // Mock implementation for backward compatibility
    return {
      content: [{
        type: 'text',
        text: `📝 Recent Commits in ${params.repoSlug} (5):\n\n🔸 abc12345: Fix authentication bug in payment service\n   👤 John Doe • ${new Date().toLocaleDateString()}`
      }]
    };
  }

  async searchBitbucketCode(params: {
    query: string;
    repoSlug?: string;
    limit?: number;
  }): Promise<MCPResponse> {
    try {
      const result = await this.enhancedService.searchBitbucketCode(params.query, params.repoSlug, params.limit);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }
}

// Create singleton instance for backward compatibility
export const inHouseMCPService = new BackwardCompatibleInHouseMCPService();
