import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  MessageSquare, 
  FileText, 
  Database, 
  Plus,
  Settings,
  CheckCircle,
  XCircle,
  Zap,
  Shield,
  Clock,
  Search,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { MCPServerSetup } from './MCPServerSetup';

import { ServiceConfiguration } from './ServiceConfiguration';
import { getMCPServiceStatuses } from '../services/mcpIntegrationStatus';

interface IntegrationsProps {
  isVisible: boolean;
}

interface RealServiceStatus {
  isConfigured: boolean;
  isConnected: boolean;
  lastSync?: string;
  itemCount?: number;
  error?: string;
}

interface Integration {
  id: string;
  name: string;
  type: string;
  category: 'development' | 'communication' | 'documentation' | 'project-management';
  description: string;
  features: string[];
  icon: React.ReactNode;
  color: string;
  setupInstructions: string;
  isRealService: boolean; // Flag to differentiate real vs coming soon services
}

export const Integrations: React.FC<IntegrationsProps> = ({ 
  isVisible
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMCPSetup, setShowMCPSetup] = useState(false);
  const [selectedService, setSelectedService] = useState<Integration | null>(null);
  const [showServiceConfig, setShowServiceConfig] = useState(false);
  const [activeTab, setActiveTab] = useState<'mcp-integrations'>('mcp-integrations');
  const [serviceStatuses, setServiceStatuses] = useState<Record<string, RealServiceStatus>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);


  // Check real service status (merge MCP client state with localStorage for config)
  const checkServiceStatus = (serviceId: string): RealServiceStatus => {
    const mcpStatuses = getMCPServiceStatuses();
    const mcp = mcpStatuses[serviceId];
    // Local config presence
    let isConfigured = false;
    switch (serviceId) {
      case 'github':
        isConfigured = !!localStorage.getItem('github_token');
        break;
      case 'bitbucket':
        isConfigured = !!localStorage.getItem('bitbucket_token');
        break;
      case 'jira':
        isConfigured = !!localStorage.getItem('jira_config');
        break;
      case 'slack':
        isConfigured = !!localStorage.getItem('slack_token');
        break;
      case 'confluence':
        isConfigured = !!localStorage.getItem('confluence_config');
        break;
      default:
        isConfigured = false;
    }
    if (mcp) {
      return {
        isConfigured,
        isConnected: mcp.isConnected,
        lastSync: mcp.lastSync,
        itemCount: mcp.itemCount
      };
    }
    // fallback to local config only
    return {
      isConfigured,
      isConnected: false,
      itemCount: 0
    };
  };

  // Update service statuses (use MCP client state)
  const refreshServiceStatuses = () => {
    const statuses: Record<string, RealServiceStatus> = {};
    ['github', 'bitbucket', 'jira', 'confluence', 'teams', 'slack'].forEach(serviceId => {
      statuses[serviceId] = checkServiceStatus(serviceId);
    });
    setServiceStatuses(statuses);
  };

  // Initialize and refresh statuses
  useEffect(() => {
    refreshServiceStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    refreshServiceStatuses();
    setIsRefreshing(false);
  };

  const handleServiceDisconnect = (serviceId: string) => {
    // Remove the service configuration
    localStorage.removeItem(`${serviceId}_token`);
    localStorage.removeItem(`${serviceId}_config`);
    refreshServiceStatuses();
  };

  if (!isVisible) return null;

  const integrations: Integration[] = [
    {
      id: 'github',
      name: 'GitHub',
      type: 'Git Repository',
      category: 'development',
      description: 'Search through repositories, issues, pull requests, and code',
      features: ['Repository search', 'Issue tracking', 'Code search', 'Pull requests'],
      icon: <GitBranch className="w-6 h-6" />,
      color: 'bg-gray-100 text-gray-700',
      setupInstructions: 'Generate a personal access token from GitHub Settings → Developer settings → Personal access tokens',
      isRealService: true
    },
    {
      id: 'bitbucket',
      name: 'Bitbucket',
      type: 'Git Repository',
      category: 'development',
      description: 'Access Bitbucket repositories and track development progress',
      features: ['Repository search', 'Branch management', 'Code review', 'Pipeline status'],
      icon: <GitBranch className="w-6 h-6" />,
      color: 'bg-blue-100 text-blue-700',
      setupInstructions: 'Create an app password from Bitbucket Settings → Personal Bitbucket settings → App passwords',
      isRealService: true
    },
    {
      id: 'jira',
      name: 'Jira',
      type: 'Project Management',
      category: 'project-management',
      description: 'Search issues, epics, and project data from Jira',
      features: ['Issue search', 'Project tracking', 'Sprint management', 'Custom fields'],
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-blue-100 text-blue-700',
      setupInstructions: 'Generate an API token from Atlassian Account Settings → Security → API tokens',
      isRealService: true
    },
    {
      id: 'confluence',
      name: 'Confluence',
      type: 'Documentation',
      category: 'documentation',
      description: 'Search through wiki pages, documentation, and knowledge base',
      features: ['Page search', 'Space management', 'Content versioning', 'Attachments'],
      icon: <Database className="w-6 h-6" />,
      color: 'bg-indigo-100 text-indigo-700',
      setupInstructions: 'Use the same API token as Jira for Confluence access',
      isRealService: true
    },
    {
      id: 'teams',
      name: 'Microsoft Teams',
      type: 'Communication',
      category: 'communication',
      description: 'Search messages, files, and meeting notes from Teams',
      features: ['Message search', 'File access', 'Meeting notes', 'Channel history'],
      icon: <MessageSquare className="w-6 h-6" />,
      color: 'bg-purple-100 text-purple-700',
      setupInstructions: 'Register an Azure AD app and configure Microsoft Graph permissions',
      isRealService: false // Coming soon
    },
    {
      id: 'slack',
      name: 'Slack',
      type: 'Communication',
      category: 'communication',
      description: 'Search conversations, files, and shared content from Slack',
      features: ['Message search', 'File sharing', 'Thread tracking', 'Channel management'],
      icon: <MessageSquare className="w-6 h-6" />,
      color: 'bg-green-100 text-green-700',
      setupInstructions: 'Create a Slack app and generate a Bot User OAuth Token',
      isRealService: true
    },
    // Coming soon services
    {
      id: 'notion',
      name: 'Notion',
      type: 'Documentation',
      category: 'documentation',
      description: 'Search through Notion pages, databases, and workspaces',
      features: ['Page search', 'Database queries', 'Block content', 'Templates'],
      icon: <Database className="w-6 h-6" />,
      color: 'bg-gray-100 text-gray-700',
      setupInstructions: 'Coming soon - Notion integration will be available in future updates',
      isRealService: false
    },
    {
      id: 'linear',
      name: 'Linear',
      type: 'Project Management',
      category: 'project-management',
      description: 'Search issues, projects, and roadmaps from Linear',
      features: ['Issue tracking', 'Project management', 'Roadmap planning', 'Team insights'],
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-purple-100 text-purple-700',
      setupInstructions: 'Coming soon - Linear integration will be available in future updates',
      isRealService: false
    },
    {
      id: 'discord',
      name: 'Discord',
      type: 'Communication',
      category: 'communication',
      description: 'Search messages and shared content from Discord servers',
      features: ['Message search', 'Server management', 'Voice chat logs', 'File sharing'],
      icon: <MessageSquare className="w-6 h-6" />,
      color: 'bg-indigo-100 text-indigo-700',
      setupInstructions: 'Coming soon - Discord integration will be available in future updates',
      isRealService: false
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

  const connectedIntegrations = integrations.filter(i => i.isRealService && serviceStatuses[i.id]?.isConnected);
  const availableIntegrations = integrations.filter(i => i.isRealService && !serviceStatuses[i.id]?.isConnected);

  const getServiceStatus = (integration: Integration) => {
    if (!integration.isRealService) return 'coming-soon';
    const status = serviceStatuses[integration.id];
    if (!status) return 'disconnected';
    if (status.isConnected) return 'connected';
    return 'available';
  };

  const getStatusIcon = (integration: Integration) => {
    const status = getServiceStatus(integration);
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
    const status = getServiceStatus(integration);
    switch (status) {
      case 'connected':
        return (
          <div className="flex space-x-2">
            <button 
              onClick={() => setShowServiceConfig(true)}
              className="px-3 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
            >
              <Settings className="w-3 h-3 inline mr-1" />
              Configure
            </button>
            <button 
              onClick={() => handleServiceDisconnect(integration.id)}
              className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              <Trash2 className="w-3 h-3 inline mr-1" />
              Remove
            </button>
          </div>
        );
      case 'available':
        return (
          <button 
            onClick={() => {
              setSelectedService(integration);
              setShowMCPSetup(true);
            }}
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
          <h2 className="text-2xl font-bold text-gray-800">MCP Servers</h2>
          <p className="text-gray-600">Connect and manage your Model Context Protocol servers</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('mcp-integrations')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'mcp-integrations'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            MCP Servers
          </button>
        </nav>
      </div>

      {/* Tab Content - MCP Servers */}
      <>
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
                  <p className="text-2xl font-bold text-gray-800">
                    {Object.values(serviceStatuses).reduce((sum, status) => sum + (status.itemCount || 0), 0).toLocaleString()}
                  </p>
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
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh connection status"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="text-sm">Refresh</span>
              </button>
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
            {filteredIntegrations.map(integration => {
              const status = getServiceStatus(integration);
              const serviceStatus = serviceStatuses[integration.id];
              
              return (
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
                    {getStatusIcon(integration)}
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
                  {status === 'connected' && serviceStatus && (
                    <div className="mb-4 p-3 bg-emerald-50 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-emerald-700">
                          {serviceStatus.itemCount?.toLocaleString() || 0} items indexed
                        </span>
                        <span className="text-emerald-600">
                          Last sync: {serviceStatus.lastSync || 'Never'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Setup Instructions for Available Services */}
                  {status === 'available' && integration.isRealService && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                      <h4 className="text-sm font-medium text-blue-800 mb-1">Setup Instructions</h4>
                      <p className="text-xs text-blue-700">{integration.setupInstructions}</p>
                    </div>
                  )}

                  {/* Coming Soon Notice */}
                  {status === 'coming-soon' && (
                    <div className="mb-4 p-3 bg-amber-50 rounded-lg border-l-4 border-amber-400">
                      <h4 className="text-sm font-medium text-amber-800 mb-1">Coming Soon</h4>
                      <p className="text-xs text-amber-700">{integration.setupInstructions}</p>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="flex justify-end">
                    {getStatusButton(integration)}
                  </div>
                </div>
              );
            })}
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
      </>

      {/* MCP Server Setup Modal */}
      {showMCPSetup && selectedService && (
        <MCPServerSetup
          isOpen={showMCPSetup}
          onClose={() => {
            setShowMCPSetup(false);
            setSelectedService(null);
          }}
          selectedService={selectedService}
          onAddServer={async (config) => {
            try {
              // Handle MCP server addition for the specific service
              console.log('MCP Server configuration for', selectedService.name, ':', config);
              
              // Save the configuration to localStorage based on service type
              switch (config.type) {
                case 'github':
                  if (config.serverConfig.token) {
                    localStorage.setItem('github_token', config.serverConfig.token);
                    console.log('✅ GitHub token saved successfully');
                  }
                  break;
                case 'bitbucket':
                  if (config.serverConfig.username && config.serverConfig.password) {
                    localStorage.setItem('bitbucket_token', config.serverConfig.password);
                    localStorage.setItem('bitbucket_username', config.serverConfig.username);
                    console.log('✅ Bitbucket credentials saved successfully');
                  }
                  break;
                case 'jira':
                  if (config.serverConfig.username && config.serverConfig.token && config.serverConfig.serverUrl) {
                    const jiraConfig = {
                      username: config.serverConfig.username,
                      apiToken: config.serverConfig.token,
                      serverUrl: config.serverConfig.serverUrl
                    };
                    localStorage.setItem('jira_config', JSON.stringify(jiraConfig));
                    console.log('✅ Jira configuration saved successfully');
                  }
                  break;
                case 'slack':
                  if (config.serverConfig.token) {
                    localStorage.setItem('slack_token', config.serverConfig.token);
                    console.log('✅ Slack token saved successfully');
                  }
                  break;
                case 'confluence':
                  if (config.serverConfig.username && config.serverConfig.token && config.serverConfig.serverUrl) {
                    const confluenceConfig = {
                      username: config.serverConfig.username,
                      apiToken: config.serverConfig.token,
                      serverUrl: config.serverConfig.serverUrl
                    };
                    localStorage.setItem('confluence_config', JSON.stringify(confluenceConfig));
                    console.log('✅ Confluence configuration saved successfully');
                  }
                  break;
                default:
                  console.warn('Unknown service type:', config.type);
              }

              // Also add the server to mcpClient and connect it
              try {
                const { mcpClient } = await import('../services/mcpClient');
                const serverId = await mcpClient.addServer({
                  name: selectedService.name,
                  type: config.type,
                  serverConfig: config.serverConfig
                });
                await mcpClient.connectServer(serverId);
                console.log('✅ MCP server added and connected:', serverId);
              } catch (err) {
                console.error('❌ Failed to add/connect MCP server:', err);
              }

              // Close modal and refresh
              setShowMCPSetup(false);
              setSelectedService(null);
              refreshServiceStatuses();
            } catch (error) {
              console.error('❌ Failed to save MCP server configuration:', error);
              // You might want to show an error message to the user here
            }
          }}
        />
      )}

      {/* Service Configuration Modal */}
      {showServiceConfig && (
        <ServiceConfiguration
          isOpen={showServiceConfig}
          onClose={() => setShowServiceConfig(false)}
          onSave={(configs) => {
            // Handle service configuration save
            console.log('Service configurations saved:', configs);
            setShowServiceConfig(false);
            refreshServiceStatuses();
          }}
        />
      )}
    </div>
  );
};