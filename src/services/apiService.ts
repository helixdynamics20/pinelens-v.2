/**
 * Enhanced API Service for Backend Integration
 * Provides improved connectivity and data processing
 */

import { SearchRequest, SearchResult } from './mcpClient';

export interface BackendConfig {
  apiUrl: string;
  apiKey?: string;
  timeout?: number;
}

export interface GPTProcessingRequest {
  query: string;
  results: SearchResult[];
  model: string;
  prompt?: string;
}

export interface GPTProcessingResponse {
  processedResults: SearchResult[];
  summary: string;
  insights: string[];
  recommendedActions: string[];
}

export interface SearchAnalytics {
  totalSearches: number;
  averageResponseTime: number;
  mostSearchedTerms: string[];
  topSources: string[];
  userSatisfactionScore: number;
}

class EnhancedAPIService {
  private config: BackendConfig;
  private analytics: SearchAnalytics;

  constructor(config: BackendConfig) {
    this.config = {
      timeout: 30000,
      ...config
    };
    
    this.analytics = {
      totalSearches: 0,
      averageResponseTime: 0,
      mostSearchedTerms: [],
      topSources: [],
      userSatisfactionScore: 0
    };
  }

  /**
   * Enhanced search with backend processing
   */
  async enhancedSearch(request: SearchRequest & { 
    searchMode?: string; 
    webRestrictions?: any; 
    aiOptions?: any; 
    appSources?: string[];
    companyPolicies?: string[];
  }): Promise<{
    results: SearchResult[];
    processingTime: number;
    totalResults: number;
    suggestedQueries: string[];
  }> {
    const startTime = Date.now();
    
    try {
      // Track analytics
      this.analytics.totalSearches++;
      
      const response = await fetch(`${this.config.apiUrl}/api/search/enhanced`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify({
          ...request,
          includeAnalytics: true,
          processingOptions: {
            rankResults: true,
            generateSummaries: true,
            extractKeywords: true,
            identifyDuplicates: true
          }
        }),
        signal: AbortSignal.timeout(this.config.timeout!)
      });

      if (!response.ok) {
        throw new Error(`Backend search failed: ${response.status}`);
      }

      const data = await response.json();
      const processingTime = Date.now() - startTime;
      
      // Update analytics
      this.updateAnalytics(processingTime, request.query, data.results);
      
      return {
        results: data.results || [],
        processingTime,
        totalResults: data.totalResults || 0,
        suggestedQueries: data.suggestedQueries || []
      };

    } catch (error) {
      console.error('Enhanced search failed:', error);
      
      // Fallback to basic processing
      return {
        results: [],
        processingTime: Date.now() - startTime,
        totalResults: 0,
        suggestedQueries: []
      };
    }
  }

  /**
   * Process search results with GPT
   */
  async processWithGPT(request: GPTProcessingRequest): Promise<GPTProcessingResponse> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/process/gpt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify({
          query: request.query,
          results: request.results,
          model: request.model,
          prompt: request.prompt || this.generateDefaultPrompt(request.query),
          options: {
            generateSummary: true,
            extractInsights: true,
            recommendActions: true,
            improveRelevance: true
          }
        }),
        signal: AbortSignal.timeout(this.config.timeout!)
      });

      if (!response.ok) {
        throw new Error(`GPT processing failed: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        processedResults: data.processedResults || request.results,
        summary: data.summary || '',
        insights: data.insights || [],
        recommendedActions: data.recommendedActions || []
      };

    } catch (error) {
      console.error('GPT processing failed:', error);
      
      // Return original results with basic processing
      return {
        processedResults: request.results,
        summary: `Found ${request.results.length} results for "${request.query}"`,
        insights: [],
        recommendedActions: []
      };
    }
  }

  /**
   * Get real-time search suggestions
   */
  async getSearchSuggestions(query: string, limit = 10): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/search/suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify({
          query,
          limit,
          includeHistory: true,
          includePopular: true
        }),
        signal: AbortSignal.timeout(5000) // Shorter timeout for suggestions
      });

      if (!response.ok) {
        throw new Error(`Suggestions failed: ${response.status}`);
      }

      const data = await response.json();
      return data.suggestions || [];

    } catch (error) {
      console.error('Search suggestions failed:', error);
      return [];
    }
  }

  /**
   * Sync data from all connected services
   */
  async syncAllServices(): Promise<{
    success: boolean;
    syncedServices: string[];
    errors: Array<{ service: string; error: string }>;
    totalItems: number;
  }> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/sync/all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify({
          fullSync: false, // Incremental sync by default
          services: ['github', 'jira', 'confluence', 'slack', 'teams', 'bitbucket']
        }),
        signal: AbortSignal.timeout(120000) // 2 minute timeout for sync
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Service sync failed:', error);
      return {
        success: false,
        syncedServices: [],
        errors: [{ service: 'all', error: error instanceof Error ? error.message : 'Unknown error' }],
        totalItems: 0
      };
    }
  }

  /**
   * Get search analytics
   */
  async getAnalytics(timeRange: 'day' | 'week' | 'month' | 'year' = 'week'): Promise<SearchAnalytics> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/analytics/${timeRange}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        signal: AbortSignal.timeout(this.config.timeout!)
      });

      if (!response.ok) {
        throw new Error(`Analytics failed: ${response.status}`);
      }

      const data = await response.json();
      return {
        totalSearches: data.totalSearches || 0,
        averageResponseTime: data.averageResponseTime || 0,
        mostSearchedTerms: data.mostSearchedTerms || [],
        topSources: data.topSources || [],
        userSatisfactionScore: data.userSatisfactionScore || 0
      };

    } catch (error) {
      console.error('Analytics failed:', error);
      return this.analytics;
    }
  }

  /**
   * Save user feedback for continuous improvement
   */
  async submitFeedback(searchId: string, feedback: {
    helpful: boolean;
    relevantResults: string[];
    irrelevantResults: string[];
    comments?: string;
    suggestedImprovement?: string;
  }): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify({
          searchId,
          feedback,
          timestamp: new Date().toISOString()
        }),
        signal: AbortSignal.timeout(10000)
      });

      return response.ok;

    } catch (error) {
      console.error('Feedback submission failed:', error);
      return false;
    }
  }

  /**
   * Test connection to backend service
   */
  async testConnection(): Promise<{
    connected: boolean;
    latency: number;
    version: string;
    features: string[];
  }> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.config.apiUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        signal: AbortSignal.timeout(5000)
      });

      const latency = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        connected: true,
        latency,
        version: data.version || 'unknown',
        features: data.features || []
      };

    } catch (error) {
      console.error('Connection test failed:', error);
      return {
        connected: false,
        latency: Date.now() - startTime,
        version: 'unknown',
        features: []
      };
    }
  }

  /**
   * Generate default GPT prompt for processing
   */
  private generateDefaultPrompt(query: string): string {
    return `
Analyze and improve the following search results for the query: "${query}"

Please:
1. Rank the results by relevance to the query
2. Generate a concise summary of the key findings
3. Extract the most important insights
4. Recommend next actions based on the content
5. Identify any gaps or missing information

Focus on practical insights that would help the user make informed decisions.
Consider the context of enterprise/business use cases.
    `.trim();
  }

  /**
   * Update local analytics
   */
  private updateAnalytics(processingTime: number, query: string, results: SearchResult[]): void {
    // Update average response time
    const totalTime = this.analytics.averageResponseTime * (this.analytics.totalSearches - 1) + processingTime;
    this.analytics.averageResponseTime = totalTime / this.analytics.totalSearches;

    // Update most searched terms
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    queryTerms.forEach(term => {
      const existingIndex = this.analytics.mostSearchedTerms.findIndex(t => t === term);
      if (existingIndex === -1 && this.analytics.mostSearchedTerms.length < 20) {
        this.analytics.mostSearchedTerms.push(term);
      }
    });

    // Update top sources
    const sources = results.map(r => r.sourceType);
    sources.forEach(source => {
      const existingIndex = this.analytics.topSources.findIndex(s => s === source);
      if (existingIndex === -1 && this.analytics.topSources.length < 10) {
        this.analytics.topSources.push(source);
      }
    });
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<BackendConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Default instance
export const apiService = new EnhancedAPIService({
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  apiKey: import.meta.env.VITE_API_KEY
});

export { EnhancedAPIService };
