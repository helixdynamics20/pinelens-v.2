import { useState, useEffect, useCallback } from 'react';
import { Settings } from 'lucide-react';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { SearchResults } from './components/SearchResults';
import { EnhancedAnalytics } from './components/EnhancedAnalytics';
import { Integrations } from './components/Integrations';
import InHouseIntegrations from './components/InHouseIntegrations';
import { GitHubTokenSetup } from './components/GitHubTokenSetup';
import { APIKeySetup } from './components/APIKeySetup';
import { DebugPanel } from './components/DebugPanel';
import { unifiedSearchService, UnifiedSearchResult } from './services/unifiedSearchService';
import { realAPIService } from './services/realAPIService';
import { geminiService } from './services/geminiService';
import { awsBedrockService } from './services/awsBedrockService';
import { mcpClient } from './services/mcpClient';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { enhancedInHouseMCPService } from './services/enhancedInHouseMCPService';

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

// Define a minimal interface for the server object to satisfy TypeScript
interface Server {
  id: string;
  status: string;
  name?: string;
  // other properties may exist but are not needed for this component
}

function AppContent() {
  const { addNotification } = useNotifications();
  const [searchResults, setSearchResults] = useState<UnifiedSearchResult[]>([]);
  const [selectedModel, setSelectedModel] = useState('anthropic.claude-3-haiku-20240307-v1:0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'search' | 'analytics' | 'integrations' | 'inhouse-integrations'>('search');
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

      let configuredCount = 0;

      // Get AWS Bedrock models
      if (awsBedrockService.isAvailable()) {
        const bedrockModels = awsBedrockService.getAvailableModels().map(modelId => {
          const modelInfo = awsBedrockService.getModelInfo(modelId);
          return {
            id: modelId,
            name: modelId.split('.')[1]?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || modelId,
            provider: modelInfo.provider,
            tier: 'premium',
            capabilities: modelInfo.capabilities,
            summary: `${modelInfo.provider} model available in ap-south-1`,
            contextLength: modelId.includes('claude') ? 200000 : 32000
          };
        });
        allModels.push(...bedrockModels);
        configuredCount++;
        console.log(`✅ Loaded ${bedrockModels.length} AWS Bedrock models`);
      } else {
        console.log('ℹ️ AWS Bedrock not configured');
        // Add placeholder models to show what's available
        const bedrockModels = awsBedrockService.getAvailableModels().map(modelId => {
          const modelInfo = awsBedrockService.getModelInfo(modelId);
          return {
            id: modelId,
            name: `${modelId.split('.')[1]?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || modelId} (AWS Key Required)`,
            provider: `${modelInfo.provider} (Not Configured)`,
            tier: 'premium',
            capabilities: modelInfo.capabilities,
            summary: 'AWS credentials required',
            contextLength: modelId.includes('claude') ? 200000 : 32000
          };
        });
        allModels.push(...bedrockModels);
      }

      // Get Gemini models
      if (geminiService.isConfigured()) {
        const geminiModels = geminiService.getAvailableModels();
        allModels.push(...geminiModels);
        configuredCount++;
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
      
      // Set AWS Bedrock Claude as default if available, otherwise first available model
      if (allModels.length > 0 && !allModels.find(m => m.id === selectedModel)) {
        const claudeModel = allModels.find(m => m.id.includes('claude-3-haiku'));
        const awsModel = allModels.find(m => m.id.startsWith('anthropic.') || m.id.startsWith('amazon.'));
        const defaultModel = claudeModel || awsModel || allModels[0];
        setSelectedModel(defaultModel.id);
      }

      // Add notification about model availability
      if (configuredCount > 0) {
        addNotification({
          type: 'success',
          title: 'AI Models Loaded',
          message: `Successfully loaded ${allModels.length} AI models. You can now use AI-powered search.`,
          autoHide: true,
          duration: 4000
        });
      } else {
        addNotification({
          type: 'info',
          title: 'AI Models Available',
          message: `Found ${allModels.length} AI models. Configure API keys to enable AI-powered search.`,
          autoHide: true,
          duration: 5000,
          actions: [
            {
              label: 'Setup API Keys',
              action: () => {
                setShowAPIKeySetup(true);
              },
              variant: 'primary'
            }
          ]
        });
      }

      console.log(`✅ Total models loaded: ${allModels.length}`);
      console.log('📋 Available models:', allModels.map(m => ({ id: m.id, name: m.name, provider: m.provider })));
      console.log('🎯 Default selected model:', selectedModel);
    } catch (error) {
      console.error('Failed to load Gemini models:', error);
      
      // Add error notification
      addNotification({
        type: 'error',
        title: 'Failed to Load AI Models',
        message: 'Unable to load AI models. Some features may not work properly.',
        autoHide: false,
        actions: [
          {
            label: 'Retry',
            action: () => {
              loadAvailableModels();
            },
            variant: 'primary'
          },
          {
            label: 'Check API Keys',
            action: () => {
              setShowAPIKeySetup(true);
            },
            variant: 'secondary'
          }
        ]
      });
      
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
  }, [selectedModel, addNotification]);

  // Update connected services count from MCP client + In-House services
  const loadConnectedServicesCount = useCallback(() => {
    const servers = mcpClient.getServers();
    const mcpConnected = servers.filter(s => s.status === 'connected').length;
    
    // Check in-house services using the service for an accurate status
    let inHouseConnected = 0;
    if (enhancedInHouseMCPService.isJiraConfigured()) {
      inHouseConnected++;
    }
    if (enhancedInHouseMCPService.isBitbucketConfigured()) {
      inHouseConnected++;
    }
    
    const totalConnected = mcpConnected + inHouseConnected;
    setConnectedServicesCount(totalConnected);
    
    console.log('📊 Connected Services Count Updated:', {
      mcpServices: mcpConnected,
      inHouseServices: inHouseConnected,
      total: totalConnected
    });
  }, []);

  useEffect(() => {
    // loadConnectedSources(); // No longer needed
    loadAvailableModels();
    loadConnectedServicesCount();

    // Welcome notification on first load
    const hasSeenWelcome = localStorage.getItem('pinelens_seen_welcome');
    if (!hasSeenWelcome) {
      setTimeout(() => {
        addNotification({
          type: 'info',
          title: '🎉 Welcome to PineLens!',
          message: 'Your AI-powered unified search platform is ready. Connect services to start searching across all your tools.',
          autoHide: false,
          actions: [
            {
              label: 'Connect Services',
              action: () => {
                setCurrentView('integrations');
                localStorage.setItem('pinelens_seen_welcome', 'true');
              },
              variant: 'primary'
            },
            {
              label: 'Setup API Keys',
              action: () => {
                setShowAPIKeySetup(true);
                localStorage.setItem('pinelens_seen_welcome', 'true');
              },
              variant: 'secondary'
            }
          ]
        });
      }, 1000); // Delay to let UI settle
    }

    // Enhanced event handlers with notifications
    const handleServerStatusChange = (server: Server) => {
      loadConnectedServicesCount();
      
      // Add notifications based on status changes
      if (server.status === 'connected') {
        addNotification({
          type: 'success',
          title: '🎉 Service Connected Successfully',
          message: `${server.name || server.id} is now connected and ready to use. You can now search across this service.`,
          autoHide: false,
          actions: [
            {
              label: 'Search Now',
              action: () => {
                setCurrentView('search');
              },
              variant: 'primary'
            },
            {
              label: 'View Services',
              action: () => {
                setCurrentView('integrations');
              },
              variant: 'secondary'
            }
          ]
        });
      } else if (server.status === 'error') {
        addNotification({
          type: 'error',
          title: 'Service Connection Failed',
          message: `Failed to connect to ${server.name || server.id}. Please check your configuration.`,
          autoHide: false,
          actions: [
            {
              label: 'Retry Connection',
              action: () => {
                setCurrentView('integrations');
              },
              variant: 'primary'
            },
            {
              label: 'Check Settings',
              action: () => {
                setShowAPIKeySetup(true);
              },
              variant: 'secondary'
            }
          ]
        });
      } else if (server.status === 'disconnected') {
        addNotification({
          type: 'warning',
          title: 'Service Disconnected',
          message: `${server.name || server.id} has been disconnected.`,
          autoHide: true,
          duration: 4000
        });
      } else if (server.status === 'connecting') {
        addNotification({
          type: 'info',
          title: 'Connecting to Service',
          message: `Connecting to ${server.name || server.id}...`,
          autoHide: true,
          duration: 2000
        });
      }
    };

    const handleServerAdded = (server: Server) => {
      loadConnectedServicesCount();
      addNotification({
        type: 'info',
        title: 'New Service Added',
        message: `${server.name || server.id} has been added to your integrations.`,
        autoHide: true,
        duration: 4000,
        actions: [
          {
            label: 'Connect Now',
            action: () => {
              setCurrentView('integrations');
            },
            variant: 'primary'
          }
        ]
      });
    };

    const handleServerRemoved = (serverId: string, serverName?: string) => {
      loadConnectedServicesCount();
      addNotification({
        type: 'info',
        title: 'Service Removed',
        message: `${serverName || serverId} has been removed from your integrations.`,
        autoHide: true,
        duration: 3000
      });
    };

    // Listen for events
    mcpClient.on('serverStatusChanged', handleServerStatusChange);
    mcpClient.on('serverAdded', handleServerAdded);
    mcpClient.on('serverRemoved', handleServerRemoved);
    
    return () => {
      mcpClient.removeListener('serverStatusChanged', handleServerStatusChange);
      mcpClient.removeListener('serverAdded', handleServerAdded);
      mcpClient.removeListener('serverRemoved', handleServerRemoved);
    };
  }, [loadAvailableModels, addNotification, loadConnectedServicesCount]);

  const handleSearch = async (
    query: string,
    model: string,
    sources: string[],
    searchMode: 'unified' | 'apps' | 'web' | 'ai' = 'unified',
    options?: SearchOptions
  ) => {
    if (!query.trim()) {
      addNotification({
        type: 'warning',
        title: 'Empty Search',
        message: 'Please enter a search query to get started.',
        autoHide: true,
        duration: 3000
      });
      return;
    }

    // Show search start notification
    addNotification({
      type: 'info',
      title: 'Search Started',
      message: `Searching for "${query}"...`,
      autoHide: true,
      duration: 2000
    });

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
          
          if (model.startsWith('anthropic.claude') || model.startsWith('amazon.titan') || model.startsWith('meta.llama') || model.startsWith('mistral.')) {
            // Use AWS Bedrock service for AI response
            console.log(`🤖 Using AWS Bedrock model: ${model}`);
            
            // Detect query type based on content
            const queryType = (() => {
              const lowerQuery = query.toLowerCase();
              if (lowerQuery.includes('code') || lowerQuery.includes('function') || lowerQuery.includes('algorithm') || 
                  lowerQuery.includes('implement') || lowerQuery.includes('script') || lowerQuery.includes('programming') ||
                  lowerQuery.includes('sieve') || lowerQuery.includes('prime') || lowerQuery.includes('javascript') ||
                  lowerQuery.includes('python') || lowerQuery.includes('java') || lowerQuery.includes('typescript')) {
                return 'code';
              } else if (lowerQuery.includes('analyze') || lowerQuery.includes('analysis') || lowerQuery.includes('compare') ||
                        lowerQuery.includes('summarize') || lowerQuery.includes('explain') || lowerQuery.includes('review')) {
                return 'analysis';
              } else if (lowerQuery.includes('json') || lowerQuery.includes('table') || lowerQuery.includes('format') ||
                        lowerQuery.includes('structure') || lowerQuery.includes('organize')) {
                return 'structured';
              }
              return 'general';
            })();
            
            console.log(`🎯 Detected query type: ${queryType} for query: "${query}"`);
            
            const aiResponse = await awsBedrockService.generateResponse(conversationPrompt, queryType, {
              temperature: options?.aiOptions?.temperature || 0.7,
              maxTokens: 2048
            });
            results = [{
              id: `bedrock-${Date.now()}`,
              title: `AWS Bedrock AI Response`,
              content: aiResponse.content,
              source: availableModels.find(m => m.id === model)?.name || model,
              sourceType: 'ai' as const,
              author: 'AWS Bedrock AI',
              date: new Date().toISOString(),
              url: '#',
              relevanceScore: 0.95,
              searchMode: 'ai' as const,
              metadata: {
                type: 'ai-response',
                model: model,
                provider: availableModels.find(m => m.id === model)?.provider || 'AWS Bedrock',
                searchMode: 'ai',
                usage: aiResponse.usage
              }
            }];
            setChatHistory(prev => [...prev, { role: 'ai', content: aiResponse.content }]);
          } else if (model.startsWith('gemini-') || model === 'gemini-pro' || model === 'gemini-1.5-pro' || model === 'gemini-1.5-flash') {
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
          console.warn('AI search failed, falling back to unified search:', aiError);
          if (aiError instanceof Error && (aiError.message.includes('API key') || aiError.message.includes('AWS'))) {
            setError(`AI API Error: ${aiError.message}`);
            return;
          }
          results = await unifiedSearchService.search(query, searchOptions);
        }
      } else if (searchMode === 'apps') {
        // Use the unified search service for 'apps' mode
        results = await unifiedSearchService.search(query, { ...searchOptions, searchMode: 'apps' });
        console.log(`📊 Apps search returned ${results.length} results`);
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
      
      // Add search completion notification
      if (results.length > 0) {
        addNotification({
          type: 'success',
          title: 'Search Completed',
          message: `Found ${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`,
          autoHide: true,
          duration: 3000
        });
      } else {
        addNotification({
          type: 'info',
          title: 'No Results Found',
          message: `No results found for "${query}". Try different keywords or check your connected services.`,
          autoHide: true,
          duration: 4000,
          actions: [
            {
              label: 'Check Integrations',
              action: () => {
                setCurrentView('integrations');
              },
              variant: 'primary'
            }
          ]
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      console.error('Search error:', err);
      
      // Add comprehensive error notification
      addNotification({
        type: 'error',
        title: 'Search Failed',
        message: errorMessage,
        autoHide: false,
        actions: [
          {
            label: 'Retry Search',
            action: () => {
              handleSearch(query, model, sources, searchMode, options);
            },
            variant: 'primary'
          },
          {
            label: 'Check Settings',
            action: () => {
              setShowAPIKeySetup(true);
            },
            variant: 'secondary'
          }
        ]
      });
      
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
      loadAvailableModels();
      setError(null);
      setShowGitHubSetup(false);
      
      // Add success notification
      addNotification({
        type: 'success',
        title: '🎉 GitHub Token Configured',
        message: 'GitHub token has been successfully configured. You can now search GitHub repositories and access AI models.',
        autoHide: false,
        actions: [
          {
            label: 'Try Search',
            action: () => {
              setCurrentView('search');
            },
            variant: 'primary'
          }
        ]
      });
    } else {
      // Add error notification
      addNotification({
        type: 'error',
        title: 'GitHub Configuration Failed',
        message: 'Failed to configure GitHub token. Please check your token and try again.',
        autoHide: false,
        actions: [
          {
            label: 'Retry',
            action: () => {
              setShowGitHubSetup(true);
            },
            variant: 'primary'
          }
        ]
      });
    }
  };

  const handleSkipGitHubSetup = () => {
    setShowGitHubSetup(false);
  };

  const handleInHouseConnectionChange = () => {
    // This function will be called from InHouseIntegrations when a connection status changes.
    // It will trigger a re-calculation of the connected services count.
    loadConnectedServicesCount();
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
      case 'inhouse-integrations':
        return (
          <InHouseIntegrations onConnectionChange={handleInHouseConnectionChange} />
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
        onViewChange={(view) => setCurrentView(view as 'search' | 'analytics' | 'integrations' | 'inhouse-integrations')}
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

// Main App wrapper with NotificationProvider
function App() {
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
}

export default App;
