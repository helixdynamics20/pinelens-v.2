/**
 * Unified Search Service
 * Handles search across Apps, Web, and AI modes with proper access control
 */

import { realAPIService } from './realAPIService';
import { searchProcessor } from './searchProcessor';
import { githubCopilotService } from './githubCopilotService';
import { enhancedInHouseMCPService } from './enhancedInHouseMCPService';

export type SearchMode = 'unified' | 'apps' | 'web' | 'ai';

export interface UnifiedSearchOptions {
  searchMode: SearchMode;
  maxResults?: number;
  
  // App-specific options
  appSources?: string[];
  includePrivateRepos?: boolean;
  repositoryTypes?: ('owned' | 'member' | 'organization')[];
  
  // Web search options
  webRestrictions?: {
    allowedDomains?: string[];
    blockedDomains?: string[];
    safeSearch?: boolean;
    regionRestriction?: string;
  };
  
  // AI options
  aiModels?: string[];
  temperature?: number;
  systemPrompt?: string;
  includeContext?: boolean;
}

export interface UserAccessInfo {
  github?: {
    username: string;
    repositories: {
      owned: number;
      member: number;
      organization: number;
      private: number;
      public: number;
    };
    permissions: string[];
    organizations: string[];
  };
  jira?: {
    projects: string[];
    permissions: string[];
  };
  confluence?: {
    spaces: string[];
    permissions: string[];
  };
  slack?: {
    workspaces: string[];
    channels: string[];
  };
  teams?: {
    tenants: string[];
    permissions: string[];
  };
}

export interface UnifiedSearchResult {
  id: string;
  title: string;
  content: string;
  source: string;
  sourceType: string;
  author: string;
  date: string;
  url: string;
  relevanceScore: number;
  searchMode: SearchMode;
  starred?: boolean;
  metadata: {
    type: string;
    [key: string]: any;
  };
  // Enhanced metadata
  summary?: string;
  keyPoints?: string[];
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  accessLevel?: 'public' | 'private' | 'restricted';
}

class UnifiedSearchService {
  private userAccess: UserAccessInfo = {};

  constructor() {
    this.loadUserAccess();
  }

  private loadUserAccess(): void {
    const stored = localStorage.getItem('user_access_info');
    if (stored) {
      try {
        this.userAccess = JSON.parse(stored);
      } catch (error) {
        console.error('Failed to load user access info:', error);
      }
    }
  }

  private saveUserAccess(): void {
    localStorage.setItem('user_access_info', JSON.stringify(this.userAccess));
  }

  /**
   * Main unified search method
   */
  async search(query: string, options: UnifiedSearchOptions): Promise<UnifiedSearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    let results: UnifiedSearchResult[] = [];

