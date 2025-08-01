/**
 * FastMCP-style Bitbucket MCP Server (JavaScript Implementation)
 * Ported from Python FastMCP to JavaScript MCP SDK with enhanced functionality
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const fetch = require('node-fetch');
require('dotenv').config();

class BitbucketFastMCPServer {
  constructor() {
    this.authHeaders = null;
    this.bitbucketToken = process.env.BITBUCKET_TOKEN || "";
    this.bitbucketEmail = process.env.BITBUCKET_EMAIL || "";
    
    this.server = new Server(
      {
        name: "bitbucket-fastmcp-server",
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
      console.error("[Bitbucket FastMCP Server Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  getHeadersWithEmail(email) {
    const credentials = `${email}:${this.bitbucketToken}`;
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
            description: "Authenticate with Bitbucket using email and token",
            inputSchema: {
              type: "object",
              properties: {
                email: {
                  type: "string",
                  description: "Your Bitbucket email address (optional, will use config if not provided)",
                },
              },
            },
          },
          {
            name: "get_workspaces",
            description: "Get list of workspaces the user has access to",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "get_repositories",
            description: "Get list of repositories",
            inputSchema: {
              type: "object",
              properties: {
                workspace: {
                  type: "string",
                  description: "Workspace slug (optional, if not provided gets user's repositories)",
                },
                page_size: {
                  type: "number",
                  description: "Number of repositories per page",
                  default: 50,
                },
              },
            },
          },
          {
            name: "get_repository_codebase",
            description: "Get the codebase structure and contents of a repository",
            inputSchema: {
              type: "object",
              properties: {
                workspace: {
                  type: "string",
                  description: "Workspace name/slug",
                },
                repo_slug: {
                  type: "string",
                  description: "Repository slug",
                },
                branch: {
                  type: "string",
                  description: "Branch name (default: 'main')",
                  default: "main",
                },
                path: {
                  type: "string",
                  description: "Path within the repository (default: root)",
                  default: "",
                },
              },
              required: ["workspace", "repo_slug"],
            },
          },
          {
            name: "get_specific_file_content",
            description: "Get the content of a specific file from a repository",
            inputSchema: {
              type: "object",
              properties: {
                workspace: {
                  type: "string",
                  description: "Workspace name/slug",
                },
                repo_slug: {
                  type: "string",
                  description: "Repository slug",
                },
                file_path: {
                  type: "string",
                  description: "Path to the file within the repository",
                },
                branch: {
                  type: "string",
                  description: "Branch name (default: 'main')",
                  default: "main",
                },
              },
              required: ["workspace", "repo_slug", "file_path"],
            },
          },
          {
            name: "get_repository_files_list",
            description: "Get a list of all files in a repository (without content)",
            inputSchema: {
              type: "object",
              properties: {
                workspace: {
                  type: "string",
                  description: "Workspace name/slug",
                },
                repo_slug: {
                  type: "string",
                  description: "Repository slug",
                },
                branch: {
                  type: "string",
                  description: "Branch name (default: 'main')",
                  default: "main",
                },
                path: {
                  type: "string",
                  description: "Path within the repository (default: root)",
                  default: "",
                },
              },
              required: ["workspace", "repo_slug"],
            },
          },
          {
            name: "save_codebase_to_file",
            description: "Save the codebase structure to a JSON file",
            inputSchema: {
              type: "object",
              properties: {
                workspace: {
                  type: "string",
                  description: "Workspace name/slug",
                },
                repo_slug: {
                  type: "string",
                  description: "Repository slug",
                },
                filename: {
                  type: "string",
                  description: "Local filename to save to",
                },
                branch: {
                  type: "string",
                  description: "Branch name (default: 'main')",
                  default: "main",
                },
                path: {
                  type: "string",
                  description: "Path within the repository (default: root)",
                  default: "",
                },
              },
              required: ["workspace", "repo_slug", "filename"],
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
          case "get_workspaces":
            return await this.getWorkspaces(args);
          case "get_repositories":
            return await this.getRepositories(args);
          case "get_repository_codebase":
            return await this.getRepositoryCodebase(args);
          case "get_specific_file_content":
            return await this.getSpecificFileContent(args);
          case "get_repository_files_list":
            return await this.getRepositoryFilesList(args);
          case "save_codebase_to_file":
            return await this.saveCodebaseToFile(args);
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
    const email = args.email || this.bitbucketEmail;
    
    if (!email) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: "No email provided and BITBUCKET_EMAIL not configured. Please provide an email parameter or set BITBUCKET_EMAIL in your configuration."
            }, null, 2),
          },
        ],
      };
    }

    try {
      const headers = this.getHeadersWithEmail(email);
      const response = await fetch("https://api.bitbucket.org/2.0/user", {
        headers: headers
      });

      if (response.ok) {
        const userData = await response.json();
        this.authHeaders = headers; // Store for future use
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                user: userData,
                message: `Authenticated as: ${userData.username} using email: ${email}`
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

  async getWorkspaces(args = {}) {
    if (!this.authHeaders) {
      // Try to authenticate automatically if email is configured
      if (this.bitbucketEmail) {
        const authResult = await this.authenticateUser();
        const authData = JSON.parse(authResult.content[0].text);
        if (!authData.success) {
          return authResult;
        }
      } else {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: "Not authenticated. Please authenticate first using authenticate_user() or configure BITBUCKET_EMAIL."
              }, null, 2),
            },
          ],
        };
      }
    }

    try {
      const response = await fetch("https://api.bitbucket.org/2.0/workspaces", {
        headers: this.authHeaders
      });

      if (response.ok) {
        const data = await response.json();
        const workspaces = data.values || [];
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                workspaces: workspaces,
                count: workspaces.length
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
                error: `Failed to get workspaces: ${response.status}`,
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
              error: `Exception while getting workspaces: ${error.message}`
            }, null, 2),
          },
        ],
      };
    }
  }

  async getRepositories(args = {}) {
    if (!this.authHeaders) {
      // Try to authenticate automatically if email is configured
      if (this.bitbucketEmail) {
        const authResult = await this.authenticateUser();
        const authData = JSON.parse(authResult.content[0].text);
        if (!authData.success) {
          return authResult;
        }
      } else {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: "Not authenticated. Please authenticate first using authenticate_user() or configure BITBUCKET_EMAIL."
              }, null, 2),
            },
          ],
        };
      }
    }

    try {
      const workspace = args.workspace;
      const pageSize = args.page_size || 50;
      
      let url = workspace 
        ? `https://api.bitbucket.org/2.0/repositories/${workspace}`
        : "https://api.bitbucket.org/2.0/repositories";
      
      const params = new URLSearchParams({
        pagelen: pageSize.toString(),
        sort: "-updated_on"
      });

      const allRepos = [];
      let nextUrl = `${url}?${params}`;

      while (nextUrl) {
        const response = await fetch(nextUrl, {
          headers: this.authHeaders
        });

        if (response.ok) {
          const data = await response.json();
          const repos = data.values || [];
          allRepos.push(...repos);
          nextUrl = data.next;
        } else {
          const errorText = await response.text();
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: false,
                  error: `Failed to get repositories: ${response.status}`,
                  details: errorText
                }, null, 2),
              },
            ],
          };
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              repositories: allRepos,
              count: allRepos.length
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
              error: `Exception while getting repositories: ${error.message}`
            }, null, 2),
          },
        ],
      };
    }
  }

  async getFileContents(baseUrl, branch, filePath) {
    try {
      const response = await fetch(`${baseUrl}/src/${branch}/${filePath}`, {
        headers: this.authHeaders
      });
      
      if (response.ok) {
        return await response.text();
      } else {
        return `Error: Could not fetch file ${filePath} (Status: ${response.status})`;
      }
    } catch (error) {
      return `Error: Exception while fetching ${filePath}: ${error.message}`;
    }
  }

  async getDirectoryStructure(baseUrl, branch, dirPath = '') {
    try {
      const response = await fetch(`${baseUrl}/src/${branch}/${dirPath}`, {
        headers: this.authHeaders
      });

      if (response.ok) {
        const data = await response.json();
        const structure = {
          type: 'directory',
          path: dirPath,
          children: []
        };

        for (const item of data.values || []) {
          const itemType = item.type;
          const itemPath = item.path;

          if (itemType === 'commit_file') {
            // It's a file
            const codeExtensions = ['.py', '.js', '.ts', '.java', '.cpp', '.c', '.h', '.html', '.css', '.json', '.xml', '.md', '.txt', '.yml', '.yaml', '.sh', '.bat', '.ps1'];
            const shouldGetContent = codeExtensions.some(ext => itemPath.toLowerCase().endsWith(ext));
            
            const fileInfo = {
              type: 'file',
              path: itemPath,
              size: item.size || 0,
              content: shouldGetContent ? await this.getFileContents(baseUrl, branch, itemPath) : null
            };
            structure.children.push(fileInfo);
          } else if (itemType === 'commit_directory') {
            // It's a directory, recurse
            const subStructure = await this.getDirectoryStructure(baseUrl, branch, itemPath);
            if (subStructure) {
              structure.children.push(subStructure);
            }
          }
        }

        return structure;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  }

  async getRepositoryCodebase(args) {
    if (!this.authHeaders) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: "Not authenticated. Please authenticate first."
            }, null, 2),
          },
        ],
      };
    }

    const { workspace, repo_slug, branch = "main", path = "" } = args;
    const baseUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repo_slug}`;

    try {
      const structure = await this.getDirectoryStructure(baseUrl, branch, path);
      
      if (structure) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                workspace: workspace,
                repository: repo_slug,
                branch: branch,
                structure: structure
              }, null, 2),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: "Failed to get codebase structure"
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
              error: `Exception while getting codebase: ${error.message}`
            }, null, 2),
          },
        ],
      };
    }
  }

  async getSpecificFileContent(args) {
    if (!this.authHeaders) {
      // Try to authenticate automatically if email is configured
      if (this.bitbucketEmail) {
        const authResult = await this.authenticateUser();
        const authData = JSON.parse(authResult.content[0].text);
        if (!authData.success) {
          return authResult;
        }
      } else {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: "Not authenticated. Please authenticate first using authenticate_user() or configure BITBUCKET_EMAIL."
              }, null, 2),
            },
          ],
        };
      }
    }

    const { workspace, repo_slug, file_path, branch = "main" } = args;
    const baseUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repo_slug}`;

    try {
      const response = await fetch(`${baseUrl}/src/${branch}/${file_path}`, {
        headers: this.authHeaders
      });

      if (response.ok) {
        const content = await response.text();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                workspace: workspace,
                repository: repo_slug,
                file_path: file_path,
                branch: branch,
                content: content,
                size: content.length
              }, null, 2),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: `Could not fetch file ${file_path} (Status: ${response.status})`
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
              error: `Exception while fetching ${file_path}: ${error.message}`
            }, null, 2),
          },
        ],
      };
    }
  }

  async getFilesRecursive(baseUrl, branch, dirPath = '', allFiles = []) {
    try {
      const response = await fetch(`${baseUrl}/src/${branch}/${dirPath}`, {
        headers: this.authHeaders
      });

      if (response.ok) {
        const data = await response.json();

        for (const item of data.values || []) {
          const itemType = item.type;
          const itemPath = item.path;

          if (itemType === 'commit_file') {
            allFiles.push(itemPath);
          } else if (itemType === 'commit_directory') {
            await this.getFilesRecursive(baseUrl, branch, itemPath, allFiles);
          }
        }
      }
    } catch (error) {
      // Handle error silently for recursive calls
    }
  }

  async getRepositoryFilesList(args) {
    if (!this.authHeaders) {
      // Try to authenticate automatically if email is configured
      if (this.bitbucketEmail) {
        const authResult = await this.authenticateUser();
        const authData = JSON.parse(authResult.content[0].text);
        if (!authData.success) {
          return authResult;
        }
      } else {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: "Not authenticated. Please authenticate first using authenticate_user() or configure BITBUCKET_EMAIL."
              }, null, 2),
            },
          ],
        };
      }
    }

    const { workspace, repo_slug, branch = "main", path = "" } = args;
    const baseUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repo_slug}`;
    const allFiles = [];

    try {
      await this.getFilesRecursive(baseUrl, branch, path, allFiles);

      // Filter code files
      const codeExtensions = ['.py', '.js', '.ts', '.java', '.cpp', '.c', '.h', '.html', '.css', '.json', '.xml', '.md', '.txt', '.yml', '.yaml', '.sh', '.bat', '.ps1', '.dart', '.kt', '.swift', '.rb', '.php', '.go', '.rs', '.cs', '.vb', '.sql'];
      const codeFiles = allFiles.filter(f => 
        codeExtensions.some(ext => f.toLowerCase().endsWith(ext))
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              workspace: workspace,
              repository: repo_slug,
              branch: branch,
              all_files: allFiles,
              code_files: codeFiles,
              total_files: allFiles.length,
              code_files_count: codeFiles.length
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
              error: `Exception while getting files list: ${error.message}`
            }, null, 2),
          },
        ],
      };
    }
  }

  async saveCodebaseToFile(args) {
    const { workspace, repo_slug, filename, branch = "main", path = "" } = args;

    try {
      // Get the codebase structure first
      const codebaseResult = await this.getRepositoryCodebase({ workspace, repo_slug, branch, path });
      const codebaseData = JSON.parse(codebaseResult.content[0].text);

      if (!codebaseData.success) {
        return codebaseResult;
      }

      const structure = codebaseData.structure;
      const timestamp = new Date().toISOString();

      const outputData = {
        workspace: workspace,
        repository: repo_slug,
        timestamp: timestamp,
        structure: structure
      };

      const fs = require('fs');
      fs.writeFileSync(filename, JSON.stringify(outputData, null, 2), 'utf-8');

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              filename: filename,
              workspace: workspace,
              repository: repo_slug,
              message: `Codebase structure saved to ${filename}`
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
              error: `Error saving to file: ${error.message}`
            }, null, 2),
          },
        ],
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Bitbucket FastMCP Server running on stdio");
  }
}

// Run the server
const server = new BitbucketFastMCPServer();
server.run().catch(console.error);
