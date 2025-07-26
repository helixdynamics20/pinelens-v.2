# GitHub Search Usage Guide

## How to Use GitHub Search in Apps Mode

Your application now has full GitHub MCP server integration! Here's how to use it:

### 1. Setup Your GitHub Token

First, you need to configure your GitHub personal access token:

1. **Go to GitHub Settings**: Visit https://github.com/settings/tokens
2. **Generate New Token**: Click "Generate new token (classic)"
3. **Set Permissions**: Give it these scopes:
   - `repo` (for repository access)
   - `user` (for user information)
   - `read:org` (for organization repositories)
4. **Copy the Token**: Save it somewhere secure

### 2. Configure GitHub in Your App

1. **Click the Integration Tab** in your application
2. **Find the GitHub MCP Server section**
3. **Click "Setup GitHub Server"** or similar button
4. **Paste your GitHub token** when prompted
5. **Wait for connection** - you should see "Connected" status

### 3. Search GitHub Using Apps Mode

Now you can search your GitHub repositories! Here's how:

#### Switch to Apps Mode
- In the search bar, select **"Apps"** mode (not AI or Web mode)
- This tells the system to search through your connected services

#### Search Examples

**Search for repositories:**
```
repositories react typescript
```

**Search for code:**
```
function handleSubmit
```

**Search for issues:**
```
bug authentication login
```

**Search for pull requests:**
```
feature user management
```

**Search commits:**
```
fix security vulnerability
```

### 4. What You'll See in Results

Your search results will show:

- **Repository matches** with descriptions and stars
- **Code snippets** from your files
- **Issues and PRs** with titles and status
- **Commit messages** with author and date
- **Relevant file paths** and line numbers

### 5. Search Tips

**For better results:**
- Use specific keywords related to your code
- Combine terms like "authentication service"
- Search for function names, class names, or file names
- Use technical terms like "API", "database", "frontend"

**Repository-specific searches:**
- "project management dashboard" - finds repos with those keywords
- "react component library" - finds React-related repositories
- "API documentation" - finds API-related projects

### 6. Troubleshooting

**If connection fails:**
1. Check your GitHub token has correct permissions
2. Make sure token hasn't expired
3. Try disconnecting and reconnecting
4. Check the browser console for errors

**If no results appear:**
1. Make sure you're in "Apps" mode
2. Verify GitHub server is "Connected" in Integrations tab
3. Try broader search terms first
4. Check if you have access to the repositories

**Common issues:**
- **404 errors**: Usually means token doesn't have access to specific repos
- **Connection failed**: Check token permissions and expiry
- **No results**: Try different keywords or check repo access

### 7. Advanced Features

**Search across different resource types:**
- The system automatically searches repositories, code, issues, and PRs
- Results are ranked by relevance to your query
- Private repositories are included if your token has access

**Access levels:**
- **Public repos**: Available with basic token
- **Private repos**: Requires repo scope in token
- **Organization repos**: Requires appropriate org membership

### 8. Next Steps

Once GitHub is working, you can add more services:
- **Jira** for issue tracking
- **Confluence** for documentation
- **Slack** for team communications
- **Teams** for Microsoft collaboration
- **Bitbucket** for additional code repositories

Each service will appear in Apps mode search results, giving you a unified view across all your development tools!

---

## Quick Start Checklist

- [ ] Generate GitHub personal access token with `repo`, `user`, `read:org` scopes
- [ ] Add GitHub server in Integrations tab
- [ ] Paste token and connect
- [ ] Switch search mode to "Apps"
- [ ] Try searching for "repositories typescript" or similar
- [ ] Verify you see your GitHub repositories in results

That's it! You now have a powerful unified search across your GitHub repositories, code, issues, and more. 🚀
