# 🎫 **Jira MCP Integration - Quick Setup Guide**

## 📋 **What You'll Get**

Once configured, you'll be able to search your Jira issues using natural language:
- `"show me my assigned issues"`
- `"find bugs in the mobile project"`
- `"recent issues from last week"`
- `"search for authentication problems"`

## 🚀 **Quick Setup (3 minutes)**

### 1. **Access Integrations**
- Click the 🔗 **"Integrations"** tab in the header
- Find **Jira** in the Project Management section

### 2. **Get Your Jira API Token**
- Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
- Click **"Create API token"**
- Give it a name like "PineLens Access"
- **Copy the token** (you won't see it again!)

### 3. **Configure Jira MCP Server**
- Click **"Connect"** on the Jira service card
- Fill in your details:
  - **Name**: `My Jira` (or any name you prefer)
  - **Server URL**: `https://your-company.atlassian.net`
  - **Email**: Your Atlassian account email
  - **API Token**: Paste the token from step 2

### 4. **Test Connection**
- Click **"Add Server"**
- Wait for the status to show **"Connected"** ✅
- You're ready to search!

## 🔍 **How to Search**

### **Natural Language Queries**
- `"show me issues assigned to me"`
- `"find bugs in PROJECT-KEY"`
- `"recent issues from last 30 days"`
- `"search for login problems"`
- `"get issue PROJ-123"`

### **Search Modes**
- **Apps Mode**: Click 📱 to search only your connected services
- **All Mode**: Click 📊 to search everywhere (Apps + Web)
- **AI Mode**: Click 🤖 for conversational AI assistance

## 🎯 **Pro Tips**

### **Better Search Results**
- Use specific project keys: `"bugs in MOBILE-*"`
- Mention issue types: `"story issues about authentication"`
- Include status: `"open bugs assigned to me"`
- Use time filters: `"issues created this week"`

### **Issue Management**
- **Direct Links**: Click any result to open it in Jira
- **Quick Info**: See status, priority, assignee in search results
- **Project Context**: Results show which project each issue belongs to

### **Managing Servers**
- **Reconnect**: If connection fails, click "Connect" again
- **Update Config**: Click ⚙️ to update your server settings
- **Status Check**: 🟢 Connected, 🔴 Error, ⚪ Disconnected

## ⚡ **Troubleshooting**

### **"Connection Failed" Error**
1. **Check Your Token**: Make sure it's copied correctly
2. **Verify Email**: Use the email associated with your Atlassian account
3. **Server URL**: Ensure it's `https://your-domain.atlassian.net` (no trailing slash)
4. **Token Permissions**: The token should have Jira access permissions

### **"No Results Found"**
1. **Check Permissions**: Make sure you can access the projects you're searching
2. **Try Broader Terms**: Use general keywords instead of specific ones
3. **Verify Project Keys**: Ensure the project exists and you have access

### **"Server Not Connected"**
1. **Re-add Server**: Remove and add the server again
2. **Check Status**: Look for connection status indicators
3. **Browser Console**: Open dev tools to see detailed error messages

## 🔐 **Security & Privacy**

- **API Tokens**: Stored locally in your browser only
- **No Data Storage**: We don't store your Jira data or tokens
- **Direct Connection**: Your browser connects directly to Atlassian
- **Token Scope**: Tokens only have the permissions you grant

## 🎉 **Next Steps**

Once Jira is working, add more services:
- **GitHub** - Search repositories and code
- **Confluence** - Search documentation and pages
- **Slack** - Search team conversations
- **Bitbucket** - Search additional repositories

Each service follows the same pattern - just add the server and connect!

---

### **Need Help?**
- Check the browser console (F12) for detailed error messages
- Verify your Atlassian account has access to the Jira instance
- Make sure your API token hasn't expired

**Happy Searching!** 🎯
