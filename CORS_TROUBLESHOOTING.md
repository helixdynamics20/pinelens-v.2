# CORS Issues with Jira Integration

## What is the CORS Error?

When you see an error like:
```
Access to fetch at 'https://qc-hub.atlassian.net/rest/api/3/myself' from origin 'http://localhost:5174' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

This is a **browser security feature** that prevents web applications from making direct API calls to external domains (like Jira) unless the external server explicitly allows it.

## Why Does This Happen?

- **Browser Security**: Modern browsers implement CORS (Cross-Origin Resource Sharing) to protect users from malicious websites
- **Jira Configuration**: Atlassian's Jira servers don't allow direct browser API calls from external domains by default
- **Development vs Production**: This affects web applications running in browsers, but not desktop applications or server-side code

## Solutions

### Option 1: Browser Extension (Development Only) ⚠️
**For testing/development purposes only:**

1. Install a CORS browser extension:
   - **Chrome**: "CORS Unblock" or "CORS Everywhere"
   - **Firefox**: "CORS Everywhere"

2. Enable the extension
3. Reload your PineLens application
4. Try connecting to Jira again

**⚠️ Warning**: Only use this for development. Don't use CORS extensions for regular browsing as they reduce security.

### Option 2: Desktop Application 🖥️
Use a desktop version of PineLens that doesn't have browser CORS restrictions.

### Option 3: Corporate Proxy 🏢
Ask your IT team to:
- Configure a CORS proxy server
- Add CORS headers to your Jira instance
- Set up a reverse proxy that adds the necessary headers

### Option 4: Hosted Solution with Backend 🌍
Use a hosted version of PineLens that includes a backend server to proxy API calls.

## Quick Test Solution

**For immediate testing**, you can:

1. **Install CORS Unblock extension** (Chrome/Edge):
   - Go to Chrome Web Store
   - Search for "CORS Unblock" 
   - Install and enable it
   - Reload PineLens and try Jira connection

2. **Or use Firefox with CORS disabled**:
   - Type `about:config` in address bar
   - Search for `security.tls.insecure_fallback_hosts`
   - Add your Jira domain

## Technical Details

The error occurs because:
1. Your browser runs PineLens at `http://localhost:5174`
2. PineLens tries to call Jira API at `https://qc-hub.atlassian.net`
3. Browser blocks this as a "cross-origin" request
4. Jira doesn't send `Access-Control-Allow-Origin` headers

This is **normal browser behavior** and indicates that security is working correctly.

## Production Solutions

For production deployments:
- Use a backend proxy server
- Configure proper CORS headers on your infrastructure
- Use server-side API calls instead of browser-based calls
- Consider using Atlassian Connect or other official integration methods
