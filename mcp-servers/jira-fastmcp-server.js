/**
 * FastMCP-style JIRA MCP Server (JavaScript Implementation)
 * Enhanced JIRA server with JSON responses and advanced functionality
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const fetch = require('node-fetch');
require('dotenv').config();

class JiraFastMCPServer {
  constructor() {
    this.authHeaders = null;
    this.jiraEmail = process.env.JIRA_EMAIL || "";
    this.jiraApiToken = process.env.JIRA_API_TOKEN || "";
    this.jiraBaseUrl = process.env.JIRA_BASE_URL || "";
    
    this.server = new Server(
      {
        name: "jira-fastmcp-server",
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
      console.error("[JIRA FastMCP Server Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  getHeadersWithCredentials(email, apiToken) {
    const credentials = `${email}:${apiToken}`;
    const encodedCredentials = Buffer.from(credentials).toString('base64');
    return {
      "Authorization": `Basic ${encodedCredentials}`,
      "Accept": "application/json",
      "Content-Type": "application/json"
    };
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "authenticate_user",
            description: "Authenticate with JIRA using email and API token",
            inputSchema: {
              type: "object",
              properties: {
                email: {
                  type: "string",
                  description: "Your JIRA email address (optional, will use config if not provided)",
                },
                apiToken: {
                  type: "string",
                  description: "Your JIRA API token (optional, will use config if not provided)",
                },
                baseUrl: {
                  type: "string",
                  description: "JIRA base URL (optional, will use config if not provided)",
                },
              },
            },
          },
          {
            name: "get_user_info",
            description: "Get current user information and permissions",
            inputSchema: {
              type: "object",
              properties: {
                expand: {
                  type: "string",
                  description: "Comma-separated list of fields to expand",
                },
              },
            },
          },
          {
            name: "search_issues",
            description: "Search JIRA issues using JQL with comprehensive results",
            inputSchema: {
              type: "object",
              properties: {
                jql: {
                  type: "string",
                  description: "JQL query string",
                },
                maxResults: {
                  type: "number",
                  description: "Maximum number of results (default: 50)",
                  default: 50,
                },
                startAt: {
                  type: "number",
                  description: "Starting index for pagination (default: 0)",
                  default: 0,
                },
                fields: {
                  type: "string",
                  description: "Comma-separated list of fields to include",
                },
              },
              required: ["jql"],
            },
          },
          {
            name: "get_issue_details",
            description: "Get comprehensive details about a specific JIRA issue",
            inputSchema: {
              type: "object",
              properties: {
                issueKey: {
                  type: "string",
                  description: "Issue key (e.g., 'PROJ-123')",
                },
                expand: {
                  type: "string",
                  description: "Comma-separated list of fields to expand (e.g., 'changelog,comments,attachments')",
                },
              },
              required: ["issueKey"],
            },
          },
          {
            name: "get_projects",
            description: "Get list of JIRA projects with detailed information",
            inputSchema: {
              type: "object",
              properties: {
                expand: {
                  type: "string",
                  description: "Comma-separated list of fields to expand",
                },
                recent: {
                  type: "number",
                  description: "Number of recent projects to return",
                },
                properties: {
                  type: "string",
                  description: "Comma-separated list of properties to include",
                },
              },
            },
          },
          {
            name: "get_project_details",
            description: "Get comprehensive details about a specific project",
            inputSchema: {
              type: "object",
              properties: {
                projectKey: {
                  type: "string",
                  description: "Project key (e.g., 'PROJ')",
                },
                expand: {
                  type: "string",
                  description: "Comma-separated list of fields to expand",
                },
              },
              required: ["projectKey"],
            },
          },
          {
            name: "get_issue_types",
            description: "Get available issue types with metadata",
            inputSchema: {
              type: "object",
              properties: {
                projectKey: {
                  type: "string",
                  description: "Project key to get project-specific issue types",
                },
              },
            },
          },
          {
            name: "get_project_versions",
            description: "Get versions for a specific project",
            inputSchema: {
              type: "object",
              properties: {
                projectKey: {
                  type: "string",
                  description: "Project key",
                },
                expand: {
                  type: "string",
                  description: "Comma-separated list of fields to expand",
                },
              },
              required: ["projectKey"],
            },
          },
          {
            name: "get_project_components",
            description: "Get components for a specific project",
            inputSchema: {
              type: "object",
              properties: {
                projectKey: {
                  type: "string",
                  description: "Project key",
                },
              },
              required: ["projectKey"],
            },
          },
          {
            name: "get_dashboards",
            description: "Get user's dashboards with detailed information",
            inputSchema: {
              type: "object",
              properties: {
                filter: {
                  type: "string",
                  description: "Filter dashboards (favourite, my)",
                },
                startAt: {
                  type: "number",
                  description: "Starting index for pagination",
                  default: 0,
                },
                maxResults: {
                  type: "number",
                  description: "Maximum number of results",
                  default: 50,
                },
              },
            },
          },
          {
            name: "get_filters",
            description: "Get user's saved filters with JQL queries",
            inputSchema: {
              type: "object",
              properties: {
                expand: {
                  type: "string",
                  description: "Comma-separated list of fields to expand",
                },
                includeFavourites: {
                  type: "boolean",
                  description: "Include favourite filters",
                  default: true,
                },
              },
            },
          },
          {
            name: "create_issue",
            description: "Create a new JIRA issue with comprehensive field support",
            inputSchema: {
              type: "object",
              properties: {
                projectKey: {
                  type: "string",
                  description: "Project key where to create the issue",
                },
                summary: {
                  type: "string",
                  description: "Issue summary/title",
                },
                description: {
                  type: "string",
                  description: "Issue description (will be converted to ADF format)",
                },
                issueType: {
                  type: "string",
                  description: "Issue type (e.g., 'Bug', 'Task', 'Story')",
                },
                priority: {
                  type: "string",
                  description: "Issue priority (e.g., 'High', 'Medium', 'Low')",
                },
                assignee: {
                  type: "string",
                  description: "Assignee email or account ID",
                },
                labels: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of labels to add",
                },
                components: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of component names",
                },
              },
              required: ["projectKey", "summary", "issueType"],
            },
          },
          {
            name: "update_issue",
            description: "Update an existing JIRA issue",
            inputSchema: {
              type: "object",
              properties: {
                issueKey: {
                  type: "string",
                  description: "Issue key to update",
                },
                summary: {
                  type: "string",
                  description: "New summary",
                },
                description: {
                  type: "string",
                  description: "New description",
                },
                assignee: {
                  type: "string",
                  description: "New assignee email or account ID",
                },
                priority: {
                  type: "string",
                  description: "New priority",
                },
                labels: {
                  type: "array",
                  items: { type: "string" },
                  description: "New labels (replaces existing)",
                },
              },
              required: ["issueKey"],
            },
          },
          {
            name: "export_issues_to_file",
            description: "Export JIRA issues matching JQL query to JSON file",
            inputSchema: {
              type: "object",
              properties: {
                jql: {
                  type: "string",
                  description: "JQL query to filter issues",
                },
                filename: {
                  type: "string",
                  description: "Local filename to save to",
                },
                maxResults: {
                  type: "number",
                  description: "Maximum number of issues to export",
                  default: 1000,
                },
              },
              required: ["jql", "filename"],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "authenticate_user":
            return await this.authenticateUser(args);
          case "get_user_info":
            return await this.getUserInfo(args);
          case "search_issues":
            return await this.searchIssues(args);
          case "get_issue_details":
            return await this.getIssueDetails(args);
          case "get_projects":
            return await this.getProjects(args);
          case "get_project_details":
            return await this.getProjectDetails(args);
          case "get_issue_types":
            return await this.getIssueTypes(args);
          case "get_project_versions":
            return await this.getProjectVersions(args);
          case "get_project_components":
            return await this.getProjectComponents(args);
          case "get_dashboards":
            return await this.getDashboards(args);
          case "get_filters":
            return await this.getFilters(args);
          case "create_issue":
            return await this.createIssue(args);
          case "update_issue":
            return await this.updateIssue(args);
          case "export_issues_to_file":
            return await this.exportIssuesToFile(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: errorMessage,
              }, null, 2),
            },
          ],
        };
      }
    });
  }

  async authenticateUser(args = {}) {
    const email = args.email || this.jiraEmail;
    const apiToken = args.apiToken || this.jiraApiToken;
    const baseUrl = args.baseUrl || this.jiraBaseUrl;
    
    if (!email || !apiToken || !baseUrl) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: "Missing required credentials. Please provide email, apiToken, and baseUrl or configure them in environment variables."
            }, null, 2),
          },
        ],
      };
    }

    try {
      const headers = this.getHeadersWithCredentials(email, apiToken);
      const response = await fetch(`${baseUrl}/rest/api/3/myself`, {
        headers: headers
      });

      if (response.ok) {
        const userData = await response.json();
        this.authHeaders = headers;
        this.jiraBaseUrl = baseUrl;
        this.jiraEmail = email;
        this.jiraApiToken = apiToken;
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                user: userData,
                baseUrl: baseUrl,
                message: `Authenticated as: ${userData.displayName} (${userData.emailAddress})`
              }, null, 2),
            },
          ],
        };
      } else {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: `Authentication failed: ${response.status}`,
                details: errorText
              }, null, 2),
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: `Exception during authentication: ${error.message}`
            }, null, 2),
          },
        ],
      };
    }
  }

  async getUserInfo(args = {}) {
    if (!this.authHeaders) {
      const authResult = await this.authenticateUser();
      const authData = JSON.parse(authResult.content[0].text);
      if (!authData.success) {
        return authResult;
      }
    }

    try {
      let endpoint = '/rest/api/3/myself';
      if (args.expand) {
        endpoint += `?expand=${args.expand}`;
      }

      const response = await fetch(`${this.jiraBaseUrl}${endpoint}`, {
        headers: this.authHeaders
      });

      if (response.ok) {
        const userData = await response.json();
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                user: userData,
                permissions: userData.applicationRoles || {},
                groups: userData.groups || {}
              }, null, 2),
            },
          ],
        };
      } else {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: `Failed to get user info: ${response.status}`,
                details: errorText
              }, null, 2),
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: `Exception while getting user info: ${error.message}`
            }, null, 2),
          },
        ],
      };
    }
  }

  async searchIssues(args) {
    if (!this.authHeaders) {
      const authResult = await this.authenticateUser();
      const authData = JSON.parse(authResult.content[0].text);
      if (!authData.success) {
        return authResult;
      }
    }

    try {
      const params = new URLSearchParams({
        jql: args.jql,
        maxResults: (args.maxResults || 50).toString(),
        startAt: (args.startAt || 0).toString(),
        expand: 'names,schema,operations,editmeta,changelog,renderedFields',
      });

      if (args.fields) {
        params.append('fields', args.fields);
      }

      const response = await fetch(`${this.jiraBaseUrl}/rest/api/3/search?${params}`, {
        headers: this.authHeaders
      });

      if (response.ok) {
        const searchResults = await response.json();
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                issues: searchResults.issues,
                total: searchResults.total,
                startAt: searchResults.startAt,
                maxResults: searchResults.maxResults,
                jql: args.jql,
                count: searchResults.issues.length
              }, null, 2),
            },
          ],
        };
      } else {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: `Search failed: ${response.status}`,
                details: errorText
              }, null, 2),
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: `Exception while searching issues: ${error.message}`
            }, null, 2),
          },
        ],
      };
    }
  }

  async getIssueDetails(args) {
    if (!this.authHeaders) {
      const authResult = await this.authenticateUser();
      const authData = JSON.parse(authResult.content[0].text);
      if (!authData.success) {
        return authResult;
      }
    }

    try {
      let endpoint = `/rest/api/3/issue/${args.issueKey}`;
      const params = new URLSearchParams();
      
      if (args.expand) {
        params.append('expand', args.expand);
      } else {
        params.append('expand', 'names,schema,operations,editmeta,changelog,renderedFields,comments,attachments');
      }
      
      if (params.toString()) {
        endpoint += `?${params}`;
      }

      const response = await fetch(`${this.jiraBaseUrl}${endpoint}`, {
        headers: this.authHeaders
      });

      if (response.ok) {
        const issueData = await response.json();
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                issue: issueData,
                key: issueData.key,
                url: `${this.jiraBaseUrl}/browse/${issueData.key}`
              }, null, 2),
            },
          ],
        };
      } else {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: `Failed to get issue details: ${response.status}`,
                details: errorText
              }, null, 2),
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: `Exception while getting issue details: ${error.message}`
            }, null, 2),
          },
        ],
      };
    }
  }

  async getProjects(args = {}) {
    if (!this.authHeaders) {
      const authResult = await this.authenticateUser();
      const authData = JSON.parse(authResult.content[0].text);
      if (!authData.success) {
        return authResult;
      }
    }

    try {
      let endpoint = '/rest/api/3/project';
      const params = new URLSearchParams();
      
      if (args.expand) {
        params.append('expand', args.expand);
      }
      if (args.recent) {
        params.append('recent', args.recent.toString());
      }
      if (args.properties) {
        params.append('properties', args.properties);
      }
      
      if (params.toString()) {
        endpoint += `?${params}`;
      }

      const response = await fetch(`${this.jiraBaseUrl}${endpoint}`, {
        headers: this.authHeaders
      });

      if (response.ok) {
        const projects = await response.json();
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                projects: projects,
                count: projects.length
              }, null, 2),
            },
          ],
        };
      } else {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: `Failed to get projects: ${response.status}`,
                details: errorText
              }, null, 2),
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: `Exception while getting projects: ${error.message}`
            }, null, 2),
          },
        ],
      };
    }
  }

  async getProjectDetails(args) {
    if (!this.authHeaders) {
      const authResult = await this.authenticateUser();
      const authData = JSON.parse(authResult.content[0].text);
      if (!authData.success) {
        return authResult;
      }
    }

    try {
      let endpoint = `/rest/api/3/project/${args.projectKey}`;
      if (args.expand) {
        endpoint += `?expand=${args.expand}`;
      }

      const response = await fetch(`${this.jiraBaseUrl}${endpoint}`, {
        headers: this.authHeaders
      });

      if (response.ok) {
        const projectData = await response.json();
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                project: projectData,
                key: projectData.key,
                url: `${this.jiraBaseUrl}/browse/${projectData.key}`
              }, null, 2),
            },
          ],
        };
      } else {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: `Failed to get project details: ${response.status}`,
                details: errorText
              }, null, 2),
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: `Exception while getting project details: ${error.message}`
            }, null, 2),
          },
        ],
      };
    }
  }

  async getIssueTypes(args = {}) {
    if (!this.authHeaders) {
      const authResult = await this.authenticateUser();
      const authData = JSON.parse(authResult.content[0].text);
      if (!authData.success) {
        return authResult;
      }
    }

    try {
      let endpoint = '/rest/api/3/issuetype';
      if (args.projectKey) {
        endpoint = `/rest/api/3/issuetype/project?projectId=${args.projectKey}`;
      }

      const response = await fetch(`${this.jiraBaseUrl}${endpoint}`, {
        headers: this.authHeaders
      });

      if (response.ok) {
        const issueTypes = await response.json();
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                issueTypes: issueTypes,
                count: issueTypes.length,
                projectKey: args.projectKey || null
              }, null, 2),
            },
          ],
        };
      } else {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: `Failed to get issue types: ${response.status}`,
                details: errorText
              }, null, 2),
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: `Exception while getting issue types: ${error.message}`
            }, null, 2),
          },
        ],
      };
    }
  }

  async getProjectVersions(args) {
    if (!this.authHeaders) {
      const authResult = await this.authenticateUser();
      const authData = JSON.parse(authResult.content[0].text);
      if (!authData.success) {
        return authResult;
      }
    }

    try {
      let endpoint = `/rest/api/3/project/${args.projectKey}/versions`;
      if (args.expand) {
        endpoint += `?expand=${args.expand}`;
      }

      const response = await fetch(`${this.jiraBaseUrl}${endpoint}`, {
        headers: this.authHeaders
      });

      if (response.ok) {
        const versions = await response.json();
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                versions: versions,
                count: versions.length,
                projectKey: args.projectKey
              }, null, 2),
            },
          ],
        };
      } else {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: `Failed to get project versions: ${response.status}`,
                details: errorText
              }, null, 2),
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: `Exception while getting project versions: ${error.message}`
            }, null, 2),
          },
        ],
      };
    }
  }

  async getProjectComponents(args) {
    if (!this.authHeaders) {
      const authResult = await this.authenticateUser();
      const authData = JSON.parse(authResult.content[0].text);
      if (!authData.success) {
        return authResult;
      }
    }

    try {
      const endpoint = `/rest/api/3/project/${args.projectKey}/components`;

      const response = await fetch(`${this.jiraBaseUrl}${endpoint}`, {
        headers: this.authHeaders
      });

      if (response.ok) {
        const components = await response.json();
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                components: components,
                count: components.length,
                projectKey: args.projectKey
              }, null, 2),
            },
          ],
        };
      } else {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: `Failed to get project components: ${response.status}`,
                details: errorText
              }, null, 2),
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: `Exception while getting project components: ${error.message}`
            }, null, 2),
          },
        ],
      };
    }
  }

  async getDashboards(args = {}) {
    if (!this.authHeaders) {
      const authResult = await this.authenticateUser();
      const authData = JSON.parse(authResult.content[0].text);
      if (!authData.success) {
        return authResult;
      }
    }

    try {
      const params = new URLSearchParams({
        startAt: (args.startAt || 0).toString(),
        maxResults: (args.maxResults || 50).toString(),
      });

      if (args.filter) {
        params.append('filter', args.filter);
      }

      const response = await fetch(`${this.jiraBaseUrl}/rest/api/3/dashboard?${params}`, {
        headers: this.authHeaders
      });

      if (response.ok) {
        const dashboardData = await response.json();
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                dashboards: dashboardData.dashboards,
                total: dashboardData.total,
                startAt: dashboardData.startAt,
                maxResults: dashboardData.maxResults,
                count: dashboardData.dashboards?.length || 0
              }, null, 2),
            },
          ],
        };
      } else {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: `Failed to get dashboards: ${response.status}`,
                details: errorText
              }, null, 2),
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: `Exception while getting dashboards: ${error.message}`
            }, null, 2),
          },
        ],
      };
    }
  }

  async getFilters(args = {}) {
    if (!this.authHeaders) {
      const authResult = await this.authenticateUser();
      const authData = JSON.parse(authResult.content[0].text);
      if (!authData.success) {
        return authResult;
      }
    }

    try {
      let endpoint = '/rest/api/3/filter/my';
      if (args.expand) {
        endpoint += `?expand=${args.expand}`;
      }

      const response = await fetch(`${this.jiraBaseUrl}${endpoint}`, {
        headers: this.authHeaders
      });

      if (response.ok) {
        const filters = await response.json();
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                filters: filters,
                count: filters.length,
                includeFavourites: args.includeFavourites
              }, null, 2),
            },
          ],
        };
      } else {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: `Failed to get filters: ${response.status}`,
                details: errorText
              }, null, 2),
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: `Exception while getting filters: ${error.message}`
            }, null, 2),
          },
        ],
      };
    }
  }

  async createIssue(args) {
    if (!this.authHeaders) {
      const authResult = await this.authenticateUser();
      const authData = JSON.parse(authResult.content[0].text);
      if (!authData.success) {
        return authResult;
      }
    }

    try {
      const issueData = {
        fields: {
          project: {
            key: args.projectKey
          },
          summary: args.summary,
          issuetype: {
            name: args.issueType
          }
        }
      };

      if (args.description) {
        issueData.fields.description = {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: args.description
                }
              ]
            }
          ]
        };
      }

      if (args.priority) {
        issueData.fields.priority = {
          name: args.priority
        };
      }

      if (args.assignee) {
        issueData.fields.assignee = {
          emailAddress: args.assignee
        };
      }

      if (args.labels && args.labels.length > 0) {
        issueData.fields.labels = args.labels;
      }

      if (args.components && args.components.length > 0) {
        issueData.fields.components = args.components.map(comp => ({ name: comp }));
      }

      const response = await fetch(`${this.jiraBaseUrl}/rest/api/3/issue`, {
        method: 'POST',
        headers: this.authHeaders,
        body: JSON.stringify(issueData),
      });

      if (response.ok) {
        const result = await response.json();
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                issue: result,
                key: result.key,
                id: result.id,
                url: `${this.jiraBaseUrl}/browse/${result.key}`,
                message: `Issue created successfully: ${result.key}`
              }, null, 2),
            },
          ],
        };
      } else {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: `Failed to create issue: ${response.status}`,
                details: errorText
              }, null, 2),
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: `Exception while creating issue: ${error.message}`
            }, null, 2),
          },
        ],
      };
    }
  }

  async updateIssue(args) {
    if (!this.authHeaders) {
      const authResult = await this.authenticateUser();
      const authData = JSON.parse(authResult.content[0].text);
      if (!authData.success) {
        return authResult;
      }
    }

    try {
      const updateData = {
        fields: {}
      };

      if (args.summary) {
        updateData.fields.summary = args.summary;
      }

      if (args.description) {
        updateData.fields.description = {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: args.description
                }
              ]
            }
          ]
        };
      }

      if (args.assignee) {
        updateData.fields.assignee = {
          emailAddress: args.assignee
        };
      }

      if (args.priority) {
        updateData.fields.priority = {
          name: args.priority
        };
      }

      if (args.labels) {
        updateData.fields.labels = args.labels;
      }

      const response = await fetch(`${this.jiraBaseUrl}/rest/api/3/issue/${args.issueKey}`, {
        method: 'PUT',
        headers: this.authHeaders,
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                issueKey: args.issueKey,
                url: `${this.jiraBaseUrl}/browse/${args.issueKey}`,
                message: `Issue ${args.issueKey} updated successfully`,
                updatedFields: Object.keys(updateData.fields)
              }, null, 2),
            },
          ],
        };
      } else {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: `Failed to update issue: ${response.status}`,
                details: errorText
              }, null, 2),
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: `Exception while updating issue: ${error.message}`
            }, null, 2),
          },
        ],
      };
    }
  }

  async exportIssuesToFile(args) {
    try {
      // Get issues using search
      const searchResult = await this.searchIssues({
        jql: args.jql,
        maxResults: args.maxResults || 1000,
        startAt: 0
      });
      
      const searchData = JSON.parse(searchResult.content[0].text);

      if (!searchData.success) {
        return searchResult;
      }

      const timestamp = new Date().toISOString();
      const exportData = {
        exportDate: timestamp,
        jql: args.jql,
        totalIssues: searchData.total,
        exportedCount: searchData.count,
        issues: searchData.issues,
        baseUrl: this.jiraBaseUrl
      };

      const fs = require('fs');
      fs.writeFileSync(args.filename, JSON.stringify(exportData, null, 2), 'utf-8');

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              filename: args.filename,
              exportedCount: searchData.count,
              totalIssues: searchData.total,
              jql: args.jql,
              message: `Successfully exported ${searchData.count} issues to ${args.filename}`
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: `Error exporting issues to file: ${error.message}`
            }, null, 2),
          },
        ],
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("JIRA FastMCP Server running on stdio");
  }
}

// Run the server
const server = new JiraFastMCPServer();
server.run().catch(console.error);
