# Bitbucket FastMCP Server (JavaScript Port)

This is a JavaScript port of the Python FastMCP Bitbucket server, designed to be compatible with the MCP SDK and your existing PineLens application.

## Features

All the same features as the Python version:
- **Authentication**: Secure Basic Authentication with email and app password
- **Workspace Management**: List and access multiple workspaces  
- **Repository Access**: Get repository lists with filtering and sorting
- **Codebase Analysis**: Complete repository structure analysis with file contents
- **File Operations**: Get specific file contents and file listings
- **Export Functionality**: Save codebase structure to JSON files

## Available Tools

1. **authenticate_user(email)** - Authenticate with Bitbucket using email and token
2. **get_workspaces()** - Get list of accessible workspaces
3. **get_repositories(workspace, page_size)** - Get repository lists
4. **get_repository_codebase(workspace, repo_slug, branch, path)** - Get complete codebase structure
5. **get_specific_file_content(workspace, repo_slug, file_path, branch)** - Get specific file content
6. **get_repository_files_list(workspace, repo_slug, branch, path)** - Get file listings without content
7. **save_codebase_to_file(workspace, repo_slug, filename, branch, path)** - Export codebase to JSON

## Key Differences from Original Server

### Enhanced JSON Response Format
- All responses return structured JSON with `success`, `error`, and relevant data fields
- Compatible with your PineLens UI parsing logic
- Consistent error handling across all tools

### Tool Structure
```javascript
// Example response format
{
  "success": true,
  "repositories": [...],
  "count": 25
}

// Error response format  
{
  "success": false,
  "error": "Authentication failed: 401",
  "details": "Invalid credentials"
}
```

### Environment Configuration
Uses the same `.env` file structure:
```env
BITBUCKET_TOKEN=your_app_password_here
BITBUCKET_EMAIL=your.email@company.com
```

### Auto-Authentication
- Automatically tries to authenticate using configured email if not already authenticated
- Maintains authentication state across tool calls
- Graceful fallback if auto-authentication fails

## Integration with PineLens

This server provides the same functionality as your Python FastMCP server but in JavaScript format that's compatible with:

1. **Your existing MCP infrastructure** - Uses @modelcontextprotocol/sdk
2. **Browser integration** - Can be called from your existing inHouseMCPService
3. **Unified search** - Results can be integrated into unifiedSearchService
4. **Real API calls** - Works with your existing real credential detection logic

## Usage Example

The server can be integrated into your PineLens system by:

1. **Direct MCP calls** from your existing JavaScript services
2. **Browser-compatible wrapper** in your inHouseMCPService.browser.ts
3. **Search integration** in your unifiedSearchService.ts

### Sample Integration in PineLens:

```javascript
// In your inHouseMCPService.browser.ts
async searchBitbucketRepositories(query) {
  if (this.isRealToken()) {
    // Call the FastMCP server directly
    const result = await this.callMCPTool('get_repositories', { 
      workspace: this.workspace,
      page_size: 50 
    });
    return JSON.parse(result.content[0].text);
  }
  // ... existing mock logic
}
```

## Running the Server

1. Make sure you have the MCP SDK installed:
   ```bash
   npm install @modelcontextprotocol/sdk node-fetch dotenv
   ```

2. Set up your `.env` file with Bitbucket credentials

3. Run the server:
   ```bash
   node bitbucket-fastmcp-server.js
   ```

## Comparison with Original Server

| Feature | Original Server | FastMCP Server |
|---------|----------------|----------------|
| Response Format | Formatted text | Structured JSON |
| Error Handling | Text messages | JSON with success/error fields |
| Tool Count | 8 tools | 7 enhanced tools |
| Codebase Analysis | Basic info | Full structure with content |
| File Export | Not available | JSON export functionality |
| Auto-Auth | Manual config | Automatic retry with fallback |

This FastMCP server provides all the advanced functionality from your Python implementation while maintaining compatibility with your existing JavaScript MCP infrastructure.
