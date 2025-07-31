# Jira API Token Setup Guide

This guide helps you set up Jira integration in PineLens using API token authentication.

## 🔑 Creating a Jira API Token

### Step 1: Generate API Token
1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage/api-tokens)
2. Log in with your Atlassian account
3. Click **"Create API token"**
4. Enter a label: `PineLens Integration`
5. Click **"Create"**
6. **Copy the token immediately** (you can't see it again!)

### Step 2: Find Your Server URL
Your Jira server URL should be in this format:
```
https://YOUR-DOMAIN.atlassian.net
```

**Examples:**
- ✅ `https://mycompany.atlassian.net`
- ✅ `https://acme-corp.atlassian.net`
- ❌ `https://mycompany.atlassian.net/browse/PROJECT-123` (too specific)
- ❌ `https://mycompany.atlassian.net/secure/Dashboard.jspa` (too specific)

## 🔧 Configuration in PineLens

1. Open PineLens application
2. Go to **Integrations** tab
3. Find **Jira** in the list
4. Click **"Configure"**
5. Fill in the form:
   - **Email**: Your Atlassian account email
   - **API Token**: The token you generated above
   - **Server URL**: Your domain URL (https://YOUR-DOMAIN.atlassian.net)

## 🔍 What You Can Search

### Natural Language Queries
- "show me bugs assigned to john"
- "find issues created this week"
- "urgent tasks in DEMO project"
- "tickets waiting for review"

### JQL (Jira Query Language)
```jql
project = "DEMO" AND status = "In Progress"
assignee = currentUser() AND status != "Done"
created >= -7d ORDER BY created DESC
priority = "High" AND project in ("PROJ1", "PROJ2")
```

### Advanced Searches
- **By Project**: Issues from specific projects
- **By Assignee**: Issues assigned to specific users
- **By Status**: Filter by issue status (To Do, In Progress, Done)
- **By Type**: Bug, Story, Task, Epic, etc.
- **By Labels**: Search issues with specific labels

## 🌐 CORS Handling

PineLens automatically handles browser CORS restrictions:

1. **Direct Connection**: Tries to connect directly to Jira
2. **Proxy Fallback**: If CORS blocks the request, uses localhost:3001 proxy
3. **User Guidance**: Provides clear error messages and solutions

### CORS Proxy Server
The application includes a CORS proxy server (`cors-proxy.cjs`) that:
- Runs on `localhost:3001`
- Forwards requests to your Jira domain
- Adds proper CORS headers
- Handles authentication transparently

## 🔒 Security Best Practices

### API Token Security
- ✅ Store tokens securely (only in browser localStorage)
- ✅ Use descriptive labels for tokens
- ✅ Regenerate tokens periodically
- ❌ Never commit tokens to version control
- ❌ Don't share tokens in chat/email

### Permissions
Your API token inherits your user permissions:
- You can only access projects you have permission to view
- You can only see issues you're allowed to see
- Admin operations require admin permissions

## 🚀 Supported Features

### Issue Operations
- ✅ Search issues with natural language
- ✅ Execute JQL queries
- ✅ View issue details, status, priority
- ✅ Access comments and attachments metadata
- ✅ Filter by project, assignee, status

### Project Operations
- ✅ List all accessible projects
- ✅ View project details and issue types
- ✅ Search within specific projects

### User Operations  
- ✅ Get current user information
- ✅ Find issues assigned to you
- ✅ Search by assignee

## 🛠️ Troubleshooting

### Common Issues

**Authentication Failed (401)**
- Check email and API token are correct
- Ensure token hasn't expired
- Verify you have access to the Jira instance

**Forbidden Access (403)**
- Check you have permission to access the project
- Verify your user account is active
- Contact your Jira admin for permission issues

**CORS Errors**
- Make sure `cors-proxy.cjs` is running on port 3001
- Check the proxy server logs for error messages
- Try restarting the proxy server

**Connection Timeout**
- Verify your server URL is correct
- Check your internet connection
- Ensure Jira instance is accessible

### Testing Your Setup

1. **Connection Test**: The system automatically tests your connection
2. **Search Test**: Try searching for "test" or a project name
3. **JQL Test**: Execute: `assignee = currentUser()`

## 📚 API Reference

This integration uses the [Jira Cloud REST API v3](https://developer.atlassian.com/cloud/jira/platform/rest/v3/):

### Key Endpoints Used
- `/rest/api/3/myself` - User authentication test
- `/rest/api/3/search` - Issue search with JQL
- `/rest/api/3/project` - Project information
- `/rest/api/3/issue/{issueKey}` - Individual issue details

### Authentication Method
Uses HTTP Basic Authentication with:
- Username: Your Atlassian email
- Password: API token
- Header: `Authorization: Basic <base64(email:token)>`

## 📞 Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify your API token and permissions
3. Test direct access to Jira web interface
4. Try the CORS proxy solution
5. Check [Atlassian Community](https://community.atlassian.com/) for help

---

**Supported Jira Versions**: Jira Cloud only (not Jira Server/Data Center)
**Last Updated**: 2025-01-31
