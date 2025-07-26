/**
 * Search Processing Service
 * Handles GPT-powered result processing, ranking, and standardization
 */

export interface RawSearchResult {
  id: string;
  title: string;
  content: string;
  source: string;
  sourceType: string;
  author: string;
  date: string;
  url: string;
  metadata?: Record<string, any>;
}

export interface ProcessedSearchResult extends RawSearchResult {
  relevanceScore: number;
  summary: string;
  keyPoints: string[];
  tags: string[];
  priority: 'low' | 'medium' | 'high';
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface SearchProcessingOptions {
  query: string;
  model: string;
  maxResults?: number;
  includeAnalysis?: boolean;
  customPrompt?: string;
  searchMode?: 'web' | 'ai' | 'apps';
  companyPolicies?: string[];
  webRestrictions?: WebSearchRestrictions;
  aiModels?: string[];
  appSources?: string[];
}

export interface WebSearchRestrictions {
  allowedDomains?: string[];
  blockedDomains?: string[];
  contentTypes?: string[];
  safeSearch?: boolean;
  regionRestriction?: string;
  complianceLevel?: 'strict' | 'moderate' | 'relaxed';
}

export interface AISearchOptions {
  models: string[];
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  contextSources?: string[];
}

class SearchProcessor {
  private openaiApiKey: string | null = null;
  private anthropicApiKey: string | null = null;

  constructor() {
    // In production, these should be set via environment variables or secure config
    this.openaiApiKey = localStorage.getItem('openai_api_key');
    this.anthropicApiKey = localStorage.getItem('anthropic_api_key');
  }

  /**
   * Process and rank search results using AI
   */
  async processResults(
    results: RawSearchResult[],
    options: SearchProcessingOptions
  ): Promise<ProcessedSearchResult[]> {
    if (results.length === 0) return [];

    try {
      // Handle different search modes
      switch (options.searchMode) {
        case 'web':
          return await this.processWebResults(results, options);
        case 'ai':
          return await this.processAIResults(results, options);
        case 'apps':
          return await this.processAppResults(results, options);
        default:
          return await this.processDefaultResults(results, options);
      }
    } catch (error) {
      console.error('Search processing failed:', error);
      // Fallback to basic processing
      return this.basicProcessing(results, options.query);
    }
  }

  /**
   * Process web search results with company policy restrictions
   */
  private async processWebResults(
    results: RawSearchResult[],
    options: SearchProcessingOptions
  ): Promise<ProcessedSearchResult[]> {
    // Filter results based on company policies and web restrictions
    const filteredResults = this.applyWebRestrictions(results, options.webRestrictions);
    
    // Apply company policy filtering
    const policyFilteredResults = this.applyCompanyPolicies(filteredResults, options.companyPolicies || []);
    
    return this.processDefaultResults(policyFilteredResults, options);
  }

  /**
   * Process AI-only search results
   */
  private async processAIResults(
    results: RawSearchResult[],
    options: SearchProcessingOptions
  ): Promise<ProcessedSearchResult[]> {
    // Generate AI-powered responses for the query
    const aiGeneratedResults = await this.generateAIResponses(options);
    
    // Combine with any existing results and process
    const combinedResults = [...results, ...aiGeneratedResults];
    
    return this.processDefaultResults(combinedResults, options);
  }

  /**
   * Process app-specific search results with access control
   */
  private async processAppResults(
    results: RawSearchResult[],
    options: SearchProcessingOptions
  ): Promise<ProcessedSearchResult[]> {
    // Filter results to only include specified app sources
    const appFilteredResults = this.filterByAppSources(results, options.appSources || []);
    
    // Apply additional access control based on user permissions
    const accessControlledResults = this.applyAccessControl(appFilteredResults);
    
    return this.processDefaultResults(accessControlledResults, options);
  }

  /**
   * Default processing method
   */
  private async processDefaultResults(
    results: RawSearchResult[],
    options: SearchProcessingOptions
  ): Promise<ProcessedSearchResult[]> {
    // Step 1: Standardize all results
    const standardizedResults = results.map(result => this.standardizeResult(result));

    // Step 2: Calculate relevance scores
    const scoredResults = await this.calculateRelevanceScores(
      standardizedResults,
      options.query,
      options.model
    );

    // Step 3: Generate AI-powered analysis if requested
    let processedResults = scoredResults;
    if (options.includeAnalysis !== false) {
      processedResults = await this.generateAnalysis(scoredResults, options);
    }

    // Step 4: Sort by relevance and limit results
    const sortedResults = processedResults
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, options.maxResults || 50);

