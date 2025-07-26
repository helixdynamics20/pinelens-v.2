import React, { useState, useEffect } from 'react';
import { Settings, Eye, EyeOff, Check, X, AlertCircle, Zap, ArrowRight } from 'lucide-react';
import { GitHubMCPToolsConfig } from './GitHubMCPToolsConfig';

interface ServiceConfig {
  id: string;
  name: string;
  type: 'github' | 'bitbucket' | 'jira' | 'confluence' | 'teams' | 'slack';
  enabled: boolean;
  credentials: {
    token?: string;
    username?: string;
    password?: string;
    domain?: string;
    workspace?: string;
  };
  status: 'connected' | 'disconnected' | 'error' | 'testing';
}

interface ServiceConfigurationProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (configs: ServiceConfig[]) => void;
}

export const ServiceConfiguration: React.FC<ServiceConfigurationProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [services, setServices] = useState<ServiceConfig[]>([
    {
      id: 'github',
      name: 'GitHub',
      type: 'github',
      enabled: false,
      credentials: {},
      status: 'disconnected'
    },
    {
      id: 'bitbucket',
      name: 'Bitbucket',
      type: 'bitbucket',
      enabled: false,
      credentials: {},
      status: 'disconnected'
    },
    {
      id: 'jira',
      name: 'Jira',
      type: 'jira',
      enabled: false,
      credentials: {},
      status: 'disconnected'
    },
    {
      id: 'confluence',
      name: 'Confluence',
      type: 'confluence',
      enabled: false,
      credentials: {},
      status: 'disconnected'
    },
    {
      id: 'teams',
      name: 'Microsoft Teams',
      type: 'teams',
      enabled: false,
      credentials: {},
      status: 'disconnected'
    },
    {
      id: 'slack',
      name: 'Slack',
      type: 'slack',
      enabled: false,
      credentials: {},
      status: 'disconnected'
    }
  ]);

  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [showGitHubTools, setShowGitHubTools] = useState(false);
  const [gitHubStats, setGitHubStats] = useState({
    totalTools: 19,
    enabledTools: 15,
    dangerousTools: 3
  });

  useEffect(() => {
    // Load saved configurations from localStorage
    const savedConfigs = localStorage.getItem('serviceConfigs');
    if (savedConfigs) {
      try {
        setServices(JSON.parse(savedConfigs));
      } catch (error) {
        console.error('Failed to load service configurations:', error);
      }
    }

    // Load GitHub tools stats
    const savedTools = localStorage.getItem('github_mcp_tools');
    if (savedTools) {
      try {
        const tools = JSON.parse(savedTools);
        setGitHubStats({
          totalTools: tools.length,
          enabledTools: tools.filter((t: { enabled: boolean }) => t.enabled).length,
          dangerousTools: tools.filter((t: { enabled: boolean; dangerous?: boolean }) => t.enabled && t.dangerous).length
        });
      } catch (error) {
        console.error('Failed to parse GitHub tools:', error);
      }
    }
  }, []);

  const handleGitHubToolsSave = (tools: { enabled: boolean; dangerous?: boolean }[]) => {
    setGitHubStats({
      totalTools: tools.length,
      enabledTools: tools.filter(t => t.enabled).length,
      dangerousTools: tools.filter(t => t.enabled && t.dangerous).length
    });
  };

  const updateService = (serviceId: string, updates: Partial<ServiceConfig>) => {
    setServices(prev => prev.map(service => 
      service.id === serviceId 
        ? { ...service, ...updates }
        : service
    ));
  };

  const updateCredentials = (serviceId: string, field: string, value: string) => {
    setServices(prev => prev.map(service => 
      service.id === serviceId 
        ? { 
            ...service, 
            credentials: { ...service.credentials, [field]: value }
          }
        : service
    ));
  };

  const testConnection = async (serviceId: string) => {
    updateService(serviceId, { status: 'testing' });
    
    // Simulate connection test - in real implementation, this would test actual APIs
    setTimeout(() => {
      const service = services.find(s => s.id === serviceId);
      const hasRequiredCredentials = checkRequiredCredentials(service!);
      
      updateService(serviceId, { 
        status: hasRequiredCredentials ? 'connected' : 'error' 
      });
    }, 2000);
  };

  const checkRequiredCredentials = (service: ServiceConfig): boolean => {
    switch (service.type) {
      case 'github':
      case 'bitbucket':
        return !!service.credentials.token;
      case 'jira':
      case 'confluence':
        return !!(service.credentials.username && service.credentials.password && service.credentials.domain);
      case 'teams':
        return !!service.credentials.token; // Microsoft Graph API token
      case 'slack':
        return !!service.credentials.token; // Bot token
      default:
        return false;
    }
  };

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('serviceConfigs', JSON.stringify(services));
    onSave(services);
    onClose();
  };

  const getServiceInstructions = (type: string) => {
    const instructions = {
      github: {
        title: 'GitHub Personal Access Token',
        steps: [
          '1. Go to GitHub Settings → Developer settings → Personal access tokens',
          '2. Generate new token with repo, read:org, read:user scopes',
          '3. Copy the token and paste it below'
        ]
      },
      bitbucket: {
        title: 'Bitbucket App Password',
        steps: [
          '1. Go to Bitbucket Settings → App passwords',
          '2. Create app password with Repositories:Read scope',
          '3. Copy the password and paste it below'
        ]
      },
      jira: {
        title: 'Jira API Credentials',
        steps: [
          '1. Use your Jira username and password',
          '2. For Jira Cloud, use API token instead of password',
          '3. Domain should be like: company.atlassian.net'
        ]
      },
      confluence: {
        title: 'Confluence API Credentials',
        steps: [
          '1. Use your Confluence username and API token',
          '2. Domain should be like: company.atlassian.net',
          '3. Same credentials as Jira if using Atlassian Cloud'
        ]
      },
      teams: {
        title: 'Microsoft Teams API Token',
        steps: [
          '1. Register app in Azure AD',
          '2. Get Microsoft Graph API token',
          '3. Requires Chat.Read, Files.Read.All permissions'
        ]
      },
      slack: {
        title: 'Slack Bot Token',
        steps: [
          '1. Create Slack app at api.slack.com',
          '2. Add search:read, channels:read scopes',
          '3. Install app and copy Bot User OAuth Token'
        ]
      }
    };
    return instructions[type as keyof typeof instructions];
  };

  const togglePasswordVisibility = (serviceId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [serviceId]: !prev[serviceId]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Service Configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900">Configure Real API Access</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Connect to your actual services to see real data instead of mock results. 
                    All credentials are stored locally in your browser.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {services.map(service => {
              const instructions = getServiceInstructions(service.type);
              const hasCredentials = checkRequiredCredentials(service);

              return (
                <div key={service.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={service.enabled}
                          onChange={(e) => updateService(service.id, { enabled: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium">{service.name}</span>
                      </label>
                      
                      <div className="flex items-center space-x-2">
                        {service.status === 'connected' && (
                          <span className="flex items-center text-green-600 text-sm">
                            <Check className="w-4 h-4 mr-1" />
                            Connected
                          </span>
                        )}
                        {service.status === 'error' && (
                          <span className="flex items-center text-red-600 text-sm">
                            <X className="w-4 h-4 mr-1" />
                            Error
                          </span>
                        )}
                        {service.status === 'testing' && (
                          <span className="text-yellow-600 text-sm">Testing...</span>
                        )}
                      </div>
                    </div>

                    {service.enabled && (
                      <button
                        onClick={() => testConnection(service.id)}
                        disabled={!hasCredentials || service.status === 'testing'}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Test Connection
                      </button>
                    )}
                  </div>

                  {service.enabled && (
                    <div className="space-y-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h4 className="font-medium text-sm text-gray-700 mb-2">{instructions.title}</h4>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {instructions.steps.map((step, index) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* GitHub/Bitbucket/Slack - Token only */}
                        {(service.type === 'github' || service.type === 'bitbucket' || service.type === 'slack' || service.type === 'teams') && (
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {service.type === 'github' ? 'Personal Access Token' : 
                               service.type === 'bitbucket' ? 'App Password' :
                               service.type === 'teams' ? 'Microsoft Graph API Token' :
                               'Bot Token'}
                            </label>
                            <div className="relative">
                              <input
                                type={showPasswords[service.id] ? 'text' : 'password'}
                                value={service.credentials.token || ''}
                                onChange={(e) => updateCredentials(service.id, 'token', e.target.value)}
                                placeholder="Enter your API token..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(service.id)}
                                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                              >
                                {showPasswords[service.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* GitHub MCP Tools Configuration */}
                        {service.type === 'github' && service.status === 'connected' && (
                          <div className="md:col-span-2 mt-4 border border-purple-200 rounded-lg p-4 bg-purple-50">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                  <Zap className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-800">GitHub MCP Tools</h4>
                                  <p className="text-sm text-gray-600">Configure available GitHub MCP tools</p>
                                </div>
                              </div>
                              <button
                                onClick={() => setShowGitHubTools(true)}
                                className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                              >
                                <Settings className="w-4 h-4" />
                                <span>Configure</span>
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-3 text-center">
                              <div className="p-2 bg-white rounded border">
                                <div className="text-lg font-bold text-blue-600">{gitHubStats.totalTools}</div>
                                <div className="text-xs text-gray-600">Total Tools</div>
                              </div>
                              <div className="p-2 bg-white rounded border">
                                <div className="text-lg font-bold text-green-600">{gitHubStats.enabledTools}</div>
                                <div className="text-xs text-gray-600">Enabled</div>
                              </div>
                              <div className="p-2 bg-white rounded border">
                                <div className="text-lg font-bold text-red-600">{gitHubStats.dangerousTools}</div>
                                <div className="text-xs text-gray-600">Dangerous</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Jira/Confluence - Username, Password, Domain */}
                        {(service.type === 'jira' || service.type === 'confluence') && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                              <input
                                type="text"
                                value={service.credentials.domain || ''}
                                onChange={(e) => updateCredentials(service.id, 'domain', e.target.value)}
                                placeholder="company.atlassian.net"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Username/Email</label>
                              <input
                                type="text"
                                value={service.credentials.username || ''}
                                onChange={(e) => updateCredentials(service.id, 'username', e.target.value)}
                                placeholder="your@email.com"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                {service.type === 'jira' ? 'API Token/Password' : 'API Token'}
                              </label>
                              <div className="relative">
                                <input
                                  type={showPasswords[service.id] ? 'text' : 'password'}
                                  value={service.credentials.password || ''}
                                  onChange={(e) => updateCredentials(service.id, 'password', e.target.value)}
                                  placeholder="API token or password"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                                />
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility(service.id)}
                                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                                >
                                  {showPasswords[service.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>

      {/* GitHub MCP Tools Configuration Modal */}
      <GitHubMCPToolsConfig
        isOpen={showGitHubTools}
        onClose={() => setShowGitHubTools(false)}
        onSave={handleGitHubToolsSave}
      />
    </div>
  );
};
