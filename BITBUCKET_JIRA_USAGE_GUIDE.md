# How to Use Bitbucket and JIRA MCP Servers in PineLens

This guide shows you how to integrate and use your Bitbucket and JIRA MCP servers in your PineLens application.

## 🚀 Quick Start

### 1. Server Setup

You have 4 MCP servers available:

#### Standard Servers (Text Responses)
- `bitbucket-inhouse-server.js` - Standard Bitbucket integration
- `jira-inhouse-server.js` - Standard JIRA integration

#### FastMCP Servers (JSON Responses)
- `bitbucket-fastmcp-server.js` - Enhanced Bitbucket with JSON responses
- `jira-fastmcp-server.js` - Enhanced JIRA with JSON responses

### 2. Environment Configuration

Create/update your `.env` file:

```env
# Bitbucket Configuration
BITBUCKET_TOKEN=your_bitbucket_app_password
BITBUCKET_EMAIL=your.email@company.com

# JIRA Configuration  
JIRA_EMAIL=your.email@company.com
JIRA_API_TOKEN=your_jira_api_token
JIRA_BASE_URL=https://company.atlassian.net

# Optional: Default workspace
DEFAULT_WORKSPACE=your-workspace-slug
```

## 🔧 Integration Methods

### Method 1: Direct MCP Server Usage

#### Running the Servers
```bash
# Terminal 1 - Bitbucket Server
node mcp-servers/bitbucket-fastmcp-server.js

# Terminal 2 - JIRA Server  
node mcp-servers/jira-fastmcp-server.js
```

#### Using with MCP Clients
```javascript
// Example MCP client calls
const mcpClient = new MCPClient();

// Bitbucket operations
await mcpClient.callTool('authenticate_user', { 
  email: 'user@company.com' 
});

await mcpClient.callTool('get_repositories', { 
  workspace: 'my-workspace',
  page_size: 50 
});

// JIRA operations
await mcpClient.callTool('search_issues', { 
  jql: 'project = PROJ AND status = "In Progress"',
  maxResults: 25 
});
```

### Method 2: Browser Service Integration

Update your `src/services/inHouseMCPService.browser.ts`:

```typescript
export class InHouseMCPService {
  private bitbucketConfig: any = null;
  private jiraConfig: any = null;

  // Bitbucket Methods
  async configureBitbucket(config: any) {
    this.bitbucketConfig = config;
    
    if (this.isRealToken(config.appPassword)) {
      // Use real Bitbucket API
      return await this.authenticateBitbucket(config);
    } else {
      // Use demo data
      return this.getDemoBitbucketData();
    }
  }

  async searchBitbucketRepositories(query: string) {
    if (this.isRealToken()) {
      const response = await fetch(`${this.bitbucketConfig.baseUrl}/2.0/repositories/${this.bitbucketConfig.workspace}`, {
        headers: this.getBitbucketHeaders()
      });
      return await response.json();
    }
    return this.getDemoRepositories();
  }

  // JIRA Methods
  async configureJira(config: any) {
    this.jiraConfig = config;
    
    if (this.isRealToken(config.apiToken)) {
      // Use real JIRA API
      return await this.authenticateJira(config);
    } else {
      // Use demo data
      return this.getDemoJiraData();
    }
  }

  async searchJiraIssues(jql: string) {
    if (this.isRealToken()) {
      const params = new URLSearchParams({
        jql: jql,
        maxResults: '50',
        expand: 'names,schema,operations'
      });
      
      const response = await fetch(`${this.jiraConfig.baseUrl}/rest/api/3/search?${params}`, {
        headers: this.getJiraHeaders()
      });
      return await response.json();
    }
    return this.getDemoIssues();
  }

  private getBitbucketHeaders() {
    const credentials = `${this.bitbucketConfig.username}:${this.bitbucketConfig.appPassword}`;
    return {
      'Authorization': `Basic ${btoa(credentials)}`,
      'Accept': 'application/json'
    };
  }

  private getJiraHeaders() {
    const credentials = `${this.jiraConfig.email}:${this.jiraConfig.apiToken}`;
    return {
      'Authorization': `Basic ${btoa(credentials)}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  }

  private isRealToken(token?: string): boolean {
    return token && token.length > 20 && !token.includes('demo');
  }
}
```

### Method 3: Unified Search Integration

Update your `src/services/unifiedSearchService.ts`:

```typescript
export class UnifiedSearchService {
  private bitbucketService: InHouseMCPService;
  private jiraService: InHouseMCPService;

