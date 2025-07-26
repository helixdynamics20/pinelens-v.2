# MCP Integration Plan for PineLens v.2

## Current State Analysis
Your current implementation is a direct API integration masquerading as MCP. The real issue is that VS Code's MCP integration works differently:

### VS Code MCP Flow:
1. User query: "fetch all my repos"
2. AI model processes natural language
3. AI determines which MCP tools to call
4. MCP tools execute and return structured data
5. AI formats the response coherently

### Your Current Flow:
1. User query: "fetch all my repos"
2. Direct GitHub API call
3. Format as search results
4. Display to user

## Proposed Solution: True MCP Integration

### Phase 1: Create Real MCP Servers
Instead of simulating MCP, create actual MCP servers that follow the specification:

#### GitHub MCP Server (separate process)
```typescript
// github-mcp-server/src/server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server(
  { name: 'github-server', version: '1.0.0' },
  { capabilities: { tools: {}, resources: {} } }
);

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_repositories',
        description: 'Search GitHub repositories',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            user: { type: 'string', description: 'Limit to user repositories' }
          }
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'search_repositories') {
    // Your GitHub API logic here
    const results = await searchGitHubRepositories(request.params.arguments);
    return { content: [{ type: 'text', text: JSON.stringify(results) }] };
  }
});
```

### Phase 2: Update Your App to be an MCP Client
Transform your app into a proper MCP client:

```typescript
// src/services/trueMCPClient.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class TrueMCPClient {
  private clients: Map<string, Client> = new Map();

  async connectToServer(serverName: string, command: string, args: string[]) {
    const transport = new StdioClientTransport({
      command,
      args
    });
    
    const client = new Client(
      { name: 'pinelens-client', version: '1.0.0' },
      { capabilities: {} }
    );

    await client.connect(transport);
    this.clients.set(serverName, client);
  }

  async searchWithAI(query: string) {
    // 1. Use AI model to understand intent
    const intent = await this.extractIntent(query);
    
    // 2. Call appropriate MCP tools based on intent
    const results = [];
    for (const action of intent.actions) {
      const client = this.clients.get(action.server);
      if (client) {
        const result = await client.request({
          method: 'tools/call',
          params: {
            name: action.tool,
            arguments: action.arguments
          }
        });
        results.push(result);
      }
    }
    
    // 3. Use AI to format final response
    return await this.formatResponse(query, results);
  }
}
```

### Phase 3: AI-Powered Query Processing
Add true AI processing of natural language queries:

```typescript
export class QueryProcessor {
  async processQuery(query: string): Promise<MCPAction[]> {
    // Use your Gemini service to understand intent
    const response = await geminiService.generateResponse('gemini-1.5-flash', 
      `Analyze this query and determine what MCP tools to call: "${query}"
      
      Available tools:
      - search_repositories (GitHub): Search user repositories
      - search_issues (GitHub): Search issues and PRs
      - search_jira_issues (Jira): Search Jira tickets
      
      Respond with JSON array of actions:
      [{"server": "github", "tool": "search_repositories", "arguments": {"query": "...", "user": "..."}}]`,
      { temperature: 0.1 }
    );
    
    return JSON.parse(response);
  }
}
```

## Implementation Steps

### Step 1: Create GitHub MCP Server
1. Create a separate Node.js project for the GitHub MCP server
2. Use the official MCP SDK
3. Implement tools for repositories, issues, code search
4. Deploy as a separate process that your app can spawn

### Step 2: Update App Architecture
1. Replace direct API calls with MCP client connections
2. Add AI-powered query processing
3. Implement proper tool calling workflow
4. Add response formatting with AI

### Step 3: Add Other MCP Servers
1. Jira MCP server
2. Confluence MCP server  
3. Slack MCP server
4. Teams MCP server

## Benefits of True MCP Integration

1. **Standardized**: Follows the official MCP specification
2. **Reusable**: Your MCP servers can be used by VS Code, Claude, and other MCP clients
3. **AI-Powered**: Natural language understanding and response formatting
4. **Extensible**: Easy to add new tools and capabilities
5. **Composable**: Multiple servers can work together on complex queries

## Alternative: Simplified AI Integration

If full MCP implementation is too complex, at minimum add AI query processing:

```typescript
async handleSearch(query: string) {
  // 1. Use AI to understand what the user wants
  const intent = await this.processQueryWithAI(query);
  
  // 2. Execute appropriate API calls based on intent
  const results = await this.executeIntent(intent);
  
  // 3. Use AI to format the response
  const formattedResponse = await this.formatResponseWithAI(query, results);
  
  return formattedResponse;
}
```

This would make your search behave more like VS Code's MCP integration without the full complexity of implementing MCP servers.
