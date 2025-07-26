# PineLens v.2 - AI-Powered Unified Search Interface

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

## Overview

PineLens v.2 is an advanced, AI-powered unified search interface designed for enterprise environments. It provides seamless search capabilities across multiple platforms, AI models, and web sources with intelligent result processing and beautiful UI components.

## ✨ Latest Updates & Features

### 🎨 **Enhanced User Experience**
- **Beautiful SearchResults Component**: Completely redesigned with modern card layouts, AI response formatting, and interactive elements
- **Advanced AI Response Formatting**: Proper markdown parsing with code blocks, headers, lists, and inline formatting
- **Quick Actions Bar**: Clone repositories, copy links, and open results with one-click actions
- **Interactive Copy Features**: Copy code blocks, clone commands, and full AI responses with visual feedback
- **Responsive Design**: Optimized for all screen sizes with Tailwind CSS

### 🔍 **Four Distinct Search Modes**
1. **🌐 Unified Search** (Default): Search across all sources with intelligent ranking
2. **🔍 Web Search Only**: Company policy-compliant web search with content filtering
3. **🤖 AI Only Search**: Generate responses using multiple AI models simultaneously
4. **📱 Apps Only Search**: Search exclusively within connected workspace applications

### 🤖 **Advanced AI Integration**
- **GitHub Models API Integration**: Access premium models through GitHub Copilot Pro subscription
  - GPT-4, GPT-4 Turbo, o1-preview, o1-mini
  - Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
  - Gemini 1.5 Pro, Gemini 1.5 Flash
  - Llama 3.1 (405B, 70B, 8B), Llama 3.2 (90B, 11B, 3B, 1B)
  - Phi-3.5 models and more
- **Free AI Models**: Support for Hugging Face, Ollama, and other free AI services
- **Intelligent Response Processing**: Enhanced formatting, code highlighting, and structured display
- **Multi-Model Comparison**: Compare responses from different AI models side-by-side

### 🔗 **Enterprise Platform Integration**
- **GitHub/GitHub Enterprise**: Advanced repository search, issues, pull requests, code snippets
- **Real API Services**: Production-ready API integrations with proper authentication
- **Enhanced MCP Support**: Improved Model Context Protocol server management
- **Service Configuration**: Streamlined setup for all integrated services

### 📊 **Analytics & Monitoring**
- **Enhanced Analytics Dashboard**: Comprehensive search metrics, performance tracking, and user insights
- **Real-time Monitoring**: Live search performance and service health monitoring
- **Debug Panel**: Advanced debugging tools for developers and administrators
- **Export Capabilities**: CSV/JSON export for analytics data

### 🛠 **Developer Experience**
- **Component Library**: Modular, reusable React components with TypeScript
- **Service Architecture**: Clean separation of concerns with dedicated service classes
- **API Key Management**: Secure local storage and management of API credentials
- **Configuration UI**: User-friendly setup interfaces for all services

## Architecture

### Frontend Stack
- **React 18**: Modern React with hooks and concurrent features
- **TypeScript**: Full type safety and enhanced developer experience  
- **Vite**: Lightning-fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Lucide React**: Beautiful, customizable SVG icons

### Component Architecture
```
src/components/
├── SearchResults.tsx      # Enhanced search results with AI formatting
├── SearchBar.tsx         # Multi-mode search interface
├── Header.tsx           # Navigation and user controls
├── Analytics.tsx        # Advanced analytics dashboard
├── MCPConnections.tsx   # MCP server management
├── ServiceConfiguration.tsx # Service setup and configuration
├── APIKeySetup.tsx      # API key management interface
├── GitHubTokenSetup.tsx # GitHub token configuration
├── ModelOverview.tsx    # AI model selection and overview
├── DebugPanel.tsx       # Developer debugging tools
└── EnhancedAnalytics.tsx # Extended analytics features
```

### Service Layer
```
src/services/
├── unifiedSearchService.ts    # Core unified search logic
├── githubCopilotService.ts   # GitHub Models API integration
├── freeModelsService.ts      # Free AI models support
├── realAPIService.ts         # Production API integrations
├── searchProcessor.ts        # Search result processing
├── webSearch.ts             # Web search functionality
├── aiSearch.ts              # AI-powered search
├── geminiService.ts         # Google Gemini integration
├── mcpClient.ts             # Model Context Protocol client
└── integrations.ts          # Platform integrations
```