  constructor() {
    this.bitbucketService = new InHouseMCPService();
    this.jiraService = new InHouseMCPService();
  }

  async search(query: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    // Search Bitbucket repositories
    if (this.bitbucketService.isConfigured()) {
      const bitbucketResults = await this.searchBitbucket(query);
      results.push(...bitbucketResults);
    }

    // Search JIRA issues
    if (this.jiraService.isConfigured()) {
      const jiraResults = await this.searchJira(query);
      results.push(...jiraResults);
    }

    return results;
  }

  private async searchBitbucket(query: string): Promise<SearchResult[]> {
    try {
      const repos = await this.bitbucketService.searchBitbucketRepositories(query);
      
      return repos.values?.map((repo: any) => ({
        id: repo.uuid,
        title: repo.name,
        description: repo.description || 'No description',
        url: repo.links.html.href,
        type: 'bitbucket-repo',
        source: 'Bitbucket',
        metadata: {
          language: repo.language,
          isPrivate: repo.is_private,
          updatedOn: repo.updated_on
        }
      })) || [];
    } catch (error) {
      console.error('Bitbucket search error:', error);
      return [];
    }
  }

  private async searchJira(query: string): Promise<SearchResult[]> {
    try {
      const jql = `text ~ "${query}" ORDER BY updated DESC`;
      const searchResults = await this.jiraService.searchJiraIssues(jql);
      
      return searchResults.issues?.map((issue: any) => ({
        id: issue.key,
        title: `${issue.key}: ${issue.fields.summary}`,
        description: this.extractDescription(issue.fields.description),
        url: `${this.jiraService.baseUrl}/browse/${issue.key}`,
        type: 'jira-issue',
        source: 'JIRA',
        metadata: {
          status: issue.fields.status.name,
          priority: issue.fields.priority?.name,
          assignee: issue.fields.assignee?.displayName,
          issueType: issue.fields.issuetype.name
        }
      })) || [];
    } catch (error) {
      console.error('JIRA search error:', error);
      return [];
    }
  }

  private extractDescription(adfContent: any): string {
    if (!adfContent?.content) return '';
    
    let text = '';
    const extractText = (node: any) => {
      if (node.type === 'text') {
        text += node.text;
      } else if (node.content) {
        node.content.forEach(extractText);
      }
    };
    
    adfContent.content.forEach(extractText);
    return text.substring(0, 200) + (text.length > 200 ? '...' : '');
  }
}
```

## 🎯 Usage Examples

### Bitbucket Operations

#### 1. Repository Search
```javascript
// Search for repositories
const repos = await bitbucketService.searchRepositories({ 
  query: 'react',
  limit: 20 
});

// Results include:
// - Repository name, description, language
// - Privacy status, size, dates
// - Direct links to repositories
```

#### 2. Code Search
```javascript
// Search code across repositories
const codeResults = await bitbucketService.searchCode({ 
  query: 'function authenticate',
  limit: 50 
});

// Results include:
// - File paths and line numbers
// - Code snippets with matches
// - Repository context
```

#### 3. Repository Analysis
```javascript
// Get detailed repository info
const repoDetails = await bitbucketService.getRepository({ 
  repoSlug: 'my-project' 
});

// Get branches, commits, pull requests
const branches = await bitbucketService.getBranches({ 
  repoSlug: 'my-project' 
});

const commits = await bitbucketService.getCommits({ 
  repoSlug: 'my-project',
  branch: 'main' 
});
```

### JIRA Operations

#### 1. Issue Search
```javascript
// Search issues with JQL
const issues = await jiraService.searchIssues({ 
  jql: 'project = PROJ AND status = "In Progress"',
  maxResults: 50 
});

