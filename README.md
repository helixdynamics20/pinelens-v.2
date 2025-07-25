# PineLens - AI-Powered Centralized Search Interface

PineLens is a modern, AI-powered search interface that allows you to search across multiple connected services using MCP (Model Context Protocol) servers. Connect to Bitbucket, Jira, Teams, Confluence, GitHub, Slack, and more to create a unified search experience.

## Features

- **AI-Powered Search**: Choose from multiple AI models (GPT-4, Claude 3, Gemini Pro, Llama 2)
- **Multi-Source Search**: Search across all your connected services simultaneously
- **MCP Integration**: Built-in support for Model Context Protocol servers
- **Real-time Results**: Live search results with relevance scoring
- **Advanced Filtering**: Filter by source, date, author, and content type
- **Modern UI**: Beautiful, responsive interface with smooth animations
- **Enterprise Ready**: Secure authentication and connection management

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- MCP servers for the services you want to connect

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pinelens
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

## Connecting MCP Servers

### 1. Setting Up Your Services

Before connecting to PineLens, you'll need to set up API access for each service:

#### Bitbucket
1. Go to Bitbucket Settings → App passwords
2. Create a new app password with Repository permissions
3. Note your username and the generated app password

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