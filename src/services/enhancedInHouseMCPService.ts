/**
 * Enhanced In-House MCP Service with Bitbucket and JIRA Integration
 * Supports both demo and real API calls
 */

interface MCPConfig {
  baseUrl: string;
  username?: string;
  email?: string;
  appPassword?: string;
  apiToken?: string;
  workspace?: string;
}

interface SearchResultMetadata {
  language?: string;
  isPrivate?: boolean;
  size?: number;
  updatedOn?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  issueType?: string;
  updated?: string;
  created?: string;
  projectKey?: string;
  projectName?: string;
  projectType?: string;
  lead?: string;
  reporter?: string;
  resolution?: string;
  labels?: string[];
  components?: string[];
  fixVersions?: string[];
  affectsVersions?: string[];
  storyPoints?: number;
  timeTracking?: {
    originalEstimate?: string;
    remainingEstimate?: string;
    timeSpent?: string;
  };
  environment?: string;
  customFields?: Record<string, unknown>;
  pullRequests?: {
    total: number;
    open: number;
    merged: number;
    declined: number;
    details?: Array<{
      id: string;
      title: string;
      status: string;
      url: string;
      author: string;
      created: string;
    }>;
  };
}

interface SearchResult {
  id: string;
  title: string;
  description: string;
  url: string;
  type: string;
  source: string;
  metadata?: SearchResultMetadata;
}

interface ConfigurationResult {
  success: boolean;
  message?: string;
  user?: Record<string, unknown>;
  error?: string;
  isReal: boolean;
}

interface BitbucketRepository {
  uuid?: string;
  name: string;
  description?: string;
  language?: string;
  is_private: boolean;
  size: number;
  updated_on: string;
  links?: {
    html?: {
      href: string;
    };
  };
}

interface BitbucketSearchResult {
  values: BitbucketRepository[];
  size: number;
  page: number;
  pagelen: number;
}

interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    description?: ADFContent;
    status?: { name: string; statusCategory?: { name: string; colorName: string } };
    priority?: { name: string; iconUrl?: string };
    assignee?: { displayName: string; emailAddress?: string; accountId?: string } | null;
    reporter?: { displayName: string; emailAddress?: string; accountId?: string };
    issuetype?: { name: string; iconUrl?: string; description?: string };
    project?: { key: string; name: string; projectTypeKey?: string };
    updated: string;
    created?: string;
    resolutiondate?: string;
    resolution?: { name: string; description?: string };
    labels?: string[];
    components?: Array<{ name: string; description?: string }>;
    fixVersions?: Array<{ name: string; description?: string; releaseDate?: string }>;
    versions?: Array<{ name: string; description?: string; releaseDate?: string }>;
    environment?: string;
    timetracking?: {
      originalEstimate?: string;
      remainingEstimate?: string;
      timeSpent?: string;
      originalEstimateSeconds?: number;
      remainingEstimateSeconds?: number;
      timeSpentSeconds?: number;
    };
    customfield_10016?: number; // Story Points (common custom field)
    customfield_10000?: string; // Development field (for PR info)
    watches?: { watchCount: number };
    votes?: { votes: number };
    comment?: {
      total: number;
      comments: Array<{
        author: { displayName: string };
        body: ADFContent;
        created: string;
        updated: string;
      }>;
    };
  };
}

interface JiraSearchResult {
  issues: JiraIssue[];
  total: number;
  startAt: number;
  maxResults: number;
}

interface JiraProject {
  key: string;
  name: string;
  description: string;
  projectTypeKey: string;
  lead: { displayName: string };
}

interface ADFContent {
  type: string;
  version: number;
  content: ADFNode[];
}

interface ADFNode {
  type: string;
  content?: ADFNode[];
  text?: string;
}

interface IssueCreationData {
  projectKey: string;
  summary: string;
  description: string;
  issueType: string;
  priority?: string;
  assignee?: string;
}

interface CreatedIssueResult {
  key: string;
  id: string;
  self: string;
}

// Request Manager for handling resource cleanup and preventing browser overload
class RequestManager {
  private activeRequests: Map<string, { controller: AbortController; timestamp: number }> = new Map();
  private readonly MAX_CONCURRENT_REQUESTS = 6;
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds default

  async makeRequest<T>(
    key: string, 
    requestFn: () => Promise<T>, 
    timeout: number = this.REQUEST_TIMEOUT
  ): Promise<T> {
    // Wait if too many concurrent requests
    while (this.activeRequests.size >= this.MAX_CONCURRENT_REQUESTS) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const controller = new AbortController();
    const requestData = { controller, timestamp: Date.now() };
    this.activeRequests.set(key, requestData);

    // Set up timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
      this.activeRequests.delete(key);
    }, timeout);

    try {
      const result = await requestFn();
      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('🚫 Request aborted:', key);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      this.activeRequests.delete(key);
    }
  }

  createAbortController(timeout: number = this.REQUEST_TIMEOUT): AbortController {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    return controller;
  }

  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }

  cleanup(): void {
    console.log('🧹 Cleaning up RequestManager...');
    for (const [, { controller }] of this.activeRequests) {
      controller.abort();
    }
    this.activeRequests.clear();
  }
}

export class EnhancedInHouseMCPService {
  private bitbucketConfig: MCPConfig | null = null;
  private jiraConfig: MCPConfig | null = null;
  private isConfiguredRef = { current: false };
  private requestManager: RequestManager;
  public readonly version = '2.1';

  constructor() {
    console.log('🚀 EnhancedInHouseMCPService initialized - Version 2.1 with resource management');
    this.requestManager = new RequestManager();
    // Initialize state tracking
    this.loadPersistedState();
  }

  // State persistence methods
  private loadPersistedState(): void {
    try {
      const savedBitbucketConfig = localStorage.getItem('pinelens-bitbucket-config');
      const savedJiraConfig = localStorage.getItem('pinelens-jira-config');
      
      if (savedBitbucketConfig) {
        this.bitbucketConfig = JSON.parse(savedBitbucketConfig);
        console.log('🔄 Restored Bitbucket configuration from storage');
      }
      
      if (savedJiraConfig) {
        this.jiraConfig = JSON.parse(savedJiraConfig);
        console.log('🔄 Restored JIRA configuration from storage');
      }
      
      if (this.bitbucketConfig || this.jiraConfig) {
        this.isConfiguredRef.current = true;
        console.log('✅ Service state restored from persistence');
      }
    } catch (error) {
      console.warn('⚠️ Failed to load persisted state:', error);
    }
  }

  private persistState(): void {
    try {
      if (this.bitbucketConfig) {
        localStorage.setItem('pinelens-bitbucket-config', JSON.stringify(this.bitbucketConfig));
      }
      if (this.jiraConfig) {
        localStorage.setItem('pinelens-jira-config', JSON.stringify(this.jiraConfig));
      }
      console.log('💾 Service state persisted to storage');
    } catch (error) {
      console.warn('⚠️ Failed to persist state:', error);
    }
  }

  // Use the RequestManager for all API calls
  private async makeRequest<T>(
    key: string, 
    requestFn: () => Promise<T>, 
    timeout: number = 10000
  ): Promise<T> {
    return this.requestManager.makeRequest(key, requestFn, timeout);
  }

  private createAbortController(timeout: number = 10000): AbortController {
    return this.requestManager.createAbortController(timeout);
  }