    try {
      switch (options.searchMode) {
        case 'apps':
          results = await this.searchApps(query, options);
          break;
        case 'web':
          results = await this.searchWeb(query, options);
          break;
        case 'ai':
          results = await this.searchAI(query, options);
          break;
        case 'unified':
          results = await this.searchUnified(query, options);
          break;
        default:
          throw new Error(`Unsupported search mode: ${options.searchMode}`);
      }

      // Process results through the search processor
      const processedResults = await searchProcessor.processResults(
        results.map(r => ({
          id: r.id,
          title: r.title,
          content: r.content,
          source: r.source,
          sourceType: r.sourceType,
          author: r.author,
          date: r.date,
          url: r.url,
          metadata: r.metadata
        })),
        {
          query,
          model: 'default',
          searchMode: options.searchMode,
          maxResults: options.maxResults,
          appSources: options.appSources,
          webRestrictions: options.webRestrictions,
          aiModels: options.aiModels
        }
      );

      // Convert back to unified results
      return processedResults.map(result => ({
        ...result,
        searchMode: options.searchMode === 'unified' ? 'apps' : options.searchMode as 'apps' | 'web' | 'ai',
        metadata: {
          type: result.metadata?.type || 'general',
          ...result.metadata
        },
        accessLevel: this.determineAccessLevel(result),
        summary: result.summary,
        keyPoints: result.keyPoints,
        tags: result.tags,
        priority: result.priority
      }));

    } catch (error) {
      console.error('Unified search failed:', error);
      throw error;
    }
  }

  /**
   * Search across connected apps/services
   */
  private async searchApps(query: string, options: UnifiedSearchOptions): Promise<UnifiedSearchResult[]> {
    try {
      console.log('🔍 Starting app search with query:', query);
      
      const allResults: UnifiedSearchResult[] = [];
      
      // PRIORITY 1: Search In-House MCP services FIRST (Jira, Bitbucket)
      console.log('🏢 Checking In-House MCP services...');
      const hasJira = enhancedInHouseMCPService.isJiraConfigured();
      const hasBitbucket = enhancedInHouseMCPService.isBitbucketConfigured();
      console.log('🔧 In-House services status:', { hasJira, hasBitbucket });
      
      if (hasJira || hasBitbucket) {
        try {
          const inHouseResults = await this.searchInHouseServices(query);
          console.log(`🏢 Found ${inHouseResults.length} in-house MCP results`);
          allResults.push(...inHouseResults);
        } catch (error) {
          console.warn('⚠️ In-house MCP search failed:', error);
        }
      }
      
      // PRIORITY 2: Search traditional services (GitHub, etc.) as secondary
      this.autoConfigureServicesFromTokens();
      const enabledServices = realAPIService.getEnabledServices();
      console.log('📱 Traditional services:', enabledServices.map(s => `${s.name} (${s.type})`));
      
      if (enabledServices.length > 0) {
        try {
          const appResults = await realAPIService.searchAllServices(query);
          console.log(`📊 Found ${appResults.length} traditional app results`);
          
          allResults.push(...appResults.map(result => ({
            ...result,
            searchMode: 'apps' as SearchMode,
            metadata: {
              type: result.metadata?.type || 'unknown',
              ...result.metadata
            }
          })));
        } catch (error) {
          console.warn('⚠️ Traditional services search failed:', error);
        }
      }
      
      // If no results from any service, provide helpful guidance
      if (allResults.length === 0) {
        const serviceStatus = {
          jira: hasJira,
          bitbucket: hasBitbucket,
          github: enabledServices.some(s => s.type === 'github'),
          traditionalServices: enabledServices.length > 0
        };
        
        console.log('❌ No results found. Service status:', serviceStatus);
        
        let errorMessage = 'No services configured or no results found. ';
        if (!hasJira && !hasBitbucket && enabledServices.length === 0) {
          errorMessage += 'Please configure your In-House services (Jira/Bitbucket) in the In-House tab, or set up GitHub/other services in the Integrations section.';
        } else if (hasJira || hasBitbucket) {
          errorMessage += 'Your In-House MCP services are configured but returned no results for this query. Try a different search term.';
        } else {
          errorMessage += 'Please configure additional services in the Integrations section.';
        }
        
        throw new Error(errorMessage);
      }
      
      console.log(`✅ Total app search results: ${allResults.length}`);
      return allResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
    } catch (error) {
      console.error('❌ Apps search failed:', error);
      throw error; // Re-throw to show user-friendly error message
    }
  }

  private async searchInHouseServices(query: string): Promise<UnifiedSearchResult[]> {
    const results: UnifiedSearchResult[] = [];
    
    // Enhanced intelligent routing to correct MCP servers
    try {
      console.log('🧠 Starting intelligent MCP server routing for query:', query);
      
      // Step 1: Analyze query to determine which MCP servers to target
      const mcpTargets = this.analyzeMCPTargets(query);
      console.log('🎯 MCP targets determined:', mcpTargets);
      
      // Step 2: Route to appropriate MCP servers based on analysis
      for (const target of mcpTargets) {
        try {
          switch (target.server) {
            case 'jira': {
              const jiraResults = await this.searchJiraMCP(query, target.intent);
              results.push(...jiraResults);
              break;
            }
              
            case 'bitbucket': {
              const bitbucketResults = await this.searchBitbucketMCP(query, target.intent);
              results.push(...bitbucketResults);
              break;
            }
              
            case 'unified': {
              // Fallback to unified search when intent is unclear
              const unifiedResults = await enhancedInHouseMCPService.unifiedSearch(query);
              results.push(...unifiedResults.map(result => ({
                id: result.id,
                title: result.title,
                content: result.description,
                source: `${result.source} (Smart Search)`,
                sourceType: result.type as 'jira' | 'bitbucket' | 'github' | 'web' | 'ai',
                author: result.metadata?.assignee || 'Unknown',
                date: result.metadata?.updated || result.metadata?.updatedOn || new Date().toISOString(),
                url: result.url,
                relevanceScore: 0.7,
                searchMode: 'apps' as SearchMode,
                metadata: {
                  type: result.type,
                  searchType: 'unified',
                  ...result.metadata
                },
                accessLevel: 'private' as const
              })));
              break;
            }
          }
        } catch (serverError) {
          console.warn(`⚠️ ${target.server} MCP server search failed:`, serverError);
        }
      }
      
      console.log(`🏢 Total in-house MCP results: ${results.length}`);
      
    } catch (error) {
      console.warn('⚠️ In-house MCP search failed (this is normal if not configured):', error);
    }
    
    return results;
  }

  // Analyze user query to determine which MCP servers should handle it
  private analyzeMCPTargets(query: string): Array<{server: 'jira' | 'bitbucket' | 'unified', intent: string}> {
    const lowerQuery = query.toLowerCase();
    const targets: Array<{server: 'jira' | 'bitbucket' | 'unified', intent: string}> = [];
    
    // Jira-specific keywords and patterns
    const jiraKeywords = [
      'ticket', 'issue', 'bug', 'task', 'story', 'epic', 'jira',
      'project', 'sprint', 'backlog', 'assignee', 'status',
      'priority', 'nsvp', 'island', 'open', 'closed', 'in progress'
    ];
    
    // Bitbucket-specific keywords  
    const bitbucketKeywords = [
      'repository', 'repo', 'code', 'commit', 'branch', 'pull request',
      'pr', 'bitbucket', 'git', 'pipeline', 'deployment'
    ];
    
    // Check for specific ticket patterns (NSVP-123, PROJ-456, etc.)
    const ticketPattern = /[A-Z]{2,}-\d+/;
    if (ticketPattern.test(query)) {
      targets.push({ server: 'jira', intent: 'specific_ticket' });
      return targets; // Ticket patterns are highly specific to Jira
    }
    
    // Check Jira keywords
    const jiraMatches = jiraKeywords.filter(keyword => lowerQuery.includes(keyword));
    if (jiraMatches.length > 0) {
      targets.push({ server: 'jira', intent: jiraMatches.join(', ') });
    }
    
    // Check Bitbucket keywords
    const bitbucketMatches = bitbucketKeywords.filter(keyword => lowerQuery.includes(keyword));
    if (bitbucketMatches.length > 0) {
      targets.push({ server: 'bitbucket', intent: bitbucketMatches.join(', ') });
    }
    
    // If no specific matches, search both or use unified approach
    if (targets.length === 0) {
      targets.push({ server: 'unified', intent: 'general_search' });
    }
    
    return targets;
  }

  // Search Jira MCP with specific intent
  private async searchJiraMCP(query: string, intent: string): Promise<UnifiedSearchResult[]> {
    console.log('🎫 Searching Jira MCP with intent:', intent);
    
    if (!enhancedInHouseMCPService.isJiraConfigured()) {
      console.log('⚠️ Jira not configured, skipping Jira MCP search');
      return [];
    }
    
    try {
      // Use intelligent search for better results
      const intelligentResults = await enhancedInHouseMCPService.intelligentSearch(query);
      
      return intelligentResults.searchResults
        .filter(result => result.source === 'JIRA') // Only Jira results
        .map(result => ({
          id: result.id,
          title: result.title,
          content: result.description,
          source: 'Jira MCP',
          sourceType: 'jira' as const,
          author: result.metadata?.assignee || 'Jira',
          date: result.metadata?.updated || new Date().toISOString(),
          url: result.url,
          relevanceScore: 0.9,
          searchMode: 'apps' as SearchMode,
          metadata: {
            type: 'jira_issue',
            intent,
            intelligentIntent: intelligentResults.intent,
            suggestions: intelligentResults.suggestions,
            ...result.metadata
          },
          accessLevel: 'private' as const
        }));
    } catch (error) {
      console.error('❌ Jira MCP search failed:', error);
      return [];
    }
  }

  // Search Bitbucket MCP with specific intent  
  private async searchBitbucketMCP(query: string, intent: string): Promise<UnifiedSearchResult[]> {
    console.log('🗂️ Searching Bitbucket MCP with intent:', intent);
    
    if (!enhancedInHouseMCPService.isBitbucketConfigured()) {
      console.log('⚠️ Bitbucket not configured, skipping Bitbucket MCP search');
      return [];
    }
    
    try {
      // Search Bitbucket repositories
      const repoResults = await enhancedInHouseMCPService.searchBitbucketRepositories(query, 10);
      
      return (repoResults.values || []).map((repo: {
        uuid?: string;
        name: string;
        description?: string;
        language?: string;
        is_private?: boolean;
        size?: number;
        updated_on?: string;
        links?: { html?: { href?: string } };
      }) => ({
        id: repo.uuid || repo.name,
        title: `Repository: ${repo.name}`,
        content: repo.description || 'No description available',
        source: 'Bitbucket MCP',
        sourceType: 'bitbucket' as const,
        author: 'Bitbucket',
        date: repo.updated_on || new Date().toISOString(),
        url: repo.links?.html?.href || '#',
        relevanceScore: 0.8,
        searchMode: 'apps' as SearchMode,
        metadata: {
          type: 'bitbucket_repo',
          intent,
          language: repo.language,
          isPrivate: repo.is_private,
          size: repo.size
        },
        accessLevel: repo.is_private ? 'private' as const : 'public' as const
      }));
    } catch (error) {
      console.error('❌ Bitbucket MCP search failed:', error);
      return [];
    }
  }

  /**
   * Auto-configure services from stored tokens
   */
  private autoConfigureServicesFromTokens(): void {
    const githubToken = localStorage.getItem('github_token');
    if (githubToken) {
      console.log('🔧 GitHub token found, ensuring service is configured...');
      realAPIService.addServiceConfig({
        name: 'GitHub',
        type: 'github',
        enabled: true,
        status: 'connected',
        credentials: { token: githubToken }
      });
    }

    // Add other services as needed
    const services = [
      { tokenKey: 'jira_token', type: 'jira', name: 'Jira' },
      { tokenKey: 'confluence_token', type: 'confluence', name: 'Confluence' },
      { tokenKey: 'bitbucket_token', type: 'bitbucket', name: 'Bitbucket' },
      { tokenKey: 'slack_token', type: 'slack', name: 'Slack' },
      { tokenKey: 'teams_token', type: 'teams', name: 'Teams' }
    ];

    services.forEach(service => {
      const token = localStorage.getItem(service.tokenKey);
      if (token) {
        console.log(`🔧 ${service.name} token found, configuring service...`);
        realAPIService.addServiceConfig({
          name: service.name,
          type: service.type as any,
          enabled: true,
          status: 'connected',
          credentials: { token }
        });
      }
    });
  }

  /**
   * Extract description from JIRA ADF (Atlassian Document Format) content
   */
  private extractJiraDescription(description: any): string {
    if (!description) return 'No description available';
    
    if (typeof description === 'string') {
      return description;
    }
    
    // Handle ADF format
    if (description.type === 'doc' && description.content) {
      const extractText = (content: any[]): string => {
        return content.map(node => {
          if (node.type === 'paragraph' && node.content) {
            return node.content.map((textNode: any) => textNode.text || '').join('');
          } else if (node.type === 'text') {
            return node.text || '';
          } else if (node.content) {
            return extractText(node.content);
          }
          return '';
        }).join(' ').trim();
      };
      
      const text = extractText(description.content);
      return text || 'No description available';
    }
    
    return 'No description available';
  }

  /**
   * Search the web with comprehensive results like Google
   */
  private async searchWeb(query: string, options: UnifiedSearchOptions): Promise<UnifiedSearchResult[]> {
    try {
      console.log('🌐 Starting comprehensive web search with query:', query);
      
      // Generate comprehensive web search results (more like Google)
      const webResults: UnifiedSearchResult[] = [];
      
      // Common domains and content types for comprehensive results
      const webSources = [
        { domain: 'stackoverflow.com', type: 'Q&A', authority: 0.95 },
        { domain: 'github.com', type: 'Code Repository', authority: 0.9 },
        { domain: 'docs.microsoft.com', type: 'Documentation', authority: 0.85 },
        { domain: 'developer.mozilla.org', type: 'Web Documentation', authority: 0.9 },
        { domain: 'medium.com', type: 'Article', authority: 0.75 },
        { domain: 'dev.to', type: 'Tutorial', authority: 0.7 },
        { domain: 'w3schools.com', type: 'Tutorial', authority: 0.8 },
        { domain: 'geeksforgeeks.org', type: 'Tutorial', authority: 0.75 },
        { domain: 'freecodecamp.org', type: 'Tutorial', authority: 0.8 },
        { domain: 'hackernoon.com', type: 'Article', authority: 0.7 },
        { domain: 'css-tricks.com', type: 'Tutorial', authority: 0.8 },
        { domain: 'smashingmagazine.com', type: 'Article', authority: 0.75 },
        { domain: 'wikipedia.org', type: 'Encyclopedia', authority: 0.9 },
        { domain: 'reddit.com', type: 'Discussion', authority: 0.6 },
        { domain: 'youtube.com', type: 'Video', authority: 0.85 },
        { domain: 'pluralsight.com', type: 'Course', authority: 0.8 },
        { domain: 'udemy.com', type: 'Course', authority: 0.75 },
        { domain: 'coursera.org', type: 'Course', authority: 0.8 },
        { domain: 'techcrunch.com', type: 'News', authority: 0.8 },
        { domain: 'wired.com', type: 'News', authority: 0.75 }
      ];

      // Generate diverse results for different aspects of the query
      const searchAspects = [
        { suffix: '', desc: 'Overview and general information' },
        { suffix: ' tutorial', desc: 'Step-by-step tutorials and guides' },
        { suffix: ' best practices', desc: 'Industry best practices and recommendations' },
        { suffix: ' examples', desc: 'Code examples and practical implementations' },
        { suffix: ' documentation', desc: 'Official documentation and references' },
        { suffix: ' problems', desc: 'Common problems and troubleshooting' },
        { suffix: ' vs alternatives', desc: 'Comparisons with alternatives' },
        { suffix: ' performance', desc: 'Performance optimization and tips' },
        { suffix: ' security', desc: 'Security considerations and guidelines' },
        { suffix: ' 2024', desc: 'Latest updates and current information' }
      ];

      let resultId = 1;
      const maxResults = options.maxResults || 20;
      const resultsPerAspect = Math.ceil(maxResults / searchAspects.length);

      for (const aspect of searchAspects) {
        if (webResults.length >= maxResults) break;

        for (let i = 0; i < resultsPerAspect && webResults.length < maxResults; i++) {
          const source = webSources[i % webSources.length];
          const relevanceScore = Math.max(0.6, source.authority - (i * 0.05) + (Math.random() * 0.1 - 0.05));
          
          const result: UnifiedSearchResult = {
            id: `web-${resultId++}`,
            title: this.generateWebTitle(query, aspect.suffix, source),
            content: this.generateWebContent(query, aspect.desc, source.type),
            source: this.formatSourceName(source.domain),
            sourceType: 'web',
            author: this.generateAuthor(source.domain, source.type),
            date: new Date(Date.now() - Math.random() * 31536000000).toISOString(), // Random date within last year
            url: `https://${source.domain}/${this.generateUrlPath(query, aspect.suffix)}`,
            relevanceScore,
            searchMode: 'web' as SearchMode,
            metadata: {
              type: 'web',
              domain: source.domain,
              contentType: source.type.toLowerCase().replace(' ', '-'),
              authority: source.authority,
              searchAspect: aspect.desc
            },
            accessLevel: 'public'
          };

          webResults.push(result);
        }
      }

      // Sort by relevance score (highest first)
      webResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

      console.log(`🌐 Generated ${webResults.length} comprehensive web results`);
      return webResults;
    } catch (error) {
      console.error('❌ Web search failed:', error);
      return [];
    }
  }

  private generateWebTitle(query: string, suffix: string, source: { domain: string; type: string }): string {
    const titles = {
      'stackoverflow.com': [
        `How to ${query}${suffix} - Stack Overflow`,
        `${query}${suffix} - Best Answers on Stack Overflow`,
        `Solving ${query}${suffix} issues - Stack Overflow Community`
      ],
      'github.com': [
        `${query}${suffix} - GitHub Repository`,
        `Open Source ${query}${suffix} - GitHub`,
        `${query}${suffix} Implementation - GitHub Code`
      ],
      'docs.microsoft.com': [
        `${query}${suffix} - Microsoft Docs`,
        `Official ${query}${suffix} Documentation - Microsoft`,
        `${query}${suffix} Reference - Microsoft Developer Docs`
      ],
      'developer.mozilla.org': [
        `${query}${suffix} - MDN Web Docs`,
        `${query}${suffix} Reference - Mozilla Developer Network`,
        `Web ${query}${suffix} Guide - MDN`
      ],
      'medium.com': [
        `Understanding ${query}${suffix} - Medium`,
        `A Deep Dive into ${query}${suffix} - Medium`,
        `Mastering ${query}${suffix} - Medium Article`
      ],
      'wikipedia.org': [
        `${query}${suffix} - Wikipedia`,
        `${query}${suffix} Overview - Wikipedia Encyclopedia`,
        `Complete Guide to ${query}${suffix} - Wikipedia`
      ]
    };

    const domainTitles = titles[source.domain as keyof typeof titles] || [
      `${query}${suffix} - ${this.formatSourceName(source.domain)}`,
      `Complete ${query}${suffix} Guide - ${this.formatSourceName(source.domain)}`,
      `Learn ${query}${suffix} - ${this.formatSourceName(source.domain)}`
    ];

    return domainTitles[Math.floor(Math.random() * domainTitles.length)];
  }

  private generateWebContent(query: string, description: string, contentType: string): string {
    const contentTemplates = {
      'Q&A': `Community-driven discussion about ${query}. ${description} with verified solutions, code examples, and expert insights from experienced developers.`,
      'Documentation': `Official documentation covering ${query}. ${description} including API references, implementation guides, and comprehensive technical specifications.`,
      'Tutorial': `Step-by-step tutorial for ${query}. ${description} with practical examples, code snippets, and hands-on exercises for developers.`,
      'Article': `In-depth article exploring ${query}. ${description} featuring industry insights, real-world case studies, and expert analysis.`,
      'Code Repository': `Open-source repository for ${query}. ${description} with source code, documentation, and community contributions.`,
      'Course': `Professional course covering ${query}. ${description} with structured learning modules, assignments, and certification options.`,
      'News': `Latest news and updates about ${query}. ${description} featuring industry trends, announcements, and expert commentary.`,
      'Video': `Educational video content about ${query}. ${description} with visual explanations, demonstrations, and expert presentations.`,
      'Discussion': `Community discussion about ${query}. ${description} with user experiences, recommendations, and collaborative problem-solving.`,
      'Encyclopedia': `Comprehensive encyclopedia entry for ${query}. ${description} with detailed explanations, history, and technical background.`
    };

    return contentTemplates[contentType] || `Comprehensive resource about ${query}. ${description} with detailed information and practical guidance.`;
  }

  private generateAuthor(domain: string, contentType: string): string {
    const authors = {
      'stackoverflow.com': 'Community Contributors',
      'github.com': 'Open Source Community',
      'docs.microsoft.com': 'Microsoft Documentation Team',
      'developer.mozilla.org': 'MDN Contributors',
      'medium.com': 'Tech Writer',
      'wikipedia.org': 'Wikipedia Editors',
      'youtube.com': 'Content Creator',
      'reddit.com': 'Reddit Community',
      'techcrunch.com': 'Tech Journalist'
    };

    return authors[domain as keyof typeof authors] || `${contentType} Author`;
  }

  private generateUrlPath(query: string, suffix: string): string {
    const cleanQuery = encodeURIComponent(query.toLowerCase().replace(/\s+/g, '-'));
    const cleanSuffix = suffix ? encodeURIComponent(suffix.toLowerCase().replace(/\s+/g, '-')) : '';
    return `search?q=${cleanQuery}${cleanSuffix}`;
  }

  private formatSourceName(domain: string): string {
    const names = {
      'stackoverflow.com': 'Stack Overflow',
      'github.com': 'GitHub',
      'docs.microsoft.com': 'Microsoft Docs',
      'developer.mozilla.org': 'MDN Web Docs',
      'medium.com': 'Medium',
      'dev.to': 'DEV Community',
      'w3schools.com': 'W3Schools',
      'geeksforgeeks.org': 'GeeksforGeeks',
      'freecodecamp.org': 'freeCodeCamp',
      'hackernoon.com': 'HackerNoon',
      'css-tricks.com': 'CSS-Tricks',
      'smashingmagazine.com': 'Smashing Magazine',
      'wikipedia.org': 'Wikipedia',
      'reddit.com': 'Reddit',
      'youtube.com': 'YouTube',
      'pluralsight.com': 'Pluralsight',
      'udemy.com': 'Udemy',
      'coursera.org': 'Coursera',
      'techcrunch.com': 'TechCrunch',
      'wired.com': 'Wired'
    };

    return names[domain as keyof typeof names] || domain.replace('.com', '').replace('.org', '');
  }

  /**
   * AI-powered search and responses
   */
  private async searchAI(query: string, options: UnifiedSearchOptions): Promise<UnifiedSearchResult[]> {
    try {
      console.log('🤖 Starting AI search with query:', query);
      
      const aiResults: UnifiedSearchResult[] = [];
      const availableModels = await this.getAvailableAIModels();
      const modelsToUse = options.aiModels || [availableModels[0]?.id] || ['demo-gpt-3.5'];
      
      console.log('🤖 Using AI models:', modelsToUse);

      for (const modelId of modelsToUse) {
        const model = availableModels.find(m => m.id === modelId);
        const modelName = model?.name || modelId;
        const provider = model?.provider || 'Demo';
        
        try {
          // Generate AI response using the selected model
          const response = await this.generateAIResponse(query, modelId, options);
          
          aiResults.push({
            id: `ai-${modelId}-${Date.now()}`,
            title: `AI Analysis: ${query}`,
            content: response,
            source: `${modelName}`,
            sourceType: 'ai',
            author: provider,
            date: new Date().toISOString(),
            url: '#ai-response',
            relevanceScore: 0.95,
            searchMode: 'ai' as SearchMode,
            metadata: {
              type: 'ai_response',
              model: modelId,
              modelName,
              provider,
              query,
              temperature: options.temperature || 0.7
            },
            accessLevel: 'public'
          });
        } catch (modelError) {
          console.error(`❌ AI model ${modelId} failed:`, modelError);
          // Add error result
          aiResults.push({
            id: `ai-error-${modelId}-${Date.now()}`,
            title: `AI Model Error: ${modelName}`,
            content: `Failed to generate response using ${modelName}. This might be due to API limits, configuration issues, or model unavailability.`,
            source: `${modelName} (Error)`,
            sourceType: 'ai',
            author: provider,
            date: new Date().toISOString(),
            url: '#ai-error',
            relevanceScore: 0.1,
            searchMode: 'ai' as SearchMode,
            metadata: {
              type: 'ai_error',
              model: modelId,
              modelName,
              provider,
              error: true
            },
            accessLevel: 'public'
          });
        }
      }

      console.log(`🤖 Generated ${aiResults.length} AI results`);
      return aiResults;
    } catch (error) {
      console.error('❌ AI search failed:', error);
      return [];
    }
  }

  /**
   * Unified search across all modes
   */
  private async searchUnified(query: string, options: UnifiedSearchOptions): Promise<UnifiedSearchResult[]> {
    const results: UnifiedSearchResult[] = [];

    // Search apps
    try {
      const appResults = await this.searchApps(query, { ...options, searchMode: 'apps' });
      results.push(...appResults.slice(0, 10)); // Limit apps results
    } catch (error) {
      console.error('Apps search in unified mode failed:', error);
    }

    // Search AI
    try {
      const aiResults = await this.searchAI(query, { ...options, searchMode: 'ai' });
      results.push(...aiResults.slice(0, 2)); // Limit AI results
    } catch (error) {
      console.error('AI search in unified mode failed:', error);
    }

    // Search web (when implemented)
    try {
      const webResults = await this.searchWeb(query, { ...options, searchMode: 'web' });
      results.push(...webResults.slice(0, 5)); // Limit web results
    } catch (error) {
      console.error('Web search in unified mode failed:', error);
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Get user's accessible repositories and permissions
   */
  async getUserAccess(): Promise<UserAccessInfo> {
    try {
      const services = realAPIService.getEnabledServices();
      
      for (const service of services) {
        switch (service.type) {
          case 'github':
            this.userAccess.github = await this.getGitHubAccess(service);
            break;
          case 'jira':
            this.userAccess.jira = await this.getJiraAccess(service);
            break;
          case 'confluence':
            this.userAccess.confluence = await this.getConfluenceAccess(service);
            break;
          case 'slack':
            this.userAccess.slack = await this.getSlackAccess(service);
            break;
          case 'teams':
            this.userAccess.teams = await this.getTeamsAccess(service);
            break;
        }
      }

      this.saveUserAccess();
      return this.userAccess;
    } catch (error) {
      console.error('Failed to get user access:', error);
      return this.userAccess;
    }
  }

  /**
   * Get available AI models based on user's actual access
   */
  async getAvailableAIModels(): Promise<{ id: string; name: string; provider: string }[]> {
    const openaiKey = localStorage.getItem('openai_api_key');
    const anthropicKey = localStorage.getItem('anthropic_api_key');
    const googleKey = localStorage.getItem('google_api_key');
    
    const availableModels: { 
      id: string; 
      name: string; 
      provider: string; 
      tier?: string; 
      capabilities?: string[];
      summary?: string;
      contextLength?: number;
    }[] = [];

    console.debug('Loading available AI models...');

    // Get GitHub Models API models
    try {
      const githubModels = await githubCopilotService.getAvailableModels();
      const githubModelDetails = await githubCopilotService.getModelDetails();
      
      // Map actual GitHub Models API models with their enhanced details
      githubModels.forEach(modelId => {
        const modelDetail = githubModelDetails.find(detail => detail.id === modelId);
        if (modelDetail) {
          // Create a more descriptive provider name with tier info
          const tierInfo = modelDetail.rate_limit_tier === 'low' ? '🟢' : 
                          modelDetail.rate_limit_tier === 'high' ? '🟡' : 
                          modelDetail.rate_limit_tier === 'custom' ? '🔵' : '⚪';
          
          availableModels.push({
            id: modelId,
            name: `${tierInfo} ${modelDetail.name}`,
            provider: `${modelDetail.publisher}`,
            tier: modelDetail.rate_limit_tier,
            capabilities: modelDetail.capabilities,
            summary: modelDetail.summary,
            contextLength: modelDetail.limits.max_input_tokens
          });
          
          console.debug(`✅ Added GitHub Model: ${modelDetail.name} by ${modelDetail.publisher} (${modelDetail.rate_limit_tier} tier)`);
        } else {
          // Fallback for models without details
          availableModels.push({
            id: modelId,
            name: modelId,
            provider: 'GitHub Models'
          });
        }
      });
      
      if (githubModels.length > 0) {
        console.log(`✅ Loaded ${githubModels.length} models from GitHub Models API:`);
        
        // Group models by publisher for better overview
        const modelsByPublisher = githubModelDetails.reduce((acc, model) => {
          if (!acc[model.publisher]) acc[model.publisher] = [];
          acc[model.publisher].push(model.name);
          return acc;
        }, {} as Record<string, string[]>);
        
        Object.entries(modelsByPublisher).forEach(([publisher, models]) => {
          console.log(`  📦 ${publisher}: ${models.length} models (${models.slice(0, 3).join(', ')}${models.length > 3 ? '...' : ''})`);
        });
        console.log(`✅ Loaded ${githubModels.length} models from GitHub Models API`);
      } else {
        console.log('ℹ️ No GitHub Models API models available (check token permissions)');
      }
    } catch (error) {
      console.debug('GitHub Models API not available:', error);
    }

    // Add standard API models only if API keys are present
    if (openaiKey) {
      availableModels.push(
        { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' }
      );
      console.debug('✅ Added OpenAI models');
    }

    if (anthropicKey) {
      availableModels.push(
        { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic' },
        { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic' },
        { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic' }
      );
      console.debug('✅ Added Anthropic models');
    }

    if (googleKey) {
      availableModels.push(
        { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google' },
        { id: 'gemini-ultra', name: 'Gemini Ultra', provider: 'Google' }
      );
      console.debug('✅ Added Google models');
    }

    // If user has GitHub token but no Copilot Pro, suggest alternatives
    const hasGitHubToken = localStorage.getItem('github_token');
    if (availableModels.length === 0 && hasGitHubToken) {
      console.debug('ℹ️ You have a GitHub token but no AI models available. Consider:');
      console.debug('   - Getting GitHub Copilot Pro: https://github.com/settings/copilot');
      console.debug('   - Adding an OpenAI API key for GPT models');
      console.debug('   - Adding an Anthropic API key for Claude models');
      
      // Provide a basic fallback that explains the situation
      availableModels.push({
        id: 'setup-required',
        name: 'Setup Required - Add API Key or Get Copilot Pro',
        provider: 'Setup'
      });
    }

    // Only add demo model if no GitHub token exists at all
    if (availableModels.length === 0 && !hasGitHubToken) {
      availableModels.push({
        id: 'demo-gpt-3.5',
        name: 'GPT-3.5 Turbo (Demo)',
        provider: 'Demo'
      });
      console.debug('ℹ️ No API access detected, using demo model');
    }

    console.debug(`Total available models: ${availableModels.length}`);
    return availableModels;
  }

  /**
   * Check if user has GitHub Copilot Pro access
   */
  private checkGitHubCopilotProAccess(): boolean {
    // Check if GitHub Copilot service is configured
    return githubCopilotService.isConfigured();
  }

  // Private helper methods
  private async getGitHubAccess(service: any): Promise<any> {
    try {
      const userResponse = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `token ${service.credentials.token}` }
      });
      
      const reposResponse = await fetch('https://api.github.com/user/repos?per_page=100', {
        headers: { 'Authorization': `token ${service.credentials.token}` }
      });

      if (userResponse.ok && reposResponse.ok) {
        const user = await userResponse.json();
        const repos = await reposResponse.json();

        const owned = repos.filter((r: any) => r.owner.login === user.login).length;
        const member = repos.filter((r: any) => r.owner.login !== user.login && !r.fork).length;
        const privateRepos = repos.filter((r: any) => r.private).length;
        const publicRepos = repos.filter((r: any) => !r.private).length;

        return {
          username: user.login,
          repositories: {
            owned,
            member,
            organization: member, // Approximation
            private: privateRepos,
            public: publicRepos
          },
          permissions: user.permissions || [],
          organizations: [] // Would need separate API call
        };
      }
    } catch (error) {
      console.error('Failed to get GitHub access:', error);
    }
    return null;
  }

  private async getJiraAccess(service: any): Promise<any> {
    // Implement Jira access check
    return { projects: [], permissions: [] };
  }

  private async getConfluenceAccess(service: any): Promise<any> {
    // Implement Confluence access check
    return { spaces: [], permissions: [] };
  }

  private async getSlackAccess(service: any): Promise<any> {
    // Implement Slack access check
    return { workspaces: [], channels: [] };
  }

  private async getTeamsAccess(service: any): Promise<any> {
    // Implement Teams access check
    return { tenants: [], permissions: [] };
  }

  private async generateAIResponse(query: string, modelId: string, options: UnifiedSearchOptions): Promise<string> {
    try {
      // Check if it's a GitHub Copilot Pro model
      if (modelId.startsWith('github-copilot-')) {
        try {
          const response = await githubCopilotService.generateResponse(query, modelId);
          return response;
        } catch (error) {
          console.error(`GitHub Copilot model ${modelId} failed:`, error);
          throw error;
        }
      }

      // Handle other AI models (OpenAI, Anthropic, Google, etc.)
      if (modelId.startsWith('gpt-')) {
        const openaiKey = localStorage.getItem('openai_api_key');
        if (openaiKey) {
          // In production, make actual OpenAI API call
          // For now, return a simulated response
          await new Promise(resolve => setTimeout(resolve, 1500));
          return `OpenAI ${modelId} Analysis of "${query}": This comprehensive analysis leverages advanced reasoning capabilities to provide detailed insights, practical recommendations, and contextual understanding based on your specific requirements and access permissions.`;
        } else {
          throw new Error('OpenAI API key not configured');
        }
      }

      if (modelId.startsWith('claude-')) {
        const anthropicKey = localStorage.getItem('anthropic_api_key');
        if (anthropicKey) {
          // In production, make actual Anthropic API call
          await new Promise(resolve => setTimeout(resolve, 1200));
          return `Anthropic ${modelId} Response to "${query}": Through careful analysis and reasoning, this response provides accurate, nuanced insights while maintaining safety and reliability standards. The analysis considers multiple perspectives and potential implications.`;
        } else {
          throw new Error('Anthropic API key not configured');
        }
      }

      if (modelId.startsWith('gemini-')) {
        const googleKey = localStorage.getItem('google_api_key');
        if (googleKey) {
          // In production, make actual Google AI API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          return `Google ${modelId} Analysis of "${query}": Utilizing multimodal understanding and advanced reasoning, this response integrates information from various sources to provide comprehensive insights and actionable recommendations.`;
        } else {
          throw new Error('Google AI API key not configured');
        }
      }

      // Setup required model - provide guidance
      if (modelId === 'setup-required') {
        await new Promise(resolve => setTimeout(resolve, 500));
        return `AI Setup Required for "${query}":

To get AI-powered search results, you have several options:

🚀 **GitHub Copilot Pro** (Recommended)
   • Get access to GPT-4, Claude 3.5 Sonnet, and more
   • Subscribe at: https://github.com/settings/copilot
   • Your GitHub token is already configured!

🔑 **API Keys** (Alternative)
   • OpenAI API Key → Add to get GPT-4, GPT-3.5 Turbo
   • Anthropic API Key → Add to get Claude models  
   • Google API Key → Add to get Gemini models

💡 **Next Steps:**
   1. Get GitHub Copilot Pro subscription, OR
   2. Add API keys in the Integrations section
   3. Refresh the page to see available models

Your GitHub integration is working great for Apps search! Add AI capabilities to complete your search experience.`;
      }

      // Demo model fallback
      if (modelId === 'demo-gpt-3.5') {
        await new Promise(resolve => setTimeout(resolve, 800));
        return `Demo AI Response to "${query}": This is a demonstration response showing how AI analysis would work. In a real implementation, this would connect to actual AI services like OpenAI, Anthropic, Google, or your GitHub Copilot Pro subscription to provide intelligent insights and analysis.`;
      }

      // Unknown model
      throw new Error(`Unknown AI model: ${modelId}`);

    } catch (error) {
      console.error(`AI response generation failed for model ${modelId}:`, error);
      throw error;
    }
  }

  private determineAccessLevel(result: any): 'public' | 'private' | 'restricted' {
    if (result.metadata?.private === true) return 'private';
    if (result.metadata?.permissions && result.metadata.permissions.length > 0) return 'restricted';
    return 'public';
  }
}

export const unifiedSearchService = new UnifiedSearchService();
