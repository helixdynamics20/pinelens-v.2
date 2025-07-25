import React, { useState } from 'react';
import { 
  GitBranch, 
  MessageSquare, 
  Users, 
  FileText, 
  Database, 
  Plus, 
  Settings, 
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';

interface MCPServer {
  id: string;
  name: string;
  type: 'bitbucket' | 'jira' | 'teams' | 'confluence' | 'github' | 'slack';
  status: 'connected' | 'connecting' | 'error' | 'disconnected';
  lastSync?: string;
  itemCount?: number;
}

interface MCPConnectionsProps {
  servers: MCPServer[];
  onConnect: (serverId: string) => void;
  onDisconnect: (serverId: string) => void;
  onConfigure: (serverId: string) => void;
  onAddServer: () => void;
}

export const MCPConnections: React.FC<MCPConnectionsProps> = ({
  servers,
  onConnect,
  onDisconnect,
  onConfigure,
  onAddServer
}) => {

  const getServerIcon = (type: MCPServer['type']) => {
    switch (type) {
      case 'bitbucket':
      case 'github':
        return <GitBranch className="w-5 h-5" />;
      case 'jira':
        return <FileText className="w-5 h-5" />;
      case 'teams':
      case 'slack':
        return <MessageSquare className="w-5 h-5" />;
      case 'confluence':
        return <Database className="w-5 h-5" />;
      default:
        return <Database className="w-5 h-5" />;
    }
  };

  const getStatusIcon = (status: MCPServer['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'connecting':
        return <AlertCircle className="w-4 h-4 text-amber-500 animate-pulse" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'disconnected':
        return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: MCPServer['status']) => {
    switch (status) {
      case 'connected':
        return 'border-emerald-200 bg-emerald-50';
      case 'connecting':
        return 'border-amber-200 bg-amber-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'disconnected':
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">MCP Connections</h3>
          <p className="text-sm text-gray-600">Manage your connected services</p>
        </div>
        <button
          onClick={onAddServer}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Server</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {servers.map(server => (
          <div
            key={server.id}
            className={`border-2 rounded-xl p-4 transition-all hover:shadow-md ${getStatusColor(server.status)}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  {getServerIcon(server.type)}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 capitalize">{server.name}</h4>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{server.type}</p>
                </div>
              </div>
              {getStatusIcon(server.status)}
            </div>

            <div className="space-y-2 mb-4">
              {server.status === 'connected' && (
                <>
                  {server.lastSync && (
                    <p className="text-xs text-gray-600">
                      Last sync: {server.lastSync}
                    </p>
                  )}
                  {server.itemCount && (
                    <p className="text-xs text-gray-600">
                      {server.itemCount.toLocaleString()} items indexed
                    </p>
                  )}
                </>
              )}
              {server.status === 'error' && (
                <p className="text-xs text-red-600">
                  Connection failed. Check configuration.
                </p>
              )}
              {server.status === 'connecting' && (
                <p className="text-xs text-amber-600">
                  Establishing connection...
                </p>
              )}
            </div>

            <div className="flex space-x-2">
              {server.status === 'connected' ? (
                <button
                  onClick={() => onDisconnect(server.id)}
                  className="flex-1 px-3 py-2 text-xs bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => onConnect(server.id)}
                  className="flex-1 px-3 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Connect
                </button>
              )}
              <button
                onClick={() => onConfigure(server.id)}
                className="p-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors"
              >
                <Settings className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};