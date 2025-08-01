import React, { useState, useEffect } from 'react';
import { enhancedInHouseMCPService } from '../services/enhancedInHouseMCPService';

interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
}

interface BitbucketConfig {
  baseUrl: string;
  username: string;
  appPassword: string;
  workspace?: string;
}

interface InHouseIntegrationsProps {
  onConnectionChange?: () => void;
}

export const InHouseIntegrations: React.FC<InHouseIntegrationsProps> = ({ 
  onConnectionChange 
}) => {
  const [jiraConfig, setJiraConfig] = useState<JiraConfig>({ baseUrl: '', email: '', apiToken: '' });
  const [bitbucketConfig, setBitbucketConfig] = useState<BitbucketConfig>({ baseUrl: '', username: '', appPassword: '', workspace: '' });

  const [jiraConnected, setJiraConnected] = useState(false);
  const [bitbucketConnected, setBitbucketConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' }>({ text: '', type: 'info' });

  useEffect(() => {
    // On component mount, check configurations without calling private method
    setJiraConnected(enhancedInHouseMCPService.isJiraConfigured());
    setBitbucketConnected(enhancedInHouseMCPService.isBitbucketConfigured());
    
    const savedJiraConfig = enhancedInHouseMCPService.getJiraConfig();
    if (savedJiraConfig) {
      setJiraConfig({
        baseUrl: savedJiraConfig.baseUrl,
        email: savedJiraConfig.email || '',
        apiToken: savedJiraConfig.apiToken || ''
      });
    }

    const savedBitbucketConfig = enhancedInHouseMCPService.getBitbucketConfig();
    if (savedBitbucketConfig) {
      setBitbucketConfig({
        baseUrl: savedBitbucketConfig.baseUrl,
        username: savedBitbucketConfig.username || '',
        appPassword: savedBitbucketConfig.appPassword || '',
        workspace: savedBitbucketConfig.workspace || ''
      });
    }
  }, []);

  const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: 'info' }), 5000);
  };

  const handleConnectionChange = (success: boolean, serviceName: string) => {
    if (serviceName === 'jira') setJiraConnected(success);
    if (serviceName === 'bitbucket') setBitbucketConnected(success);
    onConnectionChange?.();
  };

  const connectJira = async () => {
    setLoading(true);
    try {
      const result = await enhancedInHouseMCPService.configureJira(jiraConfig);
      if (result.success) {
        showMessage(result.message || 'Connected to JIRA successfully!', 'success');
        handleConnectionChange(true, 'jira');
      } else {
        showMessage(`JIRA connection failed: ${result.error}`, 'error');
        handleConnectionChange(false, 'jira');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showMessage(`JIRA connection failed: ${errorMessage}`, 'error');
      handleConnectionChange(false, 'jira');
    } finally {
      setLoading(false);
    }
  };

  const disconnectJira = () => {
    enhancedInHouseMCPService.disconnectJira();
    setJiraConfig(prev => ({ ...prev, apiToken: '' }));
    showMessage('Disconnected from Jira.', 'info');
    handleConnectionChange(false, 'jira');
  };

  const connectBitbucket = async () => {
    setLoading(true);
    try {
      const result = await enhancedInHouseMCPService.configureBitbucket(bitbucketConfig);
      if (result.success) {
        showMessage(result.message || 'Connected to Bitbucket successfully!', 'success');
        handleConnectionChange(true, 'bitbucket');
      } else {
        showMessage(`Bitbucket connection failed: ${result.error}`, 'error');
        handleConnectionChange(false, 'bitbucket');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showMessage(`Bitbucket connection failed: ${errorMessage}`, 'error');
      handleConnectionChange(false, 'bitbucket');
    } finally {
      setLoading(false);
    }
  };
  
  const disconnectBitbucket = () => {
    enhancedInHouseMCPService.disconnectBitbucket();
    setBitbucketConfig(prev => ({ ...prev, appPassword: '', username: '', workspace: '' }));
    showMessage('Disconnected from Bitbucket.', 'info');
    handleConnectionChange(false, 'bitbucket');
  };

  const testJiraConnection = async () => {
    if (!jiraConnected) {
      showMessage('Please connect to Jira first.', 'error');
      return;
    }
    setLoading(true);
    try {
      const result = await enhancedInHouseMCPService.getJiraProjects();
      if (result && result.length > 0) {
        const projectNames = result.map(project => `- ${project.name} (${project.key})`).join('\n');
        showMessage(`Connection test successful!\n\nFound ${result.length} projects:\n${projectNames}`, 'success');
      } else {
        showMessage('Connection test successful, but no projects found.', 'info');
      }
    } catch (error) {
      showMessage(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const testGenericTickets = async () => {
    if (!jiraConnected) {
      showMessage('Please connect to Jira first.', 'error');
      return;
    }
    setLoading(true);
    try {
      // Test enhanced intelligent search with different query types
      const testQueries = [
        'NSVP-27299',  // Direct ticket ID
        'qc-hub.atlassian.net/browse/nsvp-27299',  // URL format
        'show me all bugs',
        'tickets in progress',
        'project Island'
      ];
      
      const randomQuery = testQueries[Math.floor(Math.random() * testQueries.length)];
      console.log('🧪 Testing query:', randomQuery);
      
      const result = await enhancedInHouseMCPService.intelligentSearch(randomQuery);
      
      if (result.searchResults.length > 0) {
        const summary = result.searchResults.slice(0, 3).map(item => 
          `- ${item.title}`
        ).join('\n');
        showMessage(`✅ Enhanced Search Results for "${randomQuery}"\n🎯 Intent: ${result.intent}\n\n📋 Found ${result.searchResults.length} items:\n${summary}${result.searchResults.length > 3 ? '\n...and more' : ''}\n\n💡 Suggestions: ${result.suggestions.join(', ')}`, 'success');
      } else {
        showMessage(`❌ Enhanced search for "${randomQuery}" found no results.\n🎯 Intent detected: ${result.intent}\n💡 Suggestions: ${result.suggestions.join(', ')}\n\n🔧 This might indicate:\n- Ticket doesn't exist in your Jira\n- Different project key needed\n- Check your Jira connection`, 'info');
      }
    } catch (error) {
      showMessage(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\n🔧 Check your Jira connection and try again.`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const testSpecificTicket = async () => {
    if (!jiraConnected) {
      showMessage('Please connect to Jira first.', 'error');
      return;
    }
    
    // Test with your specific ticket URL/ID
    const testTicketQuery = 'qc-hub.atlassian.net/browse/nsvp-27299 give me details about this one';
    setLoading(true);
    
    try {
      console.log('🧪 Testing specific ticket query:', testTicketQuery);
      const result = await enhancedInHouseMCPService.intelligentSearch(testTicketQuery);
      
      if (result.searchResults.length > 0) {
        const ticket = result.searchResults[0];
        showMessage(`✅ Found Ticket!\n🎫 ${ticket.title}\n🎯 Intent: ${result.intent}\n\n📝 Description: ${ticket.description}\n🔗 URL: ${ticket.url}\n\n📊 Metadata: ${JSON.stringify(ticket.metadata, null, 2)}`, 'success');
      } else {
        showMessage(`❌ Ticket not found!\n🎯 Intent: ${result.intent}\n💡 Suggestions: ${result.suggestions.join(', ')}\n\n🔧 Possible issues:\n- Ticket doesn't exist\n- Wrong project key\n- Permission issues\n- Check Jira connection`, 'info');
      }
    } catch (error) {
      console.error('Test error:', error);
      showMessage(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\n🔧 Check your Jira connection and permissions.`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const testTicketsByStatus = async () => {
    if (!jiraConnected) {
      showMessage('Please connect to Jira first.', 'error');
      return;
    }
    setLoading(true);
    try {
      const ticketsByStatus = await enhancedInHouseMCPService.getTicketsByStatus();
      const statusSummary = Object.entries(ticketsByStatus)
        .map(([status, tickets]) => `- ${status}: ${tickets.length} tickets`)
        .join('\n');
      
      if (Object.keys(ticketsByStatus).length > 0) {
        showMessage(`All Tickets by Status:\n\n${statusSummary}`, 'success');
      } else {
        showMessage('No tickets found grouped by status.', 'info');
      }
    } catch (error) {
      showMessage(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const testBitbucketConnection = async () => {
    if (!bitbucketConnected) {
      showMessage('Please connect to Bitbucket first.', 'error');
      return;
    }
    setLoading(true);
    try {
      const result = await enhancedInHouseMCPService.searchBitbucketRepositories('', 5);
      if (result?.values && result.values.length > 0) {
        const repoNames = result.values.slice(0, 3).map(repo => `- ${repo.name}`).join('\n');
        showMessage(`Connection test successful!\n\nFound ${result.values.length} repositories:\n${repoNames}`, 'success');
      } else {
        showMessage('Connection test successful, but no repositories found.', 'info');
      }
    } catch (error) {
      showMessage(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">In-House MCP Integration</h2>
        
        {message.text && (
          <div className={`mb-4 p-4 rounded-md whitespace-pre-line ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {message.text}
          </div>
        )}

        <div className="border rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-700">Jira Configuration</h3>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${jiraConnected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm">{jiraConnected ? 'Connected' : 'Not Connected'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jira Base URL
              </label>
              <input
                type="url"
                value={jiraConfig.baseUrl}
                onChange={(e) => setJiraConfig({...jiraConfig, baseUrl: e.target.value})}
                placeholder="https://your-domain.atlassian.net"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={jiraConfig.email}
                onChange={(e) => setJiraConfig({...jiraConfig, email: e.target.value})}
                placeholder="your.email@company.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Token
            </label>
            <input
              type="password"
              value={jiraConfig.apiToken}
              onChange={(e) => setJiraConfig({...jiraConfig, apiToken: e.target.value})}
              placeholder="Your Jira API Token"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-600 mt-1">
              Generate an API token from your Atlassian Account Settings → Security → API tokens
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={connectJira}
              disabled={loading || !jiraConfig.baseUrl || !jiraConfig.email || !jiraConfig.apiToken}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Connecting...' : 'Connect Jira'}
            </button>
            <button
              onClick={disconnectJira}
              disabled={loading || !jiraConnected}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              Disconnect Jira
            </button>
            <button
              onClick={testJiraConnection}
              disabled={loading || !jiraConnected}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Test Connection
            </button>
          </div>

          {/* Simple MCP Test */}
          {jiraConnected && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h4 className="text-md font-semibold text-blue-800 mb-3">Test MCP Search</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={testGenericTickets}
                  disabled={loading}
                  className="px-3 py-1 bg-purple-500 text-white text-sm rounded hover:bg-purple-600 disabled:opacity-50"
                >
                  Test Smart Search
                </button>
                <button
                  onClick={testTicketsByStatus}
                  disabled={loading}
                  className="px-3 py-1 bg-indigo-500 text-white text-sm rounded hover:bg-indigo-600 disabled:opacity-50"
                >
                  View by Status
                </button>
                <button
                  onClick={testSpecificTicket}
                  disabled={loading}
                  className="px-3 py-1 bg-orange-500 text-white text-sm rounded hover:bg-orange-600 disabled:opacity-50"
                >
                  Test URL Parsing
                </button>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                Test the intelligent search that routes queries to the correct MCP server based on content.
              </p>
            </div>
          )}
        </div>

        <div className="border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-700">Bitbucket Configuration</h3>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${bitbucketConnected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm">{bitbucketConnected ? 'Connected' : 'Not Connected'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bitbucket Base URL
              </label>
              <input
                type="url"
                value={bitbucketConfig.baseUrl}
                onChange={(e) => setBitbucketConfig({...bitbucketConfig, baseUrl: e.target.value})}
                placeholder="https://bitbucket.org or your server URL"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={bitbucketConfig.username}
                onChange={(e) => setBitbucketConfig({...bitbucketConfig, username: e.target.value})}
                placeholder="your-username"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                App Password
              </label>
              <input
                type="password"
                value={bitbucketConfig.appPassword}
                onChange={(e) => setBitbucketConfig({...bitbucketConfig, appPassword: e.target.value})}
                placeholder="Your App Password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-600 mt-1">
                Generate an app password from Bitbucket Settings → App passwords
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Workspace (for Cloud)
              </label>
              <input
                type="text"
                value={bitbucketConfig.workspace}
                onChange={(e) => setBitbucketConfig({...bitbucketConfig, workspace: e.target.value})}
                placeholder="your-workspace"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={connectBitbucket}
              disabled={loading || !bitbucketConfig.baseUrl || !bitbucketConfig.username || !bitbucketConfig.appPassword}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Connecting...' : 'Connect Bitbucket'}
            </button>
            <button
              onClick={disconnectBitbucket}
              disabled={loading || !bitbucketConnected}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              Disconnect Bitbucket
            </button>
            <button
              onClick={testBitbucketConnection}
              disabled={loading || !bitbucketConnected}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Test Connection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InHouseIntegrations;
