// Utility to get MCP server connection status for Integrations page
import { mcpClient } from './mcpClient';

export function getMCPServiceStatuses() {
  // Returns a map of { [type]: { isConfigured, isConnected, name, id, lastSync, itemCount } }
  const statuses = {};
  const servers = mcpClient.getServers();
  for (const server of servers) {
    statuses[server.type] = {
      isConfigured: true,
      isConnected: server.status === 'connected',
      name: server.name,
      id: server.id,
      lastSync: server.lastSync,
      itemCount: server.itemCount
    };
  }
  return statuses;
}
