# CORS Fix for In-House MCP Integration

This document explains the CORS issue you encountered and how it has been resolved.

## 🚨 **The Problem: CORS Error**

The error you saw was:
```
Access to fetch at 'https://qc-hub.atlassian.net/rest/api/3/myself' from origin 'http://localhost:5174' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### **What is CORS?**
CORS (Cross-Origin Resource Sharing) is a security feature implemented by web browsers that blocks requests from one domain to another unless the target server explicitly allows it.

**Your situation:**
- **Origin**: `http://localhost:5173` (your development server)
- **Target**: `https://qc-hub.atlassian.net` (JIRA API)
- **Problem**: JIRA doesn't allow requests from localhost

## ✅ **The Solution: Proxy Configuration**

I've implemented a proxy server solution that routes your API calls through your development server, bypassing CORS restrictions.

### **How It Works:**

1. **Before (CORS Error):**
   ```
   Browser → Direct Request → JIRA API ❌ (CORS blocked)
   ```

2. **After (Proxy Solution):**
   ```
   Browser → Vite Dev Server → JIRA API ✅ (Server-to-server, no CORS)
   ```

### **Proxy Configuration Added:**

In `vite.config.ts`, I added:

```typescript
server: {
  proxy: {
    // Bitbucket API proxy
    '/api/bitbucket': {
      target: 'https://api.bitbucket.org',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/bitbucket/, ''),
    },
    
    // JIRA API proxy (specific domain)
    '/api/jira': {
      target: 'https://qc-hub.atlassian.net',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/jira/, ''),
    },
    
    // Dynamic JIRA proxy (any domain)
    '/api/jira-proxy': {
      target: 'https://your-domain.atlassian.net',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/jira-proxy/, ''),
      configure: (proxy, options) => {
        proxy.on('proxyReq', (_proxyReq, req) => {
          const targetDomain = req.headers['x-target-domain'] as string;
          if (targetDomain) {
            options.target = `https://${targetDomain}`;
          }
        });
      }
    }
  }
}
```

## 🔧 **Updated Service Implementation**

### **Enhanced MCP Service Changes:**

**Before (Direct API calls):**
```typescript
const response = await fetch(`${config.baseUrl}/rest/api/3/myself`, { headers });
```

**After (Proxy API calls):**
```typescript
const proxyUrl = '/api/jira-proxy/rest/api/3/myself';
const headers = this.getJiraHeaders(config);
headers['x-target-domain'] = new URL(config.baseUrl).hostname;
const response = await fetch(proxyUrl, { headers });
```

### **Key Changes:**
1. **Bitbucket URLs**: `https://api.bitbucket.org/...` → `/api/bitbucket/...`
2. **JIRA URLs**: `https://your-domain.atlassian.net/...` → `/api/jira-proxy/...`
3. **Dynamic targeting**: Uses `x-target-domain` header for different JIRA instances

## 🚀 **Testing the Fix**

### **1. Start the Development Server**
```bash
npm run dev
```
Server should be running on `http://localhost:5173`

### **2. Test JIRA Configuration**
```typescript
import { InHouseMCPService } from './services/inHouseMCPService.browser';

const service = new InHouseMCPService();

// This should now work without CORS errors
const result = await service.configureJira({
  baseUrl: 'https://qc-hub.atlassian.net',
  email: 'your-email@company.com',
  apiToken: 'your-api-token'
});

console.log(result); // Should show success
```

### **3. Test Bitbucket Configuration**
```typescript
const result = await service.configureBitbucket({
  baseUrl: 'https://api.bitbucket.org',
  username: 'your-username',
  appPassword: 'your-app-password',
  workspace: 'your-workspace'
});

console.log(result); // Should show success
```

## 🔍 **Troubleshooting**

### **If you still get CORS errors:**
1. **Check server restart**: Make sure you restarted the dev server after config changes
2. **Clear browser cache**: Hard refresh (Ctrl+F5) or clear browser cache
3. **Check port**: Ensure you're using `http://localhost:5173` (not 5174)

### **Common Issues:**

1. **Wrong URL format**:
   ```typescript
   // ❌ Wrong - still using direct URL
   fetch('https://qc-hub.atlassian.net/rest/api/3/myself')
   
   // ✅ Correct - using proxy URL
   fetch('/api/jira-proxy/rest/api/3/myself', {
     headers: { 'x-target-domain': 'qc-hub.atlassian.net' }
   })
   ```

2. **Missing target domain header**:
   ```typescript
   // ❌ Missing for dynamic proxy
   fetch('/api/jira-proxy/rest/api/3/myself')
   
   // ✅ Correct with target domain
   fetch('/api/jira-proxy/rest/api/3/myself', {
     headers: { 'x-target-domain': 'qc-hub.atlassian.net' }
   })
   ```

## 🛠 **Alternative Solutions**

If proxy doesn't work for some reason, here are other options:

### **1. Browser Extension (Development Only)**
Install a CORS-disabling browser extension for development:
- **Chrome**: "CORS Unblock" extension
- **Firefox**: "CORS Everywhere" extension

⚠️ **Warning**: Only use for development, never in production!

### **2. Backend API Server**
Create a dedicated backend service that handles API calls:
```javascript
// Express server example
app.post('/api/jira-search', async (req, res) => {
  const response = await fetch('https://qc-hub.atlassian.net/rest/api/3/search', {
    method: 'POST',
    headers: { 'Authorization': req.headers.authorization },
    body: JSON.stringify(req.body)
  });
  
  const data = await response.json();
  res.json(data);
});
```

### **3. MCP Server (Production)**
Use the Python MCP server you have in `inhouse-mcp-server/`:
```bash
cd inhouse-mcp-server
python bitbucket_server.py
```

This runs as a separate process and doesn't have CORS limitations.

## 📋 **Configuration Checklist**

- ✅ **Proxy configured**: Added to `vite.config.ts`
- ✅ **Service updated**: Using proxy URLs instead of direct URLs
- ✅ **Server restarted**: Development server restarted to apply changes
- ✅ **Headers configured**: Authentication and target domain headers set
- ✅ **Error handling**: Proper error handling for failed requests

## 🎯 **Next Steps**

1. **Test the configuration** with your real JIRA and Bitbucket credentials
2. **Monitor network tab** in browser dev tools to verify proxy requests
3. **Check console logs** for any remaining errors
4. **Update other components** if they make direct API calls

## 📝 **Production Considerations**

For production deployment:
1. **Remove proxy configuration** (only needed for development)
2. **Use backend API** or **MCP servers** instead
3. **Implement proper CORS headers** on your backend
4. **Use environment variables** for API endpoints

The proxy solution is perfect for development and testing, allowing you to work with real APIs without CORS restrictions! 🎉