  // Bitbucket Configuration
  async configureBitbucket(config: MCPConfig): Promise<ConfigurationResult> {
    console.log('🔧 Configuring Bitbucket...', { baseUrl: config.baseUrl, username: config.username });
    
    const requestKey = `bitbucket-config-${config.username}`;
    
    try {
      if (this.isRealToken(config.appPassword)) {
        console.log('🔑 Using real Bitbucket credentials');
        
        return await this.makeRequest(requestKey, async () => {
          const headers = this.getBitbucketHeaders(config);
          const proxyUrl = '/api/bitbucket/2.0/user';
          const controller = this.createAbortController(15000);
          
          console.log('🌐 Testing Bitbucket connection via proxy:', proxyUrl);
          
          const response = await fetch(proxyUrl, { 
            headers,
            signal: controller.signal
          });
          
          if (response.ok) {
            const userData = await response.json();
            this.bitbucketConfig = config;
            this.isConfiguredRef.current = true;
            this.persistState(); // Save state to localStorage
            
            return {
              success: true,
              message: `✅ Connected to Bitbucket as ${userData.display_name}`,
              user: userData,
              isReal: true
            };
          } else {
            const errorText = await response.text();
            throw new Error(`Authentication failed: ${response.status} - ${errorText}`);
          }
        }, 15000);
      } else {
        console.log('🎭 Using Bitbucket demo mode');
        this.bitbucketConfig = { ...config, appPassword: 'demo-token' };
        this.isConfiguredRef.current = true;
        this.persistState(); // Save state to localStorage
        
        return {
          success: true,
          message: '✅ Connected to Bitbucket (Demo Mode)',
          user: { display_name: 'Demo User', username: 'demo' },
          isReal: false
        };
      }
    } catch (error: unknown) {
      console.error('❌ Bitbucket configuration failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        isReal: false
      };
    }
  }

  // JIRA Configuration
  async configureJira(config: MCPConfig): Promise<ConfigurationResult> {
    console.log('🔧 Configuring JIRA...', { baseUrl: config.baseUrl, email: config.email });
    
    const requestKey = `jira-config-${config.email}`;
    
    try {
      if (this.isRealToken(config.apiToken)) {
        console.log('🔑 Using real JIRA credentials');
        
        return await this.makeRequest(requestKey, async () => {
          const headers = this.getJiraHeaders(config);
          const proxyUrl = '/api/jira/rest/api/3/myself';
          const controller = this.createAbortController(15000);
          
          console.log('🌐 Testing JIRA connection via proxy:', proxyUrl);
          
          const response = await fetch(proxyUrl, { 
            headers,
            signal: controller.signal
          });
          
          if (response.ok) {
            const userData = await response.json();
            this.jiraConfig = config;
            this.isConfiguredRef.current = true;
            this.persistState(); // Save state to localStorage
            
            return {
              success: true,
              message: `✅ Connected to JIRA as ${userData.displayName}`,
              user: userData,
              isReal: true
            };
          } else {
            const errorText = await response.text();
            console.error('🚫 JIRA authentication failed:', {
              status: response.status,
              statusText: response.statusText,
              errorText: errorText,
              url: proxyUrl
            });
            
            // Provide specific error messages based on status code
            let errorMessage = `Authentication failed: ${response.status}`;
            if (response.status === 401) {
              errorMessage = `Invalid JIRA credentials. Please check your email and API token.`;
            } else if (response.status === 403) {
              errorMessage = `Access denied. Your JIRA account may not have sufficient permissions.`;
            } else if (response.status === 404) {
              errorMessage = `JIRA instance not found. Please verify your JIRA base URL.`;
            }
            
            throw new Error(errorMessage);
          }
        }, 15000);
      } else {
        console.log('🎭 Using JIRA demo mode');
        this.jiraConfig = { ...config, apiToken: 'demo-token' };
        this.isConfiguredRef.current = true;
        this.persistState(); // Save state to localStorage
        
        return {
          success: true,
          message: '✅ Connected to JIRA (Demo Mode)',
          user: { displayName: 'Demo User', emailAddress: 'demo@example.com' },
          isReal: false
        };
      }
    } catch (error: unknown) {
      console.error('❌ JIRA configuration failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        isReal: false
      };
    }
  }

  // Bitbucket Operations
  async searchBitbucketRepositories(query: string = '', limit: number = 50): Promise<BitbucketSearchResult> {
    if (!this.bitbucketConfig) {
      throw new Error('Bitbucket not configured');
    }

    const requestKey = `bitbucket-search-${Date.now()}-${Math.random()}`;

    if (this.isRealToken(this.bitbucketConfig.appPassword)) {
      console.log('🔍 Searching Bitbucket repositories (Real API):', query);
      
      return await this.makeRequest(requestKey, async () => {
        const params = new URLSearchParams({
          pagelen: limit.toString(),
          sort: '-updated_on'
        });
        
        if (query) {
          params.append('q', `name ~ "${query}"`);
        }
        
        const proxyUrl = `/api/bitbucket/2.0/repositories/${this.bitbucketConfig!.workspace}?${params}`;
        const headers = this.getBitbucketHeaders(this.bitbucketConfig!);
        console.log('🌐 Searching Bitbucket repositories via proxy:', proxyUrl);
        
        const controller = this.createAbortController(20000);
        
        const response = await fetch(proxyUrl, { 
          headers,
          signal: controller.signal
        });
        
        if (response.ok) {
          return await response.json();
        } else {
          const errorText = await response.text();
          console.error('🚫 Bitbucket search failed:', response.status, errorText);
          throw new Error(`Search failed: ${response.status} - ${errorText}`);
        }
      }, 20000);
    } else {
      console.log('🎭 Returning demo Bitbucket repositories');
      return this.getDemoBitbucketRepositories(query);
    }
  }

  async getBitbucketRepository(repoSlug: string): Promise<BitbucketRepository> {
    if (!this.bitbucketConfig) {
      throw new Error('Bitbucket not configured');
    }

    const requestKey = `bitbucket-repo-${repoSlug}-${Date.now()}`;

    if (this.isRealToken(this.bitbucketConfig.appPassword)) {
      return await this.makeRequest(requestKey, async () => {
        const proxyUrl = `/api/bitbucket/2.0/repositories/${this.bitbucketConfig!.workspace}/${repoSlug}`;
        const headers = this.getBitbucketHeaders(this.bitbucketConfig!);
        console.log('🌐 Getting Bitbucket repository via proxy:', proxyUrl);
        
        const controller = this.createAbortController(15000);
        
        const response = await fetch(proxyUrl, { 
          headers,
          signal: controller.signal
        });
        
        if (response.ok) {
          return await response.json();
        } else {
          const errorText = await response.text();
          console.error('🚫 Bitbucket repository fetch failed:', response.status, errorText);
          throw new Error(`Repository not found: ${response.status} - ${errorText}`);
        }
      }, 15000);
    } else {
      return this.getDemoBitbucketRepository(repoSlug);
    }
  }

  async searchBitbucketCode(query: string, repoSlug?: string, limit: number = 50): Promise<Record<string, unknown>> {
    if (!this.bitbucketConfig) {
      throw new Error('Bitbucket not configured');
    }

    if (this.isRealToken(this.bitbucketConfig.appPassword)) {
      const params = new URLSearchParams({
        search_query: query,
        pagelen: limit.toString()
      });

      const endpoint = repoSlug 
        ? `/2.0/repositories/${this.bitbucketConfig.workspace}/${repoSlug}/src`
        : `/2.0/workspaces/${this.bitbucketConfig.workspace}/search/code`;
      
      const proxyUrl = `/api/bitbucket${endpoint}?${params}`;
      const headers = this.getBitbucketHeaders(this.bitbucketConfig);
      console.log('🌐 Searching Bitbucket code via proxy:', proxyUrl);
      
      const response = await fetch(proxyUrl, { 
        headers
      });
      
      if (response.ok) {
        return await response.json();
      } else {
        const errorText = await response.text();
        console.error('🚫 Bitbucket code search failed:', response.status, errorText);
        throw new Error(`Code search failed: ${response.status} - ${errorText}`);
      }
    } else {
      return this.getDemoBitbucketCodeSearch(query);
    }
  }

