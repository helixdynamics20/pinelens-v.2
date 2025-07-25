import React, { useState } from 'react';
import { Search, Settings, Filter, Clock, Star } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string, model: string, sources: string[]) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  availableModels: { id: string; name: string; provider: string }[];
  connectedSources: string[];
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  selectedModel,
  onModelChange,
  availableModels,
  connectedSources
}) => {
  const [query, setQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedSources, setSelectedSources] = useState<string[]>(connectedSources);
  const [searchHistory] = useState([
    'How to integrate Bitbucket with Jira?',
    'Teams meeting notes from last week',
    'Bug reports with high priority'
  ]);

  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query, selectedModel, selectedSources);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const toggleSource = (source: string) => {
    setSelectedSources(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Main Search Bar */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-emerald-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search across all your connected services..."
                className="w-full pl-12 pr-4 py-4 text-lg bg-transparent border-0 focus:outline-none focus:ring-0 placeholder-gray-500"
              />
            </div>
            
            {/* AI Model Selector */}
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => onModelChange(e.target.value)}
                className="appearance-none bg-gray-50 hover:bg-gray-100 rounded-xl px-4 py-3 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer"
              >
                {availableModels.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.provider})
                  </option>
                ))}
              </select>
            </div>

            {/* Advanced Options Toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`p-3 rounded-xl transition-all ${
                showAdvanced 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
              }`}
            >
              <Filter className="w-5 h-5" />
            </button>

            {/* Search Button */}
            <button
              onClick={handleSearch}
              disabled={!query.trim()}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 text-white px-8 py-3 rounded-xl font-medium transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
            >
              Search
            </button>
          </div>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Source Selection */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Search Sources</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {connectedSources.map(source => (
                      <label key={source} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedSources.includes(source)}
                          onChange={() => toggleSource(source)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600 capitalize">{source}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Quick Filters */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Filters</h4>
                  <div className="flex flex-wrap gap-2">
                    {['Recent', 'Starred', 'High Priority', 'My Items'].map(filter => (
                      <button
                        key={filter}
                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search History */}
      {query === '' && (
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">Recent Searches</span>
          </div>
          <div className="space-y-2">
            {searchHistory.map((item, index) => (
              <button
                key={index}
                onClick={() => setQuery(item)}
                className="block w-full text-left text-sm text-gray-600 hover:text-gray-800 hover:bg-white/50 rounded-lg px-3 py-2 transition-colors"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};