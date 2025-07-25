import React, { useState } from 'react';
import { FileText, GitBranch, MessageSquare, Calendar, User, ExternalLink, Star, Filter, SortAsc as Sort } from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  source: string;
  sourceType: 'bitbucket' | 'jira' | 'teams' | 'confluence' | 'github' | 'slack';
  author: string;
  date: string;
  url: string;
  relevanceScore: number;
  starred?: boolean;
}

interface SearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
  query: string;
  onStarToggle: (resultId: string) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  isLoading,
  query,
  onStarToggle
}) => {
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'source'>('relevance');
  const [filterBy, setFilterBy] = useState<string>('all');

  const getSourceIcon = (sourceType: SearchResult['sourceType']) => {
    switch (sourceType) {
      case 'bitbucket':
      case 'github':
        return <GitBranch className="w-4 h-4" />;
      case 'jira':
        return <FileText className="w-4 h-4" />;
      case 'teams':
      case 'slack':
        return <MessageSquare className="w-4 h-4" />;
      case 'confluence':
        return <FileText className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getSourceColor = (sourceType: SearchResult['sourceType']) => {
    switch (sourceType) {
      case 'bitbucket':
        return 'bg-blue-100 text-blue-700';
      case 'github':
        return 'bg-gray-100 text-gray-700';
      case 'jira':
        return 'bg-blue-100 text-blue-700';
      case 'teams':
        return 'bg-purple-100 text-purple-700';
      case 'slack':
        return 'bg-green-100 text-green-700';
      case 'confluence':
        return 'bg-indigo-100 text-indigo-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.trim()})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  const sortedResults = [...results].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case 'source':
        return a.source.localeCompare(b.source);
      case 'relevance':
      default:
        return b.relevanceScore - a.relevanceScore;
    }
  });

  const filteredResults = sortedResults.filter(result => 
    filterBy === 'all' || result.sourceType === filterBy
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg animate-pulse">
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            Search Results
          </h2>
          <p className="text-sm text-gray-600">
            {filteredResults.length} results found {query && `for "${query}"`}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Sources</option>
              <option value="bitbucket">Bitbucket</option>
              <option value="jira">Jira</option>
              <option value="teams">Teams</option>
              <option value="confluence">Confluence</option>
              <option value="github">GitHub</option>
              <option value="slack">Slack</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center space-x-2">
            <Sort className="w-4 h-4 text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="relevance">Relevance</option>
              <option value="date">Date</option>
              <option value="source">Source</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {filteredResults.map(result => (
          <div
            key={result.id}
            className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-all group"
          >
            <div className="flex items-start space-x-4">
              {/* Source Icon */}
              <div className={`p-2 rounded-lg ${getSourceColor(result.sourceType)}`}>
                {getSourceIcon(result.sourceType)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                    {highlightText(result.title, query)}
                  </h3>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => onStarToggle(result.id)}
                      className={`p-1 rounded transition-colors ${
                        result.starred 
                          ? 'text-amber-500 hover:text-amber-600' 
                          : 'text-gray-400 hover:text-amber-500'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${result.starred ? 'fill-current' : ''}`} />
                    </button>
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                  <div className="flex items-center space-x-1">
                    <span className="font-medium capitalize">{result.source}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <User className="w-3 h-3" />
                    <span>{result.author}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(result.date).toLocaleDateString()}</span>
                  </div>
                  <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {Math.round(result.relevanceScore * 100)}% match
                  </div>
                </div>

                {/* Content Preview */}
                <p className="text-gray-600 leading-relaxed">
                  {highlightText(result.content, query)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredResults.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">No results found</h3>
          <p className="text-gray-600">
            Try adjusting your search query or connecting more MCP servers.
          </p>
        </div>
      )}
    </div>
  );
};