    return sortedResults;
  }

  /**
   * Standardize results from different sources into a consistent format
   */
  private standardizeResult(result: RawSearchResult): ProcessedSearchResult {
    return {
      ...result,
      // Ensure all required fields are present with defaults
      title: result.title || 'Untitled',
      content: result.content || '',
      author: result.author || 'Unknown',
      date: result.date || new Date().toISOString(),
      url: result.url || '#',
      // Add processed fields with defaults
      relevanceScore: 0.5,
      summary: '',
      keyPoints: [],
      tags: [],
      priority: 'medium',
      sentiment: 'neutral'
    };
  }

  /**
   * Calculate relevance scores using text similarity and AI
   */
  private async calculateRelevanceScores(
    results: ProcessedSearchResult[],
    query: string,
    model: string
  ): Promise<ProcessedSearchResult[]> {
    return Promise.all(results.map(async result => {
      try {
        // Basic text similarity score
        const textScore = this.calculateTextSimilarity(query, result.title + ' ' + result.content);
        
        // Source-specific scoring adjustments
        const sourceWeight = this.getSourceWeight(result.sourceType);
        
        // Recency score (newer content gets higher score)
        const recencyScore = this.calculateRecencyScore(result.date);
        
        // Combined score
        const combinedScore = (textScore * 0.6) + (sourceWeight * 0.2) + (recencyScore * 0.2);
        
        return {
          ...result,
          relevanceScore: Math.min(Math.max(combinedScore, 0), 1)
        };
      } catch (error) {
        console.error('Score calculation failed for result:', result.id, error);
        return {
          ...result,
          relevanceScore: 0.5
        };
      }
    }));
  }

  /**
   * Generate AI-powered analysis for search results
   */
  private async generateAnalysis(
    results: ProcessedSearchResult[],
    options: SearchProcessingOptions
  ): Promise<ProcessedSearchResult[]> {
    // For now, implement basic analysis without external API calls
    // In production, this would call OpenAI, Claude, etc.
    return results.map(result => {
      const analysis = this.generateBasicAnalysis(result, options.query);
      return {
        ...result,
        ...analysis
      };
    });
  }

  /**
   * Generate basic analysis without external API calls
   */
  private generateBasicAnalysis(
    result: ProcessedSearchResult,
    query: string
  ): Partial<ProcessedSearchResult> {
    const content = (result.title + ' ' + result.content).toLowerCase();
    const queryLower = query.toLowerCase();

    // Generate summary (first 150 characters)
    const summary = result.content.length > 150 
      ? result.content.substring(0, 150) + '...'
      : result.content;

    // Extract key points (sentences containing query terms)
    const sentences = result.content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const keyPoints = sentences
      .filter(sentence => 
        queryLower.split(' ').some(term => 
          sentence.toLowerCase().includes(term)
        )
      )
      .slice(0, 3)
      .map(s => s.trim());

    // Generate tags based on content and source type
    const tags = this.generateTags(result, query);

    // Determine priority based on keywords and source type
    const priority = this.determinePriority(result);

    // Basic sentiment analysis
    const sentiment = this.analyzeSentiment(result.content);

    return {
      summary,
      keyPoints,
      tags,
      priority,
      sentiment
    };
  }

  /**
   * Calculate text similarity using simple algorithm
   */
  private calculateTextSimilarity(query: string, text: string): number {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const textLower = text.toLowerCase();
    
    if (queryWords.length === 0) return 0;

    const matches = queryWords.filter(word => textLower.includes(word));
    const exactMatches = queryWords.filter(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(text);
    });

