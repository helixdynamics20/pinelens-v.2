# In-House MCP Servers Setup Guide

## 🎯 Overview

You now have **custom MCP servers** for **Jira** and **Bitbucket** that run locally and bypass all CORS issues! These servers connect directly to your company's Jira and Bitbucket instances using API keys.

## 🚀 Quick Start

### 1. Start the MCP Servers

```bash
cd mcp-servers
node setup.js
```

You should see:
```
[19:11:18] All servers started successfully!
[19:11:18] 
[19:11:18] Server Status:
[19:11:18] - Jira MCP Server: Running
[19:11:18] - Bitbucket MCP Server: Running
[19:11:18]
[19:11:18] You can now configure the servers through the PineLens UI at http://localhost:5174
```

### 2. Start PineLens (in another terminal)

```bash
npm run dev
```

### 3. Configure Your Services

1. Open http://localhost:5174
2. Click the **"In-House"** tab in the header
3. Configure your Jira and Bitbucket credentials

## 🔧 Configuration

### Jira Configuration

Your specific settings:
- **Base URL**: `https://qc-hub.atlassian.net`
- **Email**: `vishal.kumar10@pinelabs.com`
- **API Token**: [Your existing API token]

### Bitbucket Configuration

- **Base URL**: `https://bitbucket.org` (or your company's Bitbucket server)
- **Username**: [Your Bitbucket username]
- **App Password**: [Generate from Bitbucket Settings → App passwords]
- **Workspace**: [Your workspace name]

## 🎨 Features Available

### Jira Tools
- ✅ **Search Issues**: Natural language or JQL queries
- ✅ **Get Specific Issue**: Detailed issue information
- ✅ **List Projects**: All accessible projects
- ✅ **User Issues**: Issues assigned to you
- ✅ **Project Filtering**: Search within specific projects
- ✅ **Status Filtering**: Filter by issue status

### Bitbucket Tools
- ✅ **Search Repositories**: Find repos by name or description
- ✅ **Repository Details**: Get detailed repo information
- ✅ **Browse Branches**: List all branches
- ✅ **View Commits**: Recent commit history
- ✅ **Pull Requests**: Open, merged, or declined PRs
- ✅ **Code Search**: Search code within repositories (Cloud only)
- ✅ **File Content**: Get specific file contents

## 💡 How It Works

1. **Local MCP Servers**: Run on your machine, no external dependencies
2. **Direct API Access**: Connect directly to Jira/Bitbucket APIs
3. **No CORS Issues**: Bypassed completely since servers run locally
4. **Secure**: API keys stored only in memory, never persisted
5. **Fast**: Direct connections without proxy overhead

## 🔍 Usage Examples

### Search Jira Issues
```
"bug in authentication"
"assignee = currentUser()"
"project = NSVP AND status != Done"
"priority = High"
```

### Search Bitbucket
```
"authentication service"
"payment gateway"
"mobile app"
```

## 🛠️ Troubleshooting

### Servers Won't Start
```bash
cd mcp-servers
npm install  # Reinstall dependencies
node setup.js
```

### Connection Issues
1. Check your API credentials are correct
2. Verify network access to your Jira/Bitbucket instances
3. For Jira: Use API tokens, not passwords
4. For Bitbucket: Use app passwords, not account passwords

### No Search Results
1. Make sure both MCP servers are running (green dots in UI)
2. Test connections using the "Test Connection" buttons
3. Check console logs for error messages

## 🎯 Benefits vs Previous CORS Solutions

| Feature | Previous CORS Proxy | In-House MCP Servers |
|---------|-------------------|---------------------|
| **Setup Complexity** | Medium | Easy |
| **Reliability** | Depends on proxy | High - Local |
| **Performance** | Slower (proxy hop) | Fast - Direct |
| **Security** | Proxy server | Local only |
| **CORS Issues** | Sometimes | Never |
| **API Features** | Limited | Full API access |
| **Search Quality** | Basic | Advanced (JQL, filters) |

## 🔗 Architecture

```
PineLens UI (localhost:5174)
    ↓ (JSON-RPC over stdio)
Jira MCP Server (local process)
    ↓ (HTTPS API calls)
qc-hub.atlassian.net

PineLens UI (localhost:5174)
    ↓ (JSON-RPC over stdio)
Bitbucket MCP Server (local process)
    ↓ (HTTPS API calls)
bitbucket.org
```

## 📁 File Structure

```
mcp-servers/
├── jira-inhouse-server.js      # Jira MCP server
├── bitbucket-inhouse-server.js # Bitbucket MCP server
├── setup.js                    # Server management script
├── package.json               # Dependencies
└── README.md                  # Documentation

src/
├── services/
│   ├── inHouseMCPService.ts   # MCP client integration
│   └── inHouseSearchService.ts # Search abstraction
└── components/
    └── InHouseIntegrations.tsx # UI component
```

## ✅ Test Your Setup

1. **Start servers**: `cd mcp-servers && node setup.js`
2. **Start PineLens**: `npm run dev`
3. **Configure Jira**: Use your existing credentials
4. **Test search**: Try searching for "NSVP-27299"
5. **Configure Bitbucket**: Add your workspace credentials
6. **Test repos**: Search for your repositories

## 🎉 You're Ready!

Your in-house MCP servers are now running and ready to search across your company's Jira and Bitbucket instances without any CORS issues!

The servers will:
- ✅ Handle authentication automatically
- ✅ Provide rich search results
- ✅ Support advanced filtering
- ✅ Work reliably across all browsers
- ✅ Bypass all CORS restrictions

Perfect solution for your company's internal tool integration! 🚀
