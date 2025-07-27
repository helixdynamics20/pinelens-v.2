import { useState, useEffect, useCallback } from 'react';
import { Settings } from 'lucide-react';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { SearchResults } from './components/SearchResults';
import { EnhancedAnalytics } from './components/EnhancedAnalytics';
import { Integrations } from './components/Integrations';
import { GitHubTokenSetup } from './components/GitHubTokenSetup';
import { APIKeySetup } from './components/APIKeySetup';
import { DebugPanel } from './components/DebugPanel';
import { unifiedSearchService, UnifiedSearchResult } from './services/unifiedSearchService';
import { realAPIService } from './services/realAPIService';
import { geminiService } from './services/geminiService';
import { mcpClient } from './services/mcpClient';

interface SearchOptions {
  searchMode?: string;
  webRestrictions?: {
    safeSearch?: boolean;
    complianceLevel?: string;
  };
  aiOptions?: {
    models?: string[];
    temperature?: number;
  };
  appSources?: string[];
}

function App() {
  const [searchResults, setSearchResults] = useState<UnifiedSearchResult[]>([]);
  const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'search' | 'analytics' | 'integrations'>('search');
  const [showGitHubSetup, setShowGitHubSetup] = useState(false);
  const [showAPIKeySetup, setShowAPIKeySetup] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [lastQuery, setLastQuery] = useState('');
  // Conversational AI chat state (for chat UI)
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
  
  // Get available models based on user's API keys
  const [availableModels, setAvailableModels] = useState<{ 
    id: string; 
    name: string; 
    provider: string; 
    tier?: string; 
    capabilities?: string[];
    summary?: string;
    contextLength?: number;
  }[]>([]);
  
  // Get connected MCP services (status === 'connected')
  const [connectedServicesCount, setConnectedServicesCount] = useState(0);



  const loadAvailableModels = useCallback(async () => {
    try {
      const allModels: { 
        id: string; 
        name: string; 
        provider: string; 
        tier?: string; 
        capabilities?: string[];
        summary?: string;
        contextLength?: number;
      }[] = [];

      // Get Gemini models
      if (geminiService.isConfigured()) {
        const geminiModels = geminiService.getAvailableModels();
        allModels.push(...geminiModels);
        console.log(`✅ Loaded ${geminiModels.length} Gemini models`);
      } else {
        console.log('ℹ️ Gemini API key not configured');
        // Add placeholder models to show what's available
        const geminiModels = geminiService.getAvailableModels();
        allModels.push(...geminiModels.map(model => ({
          ...model,
          name: `${model.name} (API Key Required)`,
          provider: `${model.provider} (Not Configured)`
        })));
      }

      setAvailableModels(allModels);
      
      // Set the first available model as default if current selection is not available
      if (allModels.length > 0 && !allModels.find(m => m.id === selectedModel)) {
        setSelectedModel(allModels[0].id);
      }

      console.log(`✅ Total Gemini models loaded: ${allModels.length}`);
    } catch (error) {
      console.error('Failed to load Gemini models:', error);
      // Fallback to basic Gemini models
      const fallbackModels = [
        {
          id: 'gemini-pro',
          name: 'Gemini Pro (API Key Required)',
          provider: 'Google AI (Not Configured)',
          tier: 'standard' as const
        }
      ];
      setAvailableModels(fallbackModels);
      setSelectedModel('gemini-pro');
    }
  }, [selectedModel]);

  // Update connected services count from MCP client
  const loadConnectedServicesCount = () => {
    const servers = mcpClient.getServers();
    const connected = servers.filter(s => s.status === 'connected');
    setConnectedServicesCount(connected.length);
  };

  useEffect(() => {
    // loadConnectedSources(); // No longer needed
    loadAvailableModels();
    loadConnectedServicesCount();

    // Optionally, listen for server status changes to update count live
    const handler = () => loadConnectedServicesCount();
    mcpClient.on('serverStatusChanged', handler);
    mcpClient.on('serverAdded', handler);
    mcpClient.on('serverRemoved', handler);
    return () => {
      mcpClient.removeListener('serverStatusChanged', handler);
      mcpClient.removeListener('serverAdded', handler);
      mcpClient.removeListener('serverRemoved', handler);
    };
  }, [loadAvailableModels]);

  const handleSearch = async (
    query: string,
    model: string,
    sources: string[],
    searchMode: 'unified' | 'apps' | 'web' | 'ai' = 'unified',
    options?: SearchOptions
  ) => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setLastQuery(query);

    try {
      const searchOptions = {
        searchMode,
        maxResults: 50,
        appSources: sources,
        aiModels: [model],
        temperature: options?.aiOptions?.temperature || 0.7,
        webRestrictions: options?.webRestrictions,
        includePrivateRepos: true,
        repositoryTypes: ['owned', 'member', 'organization'] as ('owned' | 'member' | 'organization')[]
      };

      let results: UnifiedSearchResult[] = [];

      if (searchMode === 'ai') {
        // Conversational AI: maintain chat history
        setChatHistory(prev => [...prev, { role: 'user', content: query }]);
        try {
          let conversationPrompt = chatHistory.map(msg => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`).join('\n');
          conversationPrompt += `\nUser: ${query}`;
          if (model.startsWith('gemini-') || model === 'gemini-pro' || model === 'gemini-1.5-pro' || model === 'gemini-1.5-flash') {
            // Use Gemini service for AI response
            console.log(`🤖 Using Gemini model: ${model}`);
            const aiResponse = await geminiService.generateResponse(model, conversationPrompt, {
              systemPrompt: 'You are a helpful AI assistant. Provide accurate and concise information. Continue the conversation naturally.',
              temperature: options?.aiOptions?.temperature || 0.7,
              maxTokens: 2048
            });
            results = [{
              id: `gemini-${Date.now()}`,
              title: `Gemini AI Response`,
              content: aiResponse,
              source: availableModels.find(m => m.id === model)?.name || model,
              sourceType: 'ai' as const,
              author: 'Gemini AI',
              date: new Date().toISOString(),
              url: '#',
              relevanceScore: 0.95,
              searchMode: 'ai' as const,
              metadata: {
                type: 'ai-response',
                model: model,
                provider: 'Google AI',
                searchMode: 'ai'
              }
            }];
            setChatHistory(prev => [...prev, { role: 'ai', content: aiResponse }]);
          } else {
            results = await unifiedSearchService.search(query, searchOptions);
          }
        } catch (aiError) {
          console.warn('Gemini AI search failed, falling back to unified search:', aiError);
          if (aiError instanceof Error && aiError.message.includes('API key')) {
            setError(`Gemini API Error: ${aiError.message}`);
            return;
          }
          results = await unifiedSearchService.search(query, searchOptions);
        }
      } else if (searchMode === 'apps') {
        // Debug: Print all MCP servers before search
        console.log('DEBUG: MCP servers before app search:', mcpClient.getServers());
        try {
          const mcpResults = await mcpClient.search({
            query,
            sources: [],
            model,
            searchMode: 'apps'
          });
          results = mcpResults.map(result => ({
            id: result.id,
            title: result.title,
            content: result.content,
            source: result.source,
            sourceType: result.sourceType as 'bitbucket' | 'jira' | 'teams' | 'confluence' | 'github' | 'slack' | 'web' | 'ai',
            author: result.author,
            date: result.date,
            url: result.url,
            relevanceScore: result.relevanceScore,
            searchMode: 'apps' as const,
            starred: result.starred,
            metadata: {
              type: String(result.metadata?.type || 'general'),
              ...result.metadata,
              aiProcessed: true
            },
            accessLevel: 'private' as const
          }));
          console.log(`📊 AI-powered MCP search returned ${results.length} results`);
          if (results.length > 0 && (model.startsWith('gemini-') || model === 'gemini-pro' || model === 'gemini-1.5-pro' || model === 'gemini-1.5-flash')) {
            try {
              const { aiQueryProcessor } = await import('./services/aiQueryProcessor');
              const aiFormattedContent = await aiQueryProcessor.formatResults(
                {
                  originalQuery: query,
                  processedQuery: query,
                  intent: `Search for ${query}`,
                  actions: [],
                  confidence: 0.8
                },
                mcpResults,
                model
              );
              results.unshift({
                id: `ai-summary-${Date.now()}`,
                title: `📋 Search Summary for "${query}"`,
                content: aiFormattedContent,
                source: availableModels.find(m => m.id === model)?.name || model,
                sourceType: 'ai' as const,
                author: 'AI Assistant',
                date: new Date().toISOString(),
                url: '#',
                relevanceScore: 1.0,
                searchMode: 'apps' as const,
                starred: false,
                metadata: {
                  type: 'ai-summary',
                  model: model,
                  provider: 'Google AI',
                  searchMode: 'apps',
                  aiProcessed: true,
                  isAISummary: true
                },
                accessLevel: 'private' as const
              });
              console.log('✨ Enhanced results with AI-powered summary');
            } catch (aiError) {
              console.warn('Failed to enhance results with AI formatting:', aiError);
            }
          }
        } catch (mcpError) {
          console.error('AI-powered MCP search failed:', mcpError);
          setError(`App search failed: ${mcpError instanceof Error ? mcpError.message : 'Unknown error'}`);
          return;
        }
      } else {
        results = await unifiedSearchService.search(query, searchOptions);
        console.log(`📊 ${searchMode === 'unified' ? 'All mode' : searchMode + ' mode'}: Got ${results.length} results`);
      }

      // Ensure apps mode only shows MCP results
      if (searchMode === 'apps') {
        // Filter to only include MCP server results (exclude web sources)
        results = results.filter(result => 
          result.sourceType !== 'web' && 
          (result.searchMode === 'apps' || 
           ['github', 'bitbucket', 'jira', 'confluence', 'teams', 'slack', 'ai'].includes(result.sourceType))
        );
        console.log(`🔍 Apps mode: Filtered to ${results.length} MCP server results (no web results)`);
      } else if (searchMode === 'unified') {
        console.log(`📊 All mode: Showing ${results.length} results from all sources (MCP + Web + AI)`);
      }

      setSearchResults(results);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      console.error('Search error:', err);
      
      // If it's a "no services configured" error, show GitHub setup
      if (errorMessage.includes('No services configured')) {
        const gitHubConfig = realAPIService.checkGitHubConfiguration();
        if (!gitHubConfig.hasToken) {
          setShowGitHubSetup(true);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickGitHubSetup = (token: string) => {
    const success = realAPIService.configureGitHubToken(token);
    if (success) {
      loadConnectedSources();
      loadAvailableModels();
      setError(null);
      setShowGitHubSetup(false);
    }
  };

  const handleSkipGitHubSetup = () => {
    setShowGitHubSetup(false);
  };

  const renderMainContent = () => {
    switch (currentView) {
      case 'analytics':
        return (
          <EnhancedAnalytics 
            isVisible={currentView === 'analytics'}
          />
        );
      case 'integrations':
        return (
          <Integrations
            isVisible={currentView === 'integrations'}
          />
        );
      default:
        return (
          <div className="space-y-6">
            <SearchBar
              onSearch={handleSearch}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              availableModels={availableModels}
            />
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-red-800 text-sm font-medium">Search Error</p>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                  </div>
                  {error.includes('No services configured') && (
                    <button
                      onClick={() => setCurrentView('integrations')}
                      className="ml-4 px-3 py-1 text-sm bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors"
                    >
                      Configure Services
                    </button>
                  )}
                  {error.includes('Gemini API key not configured') && (
                    <button
                      onClick={() => setShowAPIKeySetup(true)}
                      className="ml-4 px-3 py-1 text-sm bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors"
                    >
                      Setup API Key
                    </button>
                  )}
                </div>
              </div>
            )}




            {!isLoading && searchResults.length === 0 && !error && (
              <div className="text-center py-12">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 max-w-2xl mx-auto">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Welcome to Unified Search
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Search across all your connected services with three powerful modes:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-blue-600 font-medium mb-2">📱 Apps Mode</div>
                      <p className="text-gray-600">
                        Search your GitHub repositories, Jira issues, Confluence pages, and more
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-green-600 font-medium mb-2">🌐 Web Mode</div>
                      <p className="text-gray-600">
                        Search the web with company policy restrictions and safe browsing
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-purple-600 font-medium mb-2">🤖 AI Mode</div>
                      <p className="text-gray-600">
                        Get AI-powered insights and analysis from multiple models
                      </p>
                    </div>
                  </div>
                  {connectedServicesCount === 0 && (
                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-yellow-800 text-sm mb-3">
                        <strong>Get Started:</strong> Configure your API credentials to enable search across your services.
                      </p>
                      <div className="text-xs text-yellow-700 mb-3">
                        <strong>Supported Services:</strong> GitHub, Bitbucket, Jira, Confluence, Slack, Microsoft Teams
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setCurrentView('integrations')}
                          className="inline-flex items-center px-3 py-1 text-sm font-medium text-yellow-900 bg-yellow-100 rounded-md hover:bg-yellow-200 transition-colors"
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Configure Services
                        </button>
                        <button
                          onClick={() => setShowGitHubSetup(true)}
                          className="inline-flex items-center px-3 py-1 text-sm font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100 transition-colors border border-green-200"
                        >
                          Setup GitHub Token
                        </button>
                        <button
                          onClick={() => setShowAPIKeySetup(true)}
                          className="inline-flex items-center px-3 py-1 text-sm font-medium text-purple-700 bg-purple-50 rounded-md hover:bg-purple-100 transition-colors border border-purple-200"
                        >
                          Setup AI Models
                        </button>
                        <button
                          onClick={() => {
                            localStorage.setItem('use_demo_mode', 'true');
                            // Show a demo search
                            handleSearch('project management', selectedModel, [], 'apps');
                          }}
                          className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors border border-blue-200"
                        >
                          Try Demo Mode
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(isLoading || searchResults.length > 0) && (
              <SearchResults
                results={searchResults}
                isLoading={isLoading}
                query={lastQuery}
                onStarToggle={(resultId) => {
                  // TODO: Implement star toggle functionality
                  console.log('Star toggle for:', resultId);
                }}
                renderExtraContent={(result, idx) => {
                  // Only show follow-up input at the end of the last AI response card
                  if (
                    currentView === 'search' &&
                    selectedModel.startsWith('gemini') &&
                    result.sourceType === 'ai' &&
                    idx === searchResults.map(r => r.sourceType).lastIndexOf('ai')
                  ) {
                    return (
                      <div className="mt-4">
                        <ChatLikeFollowUpInput onFollowUp={handleSearch} selectedModel={selectedModel} />
                      </div>
                    );
                  }
                  return null;
                }}
              />
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        currentView={currentView}
        onViewChange={(view) => setCurrentView(view as 'search' | 'analytics' | 'integrations')}
        connectedServicesCount={connectedServicesCount}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderMainContent()}
      </main>

      {/* Debug Button - positioned in bottom right corner */}
      <button
        onClick={() => setShowDebugPanel(true)}
        className="fixed bottom-4 right-4 bg-purple-500 text-white p-3 rounded-full shadow-lg hover:bg-purple-600 z-40"
        title="Open Debug Panel"
      >
        🐛
      </button>

      {showGitHubSetup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <GitHubTokenSetup
            onTokenConfigured={handleQuickGitHubSetup}
            onSkip={handleSkipGitHubSetup}
          />
        </div>
      )}

      <APIKeySetup
        isOpen={showAPIKeySetup}
        onClose={() => setShowAPIKeySetup(false)}
        onSave={() => {
          loadAvailableModels();
          setShowAPIKeySetup(false);
        }}
      />

      <DebugPanel
        isOpen={showDebugPanel}
        onClose={() => setShowDebugPanel(false)}
      />
    </div>
  );
}


// Persistent chat-like follow-up input below AI card
import React, { useState as useChatInputState } from 'react';
function ChatLikeFollowUpInput({ onFollowUp, selectedModel }: { onFollowUp: (query: string, model: string, sources: string[], searchMode: 'ai') => Promise<void>, selectedModel: string }) {
  const [value, setValue] = useChatInputState('');
  const [sending, setSending] = useChatInputState(false);
  return (
    <form
      className="flex gap-2 items-end bg-white border border-gray-200 rounded-xl shadow-sm p-4"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (value.trim()) {
          setSending(true);
          await onFollowUp(value, selectedModel, [], 'ai');
          setValue('');
          setSending(false);
        }
      }}
    >
      <input
        name="followup"
        type="text"
        placeholder="Type your follow-up..."
        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
        autoComplete="off"
        value={value}
        onChange={e => setValue(e.target.value)}
        disabled={sending}
        autoFocus
      />
      <button
        type="submit"
        className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-base font-semibold"
        disabled={sending || !value.trim()}
      >
        {sending ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}

export default App;
