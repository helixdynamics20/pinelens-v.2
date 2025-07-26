# PineLens v.2 - AI-Powered Unified Search Interface

## Overview

PineLens v.2 is an advanced, AI-powered centralized search interface designed for enterprise environments. It provides unified search capabilities across multiple platforms and services including GitHub, Jira, Bitbucket, Microsoft Teams, Confluence, Slack, and more.

## Key Features

### 🔍 **Unified Search**
- Search across all connected enterprise services in one interface
- AI-powered result ranking and relevance scoring
- Real-time search suggestions and query optimization
- Advanced filtering and sorting capabilities

### 🤖 **AI Integration**
- Support for multiple AI models (GPT-4, Claude, Gemini Pro, Llama 2)
- **GitHub Copilot Pro Integration**: Access to premium models (GPT-4, Claude 3.5 Sonnet, o1-preview, o1-mini)
- Intelligent result processing and summarization
- Automated key point extraction and tagging
- Sentiment analysis and priority detection

### 🔗 **Multi-Platform Integration**
- **GitHub/GitHub Enterprise**: Repositories, issues, pull requests, code search
- **Jira**: Issues, projects, tickets, custom fields
- **Confluence**: Pages, spaces, documentation
- **Microsoft Teams**: Messages, files, meeting notes
- **Slack**: Messages, files, channels
- **Bitbucket**: Repositories, pull requests, issues

### 📊 **Advanced Analytics**
- Search performance metrics and trends
- User satisfaction tracking
- Source health monitoring
- Popular results and search patterns
- Exportable analytics data

### 🛠 **Enterprise Features**
- MCP (Model Context Protocol) server support
- WebSocket and HTTP API connectivity
- Secure authentication for all services
- Real-time synchronization
- Background processing

## Architecture

### Frontend (React + TypeScript)
- **Components**: Modular React components with TypeScript
- **State Management**: React hooks and context
- **UI Framework**: Tailwind CSS for responsive design
- **Icons**: Lucide React for consistent iconography

## 🔍 Advanced Search Modes

PineLens supports four distinct search modes to match different use cases and company policies:

### 1. 🌐 Unified Search (Default)
Searches across all available sources - web, AI models, and connected apps - providing comprehensive results with intelligent ranking and deduplication.

**Use Cases:**
- General research and discovery
- Getting complete context on topics
- Finding information when source is unknown

### 2. 🔍 Web Search Only
Searches the web with company policy restrictions and content filtering to ensure compliance and safety.

**Features:**
- **Company Policy Compliance**: Automatically filters content based on predefined policies
- **Domain Restrictions**: Allow/block specific domains per company guidelines
- **Safe Search**: Built-in content filtering for inappropriate material
- **Compliance Levels**: Strict, Moderate, or Relaxed filtering

### 3. 🤖 AI Only Search
Generates responses using multiple AI models simultaneously, providing diverse perspectives and AI-powered insights.

**Supported AI Models:**
- **GPT-4** (OpenAI): Advanced reasoning and code analysis
- **Claude 3 Opus/Sonnet** (Anthropic): Safety-focused, analytical responses
- **Gemini Pro** (Google): Multimodal understanding with Google integration
- **Llama 2 70B** (Meta): Open-source alternative with community focus

### 4. 📱 Apps Only Search
Searches exclusively within your connected workspace applications with access-based filtering.

**Supported Applications:**
- **GitHub**: Repositories, issues, pull requests, discussions
- **Jira**: Tickets, epics, sprints, comments
- **Confluence**: Pages, spaces, attachments
- **Slack**: Messages, channels, files, threads
- **Microsoft Teams**: Chats, channels, meetings, files
- **Bitbucket**: Repositories, pull requests, pipelines

### Backend Integration
- **MCP Client**: Manages connections to various services
- **Search Processor**: AI-powered result processing and ranking
- **API Service**: Enhanced backend connectivity and caching
- **Service Integrations**: Direct API connections to enterprise services

### Data Flow
1. User submits search query through the UI
2. Query is processed and sent to connected services
3. Raw results are collected from multiple sources
4. AI processes and ranks results for relevance
5. Enhanced results are displayed with metadata and insights