### Data Flow Architecture
1. **User Input**: Multi-mode search interface captures user queries
2. **Query Processing**: Unified search service routes queries based on search mode
3. **API Orchestration**: Parallel API calls to selected services and AI models
4. **Result Processing**: AI-powered result ranking, formatting, and enhancement
5. **UI Rendering**: React components render enhanced results with interactive features

## � Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- GitHub account (for GitHub Models API access)
- API keys for desired services (optional, many free options available)

### Installation
```bash
# Clone the repository
git clone https://github.com/helixdynamics20/pinelens-v.2.git
cd pinelens-v.2

# Install dependencies
npm install

# Start development server
npm run dev
```

### First Time Setup
1. **Open PineLens**: Navigate to `http://localhost:5173`
2. **Configure Services**: Click on "Service Configuration" in the header
3. **Add API Keys**: Set up GitHub token and any additional AI model API keys
4. **Test Search**: Try searching across different modes to verify functionality

## 🔧 Configuration Guide

### GitHub Models API Setup (Recommended)
GitHub Models API provides access to premium AI models through GitHub Copilot Pro subscription:

1. **Get GitHub Personal Access Token**:
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Generate token with `model` scope (if available) or `repo` scope
   - Copy the token

2. **Configure in PineLens**:
   - Click "GitHub Token Setup" in the header
   - Paste your GitHub token
   - Test connection to verify access

3. **Available Models** (with GitHub Copilot Pro):
   - **OpenAI**: GPT-4, GPT-4 Turbo, o1-preview, o1-mini
   - **Anthropic**: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
   - **Google**: Gemini 1.5 Pro, Gemini 1.5 Flash
   - **Meta**: Llama 3.1 (405B, 70B, 8B), Llama 3.2 models
   - **Microsoft**: Phi-3.5 variants

### Free AI Models Setup
For users without GitHub Copilot Pro, PineLens supports multiple free AI services:

1. **Hugging Face Inference API**:
   - Sign up at huggingface.co
   - Get free API token from settings
   - Add to PineLens API Key Setup

2. **Ollama (Local Models)**:
   - Install Ollama on your machine
   - Run `ollama serve` to start API server
   - PineLens will auto-detect local Ollama installation

3. **Together AI** (Free Tier):
   - Sign up at together.ai
   - Get API key from dashboard
   - Configure in API Key Setup

### Enterprise Service Integration

#### GitHub Enterprise
```bash
# Repository Configuration
- Server URL: https://your-github-enterprise.com
- Token: Personal Access Token with repo permissions
- Scopes: repo, read:org, read:user
```

#### Jira
```bash
# Jira Cloud/Server Setup  
- Server URL: https://your-domain.atlassian.net
- Email: your-email@company.com
- API Token: Generated from Atlassian Account Settings
```

#### Confluence
```bash
# Confluence Setup
- Server URL: https://your-domain.atlassian.net/wiki
- Email: your-email@company.com  
- API Token: Same as Jira token
```
## 🔍 Search Modes & Features

### 1. 🌐 Unified Search (Default)
Intelligent search across all sources with AI-powered result ranking and deduplication.

**Key Features:**
- Multi-source aggregation (Web + AI + Apps)
- Intelligent result scoring and ranking
- Duplicate detection and removal
- Contextual result enhancement

### 2. 🔍 Web Search Only
Company policy-compliant web search with advanced filtering capabilities.

**Features:**
- Domain-based filtering (allow/block lists)
- Safe search with content filtering
- Regional search restrictions
- Compliance-level controls (Strict/Moderate/Relaxed)

### 3. 🤖 AI Only Search
Multi-model AI responses with enhanced formatting and code highlighting.

**Enhanced Features:**
- **Code Block Formatting**: Syntax highlighting with copy buttons
- **Markdown Support**: Headers, lists, emphasis, and inline code
- **Model Comparison**: Side-by-side responses from different models
- **Response Actions**: Copy, save, and share AI responses

**Supported Models:**
- OpenAI GPT-4, GPT-4 Turbo, o1-series
- Anthropic Claude 3.5 Sonnet, Claude 3 Opus
- Google Gemini 1.5 Pro/Flash
- Meta Llama 3.1/3.2 series
- Microsoft Phi-3.5 variants
- Free models via Hugging Face and Ollama

### 4. 📱 Apps Only Search
Workspace application search with access-based filtering and quick actions.

**Quick Actions:**
- **Git Clone**: One-click repository cloning
- **Copy Links**: Direct link copying with visual feedback
- **Open in App**: Launch in original application
- **Export Results**: Save search results in multiple formats