  // JIRA Operations
  async searchJiraIssues(jql: string, maxResults: number = 50, startAt: number = 0): Promise<JiraSearchResult> {
    console.log('🔍 JIRA Search Debug:', {
      jiraConfigExists: !!this.jiraConfig,
      isConfigured: this.isConfiguredRef.current,
      configBaseUrl: this.jiraConfig?.baseUrl,
      configEmail: this.jiraConfig?.email,
      hasApiToken: !!this.jiraConfig?.apiToken,
      tokenLength: this.jiraConfig?.apiToken?.length
    });

    if (!this.jiraConfig) {
      console.error('❌ JIRA not configured - attempting to restore from localStorage');
      this.loadPersistedState();
      
      if (!this.jiraConfig) {
        throw new Error('JIRA not configured');
      }
    }

    const requestKey = `jira-search-${Date.now()}-${Math.random()}`;

    if (this.isRealToken(this.jiraConfig.apiToken)) {
      console.log('🔍 Searching JIRA issues (Real API):', jql);
      
      return await this.makeRequest(requestKey, async () => {
        const params = new URLSearchParams({
          jql: jql,
          maxResults: maxResults.toString(),
          startAt: startAt.toString(),
          expand: 'names,schema,operations,editmeta,renderedFields,changelog',
          fields: 'summary,description,status,priority,assignee,reporter,issuetype,project,updated,created,resolutiondate,resolution,labels,components,fixVersions,versions,environment,timetracking,customfield_10016,customfield_10000,watches,votes,comment'
        });
        
        const proxyUrl = `/api/jira/rest/api/3/search?${params}`;
        const headers = this.getJiraHeaders(this.jiraConfig!);
        console.log('🌐 Searching JIRA via proxy:', proxyUrl);
        
        const controller = this.createAbortController(25000);
        
        const response = await fetch(proxyUrl, { 
          headers,
          signal: controller.signal
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ JIRA search successful:', { total: result.total, issues: result.issues?.length });
          return result;
        } else {
          const errorText = await response.text();
          console.error('🚫 JIRA search failed:', response.status, errorText);
          throw new Error(`JIRA search failed: ${response.status} - ${errorText}`);
        }
      }, 25000);
    } else {
      console.log('🎭 Returning demo JIRA issues');
      return this.getDemoJiraIssues();
    }
  }

  async getJiraIssue(issueKey: string, expand?: string): Promise<JiraIssue> {
    if (!this.jiraConfig) {
      throw new Error('JIRA not configured');
    }

    const requestKey = `jira-issue-${issueKey}-${Date.now()}`;

    if (this.isRealToken(this.jiraConfig.apiToken)) {
      return await this.makeRequest(requestKey, async () => {
        let proxyUrl = `/api/jira/rest/api/3/issue/${issueKey}`;
        if (expand) {
          proxyUrl += `?expand=${expand}`;
        }
        
        const headers = this.getJiraHeaders(this.jiraConfig!);
        console.log('🌐 Getting JIRA issue via proxy:', proxyUrl);
        
        const controller = this.createAbortController(15000);
        
        const response = await fetch(proxyUrl, { 
          headers,
          signal: controller.signal
        });
        
        if (response.ok) {
          return await response.json();
        } else {
          const errorText = await response.text();
          console.error('🚫 JIRA issue fetch failed:', response.status, errorText);
          throw new Error(`Issue not found: ${response.status} - ${errorText}`);
        }
      }, 15000);
    } else {
      return this.getDemoJiraIssue(issueKey);
    }
  }

  async createJiraIssue(issueData: IssueCreationData): Promise<CreatedIssueResult> {
    if (!this.jiraConfig) {
      throw new Error('JIRA not configured');
    }

    if (this.isRealToken(this.jiraConfig.apiToken)) {
      const proxyUrl = `/api/jira/rest/api/3/issue`;
      const headers = this.getJiraHeaders(this.jiraConfig);
      console.log('🌐 Creating JIRA issue via proxy:', proxyUrl);
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          fields: {
            project: { key: issueData.projectKey },
            summary: issueData.summary,
            description: this.createADFDescription(issueData.description),
            issuetype: { name: issueData.issueType },
            priority: issueData.priority ? { name: issueData.priority } : undefined,
            assignee: issueData.assignee ? { emailAddress: issueData.assignee } : undefined
          }
        })
      });
      
      if (response.ok) {
        return await response.json();
      } else {
        const errorText = await response.text();
        console.error('🚫 JIRA issue creation failed:', response.status, errorText);
        throw new Error(`Issue creation failed: ${response.status} - ${errorText}`);
      }
    } else {
      return this.getDemoJiraIssueCreation();
    }
  }

  async getJiraProjects(): Promise<JiraProject[]> {
    if (!this.jiraConfig) {
      throw new Error('JIRA not configured');
    }

    if (this.isRealToken(this.jiraConfig.apiToken)) {
      const proxyUrl = `/api/jira/rest/api/3/project`;
      const headers = this.getJiraHeaders(this.jiraConfig);
      console.log('🌐 Getting JIRA projects via proxy:', proxyUrl);
      
      const response = await fetch(proxyUrl, { 
        headers
      });
      
      if (response.ok) {
        return await response.json();
      } else {
        const errorText = await response.text();
        console.error('🚫 JIRA projects fetch failed:', response.status, errorText);
        throw new Error(`Failed to get projects: ${response.status} - ${errorText}`);
      }
    } else {
      return this.getDemoJiraProjects();
    }
  }

  // Generic search methods for all projects and tickets
  async searchProjectByName(projectName: string): Promise<JiraProject | null> {
    if (!this.jiraConfig) {
      throw new Error('JIRA not configured');
    }

    const requestKey = `jira-project-search-${Date.now()}`;

    if (this.isRealToken(this.jiraConfig.apiToken)) {
      return await this.makeRequest(requestKey, async () => {
        const proxyUrl = `/api/jira/rest/api/3/project/search?query=${encodeURIComponent(projectName)}`;
        const headers = this.getJiraHeaders(this.jiraConfig!);
        console.log('🌐 Searching for project via proxy:', proxyUrl);
        
        const controller = this.createAbortController(15000);
        
        const response = await fetch(proxyUrl, { 
          headers,
          signal: controller.signal
        });
        
        if (response.ok) {
          const result = await response.json();
          const project = result.values?.find((project: JiraProject) => 
            project.name.toLowerCase().includes(projectName.toLowerCase()) || 
            project.key.toLowerCase().includes(projectName.toLowerCase())
          );
          return project || null;
        } else {
          const errorText = await response.text();
          console.error('🚫 Project search failed:', response.status, errorText);
          throw new Error(`Failed to search for project: ${response.status} - ${errorText}`);
        }
      }, 15000);
    } else {
      return this.getDemoProject(projectName);
    }
  }

  async searchTicketsByProject(projectKey: string, filters?: {
    status?: string;
    assignee?: string;
    issueType?: string;
    priority?: string;
    createdAfter?: string;
    updatedAfter?: string;
  }, limit: number = 50): Promise<JiraSearchResult> {
    if (!this.jiraConfig) {
      throw new Error('JIRA not configured');
    }

    const requestKey = `jira-project-tickets-${Date.now()}`;

    // Build JQL query dynamically
    let jql = `project = "${projectKey}"`;
    
    if (filters?.status) {
      jql += ` AND status = "${filters.status}"`;
    }
    if (filters?.assignee) {
      jql += ` AND assignee = "${filters.assignee}"`;
    }
    if (filters?.issueType) {
      jql += ` AND issuetype = "${filters.issueType}"`;
    }
    if (filters?.priority) {
      jql += ` AND priority = "${filters.priority}"`;
    }
    if (filters?.createdAfter) {
      jql += ` AND created >= "${filters.createdAfter}"`;
    }
    if (filters?.updatedAfter) {
      jql += ` AND updated >= "${filters.updatedAfter}"`;
    }
    
    jql += ' ORDER BY updated DESC';

    console.log('🎯 Searching project tickets with JQL:', jql);

    if (this.isRealToken(this.jiraConfig.apiToken)) {
      return await this.makeRequest(requestKey, async () => {
        const params = new URLSearchParams({
          jql: jql,
          maxResults: limit.toString(),
          startAt: '0',
          expand: 'names,schema,operations,editmeta,renderedFields,changelog',
          fields: 'summary,description,status,priority,assignee,reporter,issuetype,project,updated,created,resolutiondate,resolution,labels,components,fixVersions,versions,environment,timetracking,customfield_10016,customfield_10000,watches,votes,comment'
        });
        
        const proxyUrl = `/api/jira/rest/api/3/search?${params}`;
        const headers = this.getJiraHeaders(this.jiraConfig!);
        console.log('🌐 Searching project tickets via proxy:', proxyUrl);
        
        const controller = this.createAbortController(25000);
        
        const response = await fetch(proxyUrl, { 
          headers,
          signal: controller.signal
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Project tickets search successful:', { total: result.total, issues: result.issues?.length });
          return result;
        } else {
          const errorText = await response.text();
          console.error('🚫 Project tickets search failed:', response.status, errorText);
          throw new Error(`Project tickets search failed: ${response.status} - ${errorText}`);
        }
      }, 25000);
    } else {
      return this.getDemoProjectTickets(projectKey, filters);
    }
  }

  async getTicketsByStatus(projectKey?: string): Promise<{ [status: string]: JiraIssue[] }> {
    if (!this.jiraConfig) {
      throw new Error('JIRA not configured');
    }

    const requestKey = `jira-tickets-by-status-${Date.now()}`;

    if (this.isRealToken(this.jiraConfig.apiToken)) {
      return await this.makeRequest(requestKey, async () => {
        let jql = projectKey ? `project = "${projectKey}"` : 'project is not EMPTY';
        jql += ' ORDER BY status, updated DESC';
        
        const params = new URLSearchParams({
          jql: jql,
          maxResults: '100',
          startAt: '0',
          expand: 'names,schema,operations,editmeta,renderedFields,changelog',
          fields: 'summary,description,status,priority,assignee,reporter,issuetype,project,updated,created,resolutiondate,resolution,labels,components,fixVersions,versions,environment,timetracking,customfield_10016,customfield_10000,watches,votes,comment'
        });
        
        const proxyUrl = `/api/jira/rest/api/3/search?${params}`;
        const headers = this.getJiraHeaders(this.jiraConfig!);
        console.log('🌐 Getting tickets by status via proxy:', proxyUrl);
        
        const controller = this.createAbortController(25000);
        
        const response = await fetch(proxyUrl, { 
          headers,
          signal: controller.signal
        });
        
        if (response.ok) {
          const result = await response.json();
          
          // Group tickets by status
          const ticketsByStatus: { [status: string]: JiraIssue[] } = {};
          result.issues?.forEach((issue: JiraIssue) => {
            const status = issue.fields.status?.name || 'Unknown';
            if (!ticketsByStatus[status]) {
              ticketsByStatus[status] = [];
            }
            ticketsByStatus[status].push(issue);
          });
          
          console.log('✅ Tickets by status:', Object.keys(ticketsByStatus).map(status => 
            `${status}: ${ticketsByStatus[status].length}`
          ).join(', '));
          
          return ticketsByStatus;
        } else {
          const errorText = await response.text();
          console.error('🚫 Tickets by status failed:', response.status, errorText);
          throw new Error(`Failed to get tickets by status: ${response.status} - ${errorText}`);
        }
      }, 25000);
    } else {
      return this.getDemoTicketsByStatus(projectKey);
    }
  }

  async getSpecificTicket(ticketKey: string): Promise<JiraIssue> {
    if (!this.jiraConfig) {
      throw new Error('JIRA not configured');
    }
    
    console.log('🎯 Getting specific ticket:', ticketKey);
    
    return await this.getJiraIssue(ticketKey, 'renderedFields,names,schema,operations,editmeta,changelog');
  }

  // Generic intelligent search using LLM-processed queries
  async intelligentSearch(userQuery: string): Promise<{
    intent: string;
    searchResults: SearchResult[];
    suggestions: string[];
  }> {
    console.log('🧠 Processing intelligent search for:', userQuery);
    
    // Parse user intent using simple NLP patterns
    const intent = this.parseUserIntent(userQuery);
    console.log('🎯 Detected intent:', intent);
    
    let searchResults: SearchResult[] = [];
    const suggestions: string[] = [];
    
    try {
      switch (intent.type) {
        case 'project_search':
          if (intent.projectName) {
            const project = await this.searchProjectByName(intent.projectName);
            if (project) {
              searchResults.push({
                id: project.key,
                title: `Project: ${project.name}`,
                description: project.description || 'No description available',
                url: `${this.jiraConfig!.baseUrl}/projects/${project.key}`,
                type: 'project',
                source: 'JIRA',
                metadata: {
                  projectKey: project.key,
                  projectType: project.projectTypeKey,
                  lead: project.lead?.displayName
                }
              });
              suggestions.push(`Search tickets in ${project.name}`, `View ${project.name} board`);
            }
          }
          break;
          
        case 'ticket_search':
          if (intent.ticketKey) {
            console.log('🎫 Searching for specific ticket:', intent.ticketKey);
            try {
              const ticket = await this.getSpecificTicket(intent.ticketKey);
              const comprehensiveMetadata = this.extractComprehensiveMetadata(ticket);
              
              // Add pull request information if available
              if (ticket.fields.customfield_10000) {
                comprehensiveMetadata.pullRequests = this.parsePullRequestInfo(ticket.fields.customfield_10000);
              }
              
              searchResults.push({
                id: ticket.key,
                title: `${ticket.key}: ${ticket.fields.summary}`,
                description: this.extractJiraDescription(ticket.fields.description),
                url: `${this.jiraConfig!.baseUrl}/browse/${ticket.key}`,
                type: 'ticket',
                source: 'JIRA',
                metadata: comprehensiveMetadata
              });
              console.log('✅ Found specific ticket:', ticket.key);
            } catch (error) {
              console.warn('⚠️ Specific ticket not found, trying general search:', error);
              // Fallback to JQL search if specific ticket not found
              try {
                const jql = `key = "${intent.ticketKey}" OR summary ~ "${intent.ticketKey}" OR description ~ "${intent.ticketKey}"`;
                const results = await this.searchJiraIssues(jql, 10);
                searchResults = results.issues.map(issue => {
                  const comprehensiveMetadata = this.extractComprehensiveMetadata(issue);
                  
                  // Add pull request information if available
                  if (issue.fields.customfield_10000) {
                    comprehensiveMetadata.pullRequests = this.parsePullRequestInfo(issue.fields.customfield_10000);
                  }
                  
                  return {
                    id: issue.key,
                    title: `${issue.key}: ${issue.fields.summary}`,
                    description: this.extractJiraDescription(issue.fields.description),
                    url: `${this.jiraConfig!.baseUrl}/browse/${issue.key}`,
                    type: 'ticket',
                    source: 'JIRA',
                    metadata: comprehensiveMetadata
                  };
                });
                console.log(`🔍 Fallback search found ${searchResults.length} results`);
              } catch (fallbackError) {
                console.error('❌ Fallback search also failed:', fallbackError);
                suggestions.push('Check ticket ID spelling', 'Try searching by summary', 'Browse project tickets');
              }
            }
          } else if (intent.filters) {
            // Generic ticket search with filters - no project key required
            console.log('🔍 Searching tickets with filters:', intent.filters);
            const jqlParts = [];
            
            if (intent.filters.status) {
              jqlParts.push(`status = "${intent.filters.status}"`);
            }
            if (intent.filters.assignee) {
              jqlParts.push(`assignee = "${intent.filters.assignee}"`);
            }
            if (intent.filters.issueType) {
              jqlParts.push(`type = "${intent.filters.issueType}"`);
            }
            if (intent.filters.priority) {
              jqlParts.push(`priority = "${intent.filters.priority}"`);
            }
            
            const jql = jqlParts.length > 0 
              ? jqlParts.join(' AND ') + ' ORDER BY updated DESC'
              : 'ORDER BY updated DESC';
              
            const results = await this.searchJiraIssues(jql, 50);
            searchResults = results.issues.map(issue => {
              const comprehensiveMetadata = this.extractComprehensiveMetadata(issue);
              
              // Add pull request information if available
              if (issue.fields.customfield_10000) {
                comprehensiveMetadata.pullRequests = this.parsePullRequestInfo(issue.fields.customfield_10000);
              }
              
              return {
                id: issue.key,
                title: `${issue.key}: ${issue.fields.summary}`,
                description: this.extractJiraDescription(issue.fields.description),
                url: `${this.jiraConfig!.baseUrl}/browse/${issue.key}`,
                type: 'ticket',
                source: 'JIRA',
                metadata: comprehensiveMetadata
              };
            });
          }
          break;
          
        case 'status_search': {
          const ticketsByStatus = await this.getTicketsByStatus(intent.projectKey);
          Object.entries(ticketsByStatus).forEach(([status, tickets]) => {
            if (!intent.status || status.toLowerCase().includes(intent.status.toLowerCase())) {
              tickets.forEach(ticket => {
                const comprehensiveMetadata = this.extractComprehensiveMetadata(ticket);
                
                // Add pull request information if available
                if (ticket.fields.customfield_10000) {
                  comprehensiveMetadata.pullRequests = this.parsePullRequestInfo(ticket.fields.customfield_10000);
                }
                
                searchResults.push({
                  id: ticket.key,
                  title: `${ticket.key}: ${ticket.fields.summary}`,
                  description: `Status: ${status} | ${this.extractJiraDescription(ticket.fields.description)}`,
                  url: `${this.jiraConfig!.baseUrl}/browse/${ticket.key}`,
                  type: 'ticket',
                  source: 'JIRA',
                  metadata: comprehensiveMetadata
                });
              });
            }
          });
          break;
        }
          
        default:
          // Fallback to general search
          searchResults = await this.unifiedSearch(userQuery);
          break;
      }
      
      // Add general suggestions
      if (searchResults.length > 0) {
        suggestions.push('Refine search', 'Export results', 'Create similar ticket');
      } else {
        suggestions.push('Try different keywords', 'Check project name', 'Browse all projects');
      }
      
    } catch (error) {
      console.error('❌ Intelligent search failed:', error);
      // Fallback to regular search
      searchResults = await this.unifiedSearch(userQuery);
    }
    
    return {
      intent: intent.type,
      searchResults,
      suggestions
    };
  }

  // Enhanced NLP intent parsing with URL and ticket ID support
  private parseUserIntent(query: string): {
    type: 'project_search' | 'ticket_search' | 'status_search' | 'general_search';
    projectName?: string;
    projectKey?: string;
    ticketKey?: string;
    status?: string;
    filters?: {
      status?: string;
      assignee?: string;
      issueType?: string;
      priority?: string;
      createdAfter?: string;
      updatedAfter?: string;
    };
  } {
    const lowerQuery = query.toLowerCase();
    
    console.log('🧠 Parsing user intent for query:', query);
    
    // ENHANCED: Check for Jira URL patterns first
    const jiraUrlMatch = query.match(/(?:https?:\/\/)?(?:[\w-]+\.)?(?:atlassian\.net|jira\.[\w-]+\.[\w]+)\/browse\/([A-Z]{2,}-\d+)/i);
    if (jiraUrlMatch) {
      console.log('🎯 Detected Jira URL pattern:', jiraUrlMatch[1]);
      return {
        type: 'ticket_search',
        ticketKey: jiraUrlMatch[1].toUpperCase()
      };
    }
    
    // ENHANCED: Check for ticket key patterns (more flexible)
    const ticketKeyPatterns = [
      /\b([A-Z]{2,10}-\d+)\b/g,  // Standard format: NSVP-123, DEVOPS-456
      /\b([A-Z]+\d+)\b/g,        // Compact format: NSVP123
      /ticket[:\s]+([A-Z]{2,10}-\d+)/gi,  // "ticket: NSVP-123"
      /issue[:\s]+([A-Z]{2,10}-\d+)/gi    // "issue: NSVP-123"
    ];
    
    for (const pattern of ticketKeyPatterns) {
      const matches = Array.from(query.matchAll(pattern));
      if (matches.length > 0) {
        const ticketKey = matches[0][1].toUpperCase();
        // Ensure it's a valid format
        if (/^[A-Z]{2,10}-?\d+$/.test(ticketKey)) {
          const normalizedKey = ticketKey.includes('-') ? ticketKey : ticketKey.replace(/([A-Z]+)(\d+)/, '$1-$2');
          console.log('🎯 Detected ticket key:', normalizedKey);
          return {
            type: 'ticket_search',
            ticketKey: normalizedKey
          };
        }
      }
    }
    
    // ENHANCED: Check for specific project names (including yours)
    const projectPatterns = [
      /project[:\s]+(\w+)/gi,
      /proj[:\s]+(\w+)/gi,
      /\b(island|nsvp|demo|test)\b/gi  // Add your specific project names
    ];
    
    for (const pattern of projectPatterns) {
      const match = query.match(pattern);
      if (match) {
        const projectName = match[1] || match[0];
        console.log('🎯 Detected project search:', projectName);
        return {
          type: 'project_search',
          projectName: projectName.toLowerCase()
        };
      }
    }
    
    // ENHANCED: Status-related queries with better detection
    const statusKeywords = [
      'in progress', 'todo', 'done', 'closed', 'open', 'blocked', 
      'resolved', 'pending', 'review', 'testing', 'backlog'
    ];
    
    const statusMatch = statusKeywords.find(keyword => lowerQuery.includes(keyword));
    if (statusMatch) {
      console.log('🎯 Detected status search:', statusMatch);
      return {
        type: 'status_search',
        status: statusMatch
      };
    }
    
    // ENHANCED: Ticket search with better keyword detection
    const ticketKeywords = ['ticket', 'issue', 'bug', 'task', 'story', 'epic', 'defect'];
    const hasTicketKeyword = ticketKeywords.some(keyword => lowerQuery.includes(keyword));
    
    if (hasTicketKeyword) {
      console.log('🎯 Detected general ticket search');
      return {
        type: 'ticket_search',
        filters: this.extractFilters(query)
      };
    }
    
    console.log('🎯 Defaulting to general search');
    return {
      type: 'general_search'
    };
  }
  
  private extractFilters(query: string): {
    status?: string;
    assignee?: string;
    issueType?: string;
    priority?: string;
    createdAfter?: string;
    updatedAfter?: string;
  } | undefined {
    const filters: {
      status?: string;
      assignee?: string;
      issueType?: string;
      priority?: string;
      createdAfter?: string;
      updatedAfter?: string;
    } = {};
    
    // Extract assignee
    const assigneeMatch = query.match(/assignee[:\s]+(\w+)/i) || query.match(/assigned\s+to\s+(\w+)/i);
    if (assigneeMatch) {
      filters.assignee = assigneeMatch[1];
    }
    
    // Extract priority
    const priorityMatch = query.match(/priority[:\s]+(\w+)/i) || query.match(/(high|medium|low|critical)\s+priority/i);
    if (priorityMatch) {
      filters.priority = priorityMatch[1];
    }
    
    // Extract issue type
    const typeMatch = query.match(/type[:\s]+(\w+)/i) || query.match(/(bug|task|story|epic)\s/i);
    if (typeMatch) {
      filters.issueType = typeMatch[1];
    }
    
    return Object.keys(filters).length > 0 ? filters : undefined;
  }

  // Unified Search
  async unifiedSearch(query: string): Promise<SearchResult[]> {
    console.log('🔍 Unified Search Debug:', {
      query: query,
      bitbucketConfigured: !!this.bitbucketConfig,
      jiraConfigured: !!this.jiraConfig,
      isConfigured: this.isConfiguredRef.current,
      healthStatus: this.getHealthStatus()
    });

    const results: SearchResult[] = [];
    const requestKey = `unified-search-${Date.now()}-${Math.random()}`;

    return await this.makeRequest(requestKey, async () => {
      try {
        // Search Bitbucket if configured
        if (this.bitbucketConfig) {
          console.log('🔍 Searching Bitbucket...');
          const bitbucketResults = await this.searchBitbucket(query);
          console.log('✅ Bitbucket search completed:', bitbucketResults.length, 'results');
          results.push(...bitbucketResults);
        } else {
          console.log('⚠️ Bitbucket not configured, skipping');
        }

        // Search JIRA if configured
        if (this.jiraConfig) {
          console.log('🔍 Searching JIRA...');
          const jiraResults = await this.searchJira(query);
          console.log('✅ JIRA search completed:', jiraResults.length, 'results');
          results.push(...jiraResults);
        } else {
          console.log('⚠️ JIRA not configured, skipping');
        }
      } catch (error) {
        console.error('❌ Unified search error:', error);
        throw error; // Re-throw to let the caller handle it
      }

      console.log('🎯 Unified search final results:', results.length, 'total results');
      return results;
    }, 30000);
  }

  private async searchBitbucket(query: string): Promise<SearchResult[]> {
    try {
      const repos = await this.searchBitbucketRepositories(query, 25);
      
      return (repos.values || []).map((repo: BitbucketRepository) => ({
        id: repo.uuid || repo.name,
        title: repo.name,
        description: repo.description || 'No description available',
        url: repo.links?.html?.href || `${this.bitbucketConfig!.baseUrl}/${this.bitbucketConfig!.workspace}/${repo.name}`,
        type: 'bitbucket-repo',
        source: 'Bitbucket',
        metadata: {
          language: repo.language,
          isPrivate: repo.is_private,
          size: repo.size,
          updatedOn: repo.updated_on
        }
      }));
    } catch (error) {
      console.error('Bitbucket search error:', error);
      return [];
    }
  }

  private async searchJira(query: string): Promise<SearchResult[]> {
    try {
      const jql = `text ~ "${query}" ORDER BY updated DESC`;
      const searchResults = await this.searchJiraIssues(jql, 25);
      
      return (searchResults.issues || []).map((issue: JiraIssue) => {
        const comprehensiveMetadata = this.extractComprehensiveMetadata(issue);
        
        // Add pull request information if available
        if (issue.fields.customfield_10000) {
          comprehensiveMetadata.pullRequests = this.parsePullRequestInfo(issue.fields.customfield_10000);
        }
        
        return {
          id: issue.key,
          title: `${issue.key}: ${issue.fields.summary}`,
          description: this.extractJiraDescription(issue.fields.description),
          url: `${this.jiraConfig!.baseUrl}/browse/${issue.key}`,
          type: 'jira-issue',
          source: 'JIRA',
          metadata: comprehensiveMetadata
        };
      });
    } catch (error) {
      console.error('JIRA search error:', error);
      return [];
    }
  }

  // Cleanup Methods
  cleanup(): void {
    console.log('🧹 Cleaning up Enhanced In-House MCP Service...');
    this.requestManager.cleanup();
    this.isConfiguredRef.current = false;
    this.bitbucketConfig = null;
    this.jiraConfig = null;
    // Clear persisted state
    try {
      localStorage.removeItem('pinelens-bitbucket-config');
      localStorage.removeItem('pinelens-jira-config');
      console.log('🗑️ Cleared persisted configuration state');
    } catch (error) {
      console.warn('⚠️ Failed to clear persisted state:', error);
    }
  }

  // Method to disconnect from a specific service
  disconnectBitbucket(): void {
    console.log('🔌 Disconnecting from Bitbucket...');
    this.bitbucketConfig = null;
    try {
      localStorage.removeItem('pinelens-bitbucket-config');
    } catch (error) {
      console.warn('⚠️ Failed to clear Bitbucket config:', error);
    }
    if (!this.jiraConfig) {
      this.isConfiguredRef.current = false;
    }
  }

  disconnectJira(): void {
    console.log('🔌 Disconnecting from JIRA...');
    this.jiraConfig = null;
    try {
      localStorage.removeItem('pinelens-jira-config');
    } catch (error) {
      console.warn('⚠️ Failed to clear JIRA config:', error);
    }
    if (!this.bitbucketConfig) {
      this.isConfiguredRef.current = false;
    }
  }

  // Helper method to extract comprehensive metadata from Jira issue
  private extractComprehensiveMetadata(issue: JiraIssue): SearchResultMetadata {
    const metadata: SearchResultMetadata = {
      status: issue.fields.status?.name,
      priority: issue.fields.priority?.name,
      assignee: issue.fields.assignee?.displayName,
      reporter: issue.fields.reporter?.displayName,
      issueType: issue.fields.issuetype?.name,
      updated: issue.fields.updated,
      created: issue.fields.created,
      projectKey: issue.fields.project?.key,
      projectName: issue.fields.project?.name,
      projectType: issue.fields.project?.projectTypeKey,
      resolution: issue.fields.resolution?.name,
      labels: issue.fields.labels || [],
      components: issue.fields.components?.map(c => c.name) || [],
      fixVersions: issue.fields.fixVersions?.map(v => `${v.name}${v.releaseDate ? ` (${new Date(v.releaseDate).toLocaleDateString()})` : ''}`) || [],
      affectsVersions: issue.fields.versions?.map(v => `${v.name}${v.releaseDate ? ` (${new Date(v.releaseDate).toLocaleDateString()})` : ''}`) || [],
      environment: issue.fields.environment,
      storyPoints: issue.fields.customfield_10016,
      timeTracking: issue.fields.timetracking ? {
        originalEstimate: issue.fields.timetracking.originalEstimate,
        remainingEstimate: issue.fields.timetracking.remainingEstimate,
        timeSpent: issue.fields.timetracking.timeSpent
      } : undefined
    };

    // Extract custom field information
    const customFields: Record<string, unknown> = {};
    if (issue.fields.customfield_10000) {
      customFields.developmentField = issue.fields.customfield_10000;
    }
    if (issue.fields.watches?.watchCount) {
      customFields.watchCount = issue.fields.watches.watchCount;
    }
    if (issue.fields.votes?.votes) {
      customFields.voteCount = issue.fields.votes.votes;
    }
    if (issue.fields.comment?.total) {
      customFields.commentCount = issue.fields.comment.total;
    }
    
    if (Object.keys(customFields).length > 0) {
      metadata.customFields = customFields;
    }

    return metadata;
  }

  // Helper method to parse development information (pull requests)
  private parsePullRequestInfo(developmentField: string): SearchResultMetadata['pullRequests'] {
    try {
      const devInfo = JSON.parse(developmentField);
      if (devInfo && devInfo.summary && devInfo.summary.pullrequest) {
        const prSummary = devInfo.summary.pullrequest;
        return {
          total: prSummary.overall?.count || 0,
          open: prSummary.byInstanceType?.bitbucket?.open?.count || 0,
          merged: prSummary.byInstanceType?.bitbucket?.merged?.count || 0,
          declined: prSummary.byInstanceType?.bitbucket?.declined?.count || 0,
          details: devInfo.detail?.pullRequests?.map((pr: unknown) => {
            const pullRequest = pr as Record<string, unknown>;
            return {
              id: pullRequest.id as string,
              title: pullRequest.title as string,
              status: pullRequest.status as string,
              url: pullRequest.url as string,
              author: (pullRequest.author as Record<string, unknown>)?.name as string,
              created: pullRequest.created as string
            };
          }) || []
        };
      }
    } catch (error) {
      console.warn('Failed to parse development field:', error);
    }
    return undefined;
  }

  // Health check method
  getHealthStatus(): { 
    version: string;
    activeRequests: number;
    isConfigured: boolean;
    bitbucketConfigured: boolean;
    jiraConfigured: boolean;
    configurationPersisted: boolean;
  } {
    const bitbucketPersisted = !!localStorage.getItem('pinelens-bitbucket-config');
    const jiraPersisted = !!localStorage.getItem('pinelens-jira-config');
    
    return {
      version: this.version,
      activeRequests: this.requestManager.getActiveRequestCount(),
      isConfigured: this.isConfiguredRef.current,
      bitbucketConfigured: !!this.bitbucketConfig,
      jiraConfigured: !!this.jiraConfig,
      configurationPersisted: bitbucketPersisted || jiraPersisted
    };
  }

  // Method to verify if stored configurations are still valid
  async verifyStoredConnections(): Promise<{
    bitbucket: { valid: boolean; error?: string };
    jira: { valid: boolean; error?: string };
  }> {
    const result = {
      bitbucket: { valid: false, error: undefined as string | undefined },
      jira: { valid: false, error: undefined as string | undefined }
    };

    // Test Bitbucket connection if configured
    if (this.bitbucketConfig) {
      try {
        const testResult = await this.configureBitbucket(this.bitbucketConfig);
        result.bitbucket.valid = testResult.success;
        if (!testResult.success) {
          result.bitbucket.error = testResult.error;
        }
      } catch (error) {
        result.bitbucket.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    // Test JIRA connection if configured
    if (this.jiraConfig) {
      try {
        const testResult = await this.configureJira(this.jiraConfig);
        result.jira.valid = testResult.success;
        if (!testResult.success) {
          result.jira.error = testResult.error;
        }
      } catch (error) {
        result.jira.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    return result;
  }
  private getBitbucketHeaders(config: MCPConfig): Record<string, string> {
    const credentials = `${config.username}:${config.appPassword}`;
    const encodedCredentials = btoa(credentials);
    return {
      'Authorization': `Basic ${encodedCredentials}`,
      'Accept': 'application/json'
    };
  }

  private getJiraHeaders(config: MCPConfig): Record<string, string> {
    const credentials = `${config.email}:${config.apiToken}`;
    const encodedCredentials = btoa(credentials);
    
    // Debug logging (remove in production)
    console.log('🔑 JIRA Auth Debug:', {
      email: config.email,
      tokenLength: config.apiToken?.length,
      encodedLength: encodedCredentials.length
    });
    
    return {
      'Authorization': `Basic ${encodedCredentials}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  }

  private isRealToken(token?: string): boolean {
    return !!(token && token.length > 20 && !token.includes('demo'));
  }

  private createADFDescription(text: string): ADFContent {
    return {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: text
            }
          ]
        }
      ]
    };
  }

  private extractJiraDescription(adfContent?: ADFContent): string {
    if (!adfContent?.content) return '';
    
    let text = '';
    const extractText = (node: ADFNode) => {
      if (node.type === 'text' && node.text) {
        text += node.text;
      } else if (node.content) {
        node.content.forEach(extractText);
      }
    };
    
    adfContent.content.forEach(extractText);
    return text.substring(0, 200) + (text.length > 200 ? '...' : '');
  }

  // Demo Data Methods
  private getDemoBitbucketRepositories(query: string = '') {
    const repos = [
      {
        name: 'pinelens-frontend',
        description: 'Main frontend application for PineLens',
        language: 'TypeScript',
        is_private: false,
        size: 15678934,
        updated_on: '2025-01-15T10:30:00Z',
        links: { html: { href: 'https://bitbucket.org/demo/pinelens-frontend' } }
      },
      {
        name: 'api-gateway',
        description: 'Microservices API gateway',
        language: 'JavaScript',
        is_private: true,
        size: 5432156,
        updated_on: '2025-01-14T15:45:00Z',
        links: { html: { href: 'https://bitbucket.org/demo/api-gateway' } }
      },
      {
        name: 'data-processor',
        description: 'ETL pipeline for data processing',
        language: 'Python',
        is_private: true,
        size: 8901234,
        updated_on: '2025-01-13T09:15:00Z',
        links: { html: { href: 'https://bitbucket.org/demo/data-processor' } }
      }
    ];

    const filtered = query 
      ? repos.filter(repo => 
          repo.name.toLowerCase().includes(query.toLowerCase()) ||
          repo.description.toLowerCase().includes(query.toLowerCase())
        )
      : repos;

    return {
      values: filtered,
      size: filtered.length,
      page: 1,
      pagelen: 50
    };
  }

  private getDemoBitbucketRepository(repoSlug: string) {
    return {
      name: repoSlug,
      description: `Demo repository: ${repoSlug}`,
      language: 'TypeScript',
      is_private: false,
      size: 12345678,
      created_on: '2024-06-01T00:00:00Z',
      updated_on: '2025-01-15T10:30:00Z',
      links: { html: { href: `https://bitbucket.org/demo/${repoSlug}` } }
    };
  }

  private getDemoBitbucketCodeSearch(query: string) {
    return {
      values: [
        {
          file: { path: 'src/components/SearchBar.tsx' },
          content_matches: [
            { line: 25, segment: `function search(${query}) {` },
            { line: 42, segment: `// Handle ${query} processing` }
          ]
        },
        {
          file: { path: 'src/utils/api.ts' },
          content_matches: [
            { line: 15, segment: `const ${query}Endpoint = '/api/search';` }
          ]
        }
      ]
    };
  }

  private getDemoJiraIssues(): JiraSearchResult {
    const issues: JiraIssue[] = [
      {
        key: 'NSVP-27299',
        fields: {
          summary: 'Implement advanced search functionality',
          description: this.createADFDescription('Add advanced search with filters and faceted search capabilities'),
          status: { name: 'In Progress' },
          priority: { name: 'High' },
          assignee: { displayName: 'John Doe' },
          issuetype: { name: 'Story' },
          updated: '2025-01-15T10:30:00Z'
        }
      },
      {
        key: 'NSVP-27300',
        fields: {
          summary: 'Fix authentication bug in MCP integration',
          description: this.createADFDescription('Users experiencing authentication failures when connecting to MCP servers'),
          status: { name: 'Open' },
          priority: { name: 'Critical' },
          assignee: { displayName: 'Jane Smith' },
          issuetype: { name: 'Bug' },
          updated: '2025-01-14T16:45:00Z'
        }
      },
      {
        key: 'NSVP-27301',
        fields: {
          summary: 'Add real-time notifications',
          description: this.createADFDescription('Implement WebSocket-based real-time notifications for search results'),
          status: { name: 'Backlog' },
          priority: { name: 'Medium' },
          assignee: null,
          issuetype: { name: 'Feature' },
          updated: '2025-01-13T12:20:00Z'
        }
      }
    ];

    return {
      issues: issues,
      total: issues.length,
      startAt: 0,
      maxResults: 50
    };
  }

  private getDemoJiraIssue(issueKey: string): JiraIssue {
    return {
      key: issueKey,
      fields: {
        summary: `Demo issue: ${issueKey}`,
        description: this.createADFDescription(`This is a demo issue for ${issueKey}`),
        status: { name: 'In Progress' },
        priority: { name: 'Medium' },
        assignee: { displayName: 'Demo User' },
        issuetype: { name: 'Task' },
        created: '2025-01-10T09:00:00Z',
        updated: '2025-01-15T10:30:00Z'
      }
    };
  }

  private getDemoJiraIssueCreation(): CreatedIssueResult {
    return {
      key: `DEMO-${Math.floor(Math.random() * 1000)}`,
      id: `${Math.floor(Math.random() * 100000)}`,
      self: 'https://demo.atlassian.net/rest/api/3/issue/10000'
    };
  }

  private getDemoJiraProjects(): JiraProject[] {
    return [
      {
        key: 'NSVP',
        name: 'PineLens Project',
        description: 'Main PineLens development project',
        projectTypeKey: 'software',
        lead: { displayName: 'Project Lead' }
      },
      {
        key: 'DEMO',
        name: 'Demo Project',
        description: 'Demo project for testing',
        projectTypeKey: 'software',
        lead: { displayName: 'Demo Lead' }
      }
    ];
  }

  // Status Methods
  isBitbucketConfigured(): boolean {
    if (!this.bitbucketConfig) {
      this.loadPersistedState();
    }
    return !!this.bitbucketConfig;
  }

  isJiraConfigured(): boolean {
    if (!this.jiraConfig) {
      this.loadPersistedState();
    }
    return !!this.jiraConfig;
  }

  isConfigured(): boolean {
    if (!this.isConfiguredRef.current && (this.bitbucketConfig || this.jiraConfig)) {
      this.isConfiguredRef.current = true;
    }
    return this.isConfiguredRef.current;
  }

  getBitbucketConfig(): MCPConfig | null {
    if (!this.bitbucketConfig) {
      this.loadPersistedState();
    }
    return this.bitbucketConfig;
  }

  getJiraConfig(): MCPConfig | null {
    if (!this.jiraConfig) {
      this.loadPersistedState();
    }
    return this.jiraConfig;
  }

  // Debug method to force reload state
  reloadConfiguration(): void {
    console.log('🔄 Force reloading configuration from storage...');
    this.loadPersistedState();
    console.log('📊 Configuration after reload:', {
      bitbucketConfigured: !!this.bitbucketConfig,
      jiraConfigured: !!this.jiraConfig,
      isConfigured: this.isConfiguredRef.current
    });
  }

  // Demo methods for generic project functionality
  private getDemoProject(projectName: string): JiraProject {
    return {
      key: projectName.toUpperCase().substring(0, 4),
      name: `${projectName} Project`,
      description: `Demo project for ${projectName}`,
      projectTypeKey: 'software',
      lead: { displayName: 'Demo User' }
    };
  }

  private getDemoProjectTickets(projectKey: string, filters?: {
    status?: string;
    assignee?: string;
    issueType?: string;
    priority?: string;
    createdAfter?: string;
    updatedAfter?: string;
  }): JiraSearchResult {
    const allTickets: JiraIssue[] = [
      {
        key: `${projectKey}-1`,
        fields: {
          summary: 'Implement user authentication',
          description: this.createADFDescription('Add secure user authentication to the application'),
          status: { name: 'In Progress' },
          priority: { name: 'High' },
          assignee: { displayName: 'John Doe' },
          issuetype: { name: 'Task' },
          updated: '2025-01-15T10:30:00.000+0000',
          created: '2025-01-10T09:00:00.000+0000'
        }
      },
      {
        key: `${projectKey}-2`,
        fields: {
          summary: 'Fix database connection issue',
          description: this.createADFDescription('Database connections are timing out in production'),
          status: { name: 'To Do' },
          priority: { name: 'Critical' },
          assignee: { displayName: 'Jane Smith' },
          issuetype: { name: 'Bug' },
          updated: '2025-01-14T16:45:00.000+0000',
          created: '2025-01-14T08:30:00.000+0000'
        }
      },
      {
        key: `${projectKey}-3`,
        fields: {
          summary: 'Update documentation',
          description: this.createADFDescription('Documentation needs to be updated for new features'),
          status: { name: 'Done' },
          priority: { name: 'Medium' },
          assignee: { displayName: 'Mike Johnson' },
          issuetype: { name: 'Task' },
          updated: '2025-01-13T14:20:00.000+0000',
          created: '2025-01-12T11:00:00.000+0000'
        }
      }
    ];

    // Apply filters
    let filteredTickets = allTickets;
    if (filters?.status) {
      filteredTickets = filteredTickets.filter(ticket => 
        ticket.fields.status?.name.toLowerCase() === filters.status!.toLowerCase()
      );
    }
    if (filters?.assignee) {
      filteredTickets = filteredTickets.filter(ticket => 
        ticket.fields.assignee?.displayName.toLowerCase().includes(filters.assignee!.toLowerCase())
      );
    }
    if (filters?.priority) {
      filteredTickets = filteredTickets.filter(ticket => 
        ticket.fields.priority?.name.toLowerCase() === filters.priority!.toLowerCase()
      );
    }
    if (filters?.issueType) {
      filteredTickets = filteredTickets.filter(ticket => 
        ticket.fields.issuetype?.name.toLowerCase() === filters.issueType!.toLowerCase()
      );
    }

    return {
      issues: filteredTickets,
      total: filteredTickets.length,
      startAt: 0,
      maxResults: 50
    };
  }

  private getDemoTicketsByStatus(projectKey?: string): { [status: string]: JiraIssue[] } {
    const demoTickets = this.getDemoProjectTickets(projectKey || 'DEMO');
    const ticketsByStatus: { [status: string]: JiraIssue[] } = {};
    
    demoTickets.issues.forEach(issue => {
      const status = issue.fields.status?.name || 'Unknown';
      if (!ticketsByStatus[status]) {
        ticketsByStatus[status] = [];
      }
      ticketsByStatus[status].push(issue);
    });
    
    return ticketsByStatus;
  }
}

// Export singleton instance for use across the app
export const enhancedInHouseMCPService = new EnhancedInHouseMCPService();
