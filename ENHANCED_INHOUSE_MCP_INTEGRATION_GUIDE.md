# Enhanced In-House MCP Service Integration Guide

This enhanced service provides comprehensive integration with Bitbucket and JIRA APIs, supporting both real API calls and demo mode for development and testing.

## Features

### 🚀 **Enhanced Bitbucket Integration**
- **Repository Management**: Search, get, and analyze repositories
- **Code Search**: Search across codebases within repositories
- **Authentication**: Secure Basic Auth with app passwords
- **Real API + Demo Mode**: Seamless fallback for development

### 🎯 **Advanced JIRA Integration**
- **Issue Management**: Search, create, update, and manage issues
- **Project Operations**: Access project information and metadata
- **JQL Support**: Full JIRA Query Language support
- **ADF Content**: Atlassian Document Format support for rich content

### 🔄 **Unified Search**
- **Cross-Platform Search**: Search both Bitbucket and JIRA simultaneously
- **Structured Results**: Normalized search results with metadata
- **Type-Safe**: Full TypeScript support with proper type definitions

## Integration Methods

### 1. Direct Service Integration

```typescript
import { EnhancedInHouseMCPService } from './services/enhancedInHouseMCPService';

const mcpService = new EnhancedInHouseMCPService();

// Configure Bitbucket
const bitbucketResult = await mcpService.configureBitbucket({
  baseUrl: 'https://api.bitbucket.org',
  username: 'your-username',
  appPassword: 'your-app-password',
  workspace: 'your-workspace'
});

// Configure JIRA
const jiraResult = await mcpService.configureJira({
  baseUrl: 'https://your-domain.atlassian.net',
  email: 'your-email@company.com',
  apiToken: 'your-api-token'
});

// Perform unified search
const results = await mcpService.unifiedSearch('authentication bug');
```

### 2. Browser Service Integration

```typescript
import { InHouseMCPService } from './services/inHouseMCPService.browser';

// The browser service now uses the enhanced implementation
const service = new InHouseMCPService();
```

### 3. Component Integration

Update your existing components to use the enhanced service:

```typescript
// In SearchResults.tsx or similar components
import { InHouseMCPService } from '../services/inHouseMCPService.browser';

const service = new InHouseMCPService();

// Use the enhanced features
const searchBitbucket = async (query: string) => {
  const results = await service.searchBitbucketRepositories(query);
  return results;
};

const searchJira = async (jql: string) => {
  const results = await service.searchJiraIssues(jql);
  return results;
};
```

## API Methods

### Bitbucket Operations

#### `configureBitbucket(config: MCPConfig)`
Configure Bitbucket connection with app password authentication.

```typescript
const result = await service.configureBitbucket({
  baseUrl: 'https://api.bitbucket.org',
  username: 'myusername',
  appPassword: 'myapppassword123',
  workspace: 'myworkspace'
});
```

#### `searchBitbucketRepositories(query?: string, limit?: number)`
Search repositories in the configured workspace.

```typescript
const repos = await service.searchBitbucketRepositories('frontend', 25);
```

#### `getBitbucketRepository(repoSlug: string)`
Get detailed information about a specific repository.

```typescript
const repo = await service.getBitbucketRepository('my-repo-name');
```

#### `searchBitbucketCode(query: string, repoSlug?: string, limit?: number)`
Search code within repositories.

```typescript
const codeResults = await service.searchBitbucketCode('function authenticate');
```

### JIRA Operations

#### `configureJira(config: MCPConfig)`
Configure JIRA connection with API token authentication.

```typescript
const result = await service.configureJira({
  baseUrl: 'https://mycompany.atlassian.net',
  email: 'myemail@company.com',
  apiToken: 'myapitoken123'
});
```

#### `searchJiraIssues(jql: string, maxResults?: number, startAt?: number)`
Search JIRA issues using JQL (JIRA Query Language).

```typescript
const issues = await service.searchJiraIssues('project = DEMO AND status = "In Progress"');
```

#### `getJiraIssue(issueKey: string, expand?: string)`
Get detailed information about a specific issue.

```typescript
const issue = await service.getJiraIssue('DEMO-123', 'comments,attachments');
```

