import React, { useState } from 'react';
import { 
  GitBranch, 
  MessageSquare, 
  FileText, 
  Database, 
  Key, 
  User, 
  Globe,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { MCPServerConfig } from '../services/mcpClient';

interface MCPServerSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onAddServer: (config: {
    name: string;
    type: 'bitbucket' | 'jira' | 'teams' | 'confluence' | 'github' | 'slack';
    serverConfig: MCPServerConfig;
  }) => Promise<void>;
}

export const MCPServerSetup: React.FC<MCPServerSetupProps> = ({
  isOpen,
  onClose,
  onAddServer
}) => {
  const [selectedType, setSelectedType] = useState<string>('');
  const [serverName, setServerName] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const serverTypes = [
    {
      id: 'bitbucket',
      name: 'Bitbucket',
      icon: <GitBranch className="w-5 h-5" />,
      description: 'Connect to Bitbucket repositories and pull requests',
      fields: [
        { key: 'username', label: 'Username', type: 'text', required: true },
        { key: 'token', label: 'App Password', type: 'password', required: true }
      ],
      defaultUrl: 'https://api.bitbucket.org'
    },
    {
      id: 'github',
      name: 'GitHub',
      icon: <GitBranch className="w-5 h-5" />,
      description: 'Connect to GitHub repositories and issues',
      fields: [
        { key: 'username', label: 'Username', type: 'text', required: true },
        { key: 'token', label: 'Personal Access Token', type: 'password', required: true }
      ],
      defaultUrl: 'https://api.github.com'
    },
    {
      id: 'github-local',
      name: 'GitHub (Local MCP)',
      icon: <GitBranch className="w-5 h-5" />,
      description: 'Connect to local GitHub MCP server',
      fields: [
        { key: 'username', label: 'GitHub Username', type: 'text', required: true },
        { key: 'token', label: 'Personal Access Token', type: 'password', required: true }
      ],
      defaultUrl: 'http://localhost:8080'
    },
    {
      id: 'jira',
      name: 'Jira',
      icon: <FileText className="w-5 h-5" />,
      description: 'Connect to Jira issues and projects',
      fields: [
        { key: 'username', label: 'Email', type: 'email', required: true },
        { key: 'password', label: 'API Token', type: 'password', required: true }
      ],
      defaultUrl: 'https://your-domain.atlassian.net'
    },
    {
      id: 'confluence',
      name: 'Confluence',
      icon: <Database className="w-5 h-5" />,
      description: 'Connect to Confluence pages and spaces',
      fields: [
        { key: 'username', label: 'Email', type: 'email', required: true },
        { key: 'apiKey', label: 'API Token', type: 'password', required: true }
      ],
      defaultUrl: 'https://your-domain.atlassian.net'
    },
    {
      id: 'teams',
      name: 'Microsoft Teams',
      icon: <MessageSquare className="w-5 h-5" />,
      description: 'Connect to Teams messages and files',
      fields: [
        { key: 'token', label: 'OAuth Token', type: 'password', required: true }
      ],
      defaultUrl: 'https://graph.microsoft.com'
    },
    {
      id: 'slack',
      name: 'Slack',
      icon: <MessageSquare className="w-5 h-5" />,
      description: 'Connect to Slack channels and messages',
      fields: [
        { key: 'token', label: 'Bot Token', type: 'password', required: true }
      ],
      defaultUrl: 'https://slack.com/api'
    }
  ];

  const selectedServerType = serverTypes.find(type => type.id === selectedType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (!selectedType || !serverName || !serverUrl) {
        throw new Error('Please fill in all required fields');
      }

      const serverConfig: MCPServerConfig = {
        serverUrl,
        ...credentials
      };

      await onAddServer({
        name: serverName,
        type: selectedType as any,
        serverConfig
      });

      // Reset form
      setSelectedType('');
      setServerName('');
      setServerUrl('');
      setCredentials({});
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCredentialChange = (key: string, value: string) => {
    setCredentials(prev => ({ ...prev, [key]: value }));
  };

  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId);
    const type = serverTypes.find(t => t.id === typeId);
    if (type) {
      setServerUrl(type.defaultUrl);
      setCredentials({});
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Add MCP Server</h2>
              <p className="text-sm text-gray-600 mt-1">
                Connect a new service to enable AI-powered search
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Server Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Service Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {serverTypes.map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleTypeSelect(type.id)}
                  className={`p-4 border-2 rounded-xl text-left transition-all ${
                    selectedType === type.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`p-2 rounded-lg ${
                      selectedType === type.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {type.icon}
                    </div>
                    <h3 className="font-medium text-gray-800">{type.name}</h3>
                  </div>
                  <p className="text-xs text-gray-600">{type.description}</p>
                </button>
              ))}
            </div>
          </div>

          {selectedServerType && (
            <>
              {/* Server Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Connection Name
                </label>
                <input
                  type="text"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  placeholder={`My ${selectedServerType.name} Server`}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Server URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Globe className="w-4 h-4 inline mr-1" />
                  Server URL
                </label>
                <input
                  type="url"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Credentials */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700 flex items-center">
                  <Key className="w-4 h-4 mr-1" />
                  Authentication
                </h4>
                
                {selectedServerType.fields.map(field => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={field.type === 'password' && !showPassword ? 'password' : field.type}
                        value={credentials[field.key] || ''}
                        onChange={(e) => handleCredentialChange(field.key, e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                        required={field.required}
                      />
                      {field.type === 'password' && (
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Setup Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <h5 className="font-medium text-blue-800 mb-1">Setup Instructions</h5>
                    <div className="text-blue-700 space-y-1">
                      {selectedType === 'bitbucket' && (
                        <div>
                          <p>1. Go to Bitbucket Settings → App passwords</p>
                          <p>2. Create a new app password with Repository permissions</p>
                          <p>3. Use your username and the generated app password</p>
                        </div>
                      )}
                      {selectedType === 'github' && (
                        <div>
                          <p>1. Go to GitHub Settings → Developer settings → Personal access tokens</p>
                          <p>2. Generate a new token with repo and read:org permissions</p>
                          <p>3. Use your username and the generated token</p>
                        </div>
                      )}
                      {selectedType === 'jira' && (
                        <div>
                          <p>1. Go to Atlassian Account Settings → Security → API tokens</p>
                          <p>2. Create a new API token</p>
                          <p>3. Use your email and the generated token</p>
                        </div>
                      )}
                      {selectedType === 'confluence' && (
                        <div>
                          <p>1. Go to Atlassian Account Settings → Security → API tokens</p>
                          <p>2. Create a new API token</p>
                          <p>3. Use your email and the generated token</p>
                        </div>
                      )}
                      {selectedType === 'teams' && (
                        <div>
                          <p>1. Register an app in Azure AD</p>
                          <p>2. Grant Microsoft Graph permissions</p>
                          <p>3. Use the OAuth token from your app</p>
                        </div>
                      )}
                      {selectedType === 'slack' && (
                        <div>
                          <p>1. Create a Slack app at api.slack.com</p>
                          <p>2. Add bot token scopes (channels:read, files:read, etc.)</p>
                          <p>3. Install the app and use the Bot User OAuth Token</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 text-red-700">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedType || !serverName || !serverUrl || isSubmitting}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Add Server</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};