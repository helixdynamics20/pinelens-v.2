/**
 * In-House Bitbucket MCP Server
 * A dedicated MCP server for Bitbucket integration with proper authentication and CORS handling
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const fetch = require('node-fetch');

class BitbucketMCPServer {
  constructor() {
    this.config = null;
    this.server = new Server(
      {
        name: "bitbucket-inhouse-server",
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
      console.error("[Bitbucket MCP Server Error]", error);
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
            name: "bitbucket_configure",
            description: "Configure Bitbucket connection with base URL, username, and app password",
            inputSchema: {
              type: "object",
              properties: {
                baseUrl: {
                  type: "string",
                  description: "Bitbucket base URL (e.g., https://bitbucket.org for cloud, or your server URL for on-premise)",
                },
                username: {
                  type: "string", 
                  description: "Your Bitbucket username",
                },
                appPassword: {
                  type: "string",
                  description: "Your Bitbucket app password (not regular password)",
                },
                workspace: {
                  type: "string",
                  description: "Your Bitbucket workspace name (for cloud)",
                },
              },
              required: ["baseUrl", "username", "appPassword"],
            },
          },
          {
            name: "bitbucket_search_repositories",
            description: "Search repositories in your workspace",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Search query for repositories",
                },
                limit: {
                  type: "number",
                  description: "Maximum number of results (default: 50)",
                  default: 50,
                },
              },
            },
          },
          {
            name: "bitbucket_get_repository",
            description: "Get detailed information about a specific repository",
            inputSchema: {
              type: "object", 
              properties: {
                repoSlug: {
                  type: "string",
                  description: "Repository slug (e.g., 'my-project')",
                },
              },
              required: ["repoSlug"],
            },
          },
          {
            name: "bitbucket_get_branches",
            description: "Get branches from a repository",
            inputSchema: {
              type: "object",
              properties: {
                repoSlug: {
                  type: "string",
                  description: "Repository slug",
                },
                limit: {
                  type: "number",
                  description: "Maximum number of results (default: 50)",
                  default: 50,
                },
              },
              required: ["repoSlug"],
            },
          },
          {
            name: "bitbucket_get_commits",
            description: "Get commits from a repository",
            inputSchema: {
              type: "object",
              properties: {
                repoSlug: {
                  type: "string",
                  description: "Repository slug",
                },
                branch: {
                  type: "string",
                  description: "Branch name (default: main/master)",
                },
                limit: {
                  type: "number",
                  description: "Maximum number of results (default: 50)",
                  default: 50,
                },
              },
              required: ["repoSlug"],
            },
          },
          {
            name: "bitbucket_get_pull_requests",
            description: "Get pull requests from a repository",
            inputSchema: {
              type: "object",
              properties: {
                repoSlug: {
                  type: "string",
                  description: "Repository slug",
                },
                state: {
                  type: "string",
                  description: "PR state: OPEN, MERGED, or DECLINED",
                  enum: ["OPEN", "MERGED", "DECLINED"],
                  default: "OPEN",
                },
                limit: {
                  type: "number",
                  description: "Maximum number of results (default: 50)",
                  default: 50,
                },
              },
              required: ["repoSlug"],
            },
          },
          {
            name: "bitbucket_search_code",
            description: "Search code within repositories",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Code search query",
                },
                repoSlug: {
                  type: "string",
                  description: "Repository slug to search in (optional)",
                },
                limit: {
                  type: "number",
                  description: "Maximum number of results (default: 50)",
                  default: 50,
                },
              },
              required: ["query"],
            },
          },
          {
            name: "bitbucket_get_file_content",
            description: "Get content of a specific file from repository",
            inputSchema: {
              type: "object",
              properties: {
                repoSlug: {
                  type: "string",
                  description: "Repository slug",
                },
                filePath: {
                  type: "string",
                  description: "Path to the file",
                },
                branch: {
                  type: "string",
                  description: "Branch name (default: main/master)",
                },
              },
              required: ["repoSlug", "filePath"],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "bitbucket_configure":
            return await this.configureTool(args);
          case "bitbucket_search_repositories":
            return await this.searchRepositories(args);
          case "bitbucket_get_repository":
            return await this.getRepository(args);
          case "bitbucket_get_branches":
            return await this.getBranches(args);
          case "bitbucket_get_commits":
            return await this.getCommits(args);
          case "bitbucket_get_pull_requests":
            return await this.getPullRequests(args);
          case "bitbucket_search_code":
            return await this.searchCode(args);
          case "bitbucket_get_file_content":
            return await this.getFileContent(args);
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

  async configureTool(args) {
    this.config = {
      baseUrl: args.baseUrl.replace(/\/$/, ""), // Remove trailing slash
      username: args.username,
      appPassword: args.appPassword,
      workspace: args.workspace,
      isCloud: args.baseUrl.includes('bitbucket.org'),
    };

    // Test the connection
    try {
      const endpoint = this.config.isCloud ? '/2.0/user' : '/rest/api/1.0/users/' + this.config.username;
      const response = await this.makeRequest(endpoint);
      
      if (response.ok) {
        const user = await response.json();
        const displayName = this.config.isCloud ? user.display_name : user.displayName;
        return {
          content: [
            {
              type: "text",
              text: `✅ Bitbucket configuration successful!\nConnected as: ${displayName} (${this.config.username})\nBase URL: ${this.config.baseUrl}\nType: ${this.config.isCloud ? 'Cloud' : 'Server'}`,
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

  async searchRepositories(args) {
    if (!this.config) {
      throw new Error("Bitbucket not configured. Please run bitbucket_configure first.");
    }

    let endpoint;
    if (this.config.isCloud) {
      const params = new URLSearchParams({
        pagelen: (args.limit || 50).toString(),
      });
      if (args.query) {
        params.append('q', `name ~ "${args.query}"`);
      }
      endpoint = `/2.0/repositories/${this.config.workspace}?${params}`;
    } else {
      const params = new URLSearchParams({
        limit: (args.limit || 50).toString(),
      });
      if (args.query) {
        params.append('name', args.query);
      }
      endpoint = `/rest/api/1.0/projects?${params}`;
    }

    const response = await this.makeRequest(endpoint);
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: [
        {
          type: "text",
          text: this.formatRepositoriesResult(data),
        },
      ],
    };
  }

  async getRepository(args) {
    if (!this.config) {
      throw new Error("Bitbucket not configured. Please run bitbucket_configure first.");
    }

    let endpoint;
    if (this.config.isCloud) {
      endpoint = `/2.0/repositories/${this.config.workspace}/${args.repoSlug}`;
    } else {
      endpoint = `/rest/api/1.0/projects/${this.config.workspace}/repos/${args.repoSlug}`;
    }

    const response = await this.makeRequest(endpoint);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Repository ${args.repoSlug} not found`);
      }
      throw new Error(`Failed to get repository: ${response.status} ${response.statusText}`);
    }

    const repo = await response.json();
    
    return {
      content: [
        {
          type: "text",
          text: this.formatSingleRepository(repo),
        },
      ],
    };
  }

  async getBranches(args) {
    if (!this.config) {
      throw new Error("Bitbucket not configured. Please run bitbucket_configure first.");
    }

    let endpoint;
    if (this.config.isCloud) {
      const params = new URLSearchParams({
        pagelen: (args.limit || 50).toString(),
      });
      endpoint = `/2.0/repositories/${this.config.workspace}/${args.repoSlug}/refs/branches?${params}`;
    } else {
      const params = new URLSearchParams({
        limit: (args.limit || 50).toString(),
      });
      endpoint = `/rest/api/1.0/projects/${this.config.workspace}/repos/${args.repoSlug}/branches?${params}`;
    }

    const response = await this.makeRequest(endpoint);
    
    if (!response.ok) {
      throw new Error(`Failed to get branches: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: [
        {
          type: "text",
          text: this.formatBranchesResult(data, args.repoSlug),
        },
      ],
    };
  }

  async getCommits(args) {
    if (!this.config) {
      throw new Error("Bitbucket not configured. Please run bitbucket_configure first.");
    }

    let endpoint;
    if (this.config.isCloud) {
      const params = new URLSearchParams({
        pagelen: (args.limit || 50).toString(),
      });
      if (args.branch) {
        params.append('include', args.branch);
      }
      endpoint = `/2.0/repositories/${this.config.workspace}/${args.repoSlug}/commits?${params}`;
    } else {
      const params = new URLSearchParams({
        limit: (args.limit || 50).toString(),
      });
      if (args.branch) {
        params.append('until', args.branch);
      }
      endpoint = `/rest/api/1.0/projects/${this.config.workspace}/repos/${args.repoSlug}/commits?${params}`;
    }

    const response = await this.makeRequest(endpoint);
    
    if (!response.ok) {
      throw new Error(`Failed to get commits: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: [
        {
          type: "text",
          text: this.formatCommitsResult(data, args.repoSlug),
        },
      ],
    };
  }

  async getPullRequests(args) {
    if (!this.config) {
      throw new Error("Bitbucket not configured. Please run bitbucket_configure first.");
    }

    let endpoint;
    if (this.config.isCloud) {
      const params = new URLSearchParams({
        pagelen: (args.limit || 50).toString(),
        state: args.state || 'OPEN',
      });
      endpoint = `/2.0/repositories/${this.config.workspace}/${args.repoSlug}/pullrequests?${params}`;
    } else {
      const params = new URLSearchParams({
        limit: (args.limit || 50).toString(),
        state: args.state || 'OPEN',
      });
      endpoint = `/rest/api/1.0/projects/${this.config.workspace}/repos/${args.repoSlug}/pull-requests?${params}`;
    }

    const response = await this.makeRequest(endpoint);
    
    if (!response.ok) {
      throw new Error(`Failed to get pull requests: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: [
        {
          type: "text",
          text: this.formatPullRequestsResult(data, args.repoSlug),
        },
      ],
    };
  }

  async searchCode(args) {
    if (!this.config) {
      throw new Error("Bitbucket not configured. Please run bitbucket_configure first.");
    }

    // Code search is primarily available for cloud
    if (!this.config.isCloud) {
      throw new Error("Code search is only available for Bitbucket Cloud");
    }

    const params = new URLSearchParams({
      search_query: args.query,
      pagelen: (args.limit || 50).toString(),
    });

    let endpoint;
    if (args.repoSlug) {
      endpoint = `/2.0/repositories/${this.config.workspace}/${args.repoSlug}/src?${params}`;
    } else {
      endpoint = `/2.0/workspaces/${this.config.workspace}/search/code?${params}`;
    }

    const response = await this.makeRequest(endpoint);
    
    if (!response.ok) {
      throw new Error(`Code search failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: [
        {
          type: "text",
          text: this.formatCodeSearchResult(data, args.query),
        },
      ],
    };
  }

  async getFileContent(args) {
    if (!this.config) {
      throw new Error("Bitbucket not configured. Please run bitbucket_configure first.");
    }

    let endpoint;
    const branch = args.branch || 'main';
    
    if (this.config.isCloud) {
      endpoint = `/2.0/repositories/${this.config.workspace}/${args.repoSlug}/src/${branch}/${args.filePath}`;
    } else {
      endpoint = `/rest/api/1.0/projects/${this.config.workspace}/repos/${args.repoSlug}/browse/${args.filePath}?at=${branch}`;
    }

    const response = await this.makeRequest(endpoint);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`File ${args.filePath} not found in repository ${args.repoSlug}`);
      }
      throw new Error(`Failed to get file content: ${response.status} ${response.statusText}`);
    }

    let content;
    if (this.config.isCloud) {
      content = await response.text();
    } else {
      const data = await response.json();
      content = data.lines ? data.lines.map(line => line.text).join('\n') : '';
    }
    
    return {
      content: [
        {
          type: "text",
          text: this.formatFileContent(args.filePath, content, args.repoSlug),
        },
      ],
    };
  }

  async makeRequest(endpoint, options = {}) {
    if (!this.config) {
      throw new Error("Bitbucket not configured");
    }

    const url = `${this.config.baseUrl}${endpoint}`;
    const auth = Buffer.from(`${this.config.username}:${this.config.appPassword}`).toString('base64');

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

  formatRepositoriesResult(data) {
    const repositories = this.config.isCloud ? data.values : data.values;
    const total = this.config.isCloud ? data.size : data.size;
    
    let result = `📁 Bitbucket Repositories (${repositories?.length || 0}/${total || 0}):\n\n`;

    if (!repositories || repositories.length === 0) {
      result += "No repositories found.";
      return result;
    }

    repositories.forEach(repo => {
      const name = this.config.isCloud ? repo.name : repo.name;
      const description = this.config.isCloud ? repo.description : repo.description;
      const language = this.config.isCloud ? repo.language : repo.language;
      const isPrivate = this.config.isCloud ? repo.is_private : !repo.public;
      
      result += `📦 ${name}\n`;
      if (description) {
        result += `   📝 ${description}\n`;
      }
      if (language) {
        result += `   💻 Language: ${language}\n`;
      }
      result += `   🔒 ${isPrivate ? 'Private' : 'Public'}\n`;
      result += `   🔗 ${this.config.baseUrl}/${this.config.workspace}/${name}\n\n`;
    });

    return result;
  }

  formatSingleRepository(repo) {
    const name = this.config.isCloud ? repo.name : repo.name;
    const description = this.config.isCloud ? repo.description : repo.description;
    const language = this.config.isCloud ? repo.language : repo.language;
    const isPrivate = this.config.isCloud ? repo.is_private : !repo.public;
    const size = this.config.isCloud ? repo.size : repo.sizeInBytes;
    const created = this.config.isCloud ? repo.created_on : repo.createdDate;
    const updated = this.config.isCloud ? repo.updated_on : repo.updatedDate;
    
    let result = `📦 ${name}\n\n`;
    
    if (description) {
      result += `📝 **Description:** ${description}\n`;
    }
    if (language) {
      result += `💻 **Language:** ${language}\n`;
    }
    result += `🔒 **Visibility:** ${isPrivate ? 'Private' : 'Public'}\n`;
    if (size) {
      result += `📊 **Size:** ${this.formatBytes(size)}\n`;
    }
    if (created) {
      result += `📅 **Created:** ${new Date(created).toLocaleDateString()}\n`;
    }
    if (updated) {
      result += `🔄 **Updated:** ${new Date(updated).toLocaleDateString()}\n`;
    }
    
    result += `\n🔗 **URL:** ${this.config.baseUrl}/${this.config.workspace}/${name}\n`;

    return result;
  }

  formatBranchesResult(data, repoSlug) {
    const branches = this.config.isCloud ? data.values : data.values;
    
    let result = `🌿 Branches in ${repoSlug} (${branches?.length || 0}):\n\n`;

    if (!branches || branches.length === 0) {
      result += "No branches found.";
      return result;
    }

    branches.forEach(branch => {
      const name = this.config.isCloud ? branch.name : branch.displayId;
      const isDefault = this.config.isCloud ? branch.is_default : branch.isDefault;
      
      result += `${isDefault ? '🌟' : '🌿'} ${name}`;
      if (isDefault) {
        result += ' (default)';
      }
      result += '\n';
    });

    return result;
  }

  formatCommitsResult(data, repoSlug) {
    const commits = this.config.isCloud ? data.values : data.values;
    
    let result = `📝 Recent Commits in ${repoSlug} (${commits?.length || 0}):\n\n`;

    if (!commits || commits.length === 0) {
      result += "No commits found.";
      return result;
    }

    commits.forEach(commit => {
      const hash = this.config.isCloud ? commit.hash : commit.id;
      const message = this.config.isCloud ? commit.message : commit.message;
      const author = this.config.isCloud ? commit.author.user?.display_name : commit.author.name;
      const date = this.config.isCloud ? commit.date : commit.authorTimestamp;
      
      result += `🔸 ${hash.substring(0, 8)}: ${message.split('\n')[0]}\n`;
      result += `   👤 ${author} • ${new Date(date).toLocaleDateString()}\n\n`;
    });

    return result;
  }

  formatPullRequestsResult(data, repoSlug) {
    const prs = this.config.isCloud ? data.values : data.values;
    
    let result = `🔀 Pull Requests in ${repoSlug} (${prs?.length || 0}):\n\n`;

    if (!prs || prs.length === 0) {
      result += "No pull requests found.";
      return result;
    }

    prs.forEach(pr => {
      const id = this.config.isCloud ? pr.id : pr.id;
      const title = this.config.isCloud ? pr.title : pr.title;
      const state = this.config.isCloud ? pr.state : pr.state;
      const author = this.config.isCloud ? pr.author.display_name : pr.author.user.displayName;
      const created = this.config.isCloud ? pr.created_on : pr.createdDate;
      
      result += `🔀 #${id}: ${title}\n`;
      result += `   📊 State: ${state} | 👤 Author: ${author}\n`;
      result += `   📅 Created: ${new Date(created).toLocaleDateString()}\n\n`;
    });

    return result;
  }

  formatCodeSearchResult(data, query) {
    const results = data.values || [];
    
    let result = `🔍 Code Search Results for "${query}" (${results.length}):\n\n`;

    if (results.length === 0) {
      result += "No code matches found.";
      return result;
    }

    results.forEach(item => {
      result += `📄 ${item.file.path}\n`;
      if (item.content_matches) {
        item.content_matches.forEach(match => {
          result += `   Line ${match.line}: ${match.segment}\n`;
        });
      }
      result += '\n';
    });

    return result;
  }

  formatFileContent(filePath, content, repoSlug) {
    const lines = content.split('\n');
    const preview = lines.slice(0, 50).join('\n');
    const truncated = lines.length > 50;
    
    let result = `📄 File: ${filePath} in ${repoSlug}\n`;
    result += `📊 Size: ${lines.length} lines\n\n`;
    result += `\`\`\`\n${preview}\n\`\`\`\n`;
    
    if (truncated) {
      result += `\n... (showing first 50 lines of ${lines.length} total)`;
    }

    return result;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Bitbucket MCP Server running on stdio");
  }
}

// Run the server
const server = new BitbucketMCPServer();
server.run().catch(console.error);
