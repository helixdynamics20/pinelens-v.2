# JIRA FastMCP Server (JavaScript Implementation)

This is an enhanced JIRA MCP server with FastMCP-style JSON responses and comprehensive functionality for JIRA integration.

## Features

- **Enhanced Authentication**: Secure Basic Authentication with email and API token
- **Comprehensive Issue Management**: Search, create, update, and export issues
- **Project Management**: Detailed project information, versions, and components
- **Advanced Search**: JQL support with pagination and field filtering
- **User Management**: User info, dashboards, and saved filters
- **Export Functionality**: Export issues to JSON files
- **JSON Responses**: Structured responses with success/error handling

## Available Tools

### Authentication & User Info
1. **authenticate_user(email, apiToken, baseUrl)** - Authenticate with JIRA
2. **get_user_info(expand)** - Get current user information and permissions

### Issue Management
3. **search_issues(jql, maxResults, startAt, fields)** - Search issues using JQL
4. **get_issue_details(issueKey, expand)** - Get comprehensive issue details
5. **create_issue(projectKey, summary, description, issueType, priority, assignee, labels, components)** - Create new issue
6. **update_issue(issueKey, summary, description, assignee, priority, labels)** - Update existing issue
7. **export_issues_to_file(jql, filename, maxResults)** - Export issues to JSON

### Project Management
8. **get_projects(expand, recent, properties)** - Get list of projects
9. **get_project_details(projectKey, expand)** - Get detailed project information
10. **get_project_versions(projectKey, expand)** - Get project versions
11. **get_project_components(projectKey)** - Get project components

### Metadata & Configuration
12. **get_issue_types(projectKey)** - Get available issue types
13. **get_dashboards(filter, startAt, maxResults)** - Get user dashboards
14. **get_filters(expand, includeFavourites)** - Get saved filters

## Key Differences from Standard JIRA Server

### Enhanced JSON Response Format
All responses return structured JSON:
```javascript
// Success Response
{
  "success": true,
  "issues": [...],
  "total": 150,
  "count": 50
}

// Error Response
{
  "success": false,
  "error": "Authentication failed: 401",
  "details": "Invalid API token"
}
```

### Advanced Features
- **Auto-Authentication**: Automatically retries authentication using environment variables
- **Comprehensive Expansion**: Default expansion of fields for detailed information
- **Export Functionality**: Export search results to JSON files
- **Enhanced Error Handling**: Detailed error messages with context
- **Pagination Support**: Built-in pagination for large result sets

### Environment Configuration
Create a `.env` file with:
```env
JIRA_EMAIL=your.email@company.com
JIRA_API_TOKEN=your_api_token_here
JIRA_BASE_URL=https://company.atlassian.net
```

## Integration with PineLens

This server provides enhanced functionality for your PineLens system:

### 1. Browser Integration
Can be integrated into your `inHouseMCPService.browser.ts`:

```javascript
async searchJiraIssues(jql) {
  if (this.isRealToken()) {
    const result = await this.callMCPTool('search_issues', { 
      jql: jql,
      maxResults: 50 
    });
    return JSON.parse(result.content[0].text);
  }
  // ... existing mock logic
}
```

### 2. Unified Search Integration
Update your `unifiedSearchService.ts`:

```javascript
async searchJira(query) {
  const jql = `text ~ "${query}" ORDER BY updated DESC`;
  const result = await this.jiraFastMCPService.searchIssues({ jql });
  
  if (result.success) {
    return result.issues.map(issue => ({
      id: issue.key,
      title: issue.fields.summary,
      description: this.extractDescription(issue.fields.description),
      url: `${this.baseUrl}/browse/${issue.key}`,
      type: 'jira-issue'
    }));
  }
  return [];
}
```

### 3. Real-time Issue Creation
Create issues directly from PineLens:

```javascript
async createJiraIssue(issueData) {
  const result = await this.jiraFastMCPService.createIssue({
    projectKey: issueData.project,
    summary: issueData.title,
    description: issueData.description,
    issueType: 'Task',
    priority: 'Medium'
  });
  
  return result.success ? result.issue.key : null;
}
```

## Usage Examples

### Basic Authentication & Search
```javascript
// Authenticate
await authenticate_user({
  email: "user@company.com",
  apiToken: "your_token",
  baseUrl: "https://company.atlassian.net"
});

// Search issues
await search_issues({
  jql: "project = PROJ AND status = 'In Progress'",
  maxResults: 50
});
```

### Advanced Issue Management
```javascript
// Get detailed issue info
await get_issue_details({
  issueKey: "PROJ-123",
  expand: "changelog,comments,attachments"
});

// Create new issue
await create_issue({
  projectKey: "PROJ",
  summary: "New feature request",
  description: "Detailed description here",
  issueType: "Story",
  priority: "High",
  labels: ["feature", "urgent"]
});
```

### Export & Analysis
```javascript
// Export issues to file
await export_issues_to_file({
  jql: "project = PROJ AND created >= -30d",
  filename: "recent_issues.json",
  maxResults: 1000
});
```

## Running the Server

1. Install dependencies:
   ```bash
   npm install @modelcontextprotocol/sdk node-fetch dotenv
   ```

2. Set up environment variables in `.env`

3. Run the server:
   ```bash
   node jira-fastmcp-server.js
   ```

## Comparison with Standard Server

| Feature | Standard Server | FastMCP Server |
|---------|----------------|----------------|
| Response Format | Formatted text | Structured JSON |
| Authentication | Manual config only | Auto-retry with env vars |
| Issue Creation | Basic fields | Comprehensive field support |
| Export | Not available | JSON export functionality |
| Error Handling | Simple messages | Detailed JSON responses |
| Pagination | Basic | Full pagination support |
| Field Expansion | Limited | Comprehensive expansion |

This FastMCP JIRA server provides all the functionality needed for comprehensive JIRA integration in your PineLens application while maintaining compatibility with your existing MCP infrastructure.