**Supported Platforms:**
- GitHub/GitHub Enterprise (repositories, issues, PRs, code)
- Jira (tickets, projects, custom fields, attachments)
- Confluence (pages, spaces, comments, attachments)
- Slack (messages, files, channels, threads)
- Microsoft Teams (chats, meetings, files, channels)
- Bitbucket (repositories, PRs, pipelines, issues)

## 📊 Analytics & Monitoring

### Enhanced Analytics Dashboard
- **Search Metrics**: Volume, performance, and success rates  
- **User Behavior**: Popular queries, source preferences, and patterns
- **Performance Tracking**: Response times, error rates, and availability
- **Model Usage**: AI model utilization and response quality metrics

### Debug Panel (Developer Mode)
- **Real-time Logs**: Live search execution and API call monitoring
- **Performance Profiling**: Detailed timing and resource usage analysis
- **Error Tracking**: Comprehensive error logging and stack traces
- **Service Health**: Status monitoring for all connected services

### Export Capabilities
- **CSV Export**: Tabular data for spreadsheet analysis
- **JSON Export**: Structured data for programmatic processing
- **PDF Reports**: Formatted analytics reports for stakeholders

## 🔧 Advanced Configuration

### MCP Server Integration (Legacy)

For organizations using Model Context Protocol servers, PineLens maintains backward compatibility:

#### WebSocket Protocol Support
```javascript
// Authentication Message
{
  "type": "auth",
  "credentials": {
    "type": "token|basic|oauth|api_key|bot_token",
    "token": "your-token",
    "username": "your-username", 
    "password": "your-password"
  }
}

// Search Request
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

// Search Response Format
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
      "sourceType": "github",
      "metadata": {}
    }
  ]
}
```

#### MCP Server Setup
1. Navigate to MCP Connections in the application
2. Click "Add Server" and select service type
3. Enter server URL and authentication details
4. Test connection and verify functionality

## 🛠 Development

### Project Structure (Updated)
```
pinelens-v.2/
├── src/
│   ├── components/                 # React UI Components
│   │   ├── SearchResults.tsx      # Enhanced search results display
│   │   ├── SearchBar.tsx          # Multi-mode search interface  
│   │   ├── Header.tsx             # Navigation and controls
│   │   ├── Analytics.tsx          # Analytics dashboard
│   │   ├── EnhancedAnalytics.tsx  # Extended analytics
│   │   ├── MCPConnections.tsx     # MCP server management
│   │   ├── ServiceConfiguration.tsx # Service setup
│   │   ├── APIKeySetup.tsx        # API key management
│   │   ├── GitHubTokenSetup.tsx   # GitHub configuration
│   │   ├── ModelOverview.tsx      # AI model selection
│   │   ├── DebugPanel.tsx         # Developer tools
│   │   └── Integrations.tsx       # Platform integrations
│   ├── services/                   # Business Logic Layer
│   │   ├── unifiedSearchService.ts # Core search orchestration
│   │   ├── githubCopilotService.ts # GitHub Models API
│   │   ├── freeModelsService.ts    # Free AI models
│   │   ├── realAPIService.ts       # Production APIs
│   │   ├── searchProcessor.ts      # Result processing
│   │   ├── webSearch.ts           # Web search functionality
│   │   ├── aiSearch.ts            # AI search logic
│   │   ├── geminiService.ts       # Google Gemini integration
│   │   ├── mcpClient.ts           # MCP protocol client
│   │   └── integrations.ts        # Platform connectors
│   ├── App.tsx                     # Main application
│   ├── main.tsx                    # Application entry point
│   └── index.css                   # Global styles
├── public/                         # Static assets
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── tailwind.config.js             # Tailwind CSS config
├── vite.config.ts                 # Vite build configuration
└── README.md                       # This file
```

### Key Components Overview

#### SearchResults.tsx
Enhanced search results component with:
- Modern card-based layout design
- AI response formatting with markdown support
- Code block highlighting and copy functionality
- Quick action buttons (clone, copy, open)
- Interactive metadata display
- Responsive design for all screen sizes

#### Unified Search Service
Core service orchestrating all search operations:
- Multi-mode search routing (unified, web, AI, apps)
- Parallel API execution and result aggregation
- AI-powered result ranking and enhancement
- Access control and permission management

#### GitHub Copilot Service
Production-ready GitHub Models API integration:
- Token validation and model access verification
- Support for all GitHub Models API endpoints
- Rate limiting and error handling
- Model capability detection

### Development Workflow

#### Local Development
```bash
# Start development server with hot reload
npm run dev

# Run TypeScript type checking
npm run build

# Lint code for style and errors
npm run lint

# Preview production build
npm run preview
```

