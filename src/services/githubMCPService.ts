/**
 * GitHub MCP Service
 * Implements GitHub search functionality for the MCP client
 */

interface GitHubLabel {
  name: string;
  color: string;
}

interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
}

interface GitHubRepository {
  id: number;
  full_name: string;
  name: string;
  description: string | null;
  html_url: string;
  owner: GitHubUser;
  updated_at: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  private: boolean;
  default_branch: string;
  topics: string[];
  size: number;
}

interface GitHubIssue {
  id: number;
  title: string;
  body: string | null;
  html_url: string;
  user: GitHubUser;
  updated_at: string;
  state: string;
  labels: GitHubLabel[];
  number: number;
  comments: number;
  assignees: GitHubUser[];
  repository_url: string;
  pull_request?: {
    url: string;
  };
}

interface GitHubCodeResult {
  name: string;
  path: string;
  sha: string;
  html_url: string;
  repository: GitHubRepository;
}

interface GitHubCommit {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  repository: GitHubRepository;
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
}

export interface GitHubCredentials {
  username: string;
  token: string;
}

export interface GitHubSearchResult {
  id: string;
  title: string;
  content: string;
  url: string;
  author: string;
  date: string;
  type: 'repository' | 'issue' | 'pull_request' | 'code' | 'commit';
  metadata: {
    repository?: string;
    language?: string;
    stars?: number;
    forks?: number;
    state?: string;
    labels?: string[];
    [key: string]: unknown;
  };
}

export class GitHubMCPService {
  private baseUrl = 'https://api.github.com';
  private credentials: GitHubCredentials | null = null;

  constructor(credentials?: GitHubCredentials) {
    if (credentials) {
      this.credentials = credentials;
    }
  }

  setCredentials(credentials: GitHubCredentials): void {
    this.credentials = credentials;
  }

