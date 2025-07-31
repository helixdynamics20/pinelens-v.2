import { awsBedrockService } from './awsBedrockService';

export interface MCPAction {
  server: 'github' | 'jira' | 'confluence' | 'slack' | 'teams' | 'bitbucket';
  action: string;
  parameters: Record<string, string | number | boolean>;
  priority: number; // 1-10, higher means more relevant
  reasoning?: string; // AI's reasoning for this action
}

export interface QueryIntent {
  originalQuery: string;
  processedQuery: string;
  intent: string;
  actions: MCPAction[];
  confidence: number;
  suggestedFormat?: 'table' | 'list' | 'cards' | 'json' | 'summary';
  expectedDataTypes?: string[];
}

export interface MCPResult {
  action: string;
  server: string;
  data: unknown;
  priority: number;
}

export interface ProcessedResponse {
  success: boolean;
  data: MCPResult[];
  formattedResponse: string;
  summary: string;
  errors?: string[];
  metadata?: {
    totalResults: number;
    executionTime: number;
    sourceSystems: string[];
  };
}

export class EnhancedAIQueryProcessor {
  /**
   * Process natural language query using AWS Bedrock to determine MCP actions
   */
  async processQuery(query: string, availableServers: string[] = []): Promise<QueryIntent> {
    if (!awsBedrockService.isAvailable()) {
      throw new Error('AWS Bedrock service is not available. Please check your configuration.');
    }

    const systemPrompt = this.buildSystemPrompt(query, availableServers);

    try {
      const response = await awsBedrockService.generateResponse(
        systemPrompt,
        'structured',
        {
          temperature: 0.1,
          maxTokens: 2000
        }
      );

      // Parse and validate the AI response
      const queryIntent = this.parseQueryIntent(response.content, query);
      return this.validateQueryIntent(queryIntent, query);

    } catch (error) {
      console.error('Error processing query with AWS Bedrock:', error);
      // Fallback to basic intent parsing
      return this.createFallbackIntent(query, availableServers);
    }
  }

