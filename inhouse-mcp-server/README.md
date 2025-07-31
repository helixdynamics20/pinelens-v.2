# Bitbucket FastMCP Server

This folder contains a Python-based MCP server for Bitbucket integration using the FastMCP framework.

## Features

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

## Setup Instructions

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment

1. Copy `.env.template` to `.env`:
   ```bash
   cp .env.template .env
   ```

2. Edit `.env` with your Bitbucket credentials:
   ```env
   BITBUCKET_TOKEN=your_app_password_here
   BITBUCKET_EMAIL=your.email@company.com
   ```

### 3. Create Bitbucket App Password

1. Go to Bitbucket Settings: https://bitbucket.org/account/settings/app-passwords/
2. Click "Create app password"
3. Give it a name (e.g., "MCP Server")
4. Select permissions:
   - **Repositories**: Read
   - **Account**: Read
   - **Workspace membership**: Read
5. Copy the generated password to your `.env` file

### 4. Run the Server

```bash
python bitbucket_server.py
```

## Usage Examples

### Basic Authentication
```python
# Authenticate with your email
result = await authenticate_user("your.email@company.com")
```

### Get Repositories
```python
# Get all repositories
repos = await get_repositories()

# Get repositories from specific workspace
repos = await get_repositories(workspace="my-workspace")
```

### Analyze Codebase
```python
# Get complete codebase structure
codebase = await get_repository_codebase(
    workspace="my-workspace", 
    repo_slug="my-repo",
    branch="main"
)

# Get specific file content
file_content = await get_specific_file_content(
    workspace="my-workspace",
    repo_slug="my-repo", 
    file_path="src/main.py"
)
```

### Export Codebase
```python
# Save codebase structure to JSON file
result = await save_codebase_to_file(
    workspace="my-workspace",
    repo_slug="my-repo",
    filename="codebase_export.json"
)
```

## Integration with PineLens

This server can be integrated with PineLens by:

1. **Direct API Calls**: PineLens can make HTTP requests to the running server
2. **MCP Protocol**: Use the FastMCP protocol for structured communication
3. **Search Integration**: Include Bitbucket results in unified search

## File Structure

```
inhouse-mcp-server/
├── bitbucket_server.py     # Main FastMCP server implementation
├── requirements.txt        # Python dependencies
├── .env.template          # Environment configuration template
└── README.md             # This documentation
```

## Security Notes

- Store your app password securely in the `.env` file
- Never commit `.env` to version control
- Use app passwords instead of your main Bitbucket password
- Limit app password permissions to minimum required access

## Troubleshooting

### Authentication Issues
- Verify your email and app password are correct
- Ensure app password has required permissions
- Check if your workspace/repository names are correct

### Connection Issues
- Verify internet connectivity
- Check if Bitbucket API is accessible from your network
- Ensure no firewall is blocking the requests

### Performance
- Large repositories may take time to analyze
- Consider using path parameters to limit scope
- Use file lists instead of full codebase for better performance
