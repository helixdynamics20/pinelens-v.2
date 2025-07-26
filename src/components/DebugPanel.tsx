import React from 'react';
import { realAPIService, ServiceConfig } from '../services/realAPIService';
import { githubCopilotService } from '../services/githubCopilotService';
import { ModelOverview } from './ModelOverview';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DebugInfo {
  localStorage: {
    githubToken: string;
    githubUsername: string;
    apiServiceConfigs: string;
  };
  realAPIService: {
    serviceConfigs: ServiceConfig[];
    enabledServices: ServiceConfig[];
    serviceStatus: { total: number; connected: number; available: string[] };
    githubConfig: { hasToken: boolean; hasService: boolean; isEnabled: boolean };
  };
  githubModels?: {
    available: string[];
    testResult?: string;
  };
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ isOpen, onClose }) => {
  const [debugInfo, setDebugInfo] = React.useState<DebugInfo | null>(null);
  const [showModelOverview, setShowModelOverview] = React.useState(false);
  const [allModels, setAllModels] = React.useState<any[]>([]);

  const checkConfiguration = () => {
    const info: DebugInfo = {
      localStorage: {
        githubToken: localStorage.getItem('github_token') ? 'Present' : 'Not found',
        githubUsername: localStorage.getItem('github_username') || 'Not set',
        apiServiceConfigs: localStorage.getItem('api_service_configs') || 'Not set'
      },
      realAPIService: {
        serviceConfigs: realAPIService.getServiceConfigs(),
        enabledServices: realAPIService.getEnabledServices(),
        serviceStatus: realAPIService.getServiceStatus(),
        githubConfig: realAPIService.checkGitHubConfiguration()
      }
    };
    
    console.log('Debug Info:', info);
    setDebugInfo(info);
  };

  const triggerAutoConfig = () => {
    // realAPIService.autoConfigureServices(); // This is private
    console.log('Auto-configuration would be triggered here');
    console.log('You can manually configure services using the other setup buttons');
    setTimeout(checkConfiguration, 1000);
  };

  const clearLocalStorage = () => {
    localStorage.clear();
    console.log('LocalStorage cleared');
    checkConfiguration();
  };

  const showAllModels = async () => {
    try {
      const models = await githubCopilotService.getModelDetails();
      setAllModels(models);
      setShowModelOverview(true);
    } catch (error) {
      console.error('Failed to load model details:', error);
    }
  };

  const testGitHubModels = async () => {
    console.log('🧪 Testing GitHub Models API...');
    
    try {
      // Check if token is configured
      if (!githubCopilotService.isConfigured()) {
        console.error('❌ No GitHub token configured');
        return;
      }

      // Test API access
      const canAccess = await githubCopilotService.checkCopilotProStatus();
      console.log('GitHub Models API access:', canAccess);

      // Get available models
      const models = await githubCopilotService.getAvailableModels();
      console.log('Available models:', models);

      // Test a simple query if models are available
      let testResult = 'No models available';
      if (models.length > 0) {
        try {
          const response = await githubCopilotService.generateResponse(
            'Hello! Please respond with "GitHub Models API is working!" if you can read this.',
            models[0],
            { maxTokens: 50 }
          );
          testResult = response;
          console.log('✅ Test response:', response);
        } catch (error) {
          testResult = `Error: ${error}`;
          console.error('❌ Test failed:', error);
        }
      }

      // Update debug info with GitHub Models results
      setDebugInfo(prev => prev ? {
        ...prev,
        githubModels: {
          available: models,
          testResult
        }
      } : null);

    } catch (error) {
      console.error('❌ GitHub Models test failed:', error);
      setDebugInfo(prev => prev ? {
        ...prev,
        githubModels: {
          available: [],
          testResult: `Error: ${error}`
        }
      } : null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-4xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Debug Panel</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div>
          <div className="flex gap-2 mb-4">
            <button
              onClick={checkConfiguration}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Check Config
            </button>
            <button
              onClick={triggerAutoConfig}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Trigger Auto-Config
            </button>
            <button
              onClick={testGitHubModels}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Test GitHub Models
            </button>
            <button
              onClick={showAllModels}
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
            >
              View All Models
            </button>
            <button
              onClick={clearLocalStorage}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Clear LocalStorage
            </button>
          </div>

          {debugInfo && (
            <div className="bg-gray-100 p-4 rounded">
              <h3 className="font-bold mb-2">Debug Information:</h3>
              <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
      
      <ModelOverview
        models={allModels}
        isOpen={showModelOverview}
        onClose={() => setShowModelOverview(false)}
      />
    </div>
  );
};