  /**
   * Execute MCP actions and format the response using AI
   */
  async executeAndFormat(queryIntent: QueryIntent): Promise<ProcessedResponse> {
    const startTime = Date.now();
    const results: MCPResult[] = [];
    const errors: string[] = [];
    const sourceSystems: string[] = [];

    // Execute actions in parallel with priority-based ordering
    const sortedActions = queryIntent.actions.sort((a, b) => b.priority - a.priority);
    
    try {
      const executionPromises = sortedActions.map(async (action) => {
        try {
          const result = await this.executeMCPAction(action);
          if (result) {
            results.push({
              action: action.action,
              server: action.server,
              data: result,
              priority: action.priority
            });
            if (!sourceSystems.includes(action.server)) {
              sourceSystems.push(action.server);
            }
          }
        } catch (error) {
          console.error(`Error executing ${action.server}:${action.action}:`, error);
          errors.push(`Failed to execute ${action.server}:${action.action} - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });

      await Promise.allSettled(executionPromises);

      // Format the response using AI
      const formattedResponse = await this.formatResponseWithAI(
        queryIntent,
        results,
        errors
      );

      const executionTime = Date.now() - startTime;

      return {
        success: results.length > 0,
        data: results,
        formattedResponse: formattedResponse.formatted,
        summary: formattedResponse.summary,
        errors: errors.length > 0 ? errors : undefined,
        metadata: {
          totalResults: results.reduce((acc, r) => acc + (Array.isArray(r.data) ? r.data.length : 1), 0),
          executionTime,
          sourceSystems
        }
      };

    } catch (error) {
      console.error('Error executing query:', error);
      return {
        success: false,
        data: [],
        formattedResponse: 'Sorry, I encountered an error while processing your request.',
        summary: 'Query execution failed',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        metadata: {
          totalResults: 0,
          executionTime: Date.now() - startTime,
          sourceSystems: []
        }
      };
    }
  }

  /**
   * Build comprehensive system prompt for query analysis
   */
  private buildSystemPrompt(query: string, availableServers: string[]): string {
    return `You are an advanced AI assistant that processes natural language queries for a centralized search interface. Your task is to analyze user queries and determine the best MCP (Model Context Protocol) actions to execute.

AVAILABLE MCP SERVERS AND CAPABILITIES:
- github: search_repositories, search_issues, search_code, search_commits, get_user_repos, get_repo_details, search_pull_requests
- jira: search_issues, search_projects, get_user_issues, get_project_details
- confluence: search_pages, search_spaces, get_page_content
- slack: search_messages, search_files, search_channels, get_channel_history
- teams: search_messages, search_files, search_meetings, get_team_activity
- bitbucket: search_repositories, search_pull_requests, search_commits

CURRENTLY CONNECTED SERVERS: ${availableServers.join(', ') || 'none'}

RESPONSE FORMAT:
You must respond with valid JSON in this exact structure:
{
  "originalQuery": "user's exact query",
  "processedQuery": "optimized search terms",
  "intent": "clear description of user's goal",
  "actions": [
    {
      "server": "server_name",
      "action": "specific_action",
      "parameters": {"key": "value"},
      "priority": 1-10,
      "reasoning": "why this action is relevant"
    }
  ],
  "confidence": 0.0-1.0,
  "suggestedFormat": "table|list|cards|json|summary",
  "expectedDataTypes": ["repositories", "issues", "files", "messages", etc.]
}

ANALYSIS GUIDELINES:
1. Prioritize actions based on relevance (1-10 scale, 10 being most relevant)
2. Only suggest actions for connected servers
3. Extract specific parameters from the query (dates, usernames, keywords, etc.)
4. Consider synonyms and related terms
5. Suggest appropriate data formatting
6. Set confidence based on query clarity

QUERY EXAMPLES:

Query: "show me my recent GitHub pull requests"
Response: {
  "originalQuery": "show me my recent GitHub pull requests",
  "processedQuery": "recent pull requests author:@me",
  "intent": "Find recent pull requests created by the user",
  "actions": [
    {
      "server": "github",
      "action": "search_pull_requests",
      "parameters": {"author": "@me", "state": "all", "sort": "updated"},
      "priority": 10,
      "reasoning": "Direct match for GitHub pull requests by current user"
    }
  ],
  "confidence": 0.95,
  "suggestedFormat": "table",
  "expectedDataTypes": ["pull_requests"]
}

Query: "find Python projects with machine learning"
Response: {
  "originalQuery": "find Python projects with machine learning",
  "processedQuery": "python machine learning ML AI",
  "intent": "Search for Python repositories related to machine learning",
  "actions": [
    {
      "server": "github",
      "action": "search_repositories",
      "parameters": {"language": "python", "q": "machine learning OR ML OR AI", "sort": "stars"},
      "priority": 9,
      "reasoning": "Python repositories matching ML keywords"
    },
    {
      "server": "github",
      "action": "search_code",
      "parameters": {"language": "python", "q": "machine learning OR ML OR tensorflow OR pytorch"},
      "priority": 7,
      "reasoning": "Code search for ML-related content in Python files"
    }
  ],
  "confidence": 0.85,
  "suggestedFormat": "cards",
  "expectedDataTypes": ["repositories", "code"]
}

Now analyze this query: "${query}"

Remember to:
- Only suggest servers from the connected list: ${availableServers.join(', ')}
- Be specific with parameters
- Explain your reasoning
- Suggest appropriate formatting
- Return valid JSON only`;
  }

  /**
   * Parse AI response into QueryIntent
   */
  private parseQueryIntent(response: string, originalQuery: string): QueryIntent {
    try {
      // Use the same safe JSON parsing method
      const cleanedResponse = this.cleanAndParseQueryJSON(response);
      if (!cleanedResponse) {
        throw new Error('Failed to extract valid JSON from AI response');
      }

      // Ensure required fields are present
      return {
        originalQuery: (cleanedResponse.originalQuery as string) || originalQuery,
        processedQuery: (cleanedResponse.processedQuery as string) || originalQuery,
        intent: (cleanedResponse.intent as string) || 'Process user query',
        actions: Array.isArray(cleanedResponse.actions) ? cleanedResponse.actions as MCPAction[] : [],
        confidence: typeof cleanedResponse.confidence === 'number' ? cleanedResponse.confidence : 0.5,
        suggestedFormat: (cleanedResponse.suggestedFormat as 'table' | 'list' | 'cards' | 'json' | 'summary') || 'list',
        expectedDataTypes: Array.isArray(cleanedResponse.expectedDataTypes) ? cleanedResponse.expectedDataTypes as string[] : []
      };
    } catch (error) {
      console.error('Error parsing query intent:', error);
      console.error('Original response:', response);
      throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }
  }

  /**
   * Clean and safely parse JSON for query intent
   */
  private cleanAndParseQueryJSON(content: string): Record<string, unknown> | null {
    try {
      // Extract JSON from response (in case there's extra text)
      let jsonStr = content.trim();
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      // Clean the JSON string
      jsonStr = jsonStr.replace(/[^\x20-\x7E\xA0\n\r\t]/g, '').trim();

      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('JSON parsing error:', error);
      return null;
    }
  }

  /**
   * Validate and clean query intent
   */
  private validateQueryIntent(queryIntent: QueryIntent, originalQuery: string): QueryIntent {
    // Ensure basic validation
    if (!queryIntent.actions || queryIntent.actions.length === 0) {
      queryIntent.actions = this.generateFallbackActions(originalQuery);
    }

    // Validate action priorities
    queryIntent.actions = queryIntent.actions.map(action => ({
      ...action,
      priority: Math.max(1, Math.min(10, action.priority || 5))
    }));

    // Ensure confidence is in valid range
    queryIntent.confidence = Math.max(0, Math.min(1, queryIntent.confidence || 0.5));

    return queryIntent;
  }

  /**
   * Execute a single MCP action
   */
  private async executeMCPAction(action: MCPAction): Promise<unknown> {
    try {
      // Mock implementation - replace with actual MCP service integration
      // This would integrate with your existing MCP tools service
      const mockResult = await this.mockMCPExecution(action);
      return mockResult;
    } catch (error) {
      console.error(`Error executing MCP action ${action.server}:${action.action}:`, error);
      throw error;
    }
  }

  /**
   * Mock MCP execution - replace with actual implementation
   */
  private async mockMCPExecution(action: MCPAction): Promise<unknown> {
    // This is a mock implementation - replace with actual MCP service calls
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate API call
    
    switch (action.server) {
      case 'github':
        return this.mockGitHubResponse(action);
      case 'jira':
        return this.mockJiraResponse(action);
      default:
        return { message: `Mock response for ${action.server}:${action.action}` };
    }
  }

  /**
   * Mock GitHub responses
   */
  private mockGitHubResponse(action: MCPAction): unknown {
    switch (action.action) {
      case 'search_repositories':
        return [
          { name: 'example-repo', description: 'Example repository', stars: 100, language: 'TypeScript' },
          { name: 'another-repo', description: 'Another repository', stars: 50, language: 'Python' }
        ];
      case 'search_issues':
        return [
          { title: 'Bug in authentication', state: 'open', number: 123 },
          { title: 'Feature request: Add dark mode', state: 'closed', number: 124 }
        ];
      default:
        return { message: `Mock GitHub ${action.action} response` };
    }
  }

  /**
   * Mock Jira responses
   */
  private mockJiraResponse(action: MCPAction): unknown {
    switch (action.action) {
      case 'search_issues':
        return [
          { key: 'PROJ-123', summary: 'Fix login bug', status: 'In Progress' },
          { key: 'PROJ-124', summary: 'Implement new feature', status: 'To Do' }
        ];
      default:
        return { message: `Mock Jira ${action.action} response` };
    }
  }

  /**
   * Format response using AI
   */
  private async formatResponseWithAI(
    queryIntent: QueryIntent,
    results: MCPResult[],
    errors: string[]
  ): Promise<{ formatted: string; summary: string }> {
    try {
      const formatPrompt = `You are formatting search results for a user query. Create a well-structured, readable response.

ORIGINAL QUERY: "${queryIntent.originalQuery}"
INTENT: ${queryIntent.intent}
SUGGESTED FORMAT: ${queryIntent.suggestedFormat}

RESULTS:
${JSON.stringify(results, null, 2)}

ERRORS (if any):
${errors.join('\n')}

Create a response with:
1. A brief summary of what was found
2. Well-formatted results (use markdown formatting)
3. Clear organization and structure
4. Highlight important information
5. Include relevant metadata where helpful

Format as JSON:
{
  "summary": "Brief summary of results",
  "formatted": "Detailed markdown-formatted response"
}`;

      const response = await awsBedrockService.generateResponse(
        formatPrompt,
        'general',
        { temperature: 0.2, maxTokens: 3000 }
      );

      // Clean and parse the AI response safely
      const cleanedResponse = this.cleanAndParseJSON(response.content);
      if (cleanedResponse) {
        return {
          summary: cleanedResponse.summary || 'Results processed',
          formatted: cleanedResponse.formatted || this.createFallbackFormat(results, errors)
        };
      } else {
        throw new Error('Failed to parse AI response');
      }

    } catch (error) {
      console.error('Error formatting response with AI:', error);
      return {
        summary: `Found ${results.length} result(s)`,
        formatted: this.createFallbackFormat(results, errors)
      };
    }
  }

  /**
   * Clean and safely parse JSON response from AI
   */
  private cleanAndParseJSON(content: string): { summary: string; formatted: string } | null {
    try {
      // First, try to extract JSON from the response
      let jsonStr = content.trim();
      
      // Look for JSON block markers and extract content
      const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/) || 
                       jsonStr.match(/\{[\s\S]*\}/) ||
                       [null, jsonStr];
      
      if (jsonMatch && jsonMatch[1]) {
        jsonStr = jsonMatch[1];
      }
      
      // Clean up common issues in AI-generated JSON
      jsonStr = filterPrintableCharacters(jsonStr)
        .replace(/\n/g, '\\n') // Escape newlines
        .replace(/\r/g, '\\r') // Escape carriage returns
        .replace(/\t/g, '\\t') // Escape tabs
        .trim();

      // Try to parse the cleaned JSON
      const parsed = JSON.parse(jsonStr);
      
      // Validate the structure
      if (typeof parsed === 'object' && parsed !== null) {
        return {
          summary: typeof parsed.summary === 'string' ? parsed.summary : 'Results processed',
          formatted: typeof parsed.formatted === 'string' ? parsed.formatted : 'No formatted response available'
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing AI JSON response:', error);
      console.error('Original content:', content);
      
      // Try to extract any meaningful text as fallback
      const lines = content.split('\n').filter(line => line.trim());
      const summary = lines.find(line => line.toLowerCase().includes('summary')) || 'AI processing completed';
      const formatted = lines.join('\n') || 'Response formatting failed';
      
      return {
        summary: summary.substring(0, 200),
        formatted: formatted.substring(0, 2000)
      };
    }
  }

  /**
   * Create fallback intent when AI processing fails
   */
  private createFallbackIntent(query: string, availableServers: string[]): QueryIntent {
    const actions = this.generateFallbackActions(query, availableServers);
    
    return {
      originalQuery: query,
      processedQuery: query.toLowerCase().replace(/[^\w\s]/g, ''),
      intent: 'Search for relevant information',
      actions,
      confidence: 0.3,
      suggestedFormat: 'list',
      expectedDataTypes: ['general']
    };
  }

  /**
   * Generate basic fallback actions
   */
  private generateFallbackActions(query: string, availableServers: string[] = []): MCPAction[] {
    const actions: MCPAction[] = [];
    const lowerQuery = query.toLowerCase();

    // Simple keyword matching
    if (availableServers.includes('github')) {
      if (lowerQuery.includes('repo') || lowerQuery.includes('repository')) {
        actions.push({
          server: 'github',
          action: 'search_repositories',
          parameters: { q: query },
          priority: 8
        });
      }
      if (lowerQuery.includes('issue') || lowerQuery.includes('bug')) {
        actions.push({
          server: 'github',
          action: 'search_issues',
          parameters: { q: query },
          priority: 7
        });
      }
    }

    if (availableServers.includes('jira') && (lowerQuery.includes('issue') || lowerQuery.includes('ticket'))) {
      actions.push({
        server: 'jira',
        action: 'search_issues',
        parameters: { q: query },
        priority: 6
      });
    }

    // Default to GitHub repository search if no specific actions
    if (actions.length === 0 && availableServers.includes('github')) {
      actions.push({
        server: 'github',
        action: 'search_repositories',
        parameters: { q: query },
        priority: 5
      });
    }

    return actions;
  }

  /**
   * Create fallback formatted response
   */
  private createFallbackFormat(results: MCPResult[], errors: string[]): string {
    let formatted = '';

    if (results.length > 0) {
      formatted += `## Search Results\n\n`;
      results.forEach((result) => {
        formatted += `### ${result.server.toUpperCase()} - ${result.action}\n`;
        if (Array.isArray(result.data)) {
          formatted += `Found ${result.data.length} items:\n`;
          result.data.slice(0, 5).forEach((item: unknown, i: number) => {
            const displayItem = typeof item === 'object' && item !== null 
              ? (item as Record<string, unknown>)
              : { value: item };
            const itemText = displayItem.name || displayItem.title || displayItem.summary || 
              JSON.stringify(item).substring(0, 100);
            formatted += `${i + 1}. ${itemText}\n`;
          });
          if (result.data.length > 5) {
            formatted += `... and ${result.data.length - 5} more items\n`;
          }
        } else {
          formatted += `${JSON.stringify(result.data, null, 2)}\n`;
        }
        formatted += '\n';
      });
    }

    if (errors.length > 0) {
      formatted += `## Errors\n\n`;
      errors.forEach(error => {
        formatted += `- ${error}\n`;
      });
    }

    return formatted || 'No results found.';
  }
}

export const enhancedAIQueryProcessor = new EnhancedAIQueryProcessor();
