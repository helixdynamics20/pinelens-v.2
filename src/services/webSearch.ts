/**
 * Web Search Service
 * Handles web searches with company policy restrictions and content filtering
 */

import { RawSearchResult, WebSearchRestrictions } from './searchProcessor';

export interface WebSearchConfig {
  searchEngine: 'google' | 'bing' | 'duckduckgo';
  apiKey?: string;
  customSearchEngineId?: string;
  safeSearch: boolean;
  maxResults: number;
}

export interface CompanyPolicyConfig {
  allowedDomains: string[];
  blockedDomains: string[];
  blockedKeywords: string[];
  contentFilters: {
    excludePersonalInfo: boolean;
    excludeFinancialData: boolean;
    excludeConfidentialContent: boolean;
    requireHttps: boolean;
  };
  complianceLevel: 'strict' | 'moderate' | 'relaxed';
}

class WebSearchService {
  private config: WebSearchConfig;
  private policyConfig: CompanyPolicyConfig;

  constructor() {
    // Default configuration
    this.config = {
      searchEngine: 'duckduckgo', // Privacy-focused default
      safeSearch: true,
      maxResults: 20
    };

    // Default company policy (restrictive)
    this.policyConfig = {
      allowedDomains: [
        'stackoverflow.com',
        'github.com',
        'docs.microsoft.com',
        'developer.mozilla.org',
        'w3schools.com',
        'medium.com',
        'dev.to',
        'atlassian.com',
        'google.com',
        'wikipedia.org'
      ],
      blockedDomains: [
        'torrent',
        'pirate',
        'illegal',
        'hack',
        'crack'
      ],
      blockedKeywords: [
        'confidential',
        'internal only',
        'proprietary',
        'classified',
        'restricted'
      ],
      contentFilters: {
        excludePersonalInfo: true,
        excludeFinancialData: true,
        excludeConfidentialContent: true,
        requireHttps: true
      },
      complianceLevel: 'strict'
    };
  }

  /**
   * Perform web search with company policy restrictions
   */
  async search(query: string, restrictions?: WebSearchRestrictions): Promise<RawSearchResult[]> {
    try {
      // Apply query filtering based on company policies
      const filteredQuery = this.filterQuery(query);
      
      // Perform the actual web search
      const rawResults = await this.performWebSearch(filteredQuery);
      
      // Apply company policy filtering
      const policyFilteredResults = this.applyPolicyFiltering(rawResults, restrictions);
      
      // Apply content safety filtering
      const safeResults = this.applySafetyFiltering(policyFilteredResults);
      
      return safeResults;
    } catch (error) {
      console.error('Web search failed:', error);
      return [];
    }
  }

