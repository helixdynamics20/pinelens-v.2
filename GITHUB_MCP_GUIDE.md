# 🚀 **GitHub MCP Server Integration - Quick Start Guide**

Your PineLens app search is now fully functional with GitHub MCP server integration! Here's how to set it up and use it.

## 📋 **Step-by-Step Setup**

### 1. **Access Integrations**
- Click the 🔗 **"Integrations"** tab in the header
- You'll see the MCP Connections section

### 2. **Add GitHub MCP Server**
- Click **"Add Server"** button
- Select **"GitHub"** from the server type dropdown
- Fill in the details:
  - **Name**: `My GitHub` (or any name you prefer)
  - **Server URL**: `https://api.github.com` (pre-filled)
  - **Username**: Your GitHub username
  - **Personal Access Token**: Your GitHub token

### 3. **Create GitHub Token** (if you don't have one)
- Go to GitHub Settings → Developer settings → Personal access tokens
- Generate a new token with these permissions:
  - `repo` (access repositories)
  - `read:org` (read organization data)
  - `read:user` (read user profile)
- Copy the token and paste it in PineLens

### 4. **Connect the Server**
- After adding, click **"Connect"** on your GitHub server card
- Wait for the status to change to **"Connected"** ✅

## 🔍 **How to Search Your GitHub Data**

### 1. **Select Apps Mode**
- In the main search interface, click the 📱 **"Apps"** icon
- This ensures you're searching your connected services

### 2. **Enter Your Query**
- Type what you're looking for, examples:
  - `authentication` - Find repos/issues about auth
  - `API documentation` - Search for API-related code
  - `bug fix` - Find recent bug fixes
  - `React components` - Search for React code

### 3. **View Results**
- See results from your:
  - **Repositories** - Your GitHub repos
  - **Issues** - Issues you've created/commented on
  - **Pull Requests** - Your PRs and reviews
  - **Code** - Code search across your repos
  - **Commits** - Recent commits

## 🎯 **Search Result Types**

### **Repository Results**
- Repository name and description
- Programming language, stars, forks
- Last updated date
- Direct link to repository

### **Issue/PR Results**
- Issue/PR title and description
- Current status (open/closed)
- Labels and assignees
- Comments count

### **Code Results**
- File name and path
- Repository location
- Programming language
- Direct link to code

### **Commit Results**
- Commit message
- Author and date
- Repository name
- Changes summary

## ⚡ **Pro Tips**

### **Search Optimization**
- Use specific keywords for better results
- Include programming languages: `React TypeScript`
- Search by functionality: `user authentication`
- Find recent work: `recent commits`

### **Result Filtering**
- Results are automatically sorted by relevance
- Click on any result to open it directly in GitHub
- Copy code snippets with the built-in copy button

### **Managing Servers**
- **Disconnect**: Temporarily disable a server
- **Configure**: Update server settings
- **Status Indicators**:
  - 🟢 Connected - Ready to search
  - 🟡 Connecting - Setting up connection
  - 🔴 Error - Check credentials
  - ⚪ Disconnected - Click connect

## 🔧 **Troubleshooting**

### **"No MCP servers connected" Error**
- Make sure you've added and connected your GitHub server
- Check that your token has the required permissions
- Verify your GitHub username is correct

### **"Connection Failed" Error**
- Check your internet connection
- Verify your GitHub token is still valid
- Ensure the token has required permissions

### **"No Results Found"**
- Try broader search terms
- Make sure you have repositories with that content
- Check if the server is still connected

## 🎉 **Next Steps**

Now that GitHub is working, you can add more MCP servers:
- **Jira** - Search your project tickets
- **Confluence** - Search documentation
- **Slack** - Search team conversations
- **Bitbucket** - Search additional repositories

Each service works the same way - just add the server, connect it, and start searching!

## 💡 **Example Search Queries**

Try these example searches in **Apps mode**:

1. `React components` - Find your React code
2. `API endpoints` - Search for API-related code
3. `authentication bug` - Find auth-related issues
4. `database migration` - Search for DB code
5. `test coverage` - Find testing code
6. `documentation` - Search docs and README files

Happy searching! 🎯