#### `createJiraIssue(issueData: IssueCreationData)`
Create a new JIRA issue.

```typescript
const newIssue = await service.createJiraIssue({
  projectKey: 'DEMO',
  summary: 'New feature request',
  description: 'Add new search functionality',
  issueType: 'Story',
  priority: 'High',
  assignee: 'user@company.com'
});
```

#### `getJiraProjects()`
Get list of available JIRA projects.

```typescript
const projects = await service.getJiraProjects();
```

### Unified Search

#### `unifiedSearch(query: string)`
Search across both Bitbucket and JIRA simultaneously.

```typescript
const results = await service.unifiedSearch('authentication');
// Returns normalized SearchResult[] with source information
```

## Authentication Setup

### Bitbucket App Password
1. Go to Bitbucket Settings → App passwords
2. Create new app password with required permissions:
   - Repositories: Read
   - Pull requests: Read
   - Issues: Read

### JIRA API Token
1. Go to Atlassian Account Settings → Security → API tokens
2. Create new API token
3. Use your email address as username with the token

## Demo Mode

For development and testing, the service supports demo mode:

- **Automatic Detection**: Service detects demo tokens and switches to demo mode
- **Mock Data**: Returns realistic demo data for testing
- **No API Calls**: Safe for development without real credentials

Demo tokens are detected when:
- Token length < 20 characters
- Token contains "demo" string
- Token is undefined/empty

## Error Handling

```typescript
try {
  const results = await service.searchJiraIssues('invalid jql query');
} catch (error) {
  console.error('Search failed:', error.message);
  // Handle error appropriately
}
```

## Type Definitions

The service provides comprehensive TypeScript types:

```typescript
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
```

## Integration with PineLens Components

### Update SearchResults Component

```typescript
// In SearchResults.tsx
import { InHouseMCPService } from '../services/inHouseMCPService.browser';

const handleInHouseSearch = async (query: string) => {
  const service = new InHouseMCPService();
  
  // Configure if needed
  if (!service.isConfigured()) {
    await configureServices(service);
  }
  
  // Perform unified search
  const results = await service.unifiedSearch(query);
  return results;
};
```

### Update Service Configuration

```typescript
// In ServiceConfiguration.tsx
const configureInHouseServices = async () => {
  const service = new InHouseMCPService();
  
  // Configure both services
  await service.configureBitbucket(bitbucketConfig);
  await service.configureJira(jiraConfig);
  
  return service;
};
```

## Best Practices

1. **Configuration**: Always check if services are configured before use
2. **Error Handling**: Implement proper error handling for API calls
3. **Demo Mode**: Use demo mode for development and testing
4. **Type Safety**: Leverage TypeScript types for better development experience
5. **Caching**: Consider implementing result caching for better performance

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Verify credentials are correct
   - Check app password/API token permissions
   - Ensure base URLs are correct

2. **Search Results Empty**
   - Verify workspace/project access
   - Check search query syntax
   - Ensure proper permissions

3. **CORS Issues**
   - Only affects browser environments
   - Consider using MCP servers for production
   - Demo mode works without CORS issues

### Debug Mode

Enable debug logging:

```typescript
// Service automatically logs operations
// Check browser console for detailed logs
console.log('🔧', '🔑', '🔍', '🎭'); // Look for these emojis
```

## Migration from Old Service

If upgrading from the previous in-house MCP service:

1. **Import Change**: The import remains the same due to re-export
2. **Method Names**: Some method names have changed (e.g., `searchRepositories` → `searchBitbucketRepositories`)
3. **Enhanced Features**: New methods available (unified search, code search, etc.)
4. **Type Safety**: Better TypeScript support

## Next Steps

1. **Integration**: Start with unified search integration
2. **Configuration**: Set up proper authentication
3. **Testing**: Use demo mode for initial testing
4. **Enhancement**: Add specific features as needed
5. **Production**: Deploy with real credentials

## Support

For issues or questions:
1. Check TypeScript errors for type mismatches
2. Verify authentication configuration
3. Test with demo mode first
4. Check console logs for detailed error messages
