# In-House MCP Servers Configuration

This directory contains the in-house MCP servers for Jira and Bitbucket integration with PineLens.

## Quick Start

1. **Start the servers:**
   ```bash
   cd mcp-servers
   node setup.js
   ```

2. **Open PineLens UI:**
   - Navigate to http://localhost:5174
   - Go to the "In-House Integrations" tab
   - Configure your Jira and Bitbucket credentials

## Configuration

### Jira Configuration
- **Base URL**: Your Jira instance URL (e.g., `https://qc-hub.atlassian.net`)
- **Email**: Your Atlassian account email
- **API Token**: Generate from [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)

### Bitbucket Configuration
- **Base URL**: 
  - Cloud: `https://bitbucket.org`
  - Server: Your Bitbucket server URL
- **Username**: Your Bitbucket username
- **App Password**: Generate from Bitbucket Settings → App passwords
- **Workspace**: Your workspace name (for cloud only)

## Available Tools

### Jira Tools
- `jira_configure`: Configure Jira connection
- `jira_search_issues`: Search issues using JQL or natural language
- `jira_get_issue`: Get specific issue details
- `jira_get_projects`: List accessible projects
- `jira_get_user_issues`: Get issues assigned to current user

### Bitbucket Tools
- `bitbucket_configure`: Configure Bitbucket connection
- `bitbucket_search_repositories`: Search repositories
- `bitbucket_get_repository`: Get repository details
- `bitbucket_get_branches`: Get repository branches
- `bitbucket_get_commits`: Get repository commits
- `bitbucket_get_pull_requests`: Get pull requests
- `bitbucket_search_code`: Search code (cloud only)
- `bitbucket_get_file_content`: Get file content

## Server Management

### Start Servers
```bash
node setup.js start
```

### Stop Servers
Press `Ctrl+C` when running the setup script.

### Check Dependencies
Dependencies are automatically checked and installed when starting servers.

## Troubleshooting

### Common Issues

1. **"Server not running" error**
   - Make sure you've started the servers using `node setup.js`
   - Check the console for any error messages

2. **"Authentication failed" error**
   - Verify your credentials are correct
   - For Jira: Make sure you're using an API token, not your password
   - For Bitbucket: Make sure you're using an app password, not your account password

3. **"Connection timeout" error**
   - Check your network connection
   - Verify the base URLs are correct and accessible

4. **CORS errors**
   - These servers bypass CORS by running locally
   - Make sure the servers are running on the same machine as PineLens

### Log Files
Server logs are displayed in the console where you started the servers.

## Security Notes

- API tokens and app passwords are stored only in memory while servers are running
- No credentials are persisted to disk
- All communication happens locally between PineLens and the MCP servers
- The servers only have access to the APIs you've explicitly configured

## Development

### Adding New Tools
1. Add the tool definition in the `ListToolsRequestSchema` handler
2. Implement the tool logic in the `CallToolRequestSchema` handler
3. Update the integration service to expose the new functionality

### Server Architecture
- Each server runs as a separate Node.js process
- Communication happens via JSON-RPC over stdio
- The integration service manages server lifecycle and message routing

## Support

If you encounter issues:
1. Check the console logs for detailed error messages
2. Verify your network connectivity to the target services
3. Ensure your API credentials have the necessary permissions
4. Try testing the connections individually through the UI
