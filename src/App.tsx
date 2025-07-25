import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { MCPConnections } from './components/MCPConnections';
import { MCPServerSetup } from './components/MCPServerSetup';
import { SearchResults } from './components/SearchResults';
import { Analytics } from './components/Analytics';
import { Integrations } from './components/Integrations';
import { mcpClient, MCPServer } from './services/mcpClient';

// Mock data for demonstration
const mockAIModels = [
  { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
  { id: 'claude-3', name: 'Claude 3', provider: 'Anthropic' },
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google' },
  { id: 'llama-2', name: 'Llama 2', provider: 'Meta' }
];

const mockMCPServers = [
  {
    id: 'github-local-1',
    name: 'Local GitHub MCP',
    type: 'github' as const,
    status: 'disconnected' as const
  },
  {
    id: 'bitbucket-1',
    name: 'Company Bitbucket',
    type: 'bitbucket' as const,
    status: 'connected' as const,
    lastSync: '2 minutes ago',
    itemCount: 1247
  },
  {
    id: 'jira-1',
    name: 'Project Jira',
    type: 'jira' as const,
    status: 'connected' as const,
    lastSync: '5 minutes ago',
    itemCount: 892
  },
  {
    id: 'teams-1',
    name: 'Teams Workspace',
    type: 'teams' as const,
    status: 'connecting' as const
  },
  {
    id: 'confluence-1',
    name: 'Wiki Confluence',
    type: 'confluence' as const,
    status: 'error' as const
  },
  {
    id: 'github-1',
    name: 'GitHub Enterprise',
    type: 'github' as const,
    status: 'disconnected' as const
  },
  {
    id: 'slack-1',
    name: 'Team Slack',
    type: 'slack' as const,
    status: 'connected' as const,
    lastSync: '1 hour ago',
    itemCount: 3421
  }
];

const mockSearchResults = [
  {
    id: '1',
    title: 'API Integration Documentation',
    content: 'Complete guide for integrating with our REST API endpoints. Includes authentication, rate limiting, and error handling best practices.',
    source: 'Company Confluence',
    sourceType: 'confluence' as const,
    author: 'John Smith',
    date: '2024-01-15',
    url: 'https://confluence.company.com/api-docs',
    relevanceScore: 0.95,
    starred: true
  },
  {
    id: '2',
    title: 'Bug: Login timeout issue',
    content: 'Users experiencing timeout issues during login process. Affects approximately 5% of users. Priority: High',
    source: 'Project Jira',
    sourceType: 'jira' as const,
    author: 'Sarah Johnson',
    date: '2024-01-14',
    url: 'https://jira.company.com/PROJ-1234',
    relevanceScore: 0.87
  },
  {
    id: '3',
    title: 'Weekly Team Standup Notes',
    content: 'Sprint review, upcoming deadlines, and team updates from the weekly standup meeting.',
    source: 'Teams Workspace',
    sourceType: 'teams' as const,
    author: 'Mike Chen',
    date: '2024-01-12',
    url: 'https://teams.microsoft.com/meeting-notes',
    relevanceScore: 0.76
  },
  {
    id: '4',
    title: 'Feature: User authentication system',
    content: 'Implementation of OAuth 2.0 authentication system with JWT tokens and refresh token rotation.',
    source: 'Company Bitbucket',
    sourceType: 'bitbucket' as const,
    author: 'Alice Brown',
    date: '2024-01-10',
    url: 'https://bitbucket.company.com/auth-feature',
    relevanceScore: 0.82
  }
];

function App() {
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const [searchResults, setSearchResults] = useState(mockSearchResults);
  const [isSearching, setIsSearching] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showServerSetup, setShowServerSetup] = useState(false);
  const [mcpServers, setMCPServers] = useState<MCPServer[]>(mockMCPServers);
  const [currentView, setCurrentView] = useState('dashboard');

  const connectedSources = mcpServers
    .filter(server => server.status === 'connected')
    .map(server => server.type);

  const handleSearch = async (query: string, model: string, sources: string[]) => {
    setIsSearching(true);
    
    try {
      // Use real MCP client for search
      const results = await mcpClient.search({
        query,
        model,
        sources
      });
      
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      // Fallback to mock data for demo
      const filteredResults = sources.length === 0 
        ? mockSearchResults 
        : mockSearchResults.filter(result => sources.includes(result.sourceType));
      setSearchResults(filteredResults);
    } finally {
      setIsSearching(false);
    }
  };

  const handleStarToggle = (resultId: string) => {
    setSearchResults(prev =>
      prev.map(result =>
        result.id === resultId
          ? { ...result, starred: !result.starred }
          : result
      )
    );
  };

  const handleMCPConnect = (serverId: string) => {
    mcpClient.connectServer(serverId);
  };

  const handleMCPDisconnect = (serverId: string) => {
    mcpClient.disconnectServer(serverId);
  };

  const handleMCPConfigure = (serverId: string) => {
    console.log('Configure server:', serverId);
    // Handle server configuration
  };

  const handleAddServer = async (config: {
    name: string;
    type: 'bitbucket' | 'jira' | 'teams' | 'confluence' | 'github' | 'slack';
    serverConfig: any;
  }) => {
    await mcpClient.addServer(config);
    setMCPServers(mcpClient.getServers());
  };

  // Listen to MCP client events
  useEffect(() => {
    const handleServerStatusChanged = (server: MCPServer) => {
      setMCPServers(mcpClient.getServers());
    };

    const handleServerAdded = (server: MCPServer) => {
      setMCPServers(mcpClient.getServers());
    };

    const handleServerRemoved = () => {
      setMCPServers(mcpClient.getServers());
    };

    mcpClient.on('serverStatusChanged', handleServerStatusChanged);
    mcpClient.on('serverAdded', handleServerAdded);
    mcpClient.on('serverRemoved', handleServerRemoved);

    return () => {
      mcpClient.removeListener('serverStatusChanged', handleServerStatusChanged);
      mcpClient.removeListener('serverAdded', handleServerAdded);
      mcpClient.removeListener('serverRemoved', handleServerRemoved);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50">
      <Header 
        onSettingsClick={() => setShowSettings(!showSettings)} 
        currentView={currentView}
        onViewChange={setCurrentView}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard View */}
        {currentView === 'dashboard' && (
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="text-center py-8">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">
                Search Everything,{' '}
                <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                  Find Anything
                </span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Harness the power of AI to search across all your connected services. 
                Bitbucket, Jira, Teams, and more - all in one unified interface.
              </p>
            </div>

            {/* Search Interface */}
            <SearchBar
              onSearch={handleSearch}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              availableModels={mockAIModels}
              connectedSources={connectedSources}
            />

            {/* MCP Connections */}
            <MCPConnections
              servers={mcpServers}
              onConnect={handleMCPConnect}
              onDisconnect={handleMCPDisconnect}
              onConfigure={handleMCPConfigure}
              onAddServer={() => setShowServerSetup(true)}
            />

            {/* Search Results */}
            <SearchResults
              results={searchResults}
              isLoading={isSearching}
              query=""
              onStarToggle={handleStarToggle}
            />
          </div>
        )}

        {/* Analytics View */}
        <Analytics isVisible={currentView === 'analytics'} />

        {/* Integrations View */}
        <Integrations 
          isVisible={currentView === 'integrations'} 
          onAddServer={() => setShowServerSetup(true)}
        />
      </main>

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">AI Model Preferences</h4>
                <div className="space-y-2">
                  {mockAIModels.map(model => (
                    <label key={model.id} className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="defaultModel"
                        value={model.id}
                        checked={selectedModel === model.id}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="text-blue-600"
                      />
                      <span>{model.name} ({model.provider})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Search Preferences</h4>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" defaultChecked className="text-blue-600" />
                    <span>Enable search suggestions</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" defaultChecked className="text-blue-600" />
                    <span>Save search history</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" className="text-blue-600" />
                    <span>Include archived content</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MCP Server Setup */}
      <MCPServerSetup
        isOpen={showServerSetup}
        onClose={() => setShowServerSetup(false)}
        onAddServer={handleAddServer}
      />
    </div>
  );
}

export default App;