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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'CORS Proxy server is running' });
});

// Proxy middleware for Jira API
app.use('/jira-proxy', createProxyMiddleware({
  target: 'https://qc-hub.atlassian.net',
  changeOrigin: true,
  pathRewrite: {
    '^/jira-proxy': '', // Remove /jira-proxy from the path
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`🔄 Proxying: ${req.method} ${req.url} -> https://qc-hub.atlassian.net${proxyReq.path}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`✅ Response: ${proxyRes.statusCode} for ${req.url}`);
  },
  onError: (err, req, res) => {
    console.error('❌ Proxy error:', err.message);
    res.status(500).json({ error: 'Proxy error', details: err.message });
  }
}));

app.listen(PORT, () => {
  console.log(`🚀 CORS Proxy server running on http://localhost:${PORT}`);
  console.log(`🔗 Proxy endpoint: http://localhost:${PORT}/jira-proxy`);
  console.log(`🩺 Health check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('📋 Setup Instructions:');
  console.log('1. Leave this server running');
  console.log('2. In PineLens Jira config, use server URL: https://qc-hub.atlassian.net');
  console.log('3. Use your Atlassian email and the API token provided');
  console.log('4. The proxy will automatically forward requests if direct connection fails');
  console.log('5. Test with issue NSVP-27299 to verify connection');
});