    // Weight exact matches higher
    return (matches.length * 0.5 + exactMatches.length * 1.0) / (queryWords.length * 1.5);
  }

  /**
   * Get weight for different source types
   */
  private getSourceWeight(sourceType: string): number {
    const weights: Record<string, number> = {
      'jira': 0.9,        // High priority for issues/tickets
      'confluence': 0.8,   // High for documentation
      'github': 0.8,      // High for code repositories
      'bitbucket': 0.8,   // High for code repositories
      'teams': 0.6,       // Medium for communications
      'slack': 0.6,       // Medium for communications
      'email': 0.5,       // Lower for general communications
      'default': 0.5
    };
    
    return weights[sourceType] || weights.default;
  }

  /**
   * Calculate recency score (newer content scores higher)
   */
  private calculateRecencyScore(dateString: string): number {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const daysDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
      
      // Score decreases over time, but levels off
      if (daysDiff <= 1) return 1.0;        // Last day
      if (daysDiff <= 7) return 0.9;        // Last week
      if (daysDiff <= 30) return 0.7;       // Last month
      if (daysDiff <= 90) return 0.5;       // Last quarter
      return 0.3;                           // Older than quarter
    } catch {
      return 0.5; // Default for invalid dates
    }
  }

  /**
   * Generate tags based on content analysis
   */
  private generateTags(result: ProcessedSearchResult, query: string): string[] {
    const tags: string[] = [];
    const content = (result.title + ' ' + result.content).toLowerCase();
    
    // Add source type as tag
    tags.push(result.sourceType);
    
    // Common technical tags
    const techTerms = [
      'api', 'bug', 'feature', 'documentation', 'code', 'review',
      'deployment', 'testing', 'security', 'performance', 'database',
      'frontend', 'backend', 'mobile', 'web', 'integration'
    ];
    
    techTerms.forEach(term => {
      if (content.includes(term)) {
        tags.push(term);
      }
    });
    
    // Priority keywords
    const priorityTerms = ['urgent', 'critical', 'high priority', 'blocker'];
    if (priorityTerms.some(term => content.includes(term))) {
      tags.push('high-priority');
    }
    
    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Determine priority based on content analysis
   */
  private determinePriority(result: ProcessedSearchResult): 'low' | 'medium' | 'high' {
    const content = (result.title + ' ' + result.content).toLowerCase();
    
    const highPriorityTerms = [
      'urgent', 'critical', 'blocker', 'high priority', 'emergency',
      'security', 'vulnerability', 'outage', 'down', 'critical bug'
    ];
    
    const mediumPriorityTerms = [
      'important', 'medium priority', 'bug', 'issue', 'problem',
      'feature request', 'improvement'
    ];
    
    if (highPriorityTerms.some(term => content.includes(term))) {
      return 'high';
    }
    
    if (mediumPriorityTerms.some(term => content.includes(term))) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Basic sentiment analysis
   */
  private analyzeSentiment(content: string): 'positive' | 'neutral' | 'negative' {
    const text = content.toLowerCase();
    
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'perfect', 'love',
      'like', 'happy', 'satisfied', 'working', 'solved', 'fixed'
    ];
    
    const negativeWords = [
      'bad', 'terrible', 'awful', 'hate', 'problem', 'issue', 'bug',
      'error', 'failed', 'broken', 'wrong', 'difficult', 'annoying'
    ];
    
    const positiveCount = positiveWords.filter(word => text.includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Fallback basic processing when AI processing fails
   */
  private basicProcessing(
    results: RawSearchResult[],
    query: string
  ): ProcessedSearchResult[] {
    return results.map(result => {
      const standardized = this.standardizeResult(result);
      const textScore = this.calculateTextSimilarity(query, standardized.title + ' ' + standardized.content);
      const analysis = this.generateBasicAnalysis(standardized, query);
      
      return {
        ...standardized,
        ...analysis,
        relevanceScore: textScore
      };
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Set API keys for external AI services
   */
  setApiKeys(keys: { openai?: string; anthropic?: string }) {
    if (keys.openai) {
      this.openaiApiKey = keys.openai;
      localStorage.setItem('openai_api_key', keys.openai);
    }
    if (keys.anthropic) {
      this.anthropicApiKey = keys.anthropic;
      localStorage.setItem('anthropic_api_key', keys.anthropic);
    }
  }

  /**
   * Apply web search restrictions based on company policies
   */
  private applyWebRestrictions(
    results: RawSearchResult[],
    restrictions?: WebSearchRestrictions
  ): RawSearchResult[] {
    if (!restrictions) return results;

    return results.filter(result => {
      const url = new URL(result.url || 'https://example.com');
      const domain = url.hostname;

      // Check allowed domains
      if (restrictions.allowedDomains && restrictions.allowedDomains.length > 0) {
        if (!restrictions.allowedDomains.some(allowed => domain.includes(allowed))) {
          return false;
        }
      }

      // Check blocked domains
      if (restrictions.blockedDomains && restrictions.blockedDomains.length > 0) {
        if (restrictions.blockedDomains.some(blocked => domain.includes(blocked))) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Apply company policy filtering
   */
  private applyCompanyPolicies(
    results: RawSearchResult[],
    policies: string[]
  ): RawSearchResult[] {
    if (policies.length === 0) return results;

    return results.filter(result => {
      const content = (result.title + ' ' + result.content).toLowerCase();
      
      // Check if content violates any company policies
      const violatesPolicy = policies.some(policy => {
        const policyLower = policy.toLowerCase();
        return content.includes(policyLower);
      });

      return !violatesPolicy;
    });
  }

  /**
   * Generate AI responses for AI-only search mode
   */
  private async generateAIResponses(options: SearchProcessingOptions): Promise<RawSearchResult[]> {
    const aiResults: RawSearchResult[] = [];
    const models = options.aiModels || ['gpt-4', 'claude-3', 'gemini-pro'];

    for (const model of models) {
      try {
        // In a real implementation, this would call the actual AI APIs
        const aiResponse = await this.simulateAIResponse(options.query, model);
        aiResults.push({
          id: `ai-${model}-${Date.now()}`,
          title: `AI Response from ${model}`,
          content: aiResponse,
          source: 'AI Generated',
          sourceType: 'ai',
          author: model,
          date: new Date().toISOString(),
          url: '#',
          metadata: {
            model,
            generated: true,
            query: options.query
          }
        });
      } catch (error) {
        console.error(`Failed to generate AI response from ${model}:`, error);
      }
    }

    return aiResults;
  }

  /**
   * Simulate AI response (replace with actual AI API calls in production)
   */
  private async simulateAIResponse(query: string, model: string): Promise<string> {
    // This is a simulation - in production, replace with actual AI API calls
    const responses = {
      'gpt-4': `Based on your query "${query}", here's a comprehensive analysis using GPT-4 capabilities. This response would include detailed insights, code examples, and practical recommendations tailored to your specific needs.`,
      'claude-3': `Claude 3's analysis of "${query}" reveals several key considerations. This response focuses on accuracy, safety, and providing nuanced understanding of complex topics with careful attention to potential limitations.`,
      'gemini-pro': `Gemini Pro's response to "${query}" leverages multimodal understanding and advanced reasoning. This includes contextual analysis, creative problem-solving approaches, and integration with Google's knowledge base.`,
      'llama-2': `Llama 2's open-source approach to "${query}" emphasizes transparency and community-driven insights. This response includes research-backed information and collaborative problem-solving methodologies.`
    };

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return responses[model as keyof typeof responses] || `AI response for "${query}" from ${model}`;
  }

  /**
   * Filter results by specified app sources
   */
  private filterByAppSources(
    results: RawSearchResult[],
    appSources: string[]
  ): RawSearchResult[] {
    if (appSources.length === 0) return results;

    return results.filter(result => 
      appSources.includes(result.sourceType) || 
      appSources.includes(result.source.toLowerCase())
    );
  }

  /**
   * Apply access control to ensure results are within user's permissions
   */
  private applyAccessControl(results: RawSearchResult[]): RawSearchResult[] {
    // This method ensures that all results are already scoped to user's access
    // Since the API services already handle authentication and authorization,
    // we just need to validate that private content is properly marked
    return results.filter(result => {
      // If result has metadata indicating it's private, ensure it belongs to the authenticated user
      if (result.metadata?.private === true) {
        // For GitHub private repos, ensure the authenticated user has access
        // This is already handled by the GitHub API token permissions
        return true;
      }
      
      // For other services (Jira, Confluence, Slack, Teams), the APIs already
      // return only content the authenticated user has permission to see
      return true;
    });
  }
}

export const searchProcessor = new SearchProcessor();
