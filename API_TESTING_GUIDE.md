# API Integration Testing & Debugging Guide

## Current Configuration Status

### ✅ Fixed Issues:
1. **Direct API Calls**: All methods now use direct URLs instead of proxy endpoints
2. **CORS Support**: Added `mode: 'cors'` to all fetch requests
3. **Enhanced Error Logging**: Detailed error messages with status codes and response text
4. **Proxy Backup**: Vite proxy available for fallback if needed

### 🔧 Updated Methods:
- `configureBitbucket()` - Uses direct `${config.baseUrl}/2.0/user`
- `configureJira()` - Uses direct `${config.baseUrl}/rest/api/3/myself`
- `searchBitbucketRepositories()` - Uses direct API calls
- `getBitbucketRepository()` - Uses direct API calls
- `searchBitbucketCode()` - Uses direct API calls
- `searchJiraIssues()` - Uses direct API calls (already fixed)

## Testing Steps

### 1. Clear Browser Cache & Restart
```powershell
# Stop the dev server (Ctrl+C in terminal)
# Clear browser cache and reload
# Restart dev server
npm run dev
```

### 2. Test JIRA Configuration
1. Open browser console (F12)
2. Navigate to Integrations → In-House MCP
3. Enter JIRA credentials:
   - **Base URL**: `https://qc-hub.atlassian.net`
   - **Email**: Your Atlassian email
   - **API Token**: Your JIRA API token
4. Click "Connect to JIRA"

**Expected Console Output:**
```
🔧 Configuring JIRA... {baseUrl: "https://qc-hub.atlassian.net", email: "your@email.com"}
🔑 Using real JIRA credentials
🌐 Testing JIRA connection to: https://qc-hub.atlassian.net/rest/api/3/myself
✅ Connected to JIRA as [Your Name]
```

### 3. Test Bitbucket Configuration
1. Enter Bitbucket credentials:
   - **Base URL**: `https://api.bitbucket.org`
   - **Username**: Your Bitbucket username
   - **App Password**: Your app password
   - **Workspace**: Your workspace name
2. Click "Connect to Bitbucket"

**Expected Console Output:**
```
🔧 Configuring Bitbucket... {baseUrl: "https://api.bitbucket.org", username: "your-username"}
🔑 Using real Bitbucket credentials
🌐 Testing Bitbucket connection to: https://api.bitbucket.org/2.0/user
✅ Connected to Bitbucket as [Your Name]
```

## Troubleshooting

### If Still Getting CORS Errors:

#### Option 1: Use Proxy Endpoints (Temporary Fix)
If direct API calls still fail, you can temporarily modify the service to use proxy endpoints:

1. Change `${config.baseUrl}/2.0/user` to `/api/bitbucket/2.0/user`
2. Change `${config.baseUrl}/rest/api/3/myself` to `/api/jira/rest/api/3/myself`

#### Option 2: Browser Extension (Development Only)
Install a CORS browser extension like "CORS Unblock" for development testing.

#### Option 3: Check Network Tab
1. Open browser DevTools → Network tab
2. Try the connection again
3. Look for the actual HTTP requests and responses
4. Check if requests are being blocked or redirected

### Common Error Patterns:

#### 404 Not Found
- **Cause**: Incorrect API endpoint URL
- **Fix**: Verify the base URL format (https://qc-hub.atlassian.net vs https://qc-hub.atlassian.net/)

#### 401 Unauthorized  
- **Cause**: Invalid credentials or expired tokens
- **Fix**: Generate new API tokens, verify email/username

#### CORS Policy Error
- **Cause**: Browser blocking cross-origin requests
- **Fix**: Use proxy endpoints or enable browser CORS

## Development Server Status
- **Running**: Check that `npm run dev` is active
- **Port**: Should be accessible at `http://localhost:5173`
- **Proxy**: Bitbucket and JIRA proxies configured in vite.config.ts

## Next Steps
1. Test with the updated service code
2. Check browser console for detailed error messages
3. If still failing, switch to proxy endpoints temporarily
4. Report specific error messages for further debugging

## Quick Test Commands

```javascript
// Test in browser console after page load
// Check if service is loaded
console.log('Service available:', !!window.enhancedMCPService);

// Test CORS directly
fetch('https://api.bitbucket.org/2.0/user', {
  headers: {
    'Authorization': 'Basic ' + btoa('username:app_password'),
    'Accept': 'application/json'
  },
  mode: 'cors'
}).then(r => console.log('Direct API test:', r.status));
```

The service should now work correctly with direct API calls and proper CORS handling!
