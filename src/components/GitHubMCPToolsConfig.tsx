import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, 
  X, 
  GitBranch, 
  MessageSquare, 
  FileText, 
  PlayCircle, 
  GitPullRequest,
  Bug,
  Code,
  Eye,
  Package,
  Zap,
  Search,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { githubMCPToolsService } from '../services/githubMCPToolsService';

interface GitHubMCPTool {
  name: string;
  description: string;
  category: 'repository' | 'issues' | 'pull-requests' | 'workflow' | 'comments' | 'branches' | 'reviews' | 'files';
  enabled: boolean;
  icon: React.ReactNode;
  dangerous?: boolean;
  inputSchema?: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface GitHubMCPToolsConfigProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tools: GitHubMCPTool[]) => void;
}

export const GitHubMCPToolsConfig: React.FC<GitHubMCPToolsConfigProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [tools, setTools] = useState<GitHubMCPTool[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['repository', 'issues', 'pull-requests', 'workflow', 'comments', 'branches', 'reviews', 'files'])
  );
  const [selectAll, setSelectAll] = useState(false);

  const loadMCPTools = useCallback(async () => {
    try {
      // First, try to load from localStorage
      const savedTools = localStorage.getItem('github_mcp_tools');
      
      // Set up credentials if available
      const savedCredentials = localStorage.getItem('github_mcp_credentials');
      if (savedCredentials) {
        const credentials = JSON.parse(savedCredentials);
        githubMCPToolsService.setCredentials(credentials);
      }

      // Try to fetch tools from MCP server
      const mcpTools = await githubMCPToolsService.fetchAvailableTools();
      
      // Convert MCP tools to our format
      const formattedTools = mcpTools.map(tool => {
        const toolName = tool.name;
        
        // Determine category based on tool name
        let category: GitHubMCPTool['category'] = 'repository';
        let dangerous = false;
        
        if (toolName.includes('issue')) {
          category = 'issues';
        } else if (toolName.includes('pull_request') || toolName.includes('pr')) {
          category = 'pull-requests';
        } else if (toolName.includes('branch')) {
          category = 'branches';
        } else if (toolName.includes('comment') || toolName.includes('review')) {
          category = 'reviews';
        } else if (toolName.includes('file') || toolName.includes('content')) {
          category = 'files';
          dangerous = true; // File operations can be dangerous
        } else if (toolName.includes('workflow') || toolName.includes('action')) {
          category = 'workflow';
          dangerous = true; // Workflow operations can be dangerous
        }
        
        // Determine if tool is dangerous
        if (toolName.includes('delete') || toolName.includes('merge') || toolName.includes('create_or_update')) {
          dangerous = true;
        }

        return {
          name: toolName,
          description: tool.description,
          category,
          enabled: !dangerous, // Dangerous tools disabled by default
          dangerous,
          icon: getIconForTool(toolName),
          inputSchema: tool.inputSchema
        };
      });
      
      // Merge with saved preferences if available
      let finalTools = formattedTools;
      if (savedTools) {
        try {
          const savedPreferences = JSON.parse(savedTools);
          finalTools = formattedTools.map(mcpTool => {
            const savedTool = savedPreferences.find((saved: GitHubMCPTool) => saved.name === mcpTool.name);
            if (savedTool) {
              return { ...mcpTool, enabled: savedTool.enabled };
            }
            return mcpTool;
          });
        } catch (err) {
          console.warn('Failed to parse saved tool preferences:', err);
        }
      }
      
      setTools(finalTools);
      
    } catch (err) {
      console.log('Using fallback GitHub MCP tools:', err);
      
      // Always use fallback tools - this is the normal behavior
      const fallbackTools = await githubMCPToolsService.fetchAvailableTools();
      const formattedTools = fallbackTools.map(tool => {
        const toolName = tool.name;
        
        // Determine category based on tool name
        let category: GitHubMCPTool['category'] = 'repository';
        let dangerous = false;
        
        if (toolName.includes('issue')) {
          category = 'issues';
        } else if (toolName.includes('pull_request') || toolName.includes('pr')) {
          category = 'pull-requests';
        } else if (toolName.includes('branch')) {
          category = 'branches';
        } else if (toolName.includes('comment') || toolName.includes('review')) {
          category = 'reviews';
        } else if (toolName.includes('file') || toolName.includes('content')) {
          category = 'files';
          dangerous = true; // File operations can be dangerous
        } else if (toolName.includes('workflow') || toolName.includes('action')) {
          category = 'workflow';
          dangerous = true; // Workflow operations can be dangerous
        }
        
        // Determine if tool is dangerous
        if (toolName.includes('delete') || toolName.includes('merge') || toolName.includes('create_or_update')) {
          dangerous = true;
        }

        return {
          name: toolName,
          description: tool.description,
          category,
          enabled: !dangerous, // Dangerous tools disabled by default
          dangerous,
          icon: getIconForTool(toolName),
          inputSchema: tool.inputSchema
        };
      });
      
      // Merge with saved preferences if available
      const savedTools = localStorage.getItem('github_mcp_tools');
      let finalTools = formattedTools;
      if (savedTools) {
        try {
          const savedPreferences = JSON.parse(savedTools);
          finalTools = formattedTools.map(mcpTool => {
            const savedTool = savedPreferences.find((saved: GitHubMCPTool) => saved.name === mcpTool.name);
            if (savedTool) {
              return { ...mcpTool, enabled: savedTool.enabled };
            }
            return mcpTool;
          });
        } catch {
          // Ignore parsing errors
        }
      }
      
      setTools(finalTools);
    }
  }, []);

  // Load tools when component mounts
  useEffect(() => {
    if (isOpen) {
      loadMCPTools();
    }
  }, [isOpen, loadMCPTools]);

  const getIconForTool = (toolName: string): React.ReactNode => {
    if (toolName.includes('repository') || toolName.includes('repo')) {
      return <Package className="w-4 h-4" />;
    } else if (toolName.includes('issue')) {
      return <Bug className="w-4 h-4" />;
    } else if (toolName.includes('pull_request') || toolName.includes('pr')) {
      return <GitPullRequest className="w-4 h-4" />;
    } else if (toolName.includes('branch')) {
      return <GitBranch className="w-4 h-4" />;
    } else if (toolName.includes('file') || toolName.includes('content')) {
      return <FileText className="w-4 h-4" />;
    } else if (toolName.includes('search')) {
      return <Search className="w-4 h-4" />;
    } else if (toolName.includes('create')) {
      return <Zap className="w-4 h-4" />;
    } else if (toolName.includes('fork')) {
      return <GitBranch className="w-4 h-4" />;
    } else {
      return <Code className="w-4 h-4" />;
    }
  };

  useEffect(() => {
    // Load saved configuration from localStorage
    const savedTools = localStorage.getItem('github_mcp_tools');
    if (savedTools) {
      try {
        const parsedTools = JSON.parse(savedTools);
        setTools(parsedTools);
      } catch (error) {
        console.error('Failed to parse saved GitHub MCP tools:', error);
      }
    }
  }, []);

  const categories = [
    { id: 'repository', name: 'Repository Management', icon: <Package className="w-4 h-4" /> },
    { id: 'branches', name: 'Branch Operations', icon: <GitBranch className="w-4 h-4" /> },
    { id: 'files', name: 'File Operations', icon: <FileText className="w-4 h-4" /> },
    { id: 'issues', name: 'Issue Management', icon: <Bug className="w-4 h-4" /> },
    { id: 'pull-requests', name: 'Pull Requests', icon: <GitPullRequest className="w-4 h-4" /> },
    { id: 'reviews', name: 'Code Reviews', icon: <Eye className="w-4 h-4" /> },
    { id: 'comments', name: 'Comments & Discussion', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'workflow', name: 'GitHub Actions', icon: <PlayCircle className="w-4 h-4" /> }
  ];

  const toggleTool = (toolName: string) => {
    setTools(prev => prev.map(tool => 
      tool.name === toolName 
        ? { ...tool, enabled: !tool.enabled }
        : tool
    ));
  };

  const toggleCategory = (category: string) => {
    const categoryTools = tools.filter(tool => tool.category === category);
    const allEnabled = categoryTools.every(tool => tool.enabled);
    
    setTools(prev => prev.map(tool => 
      tool.category === category 
        ? { ...tool, enabled: !allEnabled }
        : tool
    ));
  };

  const toggleCategoryExpansion = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setTools(prev => prev.map(tool => ({ ...tool, enabled: newSelectAll })));
  };

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('github_mcp_tools', JSON.stringify(tools));
    onSave(tools);
    onClose();
  };

  const enabledCount = tools.filter(tool => tool.enabled).length;
  const dangerousEnabledCount = tools.filter(tool => tool.enabled && tool.dangerous).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">GitHub MCP Tools Configuration</h2>
                <p className="text-sm text-gray-600">Configure which GitHub MCP tools are available for use</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Summary Stats */}
          <div className="mt-4 flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-700">{enabledCount} tools enabled</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-gray-700">{dangerousEnabledCount} dangerous tools enabled</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span className="text-gray-700">{tools.length - enabledCount} tools disabled</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Global Controls */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-800">Bulk Actions</h3>
                <p className="text-sm text-gray-600">Quickly enable or disable all tools</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleSelectAll}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  {selectAll ? 'Disable All' : 'Enable All'}
                </button>
              </div>
            </div>
          </div>

          {/* Tools by Category */}
          <div className="space-y-4">
            {categories.map(category => {
              const categoryTools = tools.filter(tool => tool.category === category.id);
              const enabledInCategory = categoryTools.filter(tool => tool.enabled).length;
              const isExpanded = expandedCategories.has(category.id);

              return (
                <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Category Header */}
                  <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => toggleCategoryExpansion(category.id)}
                        className="flex items-center space-x-3 text-left flex-1"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        )}
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                          {category.icon}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-800">{category.name}</h3>
                          <p className="text-sm text-gray-600">
                            {enabledInCategory}/{categoryTools.length} tools enabled
                          </p>
                        </div>
                      </button>
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        {enabledInCategory === categoryTools.length ? 'Disable All' : 'Enable All'}
                      </button>
                    </div>
                  </div>

                  {/* Category Tools */}
                  {isExpanded && (
                    <div className="p-4 space-y-3">
                      {categoryTools.map(tool => (
                        <div
                          key={tool.name}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            tool.enabled
                              ? tool.dangerous
                                ? 'border-red-200 bg-red-50'
                                : 'border-green-200 bg-green-50'
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${
                              tool.enabled
                                ? tool.dangerous
                                  ? 'bg-red-100 text-red-600'
                                  : 'bg-green-100 text-green-600'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {tool.icon}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium text-gray-800">{tool.name}</h4>
                                {tool.dangerous && (
                                  <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                                    Dangerous
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{tool.description}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleTool(tool.name)}
                            className={`flex items-center justify-center w-12 h-6 rounded-full transition-colors ${
                              tool.enabled
                                ? 'bg-green-500'
                                : 'bg-gray-300'
                            }`}
                          >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                              tool.enabled ? 'translate-x-3' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <p className="mb-1">⚠️ <strong>Dangerous tools</strong> can modify your repositories, trigger workflows, or make irreversible changes.</p>
              <p>Enable them only if you understand the risks and have proper permissions.</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
