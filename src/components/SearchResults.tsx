import React, { useState } from 'react';
import { 
  FileText, 
  GitBranch, 
  MessageSquare, 
  Calendar, 
  User, 
  ExternalLink, 
  Star, 
  Filter, 
  SortAsc as Sort,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Tag,
  Lightbulb,
  Clock,
  Copy,
  Check
} from 'lucide-react';
import { UnifiedSearchResult } from '../services/unifiedSearchService';

interface PullRequestDetail {
  id: string;
  title: string;
  status: string;
  url: string;
  author: string;
  created: string;
}

interface SearchResultsProps {
  results: UnifiedSearchResult[];
  isLoading: boolean;
  query: string;
  onStarToggle: (resultId: string) => void;
  processingTime?: number;
  totalResults?: number;
  suggestedQueries?: string[];
  insights?: string[];
  summary?: string;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  isLoading,
  query,
  onStarToggle,
  processingTime = 0,
  totalResults = 0,
  suggestedQueries = [],
  insights = [],
  summary = ''
}) => {
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'source'>('relevance');
  const [filterBy, setFilterBy] = useState<string>('all');
  const [showInsights, setShowInsights] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = async (text: string, resultId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(resultId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const getPriorityColor = (priority?: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSentimentIcon = (sentiment?: 'positive' | 'neutral' | 'negative') => {
    switch (sentiment) {
      case 'positive':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'negative':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return <div className="w-3 h-3 rounded-full bg-gray-300" />;
    }
  };

  const getSourceIcon = (sourceType: UnifiedSearchResult['sourceType']) => {
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

  const getSourceColor = (sourceType: UnifiedSearchResult['sourceType']) => {
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
      <div className="space-y-6">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg animate-pulse border border-gray-100">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl"></div>
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-3/4"></div>
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/2"></div>
                </div>
                <div className="flex space-x-3">
                  <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-20"></div>
                  <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-24"></div>
                  <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-16"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-5/6"></div>
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-4/5"></div>
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            Search Results
          </h2>
          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
            <span>{filteredResults.length} results found {query && `for "${query}"`}</span>
            {processingTime > 0 && (
              <span className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{processingTime}ms</span>
              </span>
            )}
            {totalResults > filteredResults.length && (
              <span className="text-blue-600">
                Showing {filteredResults.length} of {totalResults} total results
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Insights Toggle */}
          {(insights.length > 0 || summary) && (
            <button
              onClick={() => setShowInsights(!showInsights)}
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                showInsights 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Lightbulb className="w-4 h-4" />
              <span>Insights</span>
            </button>
          )}

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
              onChange={(e) => setSortBy(e.target.value as 'relevance' | 'date' | 'source')}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="relevance">Relevance</option>
              <option value="date">Date</option>
              <option value="source">Source</option>
            </select>
          </div>
        </div>
      </div>

      {/* AI Insights Panel */}
      {showInsights && (insights.length > 0 || summary) && (
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center space-x-2 mb-4">
            <Lightbulb className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-800">AI Insights</h3>
          </div>
          
          {summary && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-800 mb-2">Summary</h4>
              <p className="text-gray-700 leading-relaxed">{summary}</p>
            </div>
          )}
          
          {insights.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Key Insights</h4>
              <ul className="space-y-2">
                {insights.map((insight, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Suggested Queries */}
      {suggestedQueries.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">You might also want to search for:</h4>
          <div className="flex flex-wrap gap-2">
            {suggestedQueries.map((suggestion, index) => (
              <button
                key={index}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                onClick={() => {
                  // This would trigger a new search with the suggested query
                  console.log('Search for:', suggestion);
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results List */}
      <div className="space-y-4">
        {filteredResults.map(result => (
          <div
            key={result.id}
            className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-200 hover:border-blue-300"
          >
            <div className="flex items-start space-x-4">
              {/* Source Icon */}
              <div className={`p-3 rounded-xl shadow-sm ${getSourceColor(result.sourceType)}`}>
                {getSourceIcon(result.sourceType)}
              </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3">
                    {result.sourceType === 'ai' ? (
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-xl shadow-lg">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600">
                            🤖 AI Assistant Response
                          </h3>
                          <span className="inline-flex items-center px-3 py-1 text-xs bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 rounded-full font-medium border border-blue-200">
                            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                            {result.metadata?.model || 'Gemini AI'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1">
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group block hover:no-underline"
                        >
                          <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-all duration-300 mb-1 leading-tight">
                            {highlightText(result.title, query)}
                          </h3>
                          <div className="text-sm text-blue-600 group-hover:text-blue-700 transition-colors font-medium">
                            {result.url}
                          </div>
                        </a>
                      </div>
                    )}
                    <div className="flex items-center space-x-3 ml-4 flex-shrink-0">
                      {/* Priority Indicator */}
                      {result.metadata?.priority && (
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full shadow-sm ${getPriorityColor(result.metadata.priority)}`}>
                          {result.metadata.priority.toUpperCase()}
                        </span>
                      )}
                      
                      {/* Sentiment Indicator */}
                      {result.metadata?.sentiment && (
                        <div className="flex items-center space-x-1">
                          {getSentimentIcon(result.metadata.sentiment)}
                          <span className="text-xs text-gray-600 capitalize">{result.metadata.sentiment}</span>
                        </div>
                      )}
                      
                      <button
                        onClick={() => onStarToggle(result.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          result.starred 
                            ? 'text-amber-500 hover:text-amber-600 bg-amber-50 hover:bg-amber-100' 
                            : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'
                        }`}
                        title={result.starred ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Star className={`w-5 h-5 ${result.starred ? 'fill-current' : ''}`} />
                      </button>
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Open in new tab"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    </div>
                  </div>

                  {/* Enhanced Metadata Section */}
                  <div className="flex items-center flex-wrap gap-4 text-sm mb-4">
                    <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg">
                      <div className={`w-3 h-3 rounded-full ${getSourceColor(result.sourceType).replace('text-', 'bg-').replace('bg-gray-100', 'bg-gray-500')}`}></div>
                      <span className="font-semibold text-gray-700 capitalize">{result.source}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <User className="w-4 h-4" />
                      <span className="font-medium">{result.author}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(result.date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium text-gray-600">Match:</span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.round(result.relevanceScore * 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-bold text-blue-600">
                        {Math.round(result.relevanceScore * 100)}%
                      </span>
                    </div>
                    {result.metadata?.type && (
                      <span className="px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
                        {result.metadata.type}
                      </span>
                    )}
                  </div>

                  {/* Enhanced GitHub-specific metadata */}
                  {result.sourceType === 'github' && result.metadata && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                      <div className="flex flex-wrap gap-3 text-sm">
                        {result.metadata.repository && (
                          <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg shadow-sm border">
                            <GitBranch className="w-4 h-4 text-gray-600" />
                            <span className="font-semibold text-gray-800">{result.metadata.repository}</span>
                          </div>
                        )}
                        {result.metadata.language && (
                          <div className="px-3 py-2 bg-blue-500 text-white rounded-lg font-medium shadow-sm">
                            {result.metadata.language}
                          </div>
                        )}
                        {result.metadata.stars !== undefined && (
                          <div className="flex items-center space-x-2 bg-yellow-400 text-yellow-900 px-3 py-2 rounded-lg font-medium shadow-sm">
                            <Star className="w-4 h-4 fill-current" />
                            <span>{result.metadata.stars.toLocaleString()}</span>
                          </div>
                        )}
                        {result.metadata.state && (
                          <div className={`px-3 py-2 rounded-lg font-semibold shadow-sm ${
                            result.metadata.state === 'open' 
                              ? 'bg-green-500 text-white' 
                              : 'bg-gray-500 text-white'
                          }`}>
                            {result.metadata.state.toUpperCase()}
                          </div>
                        )}
                        {result.metadata.path && (
                          <div className="bg-indigo-500 text-indigo-100 px-3 py-2 rounded-lg font-mono text-xs shadow-sm max-w-md truncate">
                            {result.metadata.path}
                          </div>
                        )}
                      </div>
                      {result.metadata.labels && result.metadata.labels.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {result.metadata.labels.slice(0, 5).map((label: string, idx: number) => (
                            <span key={idx} className="bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-sm">
                              #{label}
                            </span>
                          ))}
                          {result.metadata.labels.length > 5 && (
                            <span className="text-gray-600 px-3 py-1 bg-gray-200 rounded-full text-xs">
                              +{result.metadata.labels.length - 5} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Enhanced JIRA-specific metadata */}
                  {result.sourceType === 'jira' && result.metadata && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                      {/* Primary Information Row */}
                      <div className="flex flex-wrap gap-3 text-sm mb-4">
                        {result.metadata.status && (
                          <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg shadow-sm font-semibold ${
                            result.metadata.status.toLowerCase().includes('done') || result.metadata.status.toLowerCase().includes('closed') || result.metadata.status.toLowerCase().includes('resolved')
                              ? 'bg-green-500 text-white'
                              : result.metadata.status.toLowerCase().includes('progress') || result.metadata.status.toLowerCase().includes('review')
                              ? 'bg-yellow-500 text-white'
                              : result.metadata.status.toLowerCase().includes('to do') || result.metadata.status.toLowerCase().includes('open') || result.metadata.status.toLowerCase().includes('created')
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-500 text-white'
                          }`}>
                            <div className="w-2 h-2 rounded-full bg-white opacity-80"></div>
                            <span>{result.metadata.status}</span>
                          </div>
                        )}
                        
                        {result.metadata.priority && (
                          <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg shadow-sm font-semibold ${
                            result.metadata.priority.toLowerCase().includes('highest') || result.metadata.priority.toLowerCase().includes('critical')
                              ? 'bg-red-600 text-white'
                              : result.metadata.priority.toLowerCase().includes('high')
                              ? 'bg-red-500 text-white'
                              : result.metadata.priority.toLowerCase().includes('medium')
                              ? 'bg-orange-500 text-white'
                              : result.metadata.priority.toLowerCase().includes('low')
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-500 text-white'
                          }`}>
                            <AlertCircle className="w-4 h-4" />
                            <span>{result.metadata.priority}</span>
                          </div>
                        )}

                        {result.metadata.issueType && (
                          <div className="flex items-center space-x-2 bg-purple-500 text-white px-3 py-2 rounded-lg font-semibold shadow-sm">
                            <FileText className="w-4 h-4" />
                            <span>{result.metadata.issueType}</span>
                          </div>
                        )}

                        {result.metadata.projectKey && (
                          <div className="flex items-center space-x-2 bg-indigo-500 text-white px-3 py-2 rounded-lg font-semibold shadow-sm">
                            <Tag className="w-4 h-4" />
                            <span>{result.metadata.projectKey}</span>
                          </div>
                        )}
                      </div>

                      {/* People & Timing Row */}
                      <div className="flex flex-wrap gap-3 text-sm mb-4">
                        {result.metadata.assignee && (
                          <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-blue-200">
                            <User className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-gray-800">Assigned to:</span>
                            <span className="font-semibold text-blue-600">{result.metadata.assignee}</span>
                          </div>
                        )}

                        {result.metadata.reporter && (
                          <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-blue-200">
                            <User className="w-4 h-4 text-gray-600" />
                            <span className="font-medium text-gray-600">Reporter:</span>
                            <span className="font-semibold text-gray-800">{result.metadata.reporter}</span>
                          </div>
                        )}

                        {result.metadata.created && (
                          <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-blue-200">
                            <Calendar className="w-4 h-4 text-green-600" />
                            <span className="font-medium text-gray-600">Created:</span>
                            <span className="font-semibold text-gray-800">
                              {new Date(result.metadata.created).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        )}

                        {result.metadata.updated && (
                          <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-blue-200">
                            <Clock className="w-4 h-4 text-orange-600" />
                            <span className="font-medium text-gray-600">Updated:</span>
                            <span className="font-semibold text-gray-800">
                              {new Date(result.metadata.updated).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Development & Pull Requests */}
                      {result.metadata.pullRequests && (
                        <div className="mb-4 p-3 bg-white rounded-lg shadow-sm border border-green-200">
                          <div className="flex items-center space-x-2 mb-2">
                            <GitBranch className="w-4 h-4 text-green-600" />
                            <span className="font-semibold text-gray-800">Pull Requests</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              Total: {result.metadata.pullRequests.total}
                            </span>
                            {result.metadata.pullRequests.open > 0 && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                Open: {result.metadata.pullRequests.open}
                              </span>
                            )}
                            {result.metadata.pullRequests.merged > 0 && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                Merged: {result.metadata.pullRequests.merged}
                              </span>
                            )}
                            {result.metadata.pullRequests.declined > 0 && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                                Declined: {result.metadata.pullRequests.declined}
                              </span>
                            )}
                          </div>
                          {result.metadata.pullRequests.details && result.metadata.pullRequests.details.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {result.metadata.pullRequests.details.slice(0, 3).map((pr: PullRequestDetail, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                                  <div className="flex items-center space-x-2">
                                    <span className={`w-2 h-2 rounded-full ${
                                      pr.status === 'OPEN' ? 'bg-green-500' : 
                                      pr.status === 'MERGED' ? 'bg-purple-500' : 'bg-red-500'
                                    }`}></span>
                                    <span className="font-medium truncate max-w-xs">{pr.title}</span>
                                  </div>
                                  <a 
                                    href={pr.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Additional Information */}
                      <div className="flex flex-wrap gap-2">
                        {result.metadata.storyPoints && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                            {result.metadata.storyPoints} SP
                          </span>
                        )}
                        
                        {result.metadata.resolution && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            {result.metadata.resolution}
                          </span>
                        )}

                        {result.metadata.labels && result.metadata.labels.length > 0 && (
                          <>
                            {result.metadata.labels.slice(0, 4).map((label: string, idx: number) => (
                              <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                                {label}
                              </span>
                            ))}
                            {result.metadata.labels.length > 4 && (
                              <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded-full text-xs">
                                +{result.metadata.labels.length - 4} more
                              </span>
                            )}
                          </>
                        )}

                        {result.metadata.components && result.metadata.components.length > 0 && (
                          <>
                            {result.metadata.components.slice(0, 3).map((component: string, idx: number) => (
                              <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                {component}
                              </span>
                            ))}
                            {result.metadata.components.length > 3 && (
                              <span className="px-2 py-1 bg-blue-200 text-blue-600 rounded-full text-xs">
                                +{result.metadata.components.length - 3} more
                              </span>
                            )}
                          </>
                        )}

                        {result.metadata.customFields?.watchCount && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                            👁️ {result.metadata.customFields.watchCount} watchers
                          </span>
                        )}

                        {result.metadata.customFields?.commentCount && (
                          <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded-full text-xs font-medium">
                            💬 {result.metadata.customFields.commentCount} comments
                          </span>
                        )}
                      </div>

                      {/* Time Tracking */}
                      {result.metadata.timeTracking && (
                        <div className="mt-3 p-2 bg-indigo-50 rounded-lg border border-indigo-200">
                          <div className="flex items-center space-x-2 mb-1">
                            <Clock className="w-4 h-4 text-indigo-600" />
                            <span className="font-semibold text-indigo-800 text-sm">Time Tracking</span>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            {result.metadata.timeTracking.originalEstimate && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                Est: {result.metadata.timeTracking.originalEstimate}
                              </span>
                            )}
                            {result.metadata.timeTracking.timeSpent && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                                Spent: {result.metadata.timeTracking.timeSpent}
                              </span>
                            )}
                            {result.metadata.timeTracking.remainingEstimate && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">
                                Remaining: {result.metadata.timeTracking.remainingEstimate}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Enhanced Tags */}
                  {result.tags && result.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {result.tags.slice(0, 8).map((tag: string, index: number) => (
                        <span
                          key={index}
                          className="inline-flex items-center space-x-1 px-3 py-1 text-sm bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-full hover:from-blue-100 hover:to-blue-200 hover:text-blue-800 transition-all duration-200 cursor-pointer shadow-sm"
                        >
                          <Tag className="w-3 h-3" />
                          <span className="font-medium">{tag}</span>
                        </span>
                      ))}
                      {result.tags.length > 8 && (
                        <span className="text-sm text-gray-500 px-3 py-1 bg-gray-100 rounded-full">
                          +{result.tags.length - 8} more tags
                        </span>
                      )}
                    </div>
                  )}

                  {/* Enhanced AI Summary */}
                  {result.metadata?.summary && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-xl border-l-4 border-blue-400 shadow-sm">
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <h5 className="text-sm font-bold text-blue-800">AI Summary</h5>
                      </div>
                      <p className="text-sm text-blue-800 leading-relaxed font-medium">{result.metadata.summary}</p>
                    </div>
                  )}

                  {/* Enhanced Key Points */}
                  {result.keyPoints && result.keyPoints.length > 0 && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                      <h5 className="text-sm font-bold text-green-800 mb-3 flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4" />
                        <span>Key Highlights</span>
                      </h5>
                      <ul className="space-y-2">
                        {result.keyPoints.slice(0, 4).map((point: string, index: number) => (
                          <li key={index} className="text-sm text-green-800 flex items-start space-x-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                            <span className="leading-relaxed font-medium">{highlightText(point, query)}</span>
                          </li>
                        ))}
                        {result.keyPoints.length > 4 && (
                          <li className="text-sm text-green-700 italic pl-5">
                            ... and {result.keyPoints.length - 4} more key points
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Content Preview */}
                  {result.sourceType === 'ai' ? (
                    // Enhanced AI Response Formatting
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="p-6">
                        <div className="prose prose-gray max-w-none">
                          {(() => {
                            const content = result.content;
                            const parts = [];
                            let currentIndex = 0;
                            
                            // Match code blocks (```language or ```)
                            const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
                            let match;
                            
                            while ((match = codeBlockRegex.exec(content)) !== null) {
                              // Add text before code block
                              if (match.index > currentIndex) {
                                const textBefore = content.substring(currentIndex, match.index);
                                parts.push({ type: 'text', content: textBefore });
                              }
                              
                              // Add code block
                              const language = match[1] || 'text';
                              const code = match[2].trim();
                              parts.push({ type: 'code', content: code, language });
                              
                              currentIndex = match.index + match[0].length;
                            }
                            
                            // Add remaining text
                            if (currentIndex < content.length) {
                              const remainingText = content.substring(currentIndex);
                              parts.push({ type: 'text', content: remainingText });
                            }
                            
                            // If no code blocks found, treat entire content as text
                            if (parts.length === 0) {
                              parts.push({ type: 'text', content: result.content });
                            }
                            
                            return parts.map((part, partIndex) => {
                              if (part.type === 'code') {
                                const codeId = `${result.id}-code-${partIndex}`;
                                return (
                                  <div key={partIndex} className="my-6 first:mt-0 last:mb-0">
                                    <div className="bg-gray-900 rounded-lg overflow-hidden border">
                                      {/* Code Header */}
                                      <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700">
                                        <div className="flex items-center space-x-3">
                                          <div className="flex space-x-1">
                                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                          </div>
                                          <span className="text-gray-300 text-sm font-mono">
                                            {part.language || 'code'}
                                          </span>
                                        </div>
                                        <button
                                          onClick={() => copyToClipboard(part.content, codeId)}
                                          className="flex items-center space-x-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-sm transition-colors"
                                          title="Copy code to clipboard"
                                        >
                                          {copiedId === codeId ? (
                                            <>
                                              <Check className="w-3 h-3" />
                                              <span>Copied!</span>
                                            </>
                                          ) : (
                                            <>
                                              <Copy className="w-3 h-3" />
                                              <span>Copy</span>
                                            </>
                                          )}
                                        </button>
                                      </div>
                                      {/* Code Content */}
                                      <pre className="p-4 overflow-x-auto text-sm leading-relaxed">
                                        <code className="text-gray-100 font-mono">
                                          {part.content}
                                        </code>
                                      </pre>
                                    </div>
                                  </div>
                                );
                              } else {
                                // Enhanced text formatting
                                const lines = part.content.split('\n');
                                return lines.map((line, index) => {
                                  const key = `${partIndex}-${index}`;
                                  
                                  // Empty line
                                  if (line.trim() === '') {
                                    return <div key={key} className="h-4"></div>;
                                  }
                                  
                                  // Headers
                                  if (line.startsWith('# ')) {
                                    return (
                                      <h1 key={key} className="text-2xl font-bold text-gray-900 mt-8 mb-4 first:mt-0">
                                        {line.substring(2)}
                                      </h1>
                                    );
                                  }
                                  if (line.startsWith('## ')) {
                                    return (
                                      <h2 key={key} className="text-xl font-semibold text-gray-900 mt-6 mb-3 first:mt-0">
                                        {line.substring(3)}
                                      </h2>
                                    );
                                  }
                                  if (line.startsWith('### ')) {
                                    return (
                                      <h3 key={key} className="text-lg font-semibold text-gray-900 mt-5 mb-2 first:mt-0">
                                        {line.substring(4)}
                                      </h3>
                                    );
                                  }
                                  
                                  // Lists
                                  if (line.match(/^[\s]*[-*+]\s/)) {
                                    const content = line.replace(/^[\s]*[-*+]\s/, '');
                                    const formattedContent = content
                                      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
                                      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
                                      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');
                                    
                                    return (
                                      <div key={key} className="flex items-start space-x-3 mb-2">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2.5 flex-shrink-0"></div>
                                        <div 
                                          className="text-gray-700 leading-relaxed"
                                          dangerouslySetInnerHTML={{ __html: formattedContent }}
                                        />
                                      </div>
                                    );
                                  }
                                  
                                  // Numbered lists
                                  if (line.match(/^[\s]*\d+\.\s/)) {
                                    const match = line.match(/^[\s]*(\d+)\.\s(.*)$/);
                                    if (match) {
                                      const [, number, content] = match;
                                      const formattedContent = content
                                        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
                                        .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
                                        .replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');
                                      
                                      return (
                                        <div key={key} className="flex items-start space-x-3 mb-2">
                                          <div className="w-6 h-6 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                                            {number}
                                          </div>
                                          <div 
                                            className="text-gray-700 leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: formattedContent }}
                                          />
                                        </div>
                                      );
                                    }
                                  }
                                  
                                  // Regular paragraphs
                                  const formattedLine = line
                                    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
                                    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
                                    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');
                                  
                                  return (
                                    <p 
                                      key={key}
                                      className="text-gray-700 leading-relaxed mb-4 last:mb-0"
                                      dangerouslySetInnerHTML={{ __html: formattedLine }}
                                    />
                                  );
                                });
                              }
                            });
                          })()}
                        </div>
                      </div>
                      
                      {/* AI Model Info Footer */}
                      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Generated by {result.metadata?.model || 'AI Assistant'}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-500">
                            {new Date(result.date).toLocaleTimeString()}
                          </span>
                          <button
                            onClick={() => copyToClipboard(result.content, result.id)}
                            className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors"
                            title="Copy full response"
                          >
                            {copiedId === result.id ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy All</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Regular content display for non-AI results
                    <div>
                      <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <p className="text-gray-700 leading-relaxed">
                          {highlightText(result.content, query)}
                        </p>
                      </div>
                      
                      {/* Quick Actions Bar - Only show for non-web results */}
                      {result.sourceType !== 'web' && (
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center space-x-4">
                              <span className="text-sm font-medium text-blue-800">Quick Actions:</span>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => {
                                    if (result.sourceType === 'github' && result.metadata?.repository) {
                                      copyToClipboard(`git clone https://github.com/${result.metadata.repository}.git`, `${result.id}-clone`);
                                    } else {
                                      copyToClipboard(result.url, `${result.id}-clone`);
                                    }
                                  }}
                                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                  <GitBranch className="w-4 h-4" />
                                  <span>{copiedId === `${result.id}-clone` ? 'Cloned!' : 'Clone'}</span>
                                </button>
                                
                                <button
                                  onClick={() => copyToClipboard(result.url, `${result.id}-url`)}
                                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                  {copiedId === `${result.id}-url` ? (
                                    <>
                                      <Check className="w-4 h-4" />
                                      <span>Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-4 h-4" />
                                      <span>Copy Link</span>
                                    </>
                                  )}
                                </button>

                                <a
                                  href={result.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  <span>Open</span>
                                </a>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2 text-xs text-gray-600">
                              <Clock className="w-3 h-3" />
                              <span>
                                Updated {new Date(result.date).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
            </div>
          </div>
        ))}
      </div>

      {filteredResults.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">No results found</h3>
          <p className="text-gray-600 max-w-md mx-auto leading-relaxed mb-6">
            We couldn't find any results matching your search. Try using different keywords or connecting more MCP servers to expand your search scope.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button 
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
              onClick={() => {
                // This would clear the search query
                console.log('Clear search');
              }}
            >
              Try New Search
            </button>
            <button 
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              onClick={() => {
                // This would open MCP connections settings
                console.log('Connect MCP servers');
              }}
            >
              Connect More Sources
            </button>
          </div>
        </div>
      )}
    </div>
  );
};