  /**
   * Filter search query to remove sensitive terms
   */
  private filterQuery(query: string): string {
    let filteredQuery = query;
    
    // Remove blocked keywords
    this.policyConfig.blockedKeywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      filteredQuery = filteredQuery.replace(regex, '');
    });
    
    // Clean up extra spaces
    filteredQuery = filteredQuery.replace(/\s+/g, ' ').trim();
    
    return filteredQuery;
  }

  /**
   * Perform the actual web search (simulated - replace with real API calls)
   */
  private async performWebSearch(query: string): Promise<RawSearchResult[]> {
    // This is a simulation - in production, integrate with actual search APIs
    const simulatedResults: RawSearchResult[] = [
      {
        id: 'web-1',
        title: `How to implement ${query} - Stack Overflow`,
        content: `Comprehensive guide on implementing ${query} with best practices, code examples, and community-verified solutions.`,
        source: 'Stack Overflow',
        sourceType: 'web',
        author: 'Community',
        date: new Date().toISOString(),
        url: 'https://stackoverflow.com/questions/example',
        metadata: {
          searchEngine: this.config.searchEngine,
          rank: 1
        }
      },
      {
        id: 'web-2',
        title: `${query} Documentation - Official Guide`,
        content: `Official documentation for ${query} including API references, tutorials, and implementation examples.`,
        source: 'Official Documentation',
        sourceType: 'web',
        author: 'Documentation Team',
        date: new Date().toISOString(),
        url: 'https://docs.example.com/guide',
        metadata: {
          searchEngine: this.config.searchEngine,
          rank: 2
        }
      },
      {
        id: 'web-3',
        title: `Best Practices for ${query} - Medium`,
        content: `Industry best practices and lessons learned when working with ${query}. Includes real-world examples and common pitfalls to avoid.`,
        source: 'Medium',
        sourceType: 'web',
        author: 'Tech Expert',
        date: new Date().toISOString(),
        url: 'https://medium.com/@expert/best-practices',
        metadata: {
          searchEngine: this.config.searchEngine,
          rank: 3
        }
      }
    ];

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return simulatedResults;
  }

  /**
   * Apply company policy filtering to search results
   */
  private applyPolicyFiltering(
    results: RawSearchResult[],
    restrictions?: WebSearchRestrictions
  ): RawSearchResult[] {
    return results.filter(result => {
      try {
        const url = new URL(result.url);
        const domain = url.hostname.toLowerCase();
        const content = (result.title + ' ' + result.content).toLowerCase();

        // Check against allowed domains
        if (this.policyConfig.allowedDomains.length > 0) {
          const isAllowed = this.policyConfig.allowedDomains.some(allowedDomain => 
            domain.includes(allowedDomain.toLowerCase())
          );
          if (!isAllowed) return false;
        }

        // Check against blocked domains
        const isBlocked = this.policyConfig.blockedDomains.some(blockedDomain => 
          domain.includes(blockedDomain.toLowerCase())
        );
        if (isBlocked) return false;

        // Check for blocked keywords in content
        const hasBlockedContent = this.policyConfig.blockedKeywords.some(keyword => 
          content.includes(keyword.toLowerCase())
        );
        if (hasBlockedContent) return false;

        // Apply additional restrictions if provided
        if (restrictions) {
          if (restrictions.allowedDomains && restrictions.allowedDomains.length > 0) {
            const isInAllowedList = restrictions.allowedDomains.some(allowed => 
              domain.includes(allowed.toLowerCase())
            );
            if (!isInAllowedList) return false;
          }

          if (restrictions.blockedDomains && restrictions.blockedDomains.length > 0) {
            const isInBlockedList = restrictions.blockedDomains.some(blocked => 
              domain.includes(blocked.toLowerCase())
            );
            if (isInBlockedList) return false;
          }
        }

        // HTTPS requirement
        if (this.policyConfig.contentFilters.requireHttps && url.protocol !== 'https:') {
          return false;
        }

        return true;
      } catch (error) {
        console.error('Error filtering result:', result.url, error);
        return false; // Exclude results with invalid URLs
      }
    });
  }

  /**
   * Apply additional safety filtering
   */
  private applySafetyFiltering(results: RawSearchResult[]): RawSearchResult[] {
    return results.filter(result => {
      const content = (result.title + ' ' + result.content).toLowerCase();

      // Check for potentially sensitive content based on compliance level
      if (this.policyConfig.complianceLevel === 'strict') {
        const sensitiveTerms = [
          'password', 'api key', 'secret', 'token', 'credential',
          'ssn', 'social security', 'credit card', 'personal information',
          'confidential', 'internal', 'proprietary'
        ];

        const hasSensitiveContent = sensitiveTerms.some(term => 
          content.includes(term)
        );

        if (hasSensitiveContent) return false;
      }

      return true;
    });
  }

  /**
   * Update web search configuration
   */
  updateConfig(config: Partial<WebSearchConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Update company policy configuration
   */
  updatePolicyConfig(policyConfig: Partial<CompanyPolicyConfig>) {
    this.policyConfig = { ...this.policyConfig, ...policyConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): { webSearch: WebSearchConfig; policy: CompanyPolicyConfig } {
    return {
      webSearch: { ...this.config },
      policy: { ...this.policyConfig }
    };
  }

  /**
   * Test if a URL is allowed by current policies
   */
  isUrlAllowed(url: string): boolean {
    try {
      const testResult: RawSearchResult = {
        id: 'test',
        title: 'Test',
        content: 'Test content',
        source: 'Test',
        sourceType: 'web',
        author: 'Test',
        date: new Date().toISOString(),
        url
      };

      const filtered = this.applyPolicyFiltering([testResult]);
      return filtered.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get policy violation reasons for a URL
   */
  getPolicyViolations(url: string): string[] {
    const violations: string[] = [];

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();

      // Check allowed domains
      if (this.policyConfig.allowedDomains.length > 0) {
        const isAllowed = this.policyConfig.allowedDomains.some(allowedDomain => 
          domain.includes(allowedDomain.toLowerCase())
        );
        if (!isAllowed) {
          violations.push('Domain not in allowed list');
        }
      }

      // Check blocked domains
      const blockedDomain = this.policyConfig.blockedDomains.find(blockedDomain => 
        domain.includes(blockedDomain.toLowerCase())
      );
      if (blockedDomain) {
        violations.push(`Domain contains blocked term: ${blockedDomain}`);
      }

      // HTTPS requirement
      if (this.policyConfig.contentFilters.requireHttps && urlObj.protocol !== 'https:') {
        violations.push('HTTPS required but URL uses HTTP');
      }
    } catch {
      violations.push('Invalid URL format');
    }

    return violations;
  }
}

export const webSearchService = new WebSearchService();
