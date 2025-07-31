/**
 * In-House Jira MCP Server
 * A dedicated MCP server for Jira integration with proper authentication and CORS handling
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const fetch = require('node-fetch');

class JiraMCPServer {
  constructor() {
    this.config = null;
    this.server = new Server(
      {
        name: "jira-inhouse-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error("[Jira MCP Server Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "jira_configure",
            description: "Configure Jira connection with base URL, email, and API token",
            inputSchema: {
              type: "object",
              properties: {
                baseUrl: {
                  type: "string",
                  description: "Jira base URL (e.g., https://qc-hub.atlassian.net)",
                },
                email: {
                  type: "string", 
                  description: "Your Atlassian account email",
                },
                apiToken: {
                  type: "string",
                  description: "Your Jira API token",
                },
              },
              required: ["baseUrl", "email", "apiToken"],
            },
          },
          {
            name: "jira_search_issues",
            description: "Search Jira issues using JQL or natural language",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Search query (JQL or natural language)",
                },
                maxResults: {
                  type: "number",
                  description: "Maximum number of results (default: 50)",
                  default: 50,
                },
                project: {
                  type: "string", 
                  description: "Filter by project key",
                },
                status: {
                  type: "string",
                  description: "Filter by status",
                },
                assignee: {
                  type: "string",
                  description: "Filter by assignee",
                },
              },
              required: ["query"],
            },
          },
          {
            name: "jira_get_issue",
            description: "Get detailed information about a specific Jira issue",
            inputSchema: {
              type: "object", 
              properties: {
                issueKey: {
                  type: "string",
                  description: "Issue key (e.g., NSVP-27299)",
                },
              },
              required: ["issueKey"],
            },
          },
          {
            name: "jira_get_projects",
            description: "Get list of accessible Jira projects",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "jira_get_user_issues",
            description: "Get issues assigned to the current user",
            inputSchema: {
              type: "object",
              properties: {
                maxResults: {
                  type: "number",
                  description: "Maximum number of results (default: 50)",
                  default: 50,
                },
              },
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "jira_configure":
            return await this.configureTool(args as any);
          case "jira_search_issues":
            return await this.searchIssues(args as any);
          case "jira_get_issue":
            return await this.getIssue(args as any);
          case "jira_get_projects":
            return await this.getProjects();
          case "jira_get_user_issues":
            return await this.getUserIssues(args as any);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    });
  }

  private async configureTool(args: { baseUrl: string; email: string; apiToken: string }) {
    this.config = {
      baseUrl: args.baseUrl.replace(/\/$/, ""), // Remove trailing slash
      email: args.email,
      apiToken: args.apiToken,
    };

    // Test the connection
    try {
      const response = await this.makeRequest("/rest/api/3/myself");
      if (response.ok) {
        const user = await response.json();
        return {
          content: [
            {
              type: "text",
              text: `✅ Jira configuration successful!\nConnected as: ${user.displayName} (${user.emailAddress})\nBase URL: ${this.config.baseUrl}`,
            },
          ],
        };
      } else {
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      this.config = null;
      throw error;
    }
  }

  private async searchIssues(args: { 
    query: string; 
    maxResults?: number; 
    project?: string; 
    status?: string; 
    assignee?: string; 
  }) {
    if (!this.config) {
      throw new Error("Jira not configured. Please run jira_configure first.");
    }

    // Build JQL query
    let jql = this.buildJQL(args.query, args);
    
    const searchParams = new URLSearchParams({
      jql,
      maxResults: (args.maxResults || 50).toString(),
      fields: "id,key,summary,description,status,priority,assignee,reporter,project,issuetype,created,updated,labels",
    });

    const response = await this.makeRequest(`/rest/api/3/search?${searchParams}`);
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { issues: JiraIssue[]; total: number };
    
    return {
      content: [
        {
          type: "text",
          text: this.formatIssuesResult(data.issues, data.total, jql),
        },
      ],
    };
  }

  private async getIssue(args: { issueKey: string }) {
    if (!this.config) {
      throw new Error("Jira not configured. Please run jira_configure first.");
    }

    const response = await this.makeRequest(
      `/rest/api/3/issue/${args.issueKey}?fields=id,key,summary,description,status,priority,assignee,reporter,project,issuetype,created,updated,labels,comment`
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Issue ${args.issueKey} not found`);
      }
      throw new Error(`Failed to get issue: ${response.status} ${response.statusText}`);
    }

    const issue = await response.json() as JiraIssue;
    
    return {
      content: [
        {
          type: "text",
          text: this.formatSingleIssue(issue),
        },
      ],
    };
  }

  private async getProjects() {
    if (!this.config) {
      throw new Error("Jira not configured. Please run jira_configure first.");
    }

    const response = await this.makeRequest("/rest/api/3/project");
    
    if (!response.ok) {
      throw new Error(`Failed to get projects: ${response.status} ${response.statusText}`);
    }

    const projects = await response.json() as any[];
    
    const projectList = projects.map(p => `• ${p.name} (${p.key})`).join("\n");
    
    return {
      content: [
        {
          type: "text",
          text: `📁 Accessible Jira Projects (${projects.length}):\n\n${projectList}`,
        },
      ],
    };
  }

  private async getUserIssues(args: { maxResults?: number }) {
    return this.searchIssues({
      query: "assignee = currentUser()",
      maxResults: args.maxResults || 50,
    });
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    if (!this.config) {
      throw new Error("Jira not configured");
    }

    const url = `${this.config.baseUrl}${endpoint}`;
    const auth = Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64');

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    return response;
  }

  private buildJQL(query: string, filters: any): string {
    // If query looks like JQL, use it directly
    if (query.includes('=') || query.includes('ORDER BY') || query.includes('AND') || query.includes('OR')) {
      return query;
    }

    // Build JQL from natural language and filters
    const conditions: string[] = [];

    // Add text search
    if (query.trim()) {
      conditions.push(`(summary ~ "${query}" OR description ~ "${query}" OR comment ~ "${query}")`);
    }

    // Add filters
    if (filters.project) {
      conditions.push(`project = "${filters.project}"`);
    }
    if (filters.status) {
      conditions.push(`status = "${filters.status}"`);
    }
    if (filters.assignee) {
      if (filters.assignee === 'currentUser()' || filters.assignee === '@me') {
        conditions.push('assignee = currentUser()');
      } else {
        conditions.push(`assignee = "${filters.assignee}"`);
      }
    }

    let jql = conditions.join(' AND ');
    if (jql) {
      jql += ' ORDER BY updated DESC';
    } else {
      jql = 'ORDER BY updated DESC';
    }

    return jql;
  }

  private formatIssuesResult(issues: JiraIssue[], total: number, jql: string): string {
    let result = `🔍 Jira Search Results (${issues.length}/${total} issues)\n`;
    result += `📝 Query: ${jql}\n\n`;

    if (issues.length === 0) {
      result += "No issues found matching your criteria.";
      return result;
    }

    issues.forEach(issue => {
      const summary = issue.fields.summary || 'Untitled';
      const status = issue.fields.status?.name || 'Unknown';
      const priority = issue.fields.priority?.name || 'Medium';
      const assignee = issue.fields.assignee?.displayName || 'Unassigned';
      const project = issue.fields.project?.name || issue.fields.project?.key || 'Unknown';
      
      result += `🎫 ${issue.key}: ${summary}\n`;
      result += `   📊 Status: ${status} | Priority: ${priority}\n`;
      result += `   👤 Assignee: ${assignee} | Project: ${project}\n`;
      result += `   🔗 ${this.config!.baseUrl}/browse/${issue.key}\n\n`;
    });

    return result;
  }

  private formatSingleIssue(issue: JiraIssue): string {
    const fields = issue.fields;
    let result = `🎫 ${issue.key}: ${fields.summary}\n\n`;
    
    result += `📊 **Status:** ${fields.status?.name || 'Unknown'}\n`;
    result += `⚡ **Priority:** ${fields.priority?.name || 'Medium'}\n`;
    result += `📁 **Project:** ${fields.project?.name} (${fields.project?.key})\n`;
    result += `🏷️ **Type:** ${fields.issuetype?.name || 'Unknown'}\n`;
    result += `👤 **Assignee:** ${fields.assignee?.displayName || 'Unassigned'}\n`;
    result += `📝 **Reporter:** ${fields.reporter?.displayName || 'Unknown'}\n`;
    result += `📅 **Created:** ${new Date(fields.created).toLocaleDateString()}\n`;
    result += `🔄 **Updated:** ${new Date(fields.updated).toLocaleDateString()}\n`;
    
    if (fields.labels && fields.labels.length > 0) {
      result += `🏷️ **Labels:** ${fields.labels.join(', ')}\n`;
    }
    
    result += `\n🔗 **Link:** ${this.config!.baseUrl}/browse/${issue.key}\n`;
    
    if (fields.description) {
      result += `\n📄 **Description:**\n${this.extractPlainText(fields.description)}\n`;
    }

    return result;
  }

  private extractPlainText(content: any): string {
    if (typeof content === 'string') {
      return content;
    }
    
    if (content && typeof content === 'object') {
      if (content.content && Array.isArray(content.content)) {
        return this.extractTextFromADF(content.content);
      }
      return JSON.stringify(content);
    }
    
    return String(content || '');
  }

  private extractTextFromADF(content: any[]): string {
    let text = '';
    
    for (const node of content) {
      if (node.type === 'paragraph' && node.content) {
        for (const textNode of node.content) {
          if (textNode.type === 'text' && textNode.text) {
            text += textNode.text + ' ';
          }
        }
        text += '\n';
      } else if (node.type === 'text' && node.text) {
        text += node.text + ' ';
      } else if (node.content) {
        text += this.extractTextFromADF(node.content) + ' ';
      }
    }
    
    return text.trim();
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Jira MCP Server running on stdio");
  }
}

// Run the server
const server = new JiraMCPServer();
server.run().catch(console.error);
