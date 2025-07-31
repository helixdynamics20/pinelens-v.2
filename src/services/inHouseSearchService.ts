/**
 * Enhanced Unified Search Service with In-House MCP Integration
 * Extends the existing search to include Jira and Bitbucket MCP servers
 */

import { inHouseMCPService } from './inHouseMCPService';
import { UnifiedSearchResult } from './unifiedSearchService';

export interface InHouseSearchResult {
  source: 'jira' | 'bitbucket';
  title: string;
  content: string;
  url?: string;
  metadata: {
    type: string;
    status?: string;
    project?: string;
    assignee?: string;
    author?: string;
    created?: string;
    updated?: string;
    [key: string]: unknown;
  };
}

export class InHouseSearchService {
  /**
   * Search across both Jira and Bitbucket
   */
  async search(query: string, options?: {
    services?: ('jira' | 'bitbucket')[];
    maxResults?: number;
  }): Promise<InHouseSearchResult[]> {
    const services = options?.services || ['jira', 'bitbucket'];
    const maxResults = options?.maxResults || 20;
    const results: InHouseSearchResult[] = [];

    // Search Jira
    if (services.includes('jira')) {
      try {
        const jiraResult = await inHouseMCPService.searchJiraIssues({
          query,
          maxResults: Math.floor(maxResults / services.length)
        });

        if (jiraResult?.content?.[0]?.text) {
          const jiraResults = this.parseJiraResults(jiraResult.content[0].text, query);
          results.push(...jiraResults);
        }
      } catch (error) {
        console.warn('Jira search failed:', error);
      }
    }

    // Search Bitbucket
    if (services.includes('bitbucket')) {
      try {
        const bitbucketResult = await inHouseMCPService.searchBitbucketRepositories({
          query,
          limit: Math.floor(maxResults / services.length)
        });

        if (bitbucketResult?.content?.[0]?.text) {
          const bitbucketResults = this.parseBitbucketResults(bitbucketResult.content[0].text, query);
          results.push(...bitbucketResults);
        }
      } catch (error) {
        console.warn('Bitbucket search failed:', error);
      }
    }

    return results;
  }

  /**
   * Search specific Jira project
   */
  async searchJiraProject(query: string, project: string): Promise<InHouseSearchResult[]> {
    try {
      const result = await inHouseMCPService.searchJiraIssues({
        query,
        project,
        maxResults: 50
      });

      if (result?.content?.[0]?.text) {
        return this.parseJiraResults(result.content[0].text, query);
      }
    } catch (error) {
      console.error('Jira project search failed:', error);
    }

    return [];
  }

  /**
   * Search specific Bitbucket repository
   */
  async searchBitbucketRepository(query: string, repoSlug?: string): Promise<InHouseSearchResult[]> {
    try {
      let result;
      
      if (repoSlug) {
        // Search code within specific repository
        result = await inHouseMCPService.searchBitbucketCode({
          query,
          repoSlug,
          limit: 50
        });
      } else {
        // Search repositories
        result = await inHouseMCPService.searchBitbucketRepositories({
          query,
          limit: 50
        });
      }

      if (result?.content?.[0]?.text) {
        return this.parseBitbucketResults(result.content[0].text, query);
      }
    } catch (error) {
      console.error('Bitbucket repository search failed:', error);
    }

    return [];
  }

  /**
   * Get user's assigned Jira issues
   */
  async getUserJiraIssues(): Promise<InHouseSearchResult[]> {
    try {
      const result = await inHouseMCPService.getJiraUserIssues(50);
      
      if (result?.content?.[0]?.text) {
        return this.parseJiraResults(result.content[0].text, 'assignee = currentUser()');
      }
    } catch (error) {
      console.error('Failed to get user Jira issues:', error);
    }

    return [];
  }

  /**
   * Convert in-house results to unified search format
   */
  convertToUnifiedResults(inHouseResults: InHouseSearchResult[]): UnifiedSearchResult[] {
    return inHouseResults.map(result => ({
      id: `${result.source}-${Date.now()}-${Math.random()}`,
      title: result.title,
      content: result.content,
      url: result.url || '',
      source: result.source,
      type: 'integration',
      relevanceScore: 0.8, // Default high relevance for direct matches
      metadata: {
        ...result.metadata,
        searchSource: `${result.source}-mcp`
      }
    }));
  }

