#!/usr/bin/env node

/**
 * Setup script for PineLens In-House MCP Servers
 * This script helps configure and start the Jira and Bitbucket MCP servers
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class MCPSetup {
  constructor() {
    this.servers = new Map();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      error: '\x1b[31m',   // Red
      warning: '\x1b[33m', // Yellow
      reset: '\x1b[0m'     // Reset
    };
    
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  async checkDependencies() {
    this.log('Checking dependencies...');
    
    const packageJsonPath = path.join(__dirname, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('package.json not found. Please run this script from the mcp-servers directory.');
    }

    const nodeModulesPath = path.join(__dirname, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      this.log('Installing dependencies...', 'warning');
      await this.runCommand('npm', ['install'], __dirname);
    }

    this.log('Dependencies OK', 'success');
  }

  async startServer(name, scriptPath) {
    return new Promise((resolve, reject) => {
      this.log(`Starting ${name} server...`);
      
      const server = spawn('node', [scriptPath], {
        cwd: __dirname,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let isStarted = false;

      server.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('running on stdio')) {
          if (!isStarted) {
            isStarted = true;
            this.log(`${name} server started successfully`, 'success');
            resolve(server);
          }
        }
      });

      server.stderr.on('data', (data) => {
        const output = data.toString();
        if (output.includes('running on stdio')) {
          if (!isStarted) {
            isStarted = true;
            this.log(`${name} server started successfully`, 'success');
            resolve(server);
          }
        } else {
          this.log(`${name} stderr: ${output}`, 'warning');
        }
      });

      server.on('error', (error) => {
        this.log(`${name} server error: ${error.message}`, 'error');
        if (!isStarted) {
          reject(error);
        }
      });

      server.on('exit', (code) => {
        this.log(`${name} server exited with code ${code}`, code === 0 ? 'info' : 'error');
        this.servers.delete(name);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!isStarted) {
          reject(new Error(`${name} server failed to start within 10 seconds`));
        }
      }, 10000);

      this.servers.set(name, server);
    });
  }

  async startAllServers() {
    try {
      await this.checkDependencies();
      
      this.log('Starting all MCP servers...');
      
      const jiraServer = await this.startServer('Jira', 'jira-inhouse-server.js');
      const bitbucketServer = await this.startServer('Bitbucket', 'bitbucket-inhouse-server.js');
      
      this.log('All servers started successfully!', 'success');
      this.log('');
      this.log('Server Status:');
      this.log('- Jira MCP Server: Running');
      this.log('- Bitbucket MCP Server: Running');
      this.log('');
      this.log('You can now configure the servers through the PineLens UI at http://localhost:5174');
      this.log('');
      this.log('Press Ctrl+C to stop all servers');

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        this.log('\nShutting down servers...', 'warning');
        this.stopAllServers();
      });

      process.on('SIGTERM', () => {
        this.log('\nShutting down servers...', 'warning');
        this.stopAllServers();
      });

      // Keep the process alive
      return new Promise(() => {});

    } catch (error) {
      this.log(`Setup failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }

  stopAllServers() {
    for (const [name, server] of this.servers) {
      this.log(`Stopping ${name} server...`, 'warning');
      server.kill('SIGTERM');
    }
    
    setTimeout(() => {
      process.exit(0);
    }, 2000);
  }

  async runCommand(command, args, cwd = __dirname) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, { cwd, stdio: 'inherit' });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });

      process.on('error', reject);
    });
  }

  showHelp() {
    console.log(`
PineLens MCP Servers Setup

Usage:
  node setup.js [command]

Commands:
  start     Start all MCP servers (default)
  help      Show this help message

Examples:
  node setup.js           # Start all servers
  node setup.js start     # Start all servers
  node setup.js help      # Show help

The servers will start in the background and you can configure them
through the PineLens web interface at http://localhost:5174
`);
  }
}

// Main execution
const setup = new MCPSetup();
const command = process.argv[2] || 'start';

switch (command) {
  case 'start':
    setup.startAllServers();
    break;
  case 'help':
  case '--help':
  case '-h':
    setup.showHelp();
    break;
  default:
    console.log(`Unknown command: ${command}`);
    setup.showHelp();
    process.exit(1);
}
