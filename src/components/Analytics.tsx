import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Search, 
  Clock, 
  Users, 
  Database,
  Activity,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

interface AnalyticsProps {
  isVisible: boolean;
}

export const Analytics: React.FC<AnalyticsProps> = ({ isVisible }) => {
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('searches');

  if (!isVisible) return null;

  const metrics = [
    {
      id: 'searches',
      name: 'Total Searches',
      value: '2,847',
      change: '+12.5%',
      trend: 'up',
      icon: <Search className="w-5 h-5" />
    },
    {
      id: 'users',
      name: 'Active Users',
      value: '156',
      change: '+8.2%',
      trend: 'up',
      icon: <Users className="w-5 h-5" />
    },
    {
      id: 'sources',
      name: 'Connected Sources',
      value: '12',
      change: '+2',
      trend: 'up',
      icon: <Database className="w-5 h-5" />
    },
    {
      id: 'response_time',
      name: 'Avg Response Time',
      value: '1.2s',
      change: '-0.3s',
      trend: 'up',
      icon: <Clock className="w-5 h-5" />
    }
  ];

  const searchData = [
    { date: '2024-01-08', searches: 245, users: 23 },
    { date: '2024-01-09', searches: 312, users: 28 },
    { date: '2024-01-10', searches: 189, users: 19 },
    { date: '2024-01-11', searches: 423, users: 35 },
    { date: '2024-01-12', searches: 356, users: 31 },
    { date: '2024-01-13', searches: 478, users: 42 },
    { date: '2024-01-14', searches: 521, users: 38 }
  ];

  const topQueries = [
    { query: 'API documentation', count: 156, sources: ['confluence', 'github'] },
    { query: 'bug reports', count: 134, sources: ['jira', 'github'] },
    { query: 'team meeting notes', count: 98, sources: ['teams', 'slack'] },
    { query: 'authentication system', count: 87, sources: ['bitbucket', 'confluence'] },
    { query: 'deployment process', count: 76, sources: ['confluence', 'jira'] }
  ];

  const sourceUsage = [
    { name: 'GitHub', searches: 1247, percentage: 32 },
    { name: 'Confluence', searches: 892, percentage: 23 },
    { name: 'Jira', searches: 756, percentage: 19 },
    { name: 'Teams', searches: 534, percentage: 14 },
    { name: 'Slack', searches: 312, percentage: 8 },
    { name: 'Bitbucket', searches: 156, percentage: 4 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Analytics Dashboard</h2>
          <p className="text-gray-600">Monitor search performance and usage patterns</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button className="p-2 text-gray-600 hover:text-gray-800 transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map(metric => (
          <div key={metric.id} className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                {metric.icon}
              </div>
              <span className={`text-sm font-medium ${
                metric.trend === 'up' ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {metric.change}
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{metric.value}</p>
              <p className="text-sm text-gray-600">{metric.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search Trends */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Search Trends</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSelectedMetric('searches')}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  selectedMetric === 'searches' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Searches
              </button>
              <button
                onClick={() => setSelectedMetric('users')}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  selectedMetric === 'users' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Users
              </button>
            </div>
          </div>
          
          {/* Simple Chart Visualization */}
          <div className="space-y-3">
            {searchData.map((day, index) => {
              const value = selectedMetric === 'searches' ? day.searches : day.users;
              const maxValue = selectedMetric === 'searches' ? 600 : 50;
              const percentage = (value / maxValue) * 100;
              
              return (
                <div key={day.date} className="flex items-center space-x-3">
                  <span className="text-xs text-gray-500 w-16">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-12 text-right">
                    {value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Source Usage */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Source Usage</h3>
          <div className="space-y-4">
            {sourceUsage.map(source => (
              <div key={source.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">{source.name}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${source.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">
                    {source.searches}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Queries */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Top Search Queries</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Query</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Count</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Sources</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Trend</th>
              </tr>
            </thead>
            <tbody>
              {topQueries.map((query, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span className="font-medium text-gray-800">{query.query}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{query.count}</td>
                  <td className="py-3 px-4">
                    <div className="flex space-x-1">
                      {query.sources.map(source => (
                        <span 
                          key={source}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-full capitalize"
                        >
                          {source}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-1 text-emerald-600">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm">+{Math.floor(Math.random() * 20)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance Insights</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-emerald-50 rounded-lg">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span className="text-sm text-emerald-700">
                Search response time improved by 23% this week
              </span>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-blue-700">
                GitHub integration shows highest user engagement
              </span>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-amber-50 rounded-lg">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <span className="text-sm text-amber-700">
                Consider adding more Confluence content indexing
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Usage Patterns</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Peak Usage Hours</span>
                <span className="font-medium">9 AM - 11 AM</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Most Active Day</span>
                <span className="font-medium">Wednesday</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Search Success Rate</span>
                <span className="font-medium">94.2%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '94%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};