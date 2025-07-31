/**
 * Simple CORS Proxy Server for Jira API
 * Run this to bypass CORS restrictions during development
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());

// Proxy middleware for Jira API
app.use('/jira-proxy', createProxyMiddleware({
  target: 'https://qc-hub.atlassian.net',
  changeOrigin: true,
  pathRewrite: {
    '^/jira-proxy': '', // Remove /jira-proxy from the path
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`🔄 Proxying: ${req.method} ${req.url}`);
  },
  onError: (err, req, res) => {
    console.error('❌ Proxy error:', err);
    res.status(500).json({ error: 'Proxy error', details: err.message });
  }
}));

app.listen(PORT, () => {
  console.log(`🚀 CORS Proxy server running on http://localhost:${PORT}`);
  console.log(`🔗 Use http://localhost:${PORT}/jira-proxy instead of https://qc-hub.atlassian.net`);
  console.log('');
  console.log('📋 Setup Instructions:');
  console.log('1. Leave this server running');
  console.log('2. In PineLens Jira config, use: http://localhost:3001/jira-proxy');
  console.log('3. Keep your email and API token the same');
});