  private getHeaders(): HeadersInit {
    if (!this.credentials) {
      throw new Error('GitHub credentials not configured');
    }

    return {
      'Authorization': `Bearer ${this.credentials.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'PineLens-v2-MCP-Client'
    };
  }

  /**
   * Test GitHub API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: this.getHeaders()
      });
      return response.ok;
    } catch (error) {
      console.error('GitHub connection test failed:', error);
      return false;
    }
  }

  /**
   * Search across multiple GitHub resources
   */
  async search(query: string, options?: {
    types?: ('repositories' | 'issues' | 'code' | 'commits')[];
    limit?: number;
    sort?: 'updated' | 'created' | 'best-match';
    order?: 'asc' | 'desc';
  }): Promise<GitHubSearchResult[]> {
    if (!this.credentials) {
      throw new Error('GitHub credentials not configured');
    }

    const { types = ['repositories', 'issues', 'code'], limit = 20, sort = 'best-match', order = 'desc' } = options || {};
    console.log(`GitHub MCP search - Query: "${query}", Types: [${types.join(', ')}], Limit: ${limit}`);
    
    // Handle natural language queries that are asking for user's own repositories
    const repoQueryIndicators = /\b(fetch|get|show|list|all|my)\s*(repo|repository|repositories)\b/i;
    const isMyReposQuery = repoQueryIndicators.test(query);
    
    let allResults: GitHubSearchResult[] = [];

    if (isMyReposQuery && types.includes('repositories')) {
      // For repository-focused queries, use getUserRepositories directly
      console.log('🎯 Detected "my repositories" query, fetching user repositories directly');
      try {
        const userRepos = await this.getUserRepositories(1, limit);
        console.log(`✅ User repositories fetched: ${userRepos.length} results`);
        allResults.push(...userRepos);
        
        // Skip other searches for repository-focused queries
        return allResults.slice(0, limit);
      } catch (error) {
        console.error('Failed to fetch user repositories:', error);
        // Continue with regular search as fallback
      }
    }

    // For other queries, use the search API with improved query processing
    const processedQuery = this.processNaturalLanguageQuery(query);
    
    // Search repositories
    if (types.includes('repositories')) {
      try {
        console.log('🔍 Starting repository search...');
        const repoResults = await this.searchRepositories(processedQuery, Math.floor(limit / types.length), sort, order);
        console.log(`✅ Repository search completed: ${repoResults.length} results`);
        allResults.push(...repoResults);
      } catch (error) {
        console.warn('Repository search failed:', error);
      }
    }

    // Search issues (only if not a repo-focused query)
    if (types.includes('issues') && !isMyReposQuery) {
      try {
        console.log('🔍 Starting issues search...');
        const issueResults = await this.searchIssues(processedQuery, Math.floor(limit / types.length), sort, order);
        console.log(`✅ Issues search completed: ${issueResults.length} results`);
        allResults.push(...issueResults);
      } catch (error) {
        console.warn('Issues search failed:', error);
      }
    }

    // Search code (only if not a repo-focused query)
    if (types.includes('code') && !isMyReposQuery) {
      try {
        console.log('🔍 Starting code search...');
        const codeResults = await this.searchCode(processedQuery, Math.floor(limit / types.length), sort, order);
        console.log(`✅ Code search completed: ${codeResults.length} results`);
        allResults.push(...codeResults);
      } catch (error) {
        console.warn('Code search failed:', error);
      }
    }

    // Search commits (only if not a repo-focused query)
    if (types.includes('commits') && !isMyReposQuery) {
      try {
        console.log('🔍 Starting commits search...');
        const commitResults = await this.searchCommits(processedQuery, Math.floor(limit / types.length), sort, order);
        console.log(`✅ Commits search completed: ${commitResults.length} results`);
        allResults.push(...commitResults);
      } catch (error) {
        console.warn('Commits search failed:', error);
      }
    }

    console.log(`📊 Total GitHub search results: ${allResults.length}`);
    // Sort by relevance and return
    return allResults.sort((a, b) => {
      // Basic relevance scoring based on title match
      const aScore = a.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
      const bScore = b.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
      return bScore - aScore;
    }).slice(0, limit);
  }

  /**
   * Process natural language queries into GitHub-compatible search terms
   */
  private processNaturalLanguageQuery(query: string): string {
    // Handle common natural language patterns
    const patterns = [
      // "my repos" -> user-specific search
      { pattern: /\b(my|mine)\s+(repo|repository|repositories)\b/gi, replacement: `user:${this.credentials?.username}` },
      // "all repos" -> user-specific search
      { pattern: /\ball\s+(repo|repository|repositories)\b/gi, replacement: `user:${this.credentials?.username}` },
      // "fetch repos" -> user-specific search  
      { pattern: /\bfetch\s+(repo|repository|repositories)\b/gi, replacement: `user:${this.credentials?.username}` },
      // "show repos" -> user-specific search
      { pattern: /\bshow\s+(repo|repository|repositories)\b/gi, replacement: `user:${this.credentials?.username}` },
      // "list repos" -> user-specific search
      { pattern: /\blist\s+(repo|repository|repositories)\b/gi, replacement: `user:${this.credentials?.username}` },
      // "get repos" -> user-specific search
      { pattern: /\bget\s+(repo|repository|repositories)\b/gi, replacement: `user:${this.credentials?.username}` }
    ];

    let processedQuery = query;
    
    for (const { pattern, replacement } of patterns) {
      if (pattern.test(processedQuery)) {
        processedQuery = replacement;
        break; // Use the first matching pattern
      }
    }

    // If no patterns matched and it's still a natural language query, try to extract keywords
    if (processedQuery === query && this.isNaturalLanguageQuery(processedQuery)) {
      // Extract meaningful keywords from natural language
      const keywords = this.extractKeywords(processedQuery);
      if (keywords.length > 0) {
        processedQuery = keywords.join(' ');
      }
    }

    console.log(`Query processing: "${query}" -> "${processedQuery}"`);
    return processedQuery;
  }

  /**
   * Check if a query looks like natural language rather than search syntax
   */
  private isNaturalLanguageQuery(query: string): boolean {
    // Check for common GitHub search operators
    const searchOperators = /\b(user:|org:|repo:|language:|topic:|stars:|forks:|created:|updated:|pushed:)/;
    if (searchOperators.test(query)) {
      return false; // Already formatted for GitHub search
    }

    // Check for natural language indicators
    const naturalLanguageIndicators = /\b(show|list|find|get|fetch|give|want|need|search|look)\b/i;
    return naturalLanguageIndicators.test(query);
  }

  /**
   * Extract meaningful keywords from natural language queries
   */
  private extractKeywords(query: string): string[] {
    // Remove common stop words and extract meaningful terms
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'show', 'list', 'find', 'get', 'fetch', 'give', 'want', 'need', 'search', 'look', 'all', 'my', 'mine']);
    
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 3); // Limit to 3 most relevant keywords
  }

  /**
   * Search GitHub repositories
   */
  private async searchRepositories(query: string, limit: number, sort: string, order: string): Promise<GitHubSearchResult[]> {
    // Smart query processing like VS Code MCP
    let searchQuery = query.trim();
    
    // If it's asking for user's repositories (like "my repos", "all repos", etc.)
    const userRepoIndicators = /\b(my|mine|all|fetch|get|show|list)\s*(repo|repository|repositories)\b/i;
    const isUserRepoQuery = !searchQuery || searchQuery.length < 3 || userRepoIndicators.test(searchQuery);
    
    if (isUserRepoQuery) {
      // Use the /user/repos endpoint for better results like VS Code
      return await this.getUserRepositories(1, limit);
    } else {
      // For specific searches, search within user's context
      searchQuery = `${searchQuery} user:${this.credentials!.username}`;
    }
    
    console.log(`Repository search query: "${searchQuery}"`);
    const url = `${this.baseUrl}/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=${sort}&order=${order}&per_page=${Math.min(limit, 30)}`;

    try {
      const response = await fetch(url, { headers: this.getHeaders() });
      if (!response.ok) {
        // If the complex query fails, fall back to user repos
        if (response.status === 422) {
          console.log('Complex repository search failed, falling back to user repos...');
          return await this.getUserRepositories(1, limit);
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log(`Repository search returned ${data.items?.length || 0} results`);
      return this.mapRepositoryResults(data.items || []);
    } catch (error) {
      console.error('Repository search failed, falling back to user repos:', error);
      // Always fall back to user repos if search fails
      try {
        return await this.getUserRepositories(1, limit);
      } catch (fallbackError) {
        console.error('Fallback to user repos also failed:', fallbackError);
        return [];
      }
    }
  }

  /**
   * Map GitHub repository data to search results
   */
  private mapRepositoryResults(items: GitHubRepository[]): GitHubSearchResult[] {
    return items.map((repo: GitHubRepository) => ({
      id: `repo-${repo.id}`,
      title: repo.full_name,
      content: repo.description || 'No description available',
      url: repo.html_url,
      author: repo.owner.login,
      date: repo.updated_at,
      type: 'repository' as const,
      metadata: {
        repository: repo.full_name,
        language: repo.language || undefined,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        private: repo.private,
        default_branch: repo.default_branch,
        topics: repo.topics || []
      }
    }));
  }

  /**
   * Search GitHub issues and pull requests
   */
  private async searchIssues(query: string, limit: number, sort: string, order: string): Promise<GitHubSearchResult[]> {
    // For queries like "fetch all my repos", skip issues search since it's not relevant
    const repoQueryIndicators = /\b(fetch|get|show|list|all|my)\s*(repo|repository|repositories)\b/i;
    if (repoQueryIndicators.test(query)) {
      console.log('Skipping issues search for repository-focused query');
      return [];
    }

    // Only add author qualifier if query is empty or generic
    let searchQuery = query.trim();
    const generic = ["issue", "issues", "pr", "pull", "pulls", "pullrequest", "pullrequests", "my", "mine"];
    if (!searchQuery || generic.includes(searchQuery.toLowerCase())) {
      searchQuery = `author:${this.credentials!.username}`;
    } else {
      // For specific queries, search in user's involvement - use simpler query
      searchQuery = `${searchQuery} author:${this.credentials!.username}`;
    }
    
    console.log(`Issues search query: "${searchQuery}"`);
    const url = `${this.baseUrl}/search/issues?q=${encodeURIComponent(searchQuery)}&sort=${sort}&order=${order}&per_page=${Math.min(limit, 30)}`;

    try {
      const response = await fetch(url, { headers: this.getHeaders() });
      if (!response.ok) {
        // If the query fails, try a simpler approach
        if (response.status === 422) {
          console.log('Complex issues search failed, trying author-only query...');
          const simpleQuery = `author:${this.credentials!.username}`;
          const simpleUrl = `${this.baseUrl}/search/issues?q=${encodeURIComponent(simpleQuery)}&sort=${sort}&order=${order}&per_page=${Math.min(limit, 30)}`;
          const retryResponse = await fetch(simpleUrl, { headers: this.getHeaders() });
          if (!retryResponse.ok) {
            console.log('Simple issues search also failed, skipping issues');
            return [];
          }
          const retryData = await retryResponse.json();
          return this.mapIssueResults(retryData.items || []);
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log(`Issues search returned ${data.items?.length || 0} results`);
      return this.mapIssueResults(data.items || []);
    } catch (error) {
      console.error('Issues search failed:', error);
      return [];
    }
  }

  /**
   * Map GitHub issue data to search results
   */
  private mapIssueResults(items: GitHubIssue[]): GitHubSearchResult[] {
    return items.map((issue: GitHubIssue) => ({
      id: `issue-${issue.id}`,
      title: issue.title,
      content: issue.body || 'No description available',
      url: issue.html_url,
      author: issue.user.login,
      date: issue.updated_at,
      type: issue.pull_request ? 'pull_request' as const : 'issue' as const,
      metadata: {
        repository: issue.repository_url.split('/').slice(-2).join('/'),
        state: issue.state,
        labels: issue.labels.map((label: GitHubLabel) => label.name),
        number: issue.number,
        comments: issue.comments,
        assignees: issue.assignees.map((assignee: GitHubUser) => assignee.login)
      }
    }));
  }

  /**
   * Search GitHub code
   */
  private async searchCode(query: string, limit: number, sort: string, order: string): Promise<GitHubSearchResult[]> {
    // For queries like "fetch all my repos", skip code search since it's not relevant
    const repoQueryIndicators = /\b(fetch|get|show|list|all|my)\s*(repo|repository|repositories)\b/i;
    if (repoQueryIndicators.test(query)) {
      console.log('Skipping code search for repository-focused query');
      return [];
    }

    // Only add user qualifier if query is empty or generic
    let searchQuery = query.trim();
    const generic = ["code", "file", "files", "my", "mine"];
    if (!searchQuery || generic.includes(searchQuery.toLowerCase())) {
      searchQuery = `user:${this.credentials!.username}`;
    } else {
      // For specific queries, search in user's repositories
      searchQuery = `${searchQuery} user:${this.credentials!.username}`;
    }
    
    console.log(`Code search query: "${searchQuery}"`);
    const url = `${this.baseUrl}/search/code?q=${encodeURIComponent(searchQuery)}&sort=${sort}&order=${order}&per_page=${Math.min(limit, 30)}`;

    try {
      const response = await fetch(url, { headers: this.getHeaders() });
      if (!response.ok) {
        // If the complex query fails, try simpler approach
        if (response.status === 422) {
          console.log('Complex code search failed, trying user-only query...');
          const simpleQuery = `user:${this.credentials!.username}`;
          const simpleUrl = `${this.baseUrl}/search/code?q=${encodeURIComponent(simpleQuery)}&sort=${sort}&order=${order}&per_page=${Math.min(limit, 30)}`;
          const retryResponse = await fetch(simpleUrl, { headers: this.getHeaders() });
          if (!retryResponse.ok) {
            console.log('Simple code search also failed, skipping code search');
            return [];
          }
          const retryData = await retryResponse.json();
          return this.mapCodeResults(retryData.items || []);
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log(`Code search returned ${data.items?.length || 0} results`);
      return this.mapCodeResults(data.items || []);
    } catch (error) {
      console.error('Code search failed:', error);
      return [];
    }
  }

  /**
   * Map GitHub code data to search results
   */
  private mapCodeResults(items: GitHubCodeResult[]): GitHubSearchResult[] {
    return items.map((code: GitHubCodeResult) => ({
      id: `code-${code.sha}`,
      title: `${code.name} - ${code.repository.full_name}`,
      content: `Code found in ${code.path}`,
      url: code.html_url,
      author: code.repository.owner.login,
      date: new Date().toISOString(), // GitHub doesn't provide last modified for code search
      type: 'code' as const,
      metadata: {
        repository: code.repository.full_name,
        path: code.path,
        sha: code.sha,
        language: this.getLanguageFromPath(code.path),
        size: code.repository.size
      }
    }));
  }

  /**
   * Search GitHub commits
   */
  private async searchCommits(query: string, limit: number, sort: string, order: string): Promise<GitHubSearchResult[]> {
    // For queries like "fetch all my repos", skip commits search since it's not relevant
    const repoQueryIndicators = /\b(fetch|get|show|list|all|my)\s*(repo|repository|repositories)\b/i;
    if (repoQueryIndicators.test(query)) {
      console.log('Skipping commits search for repository-focused query');
      return [];
    }

    // Try searching author's commits first, then fall back to general search
    let searchQuery = `${query} author:${this.credentials!.username}`;
    let url = `${this.baseUrl}/search/commits?q=${encodeURIComponent(searchQuery)}&sort=${sort}&order=${order}&per_page=${Math.min(limit, 30)}`;

    console.log(`Commits search query: "${searchQuery}"`);

    try {
      let response = await fetch(url, { 
        headers: {
          ...this.getHeaders(),
          'Accept': 'application/vnd.github.cloak-preview+json' // Required for commit search preview
        }
      });
      
      // If author-specific search fails, try a broader search
      if (!response.ok && response.status === 422) {
        console.log('Author-specific commit search failed, trying author-only query...');
        searchQuery = `author:${this.credentials!.username}`;
        url = `${this.baseUrl}/search/commits?q=${encodeURIComponent(searchQuery)}&sort=${sort}&order=${order}&per_page=${Math.min(limit, 30)}`;
        response = await fetch(url, { 
          headers: {
            ...this.getHeaders(),
            'Accept': 'application/vnd.github.cloak-preview+json'
          }
        });
      }
      
      if (!response.ok) {
        console.log('Commits search failed, skipping commits');
        return [];
      }

      const data = await response.json();
      console.log(`Commits search returned ${data.items?.length || 0} results`);
      return this.mapCommitResults(data.items || []);
    } catch (error) {
      console.error('Commits search failed:', error);
      return [];
    }
  }

  /**
   * Map GitHub commit data to search results
   */
  private mapCommitResults(items: GitHubCommit[]): GitHubSearchResult[] {
    return items.map((commit: GitHubCommit) => ({
      id: `commit-${commit.sha}`,
      title: commit.commit.message.split('\n')[0], // First line of commit message
      content: commit.commit.message,
      url: commit.html_url,
      author: commit.commit.author.name,
      date: commit.commit.author.date,
      type: 'commit' as const,
      metadata: {
        repository: commit.repository.full_name,
        sha: commit.sha,
        branch: 'main', // Default branch assumption
        additions: commit.stats?.additions,
        deletions: commit.stats?.deletions,
        total_changes: commit.stats?.total
      }
    }));
  }

  /**
   * Get programming language from file path
   */
  private getLanguageFromPath(path: string): string {
    const extension = path.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'jsx': 'React',
      'tsx': 'React TypeScript',
      'py': 'Python',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C',
      'cs': 'C#',
      'php': 'PHP',
      'rb': 'Ruby',
      'go': 'Go',
      'rs': 'Rust',
      'swift': 'Swift',
      'kt': 'Kotlin',
      'scala': 'Scala',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'less': 'LESS',
      'md': 'Markdown',
      'json': 'JSON',
      'xml': 'XML',
      'yaml': 'YAML',
      'yml': 'YAML',
      'sql': 'SQL',
      'sh': 'Shell',
      'bash': 'Bash',
      'dockerfile': 'Docker'
    };
    
    return languageMap[extension || ''] || 'Unknown';
  }

  /**
   * Get user's repositories
   */
  async getUserRepositories(page: number = 1, limit: number = 30): Promise<GitHubSearchResult[]> {
    if (!this.credentials) {
      throw new Error('GitHub credentials not configured');
    }

    const url = `${this.baseUrl}/user/repos?page=${page}&per_page=${limit}&sort=updated&direction=desc`;
    
    console.log(`Fetching user repositories from: ${url}`);
    console.log(`Using credentials for user: ${this.credentials.username}`);
    
    try {
      const response = await fetch(url, { headers: this.getHeaders() });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`GitHub user repos API error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const repos = await response.json();
      console.log(`✅ Fetched ${repos.length} user repositories`);
      
      if (repos.length === 0) {
        console.warn(`⚠️ User ${this.credentials.username} has no repositories or insufficient permissions`);
        console.warn('Make sure your GitHub token has "repo" scope for private repos and "public_repo" for public repos');
      }
      
      return repos.map((repo: GitHubRepository) => ({
        id: `repo-${repo.id}`,
        title: repo.full_name,
        content: repo.description || 'No description available',
        url: repo.html_url,
        author: repo.owner.login,
        date: repo.updated_at,
        type: 'repository' as const,
        metadata: {
          repository: repo.full_name,
          language: repo.language || undefined,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          private: repo.private,
          default_branch: repo.default_branch,
          topics: repo.topics || []
        }
      }));
    } catch (error) {
      console.error('Failed to fetch user repositories:', error);
      throw error;
    }
  }
}

export const githubMCPService = new GitHubMCPService();