#### GitHub
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate a new token with `repo` and `read:org` permissions
3. Note your username and the generated token

#### Jira
1. Go to Atlassian Account Settings → Security → API tokens
2. Create a new API token
3. Note your email and the generated token

#### Confluence
1. Go to Atlassian Account Settings → Security → API tokens
2. Create a new API token (same as Jira)
3. Note your email and the generated token

#### Microsoft Teams
1. Register an app in Azure AD
2. Grant Microsoft Graph permissions (`Chat.Read`, `Files.Read.All`, etc.)
3. Get an OAuth token from your app

#### Slack
1. Create a Slack app at api.slack.com
2. Add bot token scopes (`channels:read`, `files:read`, `chat:read`, etc.)
3. Install the app and use the Bot User OAuth Token

### 2. Adding Servers to PineLens

1. Click the "Add Server" button in the MCP Connections section
2. Select your service type
3. Enter a connection name
4. Provide the server URL (pre-filled with defaults)
5. Enter your authentication credentials
6. Click "Add Server"

### 3. MCP Server Requirements

PineLens expects MCP servers to support the following WebSocket protocol:

#### Connection
- WebSocket endpoint: `wss://your-server.com/mcp`
- Authentication via initial message

#### Message Types

**Authentication:**
```json
{
  "type": "auth",
  "credentials": {
    "type": "token|basic|oauth|api_key|bot_token",
    "token": "your-token",
    "username": "your-username",
    "password": "your-password"
  }
}
```

**Search Request:**
```json
{
  "type": "search",
  "id": "unique-request-id",
  "query": "search terms",
  "model": "gpt-4",
  "filters": {
    "dateRange": { "start": "2024-01-01", "end": "2024-12-31" },
    "author": "john.doe",
    "type": "issue"
  }
}
```

**Search Response:**
```json
{
  "type": "search_response",
  "id": "unique-request-id",
  "results": [
    {
      "id": "result-1",
      "title": "Result Title",
      "content": "Result content...",
      "author": "John Doe",
      "date": "2024-01-15T10:30:00Z",
      "url": "https://service.com/item/123",
      "relevanceScore": 0.95,
      "metadata": {}
    }
  ]
}
```

**Sync Request:**
```json
{
  "type": "sync",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**Sync Complete:**
```json
{
  "type": "sync_complete",
  "itemCount": 1247,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Development

### Project Structure

```
src/
├── components/          # React components
│   ├── Header.tsx      # Main header with navigation
│   ├── SearchBar.tsx   # AI-powered search interface
│   ├── MCPConnections.tsx  # Server connection management
│   ├── MCPServerSetup.tsx  # Server setup modal
│   └── SearchResults.tsx   # Search results display
├── services/           # Business logic
│   └── mcpClient.ts   # MCP client implementation
└── App.tsx            # Main application component
```

### Key Components

- **MCPClient**: Handles WebSocket connections to MCP servers
- **SearchBar**: Provides search interface with AI model selection
- **MCPConnections**: Manages server connections and status
- **SearchResults**: Displays and filters search results

### Customization

You can customize PineLens by:

1. **Adding new AI models**: Update the `mockAIModels` array in `App.tsx`
2. **Supporting new services**: Add new server types to `MCPServerSetup.tsx`
3. **Modifying search filters**: Extend the search interface in `SearchBar.tsx`
4. **Styling**: Update Tailwind classes throughout the components

## Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Netlify

The project includes automatic Netlify deployment configuration. Simply connect your repository to Netlify for automatic deployments.

## Security Considerations

- All API credentials are stored locally in the browser
- WebSocket connections use secure protocols (WSS)
- No credentials are sent to external services except the configured MCP servers
- Consider implementing additional encryption for sensitive data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation for MCP server setup
- Review the WebSocket protocol requirements

## Roadmap

- [ ] Support for additional AI models
- [ ] Advanced search operators
- [ ] Search result caching
- [ ] Offline search capabilities
- [ ] Plugin system for custom integrations
- [ ] Team collaboration features
- [ ] Analytics and search insights