// Advanced search
const myIssues = await jiraService.searchIssues({ 
  jql: 'assignee = currentUser() AND status != Done',
  maxResults: 25 
});
```

#### 2. Issue Management
```javascript
// Get detailed issue information
const issue = await jiraService.getIssueDetails({ 
  issueKey: 'PROJ-123',
  expand: 'changelog,comments,attachments' 
});

// Create new issue
const newIssue = await jiraService.createIssue({
  projectKey: 'PROJ',
  summary: 'New feature request',
  description: 'Detailed description here',
  issueType: 'Story',
  priority: 'High',
  labels: ['feature', 'urgent']
});
```

#### 3. Project Management
```javascript
// Get all projects
const projects = await jiraService.getProjects();

// Get project details
const project = await jiraService.getProjectDetails({ 
  projectKey: 'PROJ' 
});

// Get project versions and components
const versions = await jiraService.getProjectVersions({ 
  projectKey: 'PROJ' 
});
```

## 🔗 UI Integration

### Component Example
```tsx
// src/components/InHouseIntegrations.tsx
export const InHouseIntegrations = () => {
  const [bitbucketResults, setBitbucketResults] = useState([]);
  const [jiraResults, setJiraResults] = useState([]);

  const searchBoth = async (query: string) => {
    // Search Bitbucket
    const repos = await bitbucketService.searchRepositories({ query });
    setBitbucketResults(repos);

    // Search JIRA  
    const issues = await jiraService.searchIssues({ 
      jql: `text ~ "${query}"` 
    });
    setJiraResults(issues);
  };

  return (
    <div className="space-y-6">
      <SearchInput onSearch={searchBoth} />
      
      <div className="grid grid-cols-2 gap-6">
        <BitbucketResults results={bitbucketResults} />
        <JiraResults results={jiraResults} />
      </div>
    </div>
  );
};
```

## 📊 Advanced Features

### 1. Real-time Updates
```javascript
// Set up polling for real-time updates
setInterval(async () => {
  const openPRs = await bitbucketService.getPullRequests({ 
    repoSlug: 'my-project',
    state: 'OPEN' 
  });
  
  const activeIssues = await jiraService.searchIssues({ 
    jql: 'status in ("In Progress", "Code Review")' 
  });
  
  updateDashboard({ openPRs, activeIssues });
}, 30000); // Update every 30 seconds
```

### 2. Export and Analytics
```javascript
// Export JIRA issues for analysis
await jiraService.exportIssuesToFile({
  jql: 'project = PROJ AND created >= -30d',
  filename: 'recent_issues.json',
  maxResults: 1000
});

// Export Bitbucket repository data
const repoData = await bitbucketService.getRepositoryCodebase({
  workspace: 'my-workspace',
  repo_slug: 'my-project',
  branch: 'main'
});
```

### 3. Cross-Platform Workflows
```javascript
// Link JIRA issues to Bitbucket branches
const linkIssueToRepo = async (issueKey: string, repoSlug: string) => {
  const issue = await jiraService.getIssueDetails({ issueKey });
  const branches = await bitbucketService.getBranches({ repoSlug });
  
  // Find branches that reference the issue
  const relatedBranches = branches.filter(branch => 
    branch.name.includes(issueKey.toLowerCase())
  );
  
  return { issue, relatedBranches };
};
```

## 🛠 Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Verify API tokens are correct
   - Check base URLs format
   - Ensure proper permissions

2. **Search Not Working**
   - Verify JQL syntax for JIRA
   - Check workspace names for Bitbucket
   - Validate query parameters

3. **Network Issues**
   - Check firewall settings
   - Verify SSL certificates
   - Test direct API access

### Debug Mode
```javascript
// Enable debug logging
const debugService = new InHouseMCPService({ debug: true });

// Check connection status
const bitbucketStatus = await debugService.testBitbucketConnection();
const jiraStatus = await debugService.testJiraConnection();
```

## 📈 Performance Tips

1. **Use pagination** for large result sets
2. **Cache frequently accessed data** (projects, issue types)
3. **Batch API calls** when possible
4. **Implement search debouncing** in UI
5. **Use specific JQL queries** instead of broad searches

Your Bitbucket and JIRA MCP servers are now ready for full integration into your PineLens application!
