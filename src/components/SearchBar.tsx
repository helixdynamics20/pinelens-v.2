import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, Clock, Bot, Globe, Smartphone, Layers } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string, model: string, sources: string[], searchMode?: 'unified' | 'apps' | 'web' | 'ai', options?: any) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  availableModels: { 
    id: string; 
    name: string; 
    provider: string; 
    tier?: string; 
    capabilities?: string[];
    summary?: string;
    contextLength?: number;
  }[];
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  selectedModel,
  onModelChange,
  availableModels
}) => {
  const [query, setQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const modelSelectorRef = useRef<HTMLDivElement>(null);

  // Close model selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
        setShowModelSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Search mode and AI options
  const [searchMode, setSearchMode] = useState<'unified' | 'web' | 'ai' | 'apps'>('unified');
  const [aiOptions, setAiOptions] = useState({
    models: selectedModel ? [selectedModel] : [],
    temperature: 0.7
  });
  const [searchHistory] = useState([
    'How to integrate Bitbucket with Jira?',
    'Teams meeting notes from last week',
    'Bug reports with high priority'
  ]);

  const handleSearch = () => {
    if (query.trim()) {
      // Use current search mode selection
      const options = {
        searchMode: searchMode,
        webRestrictions: undefined,
        aiOptions: aiOptions,
        appSources: undefined
      };
      onSearch(query, selectedModel, [], searchMode, options);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <>
      {/* Model Dropdown Portal - Rendered at top level */}
      {showModelSelector && (
        <div className="fixed inset-0 z-[999999]" onClick={() => setShowModelSelector(false)}>
          <div 
            className="absolute bg-white border border-gray-200 rounded-lg shadow-2xl w-64 max-h-64 overflow-y-auto"
            style={{
              top: modelSelectorRef.current ? 
                modelSelectorRef.current.getBoundingClientRect().bottom + window.scrollY + 8 : '50%',
              right: modelSelectorRef.current ? 
                window.innerWidth - modelSelectorRef.current.getBoundingClientRect().right : '50%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 mb-2 px-2">Available Models</div>
              {availableModels.length === 0 ? (
                <div className="px-2 py-2 text-xs text-gray-500">⏳ Loading models...</div>
              ) : (
                availableModels.map(model => (
                  <button
                    key={model.id}
                    onClick={() => {
                      onModelChange(model.id);
                      setShowModelSelector(false);
                    }}
                    className={`w-full text-left px-3 py-3 text-sm rounded hover:bg-gray-50 transition-colors ${
                      selectedModel === model.id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700'
                    }`}
                  >
                    <div className="font-semibold text-base">{model.name}</div>
                    <div className="text-gray-500 text-xs mt-1">{model.provider}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-4xl mx-auto space-y-3">
        {/* Main Search Bar - Compact Design */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-emerald-500/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative bg-white/90 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-4">
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything... e.g. 'How to integrate Bitbucket with Jira?' or 'Explain React hooks'"
                  className="w-full pl-10 pr-4 py-3 text-base bg-transparent border-0 focus:outline-none focus:ring-0 placeholder-gray-500"
                />
              </div>
              
              {/* AI Model Icon Selector */}
              <div className="relative" ref={modelSelectorRef}>
                <button
                  onClick={() => setShowModelSelector(!showModelSelector)}
                  className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors flex items-center space-x-1"
                  title={selectedModel ? `Current model: ${availableModels.find(m => m.id === selectedModel)?.name || selectedModel}` : 'Select AI model'}
                >
                  <Bot className="w-4 h-4" />
                  {selectedModel && (
                    <span className="text-xs font-medium">
                      {availableModels.find(m => m.id === selectedModel)?.name?.split(' ')[0] || 'Model'}
                    </span>
                  )}
                </button>
              </div>

              {/* Advanced Options Toggle - Compact */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`p-2 rounded-lg transition-all ${
                  showAdvanced 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                }`}
              >
                <Filter className="w-4 h-4" />
              </button>

              {/* Search Button - Compact */}
              <button
                onClick={handleSearch}
                disabled={!query.trim()}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
              >
                Search
              </button>
            </div>

            {/* Advanced Options */}
            {showAdvanced && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Gemini AI Options */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Gemini AI Options</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Temperature: {aiOptions.temperature}</label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={aiOptions.temperature}
                          onChange={(e) => setAiOptions(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                          className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search Mode Selector - Below Search Bar with Icons (Lower z-index) */}
        <div className="flex items-center justify-center space-x-2 relative z-10">
          <span className="text-xs text-gray-500 mr-2">Search Mode:</span>
          <div className="flex items-center bg-white/80 backdrop-blur-sm rounded-lg p-1 shadow-sm border border-white/30">
            {[
              { value: 'unified', icon: Layers, label: 'All', color: 'bg-purple-100 text-purple-700' },
              { value: 'web', icon: Globe, label: 'Web', color: 'bg-blue-100 text-blue-700' },
              { value: 'ai', icon: Bot, label: 'AI', color: 'bg-green-100 text-green-700' },
              { value: 'apps', icon: Smartphone, label: 'Apps', color: 'bg-orange-100 text-orange-700' }
            ].map(mode => {
              const IconComponent = mode.icon;
              return (
                <button
                  key={mode.value}
                  onClick={() => setSearchMode(mode.value as 'unified' | 'web' | 'ai' | 'apps')}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    searchMode === mode.value 
                      ? mode.color + ' shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <IconComponent className="w-3 h-3" />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search History - Only show when no query and compact */}
        {query === '' && (
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-3 h-3 text-gray-500" />
              <span className="text-xs font-medium text-gray-600">Recent Searches</span>
            </div>
            <div className="space-y-1">
              {searchHistory.map((item, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(item)}
                  className="block w-full text-left text-xs text-gray-600 hover:text-gray-800 hover:bg-white/50 rounded-md px-2 py-1 transition-colors"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
