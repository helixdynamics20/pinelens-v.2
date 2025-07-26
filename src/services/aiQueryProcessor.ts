import { geminiService } from './geminiService';
import { SearchResult } from './mcpClient';

export interface MCPAction {
  server: 'github' | 'jira' | 'confluence' | 'slack' | 'teams' | 'bitbucket';
  action: string;
  parameters: Record<string, string | number | boolean>;
  priority: number; // 1-10, higher means more relevant
}

export interface QueryIntent {
  originalQuery: string;
  processedQuery: string;
  intent: string;
  actions: MCPAction[];
  confidence: number;
}

export class AIQueryProcessor {
  /**
   * Process natural language query using AI to determine MCP actions
   */
  async processQuery(query: string, availableServers: string[] = []): Promise<QueryIntent> {
    const systemPrompt = `You are an AI assistant that processes natural language queries and determines what MCP (Model Context Protocol) actions to take.

Available MCP servers and their capabilities:
- github: search_repositories, search_issues, search_code, search_commits, get_user_repos
- jira: search_issues, search_projects, get_user_issues
- confluence: search_pages, search_spaces
- slack: search_messages, search_files, search_channels
- teams: search_messages, search_files, search_meetings
- bitbucket: search_repositories, search_pull_requests

Connected servers: ${availableServers.join(', ') || 'none'}

Analyze the user query and respond with JSON in this exact format:
{
  "originalQuery": "user's original query",
  "processedQuery": "cleaned/processed version for search",
  "intent": "brief description of what user wants",
  "actions": [
    {
      "server": "server_name",
      "action": "action_name", 
      "parameters": {"key": "value"},
      "priority": number_1_to_10
    }
  ],
  "confidence": number_0_to_1
}

Examples:
Query: "fetch all my repos"
Response: {
  "originalQuery": "fetch all my repos",
  "processedQuery": "user repositories", 
  "intent": "Get all repositories owned by the user",
  "actions": [{"server": "github", "action": "get_user_repos", "parameters": {"type": "owner"}, "priority": 10}],
  "confidence": 0.95
}

Query: "show me issues assigned to me"
Response: {
  "originalQuery": "show me issues assigned to me",
  "processedQuery": "assigned issues",
  "intent": "Get issues assigned to the current user", 
  "actions": [
    {"server": "github", "action": "search_issues", "parameters": {"assignee": "@me"}, "priority": 9},
    {"server": "jira", "action": "get_user_issues", "parameters": {"assignee": "currentUser"}, "priority": 8}
  ],
  "confidence": 0.9
}

Query: "find python projects"
Response: {
  "originalQuery": "find python projects",
  "processedQuery": "python repositories",
  "intent": "Search for repositories using Python language",
  "actions": [{"server": "github", "action": "search_repositories", "parameters": {"language": "python"}, "priority": 9}],
  "confidence": 0.85
}

Now process this query: "${query}"`;

    try {
      const response = await geminiService.generateResponse(
        'gemini-1.5-flash',
        systemPrompt,
        {
          temperature: 0.1, // Low temperature for consistent, structured responses
          maxTokens: 1000
        }
      );

      // Parse the AI response
      const cleanedResponse = this.extractJSON(response);
      const queryIntent: QueryIntent = JSON.parse(cleanedResponse);

      // Validate and clean the response
      return this.validateQueryIntent(queryIntent, query);
    } catch (error) {
      console.error('AI query processing failed:', error);
      
      // Fallback to simple keyword-based processing
      return this.fallbackProcessing(query, availableServers);
    }
  }

  /**
   * Extract JSON from AI response (handles cases where AI includes extra text)
   */
  private extractJSON(response: string): string {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }
    
