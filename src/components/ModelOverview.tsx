import React from 'react';

interface GitHubModel {
  id: string;
  name: string;
  publisher: string;
  summary: string;
  rate_limit_tier: string;
  supported_input_modalities: string[];
  capabilities: string[];
  limits: {
    max_input_tokens: number;
    max_output_tokens: number;
  };
}

interface ModelOverviewProps {
  models: GitHubModel[];
  isOpen: boolean;
  onClose: () => void;
}

export const ModelOverview: React.FC<ModelOverviewProps> = ({ models, isOpen, onClose }) => {
  if (!isOpen) return null;

  // Group models by publisher
  const modelsByPublisher = models.reduce((acc, model) => {
    if (!acc[model.publisher]) acc[model.publisher] = [];
    acc[model.publisher].push(model);
    return acc;
  }, {} as Record<string, GitHubModel[]>);

  // Sort publishers by number of models
  const sortedPublishers = Object.entries(modelsByPublisher)
    .sort(([, a], [, b]) => b.length - a.length);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'high': return 'bg-yellow-100 text-yellow-800';
      case 'custom': return 'bg-blue-100 text-blue-800';
      case 'embeddings': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`;
    return tokens.toString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] overflow-y-auto w-full">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">GitHub Models Overview</h2>
              <p className="text-gray-600 mt-1">
                {models.length} models available from {Object.keys(modelsByPublisher).length} publishers
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {sortedPublishers.map(([publisher, publisherModels]) => (
            <div key={publisher} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {publisher} ({publisherModels.length} models)
                </h3>
              </div>
              
              <div className="p-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {publisherModels.map((model) => (
                    <div key={model.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900 text-sm">{model.name}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTierColor(model.rate_limit_tier)}`}>
                          {model.rate_limit_tier}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 text-xs mb-3 line-clamp-2">{model.summary}</p>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Input:</span>
                          <span className="font-medium">{formatTokens(model.limits.max_input_tokens)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Output:</span>
                          <span className="font-medium">{formatTokens(model.limits.max_output_tokens)}</span>
                        </div>
                      </div>
                      
                      {model.supported_input_modalities && model.supported_input_modalities.length > 0 && (
                        <div className="mt-3">
                          <div className="text-xs text-gray-500 mb-1">Input types:</div>
                          <div className="flex flex-wrap gap-1">
                            {model.supported_input_modalities.map(modality => (
                              <span key={modality} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                {modality}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {model.capabilities && model.capabilities.length > 0 && (
                        <div className="mt-3">
                          <div className="text-xs text-gray-500 mb-1">Capabilities:</div>
                          <div className="flex flex-wrap gap-1">
                            {model.capabilities.map(capability => (
                              <span key={capability} className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                {capability}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