  private parseJiraResults(text: string, query: string): InHouseSearchResult[] {
    const results: InHouseSearchResult[] = [];
    
    // Parse the formatted Jira response
    const lines = text.split('\n');
    let currentIssue: Partial<InHouseSearchResult> | null = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Match issue pattern: 🎫 ISSUE-KEY: Title
      const issueMatch = trimmedLine.match(/^🎫\s+([A-Z]+-\d+):\s+(.+)$/);
      if (issueMatch) {
        // Save previous issue if exists
        if (currentIssue) {
          results.push(currentIssue as InHouseSearchResult);
        }
        
        currentIssue = {
          source: 'jira',
          title: `${issueMatch[1]}: ${issueMatch[2]}`,
          content: issueMatch[2],
          metadata: {
            type: 'issue',
            issueKey: issueMatch[1]
          }
        };
        continue;
      }
      
      // Parse metadata lines
      if (currentIssue) {
        const statusMatch = trimmedLine.match(/📊\s+Status:\s+([^|]+)/);
        if (statusMatch) {
          currentIssue.metadata!.status = statusMatch[1].trim();
        }
        
        const assigneeMatch = trimmedLine.match(/👤\s+Assignee:\s+([^|]+)/);
        if (assigneeMatch) {
          currentIssue.metadata!.assignee = assigneeMatch[1].trim();
        }
        
        const projectMatch = trimmedLine.match(/Project:\s+(.+)$/);
        if (projectMatch) {
          currentIssue.metadata!.project = projectMatch[1].trim();
        }
        
        const urlMatch = trimmedLine.match(/🔗\s+(.+)$/);
        if (urlMatch) {
          currentIssue.url = urlMatch[1].trim();
        }
      }
    }
    
    // Add the last issue
    if (currentIssue) {
      results.push(currentIssue as InHouseSearchResult);
    }
    
    return results;
  }

  private parseBitbucketResults(text: string, query: string): InHouseSearchResult[] {
    const results: InHouseSearchResult[] = [];
    
    // Parse the formatted Bitbucket response
    const lines = text.split('\n');
    let currentRepo: Partial<InHouseSearchResult> | null = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Match repository pattern: 📦 RepoName
      const repoMatch = trimmedLine.match(/^📦\s+(.+)$/);
      if (repoMatch) {
        // Save previous repo if exists
        if (currentRepo) {
          results.push(currentRepo as InHouseSearchResult);
        }
        
        currentRepo = {
          source: 'bitbucket',
          title: repoMatch[1],
          content: '',
          metadata: {
            type: 'repository'
          }
        };
        continue;
      }
      
      // Parse metadata lines
      if (currentRepo) {
        const descMatch = trimmedLine.match(/📝\s+(.+)$/);
        if (descMatch) {
          currentRepo.content = descMatch[1];
        }
        
        const langMatch = trimmedLine.match(/💻\s+Language:\s+(.+)$/);
        if (langMatch) {
          currentRepo.metadata!.language = langMatch[1];
        }
        
        const visMatch = trimmedLine.match(/🔒\s+(.+)$/);
        if (visMatch) {
          currentRepo.metadata!.visibility = visMatch[1];
        }
        
        const urlMatch = trimmedLine.match(/🔗\s+(.+)$/);
        if (urlMatch) {
          currentRepo.url = urlMatch[1].trim();
        }
      }
    }
    
    // Add the last repo
    if (currentRepo) {
      results.push(currentRepo as InHouseSearchResult);
    }
    
    return results;
  }

  /**
   * Check if in-house services are available
   */
  isAvailable(): boolean {
    const status = inHouseMCPService.getServerStatus();
    return status.jira || status.bitbucket;
  }

  /**
   * Get connection status
   */
  getStatus(): {
    jira: boolean;
    bitbucket: boolean;
    available: boolean;
  } {
    const status = inHouseMCPService.getServerStatus();
    return {
      jira: status.jira || false,
      bitbucket: status.bitbucket || false,
      available: this.isAvailable()
    };
  }
}

// Singleton instance
export const inHouseSearchService = new InHouseSearchService();
