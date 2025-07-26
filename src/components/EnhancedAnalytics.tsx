/**
 * Enhanced Search Analytics Component
 * Shows detailed analytics and insights about search patterns
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Search,
  Users,
  Database,
  Target,
  Star,
  Activity,
  Calendar,
  Filter,
  Download
} from 'lucide-react';
// import { apiService } from '../services/apiService';

interface AnalyticsData {
  totalSearches: number;
  averageResponseTime: number;
  mostSearchedTerms: Array<{ term: string; count: number }>;
  topSources: Array<{ source: string; count: number; color: string }>;
  userSatisfactionScore: number;
  searchTrends: Array<{ date: string; searches: number }>;
  popularResults: Array<{
    id: string;
    title: string;
    source: string;
    clicks: number;
    relevanceScore: number;
  }>;
  sourcesBreakdown: Array<{
    source: string;
    totalResults: number;
    avgRelevance: number;
    responseTime: number;
    status: 'healthy' | 'warning' | 'error';
  }>;
}

interface EnhancedAnalyticsProps {
  isVisible: boolean;
}

export const EnhancedAnalytics: React.FC<EnhancedAnalyticsProps> = ({ isVisible }) => {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [isLoading, setIsLoading] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalSearches: 1247,
    averageResponseTime: 340,
    mostSearchedTerms: [
      { term: 'API documentation', count: 156 },
      { term: 'authentication', count: 134 },
      { term: 'bug report', count: 98 },
      { term: 'deployment', count: 87 },
      { term: 'testing', count: 76 }
    ],
    topSources: [
      { source: 'Jira', count: 423, color: 'bg-blue-500' },
      { source: 'Confluence', count: 378, color: 'bg-indigo-500' },
      { source: 'GitHub', count: 245, color: 'bg-gray-700' },
      { source: 'Slack', count: 134, color: 'bg-green-500' },
      { source: 'Teams', count: 67, color: 'bg-purple-500' }
    ],
    userSatisfactionScore: 4.2,
    searchTrends: [
      { date: '2024-01-01', searches: 45 },
      { date: '2024-01-02', searches: 52 },
      { date: '2024-01-03', searches: 38 },
      { date: '2024-01-04', searches: 61 },
      { date: '2024-01-05', searches: 74 },
      { date: '2024-01-06', searches: 56 },
      { date: '2024-01-07', searches: 43 }
    ],
    popularResults: [
      {
        id: '1',
        title: 'API Authentication Guide',
        source: 'Confluence',
        clicks: 234,
        relevanceScore: 0.96
      },
      {
        id: '2',
        title: 'Bug Report Template',
        source: 'Jira',
        clicks: 198,
        relevanceScore: 0.89
      },
      {
        id: '3',
        title: 'Deployment Checklist',
        source: 'GitHub',
        clicks: 176,
        relevanceScore: 0.92
      }
    ],
    sourcesBreakdown: [
      {
        source: 'Jira',
        totalResults: 2847,
        avgRelevance: 0.87,
        responseTime: 245,
        status: 'healthy'
      },
      {
        source: 'Confluence',
        totalResults: 1634,
        avgRelevance: 0.91,
        responseTime: 312,
        status: 'healthy'
      },
      {
        source: 'GitHub',
        totalResults: 934,
        avgRelevance: 0.83,
        responseTime: 189,
        status: 'healthy'
      },
      {
        source: 'Slack',
        totalResults: 456,
        avgRelevance: 0.76,
        responseTime: 423,
        status: 'warning'
      },
      {
        source: 'Teams',
        totalResults: 234,
        avgRelevance: 0.72,
        responseTime: 567,
        status: 'error'
      }
    ]
  });

  useEffect(() => {
    if (isVisible) {
      loadAnalytics();
    }
  }, [isVisible, timeRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // In production, this would call the real API
      // const data = await apiService.getAnalytics(timeRange);
      // setAnalytics(data);
      
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const exportAnalytics = () => {
    const data = {
      timeRange,
      exportDate: new Date().toISOString(),
      analytics
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `search-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isVisible) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Search Analytics</h2>
          <p className="text-gray-600">Insights and performance metrics for your unified search</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Time Range Selector */}
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="day">Last 24 Hours</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="year">Last Year</option>
            </select>
          </div>
          
          {/* Export Button */}
          <button
            onClick={exportAnalytics}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Searches</p>
              <p className="text-2xl font-bold text-gray-800">{analytics.totalSearches.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Search className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold text-gray-800">{analytics.averageResponseTime}ms</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">User Satisfaction</p>
              <p className="text-2xl font-bold text-gray-800">{analytics.userSatisfactionScore}/5.0</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Star className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Sources</p>
              <p className="text-2xl font-bold text-gray-800">{analytics.topSources.length}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Database className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search Trends */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Search Trends</h3>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="h-64 flex items-end justify-between space-x-2">
            {analytics.searchTrends.map((trend, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-blue-500 rounded-t"
                  style={{
                    height: `${(trend.searches / Math.max(...analytics.searchTrends.map(t => t.searches))) * 200}px`
                  }}
                ></div>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(trend.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Sources */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Top Sources</h3>
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <div className="space-y-4">
            {analytics.topSources.map((source, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${source.color}`}></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{source.source}</span>
                    <span className="text-sm text-gray-500">{source.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className={`h-2 rounded-full ${source.color}`}
                      style={{
                        width: `${(source.count / Math.max(...analytics.topSources.map(s => s.count))) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Searched Terms */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Most Searched Terms</h3>
          <div className="space-y-3">
            {analytics.mostSearchedTerms.map((term, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <span className="text-sm text-gray-700">{term.term}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">{term.count}</span>
                  <div className="w-12 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${(term.count / Math.max(...analytics.mostSearchedTerms.map(t => t.count))) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sources Health */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Sources Health</h3>
          <div className="space-y-3">
            {analytics.sourcesBreakdown.map((source, index) => (
              <div key={index} className="p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-800">{source.source}</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(source.status)}`}>
                    {source.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Results</p>
                    <p className="font-medium">{source.totalResults.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Relevance</p>
                    <p className="font-medium">{Math.round(source.avgRelevance * 100)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Response</p>
                    <p className="font-medium">{source.responseTime}ms</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Popular Results */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Most Popular Results</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-sm font-medium text-gray-600 py-3">Title</th>
                <th className="text-left text-sm font-medium text-gray-600 py-3">Source</th>
                <th className="text-left text-sm font-medium text-gray-600 py-3">Clicks</th>
                <th className="text-left text-sm font-medium text-gray-600 py-3">Relevance</th>
                <th className="text-left text-sm font-medium text-gray-600 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {analytics.popularResults.map((result, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-3 text-sm text-gray-800">{result.title}</td>
                  <td className="py-3 text-sm text-gray-600">{result.source}</td>
                  <td className="py-3 text-sm text-gray-800">{result.clicks}</td>
                  <td className="py-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${result.relevanceScore * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">
                        {Math.round(result.relevanceScore * 100)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3">
                    <button className="text-blue-600 hover:text-blue-800 text-sm">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
