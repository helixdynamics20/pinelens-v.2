# PineLens v2 - Real API Integration Guide

## 🚀 What's New

Your search application now supports **REAL API INTEGRATION** with your actual services instead of showing mock data!

## 📋 Supported Services

- **GitHub** - Search repositories, issues, and pull requests
- **Bitbucket** - Search repositories and code
- **Jira** - Search issues, tasks, and tickets
- **Confluence** - Search wiki pages and documentation
- **Slack** - Search messages and conversations
- **Microsoft Teams** - Search messages and files

## 🔧 How to Configure

1. **Open the App**: Visit `http://localhost:5173`

2. **Click Service Configuration**: 
   - Click the "Configure Services" button in the blue banner
   - OR click the 🔗 icon in the header

3. **Enable Services**: Check the services you want to use

4. **Add Credentials**: For each enabled service, provide:

### GitHub
- **Personal Access Token**: Go to GitHub Settings → Developer settings → Personal access tokens
- Generate token with `repo`, `read:org`, `read:user` scopes

### Bitbucket
- **App Password**: Go to Bitbucket Settings → App passwords
- Create password with `Repositories:Read` scope
- **Workspace**: Your Bitbucket workspace name

### Jira
- **Domain**: Your Jira domain (e.g., `company.atlassian.net`)
- **Username**: Your email address
- **API Token**: Generate from Jira Account Settings → Security → API tokens

### Confluence
- **Domain**: Your Confluence domain (e.g., `company.atlassian.net`)
- **Username**: Your email address  
- **API Token**: Same as Jira if using Atlassian Cloud

### Slack
- **Bot Token**: Create Slack app at `api.slack.com`
- Add `search:read`, `channels:read` scopes
- Copy Bot User OAuth Token (starts with `xoxb-`)

### Microsoft Teams
- **API Token**: Microsoft Graph API token
- Requires Azure AD app registration
- Needs `Chat.Read`, `Files.Read.All` permissions

## 🔍 How to Search

1. **Select Apps Mode**: Click the 📱 **Apps** icon below the search bar
2. **Enter Query**: Type your search terms
3. **Get Real Results**: See actual data from your configured services

## ⚠️ Important Notes

- **Security**: All credentials are stored locally in your browser
- **CORS**: Some APIs may require CORS setup for browser requests
- **Rate Limits**: APIs have rate limits - don't search too frequently
- **Permissions**: Make sure your tokens have the required permissions

## 🛠️ Troubleshooting

### "No services configured" Error
- Configure at least one service in Settings
- Make sure the service is enabled and has valid credentials

### API Connection Errors
- Check your credentials are correct
- Verify API tokens haven't expired
- Ensure proper scopes/permissions are granted

### CORS Errors
- Some APIs may block browser requests
- Consider using a CORS proxy for development
- In production, make API calls from your backend

## 🎯 Next Steps

Your app now connects to real APIs! You can:
- Add more services by extending the `realAPIService.ts`
- Implement OAuth flows for better security
- Add caching to improve performance
- Set up a backend proxy to handle CORS issues

Enjoy searching your real data! 🎉
