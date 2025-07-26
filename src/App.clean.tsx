import React, { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { SearchResults } from './components/SearchResults';
import { EnhancedAnalytics } from './components/EnhancedAnalytics';
import { Integrations } from './components/Integrations';
import { ServiceConfiguration } from './components/ServiceConfiguration';
import { unifiedSearchService, UnifiedSearchResult } from './services/unifiedSearchService';
import { realAPIService } from './services/realAPIService';

function App() {
  const [searchResults, setSearchResults] = useState<UnifiedSearchResult[]>([]);
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'search' | 'analytics' | 'integrations'>('search');
  const [showServiceConfig, setShowServiceConfig] = useState(false);
  const [userAccess, setUserAccess] = useState<any>(null);
  
  // Get available models based on user's API keys
  const [availableModels, setAvailableModels] = useState(unifiedSearchService.getAvailableAIModels());
  
  // Get connected services
  const [connectedSources, setConnectedSources] = useState<string[]>([]);

  useEffect(() => {
    loadUserAccess();
    loadConnectedSources();
  }, []);

  const loadUserAccess = async () => {
    try {
      const access = await unifiedSearchService.getUserAccess();
      setUserAccess(access);
    } catch (error) {
      console.error('Failed to load user access:', error);
    }
  };

  const loadConnectedSources = () => {
    const services = realAPIService.getEnabledServices();
    setConnectedSources(services.map(s => s.type));
  };

  const handleSearch = async (
    query: string,
    model: string,
    sources: string[],
    searchMode: 'unified' | 'apps' | 'web' | 'ai' = 'unified',
    options?: any
  ) => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);

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

      const results = await unifiedSearchService.search(query, searchOptions);
      setSearchResults(results);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleServiceConfigured = () => {
    setShowServiceConfig(false);
    loadConnectedSources();
    loadUserAccess();
    // Refresh available models in case new API keys were added
    setAvailableModels(unifiedSearchService.getAvailableAIModels());
  };

  const renderMainContent = () => {
    switch (currentView) {
      case 'analytics':
        return (
          <EnhancedAnalytics 
            searchResults={searchResults}
            userAccess={userAccess}
            connectedSources={connectedSources}
          />
        );
      case 'integrations':
        return (
          <Integrations 
            onConfigureServices={() => setShowServiceConfig(true)}
            connectedSources={connectedSources}
            userAccess={userAccess}
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
              connectedSources={connectedSources}
            />
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
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
                  {connectedSources.length === 0 && (
                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-yellow-800 text-sm">
                        <strong>Get Started:</strong> Configure your API credentials in the integrations page to enable search across your services.
                      </p>
                      <button
                        onClick={() => setShowServiceConfig(true)}
                        className="mt-2 inline-flex items-center px-3 py-1 text-sm font-medium text-yellow-900 bg-yellow-100 rounded-md hover:bg-yellow-200"
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Configure Services
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(isLoading || searchResults.length > 0) && (
              <SearchResults
                results={searchResults}
                isLoading={isLoading}
                userAccess={userAccess}
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
        onViewChange={setCurrentView}
        onConfigureServices={() => setShowServiceConfig(true)}
        connectedServicesCount={connectedSources.length}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderMainContent()}
      </main>

      {showServiceConfig && (
        <ServiceConfiguration
          onClose={() => setShowServiceConfig(false)}
          onConfigured={handleServiceConfigured}
        />
      )}
    </div>
  );
}

export default App;