#### Component Development
- Use TypeScript for all components
- Follow React hooks patterns
- Implement responsive design with Tailwind CSS
- Add proper error handling and loading states
- Include accessibility features (ARIA labels, keyboard navigation)

#### Service Development
- Implement proper TypeScript interfaces
- Add comprehensive error handling
- Include retry logic for API calls
- Implement proper caching strategies
- Add logging for debugging

### Adding New Features

#### Adding a New AI Model
1. Update `freeModelsService.ts` or create new service file
2. Add model configuration and API integration
3. Update model selection UI in `ModelOverview.tsx`
4. Add model-specific result processing if needed

#### Adding a New Platform Integration
1. Create service file in `src/services/`
2. Implement search and authentication methods
3. Add platform configuration to `ServiceConfiguration.tsx`
4. Update unified search service to include new platform

#### Extending Search Results
1. Update `UnifiedSearchResult` interface
2. Modify result processing in `searchProcessor.ts`
3. Enhance display logic in `SearchResults.tsx`
4. Add new metadata fields and formatting

## 🚀 Deployment

### Build for Production
```bash
# Create optimized production build
npm run build

# Test production build locally
npm run preview
```

### Deployment Options

#### Netlify (Recommended)
1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Deploy automatically on git push

#### Vercel
1. Import project from GitHub
2. Framework preset: Vite
3. Build command: `npm run build`
4. Output directory: `dist`

#### Traditional Hosting
1. Run `npm run build`
2. Upload `dist/` folder contents to your web server
3. Configure server to serve index.html for all routes

### Environment Configuration
PineLens stores configuration locally in the browser. For enterprise deployment:

1. **API Keys**: Stored in localStorage (client-side only)
2. **Service URLs**: Can be pre-configured via environment variables
3. **Default Settings**: Customizable in source code before build

## 🔒 Security & Privacy

### Data Security
- **Local Storage**: All API keys and configurations stored locally in browser
- **No Backend**: PineLens operates entirely client-side for maximum security
- **HTTPS Only**: All API communications use secure HTTPS/WSS protocols
- **No Data Logging**: Search queries and results are not logged or stored

### Privacy Features
- **Private Repository Access**: Respects GitHub repository permissions
- **Access Control**: Only displays results user has permission to view
- **Token Scope Limiting**: Uses minimal required permissions for each service
- **No Analytics Tracking**: No user data sent to external analytics services

### Enterprise Security Considerations
- Deploy behind corporate firewall for additional protection
- Implement content security policies (CSP) for XSS protection
- Regular security audits of dependencies
- Consider implementing additional authentication layers

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Setup
```bash
# Fork and clone the repository
git clone https://github.com/your-username/pinelens-v.2.git
cd pinelens-v.2

# Install dependencies
npm install

# Create a feature branch
git checkout -b feature/your-feature-name

# Start development
npm run dev
```

### Contribution Guidelines
1. **Code Style**: Follow existing TypeScript and React patterns
2. **Testing**: Add tests for new features when applicable
3. **Documentation**: Update README and add code comments
4. **UI/UX**: Maintain consistent design with Tailwind CSS
5. **Performance**: Optimize for speed and responsiveness

### Pull Request Process
1. Ensure all tests pass and code builds successfully
2. Update documentation for any API changes
3. Add screenshots for UI changes
4. Submit PR with clear description of changes
5. Respond to code review feedback promptly

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support & Community

### Getting Help
- **GitHub Issues**: Report bugs and request features
- **Documentation**: Comprehensive setup and usage guides
- **Community Discussions**: Share tips and ask questions

### Roadmap & Future Features
- [ ] **Advanced Analytics**: Machine learning insights and predictions
- [ ] **Team Collaboration**: Shared searches and result collections
- [ ] **Plugin System**: Custom integrations and extensions
- [ ] **Offline Search**: Local indexing and caching capabilities
- [ ] **Mobile App**: Native iOS and Android applications
- [ ] **Search Operators**: Advanced query syntax and filtering
- [ ] **Auto-completion**: Intelligent search suggestions
- [ ] **Custom Dashboards**: Personalized analytics and metrics

### Performance Benchmarks
- **Search Response Time**: < 2 seconds for unified search
- **UI Responsiveness**: 60fps animations and interactions
- **Memory Usage**: < 100MB typical browser footprint
- **Bundle Size**: < 1MB gzipped JavaScript bundle

---

**Built with ❤️ by the PineLens Team**

*Empowering enterprises with intelligent, unified search across all their digital workspaces.*