    // If no JSON found, assume the entire response is JSON
    return response.trim();
  }

  /**
   * Validate and clean the AI response
   */
  private validateQueryIntent(intent: QueryIntent, originalQuery: string): QueryIntent {
    // Ensure required fields exist
    if (!intent.originalQuery) intent.originalQuery = originalQuery;
    if (!intent.processedQuery) intent.processedQuery = originalQuery;
    if (!intent.intent) intent.intent = 'Search query';
    if (!intent.actions) intent.actions = [];
    if (!intent.confidence) intent.confidence = 0.5;

    // Validate actions
    intent.actions = intent.actions.filter(action => {
      return action.server && action.action && action.parameters && action.priority;
    });

    // Sort actions by priority (highest first)
    intent.actions.sort((a, b) => b.priority - a.priority);

    return intent;
  }

  /**
   * Fallback processing when AI fails
   */
  private fallbackProcessing(query: string, availableServers: string[]): QueryIntent {
    console.log('Using fallback query processing');
    
    const lowerQuery = query.toLowerCase();
    const actions: MCPAction[] = [];

    // Repository-related queries
    if (lowerQuery.includes('repo') || lowerQuery.includes('project')) {
      if (availableServers.includes('github')) {
        if (lowerQuery.includes('my') || lowerQuery.includes('all')) {
          actions.push({
            server: 'github',
            action: 'get_user_repos',
            parameters: { type: 'owner' },
            priority: 9
          });
        } else {
          actions.push({
            server: 'github',
            action: 'search_repositories',
            parameters: { query: query },
            priority: 8
          });
        }
      }
    }

    // Issue-related queries
    if (lowerQuery.includes('issue') || lowerQuery.includes('bug') || lowerQuery.includes('ticket')) {
      if (availableServers.includes('github')) {
        actions.push({
          server: 'github',
          action: 'search_issues',
          parameters: { query: query },
          priority: 8
        });
      }
      if (availableServers.includes('jira')) {
        actions.push({
          server: 'jira',
          action: 'search_issues',
          parameters: { query: query },
          priority: 7
        });
      }
    }

    // Default: search repositories if no specific intent detected
    if (actions.length === 0 && availableServers.includes('github')) {
      actions.push({
        server: 'github',
        action: 'search_repositories',
        parameters: { query: query },
        priority: 5
      });
    }

    return {
      originalQuery: query,
      processedQuery: query,
      intent: 'General search query',
      actions,
      confidence: 0.3
    };
  }

  /**
   * Format AI response from MCP results
   */
  async formatResults(
    queryIntent: QueryIntent, 
    mcpResults: SearchResult[], 
    model: string = 'gemini-1.5-flash'
  ): Promise<string> {
    if (mcpResults.length === 0) {
      return `I couldn't find any results for "${queryIntent.originalQuery}". This might be because:
- No matching items were found in your connected services
- The search terms were too specific
- You might need to connect additional services

Try rephrasing your query or check your service connections.`;
    }

    const systemPrompt = `You are an AI assistant that formats search results in a clear, helpful way.

Original user query: "${queryIntent.originalQuery}"
Intent: ${queryIntent.intent}

Format the following search results into a clear, well-structured response:
- Use markdown formatting
- Group similar results together
- Highlight the most relevant items
- Include practical next steps when appropriate
- Be concise but informative

Results: ${JSON.stringify(mcpResults.slice(0, 10), null, 2)}`;

    try {
      return await geminiService.generateResponse(model, systemPrompt, {
        temperature: 0.3,
        maxTokens: 1500
      });
    } catch (error) {
      console.error('Result formatting failed:', error);
      
      // Fallback formatting
      return this.fallbackFormatResults(queryIntent, mcpResults);
    }
  }

  /**
   * Fallback result formatting
   */
  private fallbackFormatResults(queryIntent: QueryIntent, mcpResults: SearchResult[]): string {
    const count = mcpResults.length;
    let response = `Found ${count} result${count !== 1 ? 's' : ''} for "${queryIntent.originalQuery}":\n\n`;

    mcpResults.slice(0, 10).forEach((result, index) => {
      response += `${index + 1}. **${result.title}**\n`;
      if (result.content) {
        response += `   ${result.content.substring(0, 100)}${result.content.length > 100 ? '...' : ''}\n`;
      }
      if (result.url) {
        response += `   🔗 [View](${result.url})\n`;
      }
      response += '\n';
    });

    if (mcpResults.length > 10) {
      response += `... and ${mcpResults.length - 10} more results.`;
    }

    return response;
  }
}

export const aiQueryProcessor = new AIQueryProcessor();
