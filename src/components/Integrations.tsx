import React, { useState } from 'react';
import { 
  GitBranch, 
  MessageSquare, 
  FileText, 
  Database, 
  Plus,
  Settings,
  CheckCircle,
  AlertCircle,
  XCircle,
  ExternalLink,
  Zap,
  Shield,
  Clock,
  Users,
  Search,
  Globe,
  Key,
  Trash2,
  Edit3
} from 'lucide-react';

interface IntegrationsProps {
  isVisible: boolean;
  onAddServer: () => void;
}

interface Integration {
  id: string;
  name: string;
  type: string;
  category: 'development' | 'communication' | 'documentation' | 'project-management';
  status: 'available' | 'connected' | 'coming-soon';
  description: string;
  features: string[];
  icon: React.ReactNode;
  color: string;
  connectedCount?: number;
  lastSync?: string;
}

export const Integrations: React.FC<IntegrationsProps> = ({ isVisible, onAddServer }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isVisible) return null;

  const integrations: Integration[] = [
    {
      id: 'github',
      name: 'GitHub',
      type: 'Git Repository',
      category: 'development',
      status: 'connected',
      description: 'Search through repositories, issues, pull requests, and code',
      features: ['Repository search', 'Issue tracking', 'Code search', 'Pull requests'],
      icon: <GitBranch className="w-6 h-6" />,
      color: 'bg-gray-100 text-gray-700',
      connectedCount: 2,
      lastSync: '2 minutes ago'
    },
    {
      id: 'bitbucket',
      name: 'Bitbucket',
      type: 'Git Repository',
      category: 'development',
      status: 'connected',
      description: 'Access Bitbucket repositories and track development progress',
      features: ['Repository search', 'Branch management', 'Code review', 'Pipeline status'],
      icon: <GitBranch className="w-6 h-6" />,
      color: 'bg-blue-100 text-blue-700',
      connectedCount: 1,
      lastSync: '5 minutes ago'
    },
    {
      id: 'jira',
      name: 'Jira',
      type: 'Project Management',
      category: 'project-management',
      status: 'connected',
      description: 'Search issues, epics, and project data from Jira',
      features: ['Issue search', 'Project tracking', 'Sprint management', 'Custom fields'],
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-blue-100 text-blue-700',
      connectedCount: 1,
      lastSync: '1 hour ago'
    },
    {
      id: 'confluence',
      name: 'Confluence',
      type: 'Documentation',
      category: 'documentation',
      status: 'available',
      description: 'Search through wiki pages, documentation, and knowledge base',
      features: ['Page search', 'Space management', 'Content versioning', 'Attachments'],
      icon: <Database className="w-6 h-6" />,
      color: 'bg-indigo-100 text-indigo-700'
    },
    {
      id: 'teams',
      name: 'Microsoft Teams',
      type: 'Communication',
      category: 'communication',
      status: 'available',
      description: 'Search messages, files, and meeting notes from Teams',
      features: ['Message search', 'File access', 'Meeting notes', 'Channel history'],
      icon: <MessageSquare className="w-6 h-6" />,
      color: 'bg-purple-100 text-purple-700'
    },
    {
      id: 'slack',
      name: 'Slack',
      type: 'Communication',
      category: 'communication',
      status: 'connected',
      description: 'Search conversations, files, and shared content from Slack',
      features: ['Message search', 'File sharing', 'Thread tracking', 'Channel management'],
      icon: <MessageSquare className="w-6 h-6" />,
      color: 'bg-green-100 text-green-700',
      connectedCount: 1,
      lastSync: '30 minutes ago'
    },
    {
      id: 'notion',
      name: 'Notion',
      type: 'Documentation',
      category: 'documentation',
      status: 'coming-soon',
      description: 'Search through Notion pages, databases, and workspaces',
      features: ['Page search', 'Database queries', 'Block content', 'Templates'],
      icon: <Database className="w-6 h-6" />,
      color: 'bg-gray-100 text-gray-700'
    },
    {
      id: 'linear',
      name: 'Linear',
      type: 'Project Management',
      category: 'project-management',
      status: 'coming-soon',
      description: 'Search issues, projects, and roadmaps from Linear',
      features: ['Issue tracking', 'Project management', 'Roadmap planning', 'Team insights'],
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-purple-100 text-purple-700'
    },
    {
      id: 'discord',
      name: 'Discord',
      type: 'Communication',
      category: 'communication',
      status: 'coming-soon',
      description: 'Search messages and shared content from Discord servers',
      features: ['Message search', 'Server management', 'Voice chat logs', 'File sharing'],
      icon: <MessageSquare className="w-6 h-6" />,
      color: 'bg-indigo-100 text-indigo-700'
    }
  ];

  const categories = [
    { id: 'all', name: 'All Integrations', count: integrations.length },
    { id: 'development', name: 'Development', count: integrations.filter(i => i.category === 'development').length },
    { id: 'communication', name: 'Communication', count: integrations.filter(i => i.category === 'communication').length },
    { id: 'documentation', name: 'Documentation', count: integrations.filter(i => i.category === 'documentation').length },
    { id: 'project-management', name: 'Project Management', count: integrations.filter(i => i.category === 'project-management').length }
  ];

  const filteredIntegrations = integrations.filter(integration => {
    const matchesCategory = selectedCategory === 'all' || integration.category === selectedCategory;
    const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         integration.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const connectedIntegrations = integrations.filter(i => i.status === 'connected');
  const availableIntegrations = integrations.filter(i => i.status === 'available');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'available':
        return <Plus className="w-4 h-4 text-blue-500" />;
      case 'coming-soon':
        return <Clock className="w-4 h-4 text-amber-500" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusButton = (integration: Integration) => {
    switch (integration.status) {
      case 'connected':
        return (
          <div className="flex space-x-2">
            <button className="px-3 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors">
              <Settings className="w-3 h-3 inline mr-1" />
              Configure
            </button>
            <button className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">
              <Trash2 className="w-3 h-3 inline mr-1" />
              Remove
            </button>
          </div>
        );
      case 'available':
        return (
          <button 
            onClick={onAddServer}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 inline mr-1" />
            Connect
          </button>
        );
      case 'coming-soon':
        return (
          <button 
            disabled
            className="px-4 py-2 bg-gray-200 text-gray-500 text-sm rounded-lg cursor-not-allowed"
          >
            Coming Soon
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Integrations</h2>
          <p className="text-gray-600">Connect and manage your data sources</p>
        </div>
        <button 
          onClick={onAddServer}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Integration</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{connectedIntegrations.length}</p>
              <p className="text-sm text-gray-600">Connected</p>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{availableIntegrations.length}</p>
              <p className="text-sm text-gray-600">Available</p>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">4.2k</p>
              <p className="text-sm text-gray-600">Items Indexed</p>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">98.5%</p>
              <p className="text-sm text-gray-600">Uptime</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search integrations..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex space-x-2 overflow-x-auto">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {category.name} ({category.count})
            </button>
          ))}
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIntegrations.map(integration => (
          <div
            key={integration.id}
            className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-all group"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-xl ${integration.color}`}>
                  {integration.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{integration.name}</h3>
                  <p className="text-sm text-gray-500">{integration.type}</p>
                </div>
              </div>
              {getStatusIcon(integration.status)}
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 mb-4">{integration.description}</p>

            {/* Features */}
            <div className="mb-4">
              <div className="flex flex-wrap gap-1">
                {integration.features.slice(0, 3).map(feature => (
                  <span
                    key={feature}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
                  >
                    {feature}
                  </span>
                ))}
                {integration.features.length > 3 && (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                    +{integration.features.length - 3} more
                  </span>
                )}
              </div>
            </div>

            {/* Connection Info */}
            {integration.status === 'connected' && (
              <div className="mb-4 p-3 bg-emerald-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-emerald-700">
                    {integration.connectedCount} connection{integration.connectedCount !== 1 ? 's' : ''}
                  </span>
                  <span className="text-emerald-600">
                    Last sync: {integration.lastSync}
                  </span>
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="flex justify-end">
              {getStatusButton(integration)}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredIntegrations.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">No integrations found</h3>
          <p className="text-gray-600 mb-4">
            Try adjusting your search or browse different categories.
          </p>
          <button 
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Integration Tips */}
      <div className="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Integration Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-medium text-gray-800">Secure Connections</h4>
              <p className="text-sm text-gray-600">All integrations use secure authentication and encrypted connections.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-medium text-gray-800">Real-time Sync</h4>
              <p className="text-sm text-gray-600">Data is synchronized in real-time for the most up-to-date search results.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};