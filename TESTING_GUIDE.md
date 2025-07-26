# 🧪 GitHub Models API Testing Guide

## 📝 Quick Test Steps

### 1. **Add Your New GitHub Token**

You have several options to add your new GitHub token:

#### Option A: Using the Test Page
1. Open: http://localhost:5173/../test-github-models.html (or the test file I created)
2. Paste your new GitHub token in the input field
3. Click "💾 Save Token"

#### Option B: Using Your Main App
1. Open: http://localhost:5173
2. Click "Setup GitHub Token" button
3. Enter your new token
4. Click "Save GitHub Token"

#### Option C: Browser Console (Quick)
1. Open your browser's Developer Tools (F12)
2. Go to Console tab
3. Run: `localStorage.setItem('github_token', 'your_token_here')`

### 2. **Test the GitHub Models API**

#### Using the Test Page:
1. Go to the test page: `test-github-models.html`
2. Click "🧪 Test API" button
3. Watch the output for:
   - ✅ GitHub API access confirmed
   - ✅ GitHub Models API access confirmed
   - 📋 List of available models
   - ✅ Chat completion successful

#### Using Your Main App:
1. Go to: http://localhost:5173
2. Open Browser Console (F12)
3. Search for something using AI mode
4. Watch console logs for model loading and responses

### 3. **What to Look For**

#### ✅ **Success Indicators:**
- `✅ GitHub token is valid for API access`
- `✅ GitHub Models API access confirmed`
- `✅ Found X available models from GitHub Models API`
- Model list showing: `openai/gpt-4.1`, `anthropic/claude-3`, etc.
- `✅ Chat completion successful!`

#### ❌ **Error Indicators:**
- `❌ Authentication failed` → Check token permissions
- `❌ Access denied` → May need GitHub Copilot subscription
- `❌ Failed to fetch models: 404` → API endpoint might be different

## 🔧 **Troubleshooting**

### **If you get 401 (Authentication Failed):**
1. **Token Type**: Make sure you're using a Fine-grained Personal Access Token
   - Create at: https://github.com/settings/tokens?type=beta
   - NOT the classic tokens

2. **Token Permissions**: Your token needs:
   - ✅ **Repository access** (select specific repos or all)
   - ✅ **Account permissions**:
     - Contents: Read
     - Metadata: Read
     - Pull requests: Read (if you want PR search)
     - Issues: Read (if you want issue search)

### **If you get 403 (Access Denied):**
1. **GitHub Models Access**: You might need:
   - GitHub Copilot Pro subscription
   - GitHub Models beta access
   - Check: https://github.com/marketplace/models

2. **Token Scope**: Make sure token has broad enough permissions

### **If you get 404 (Not Found):**
1. The GitHub Models API might be:
   - Beta/preview only
   - Different endpoint
   - Requires special access

## 🎯 **Expected Token Format**

```
github_pat_11XXXXXXXXX_YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
```

**NOT:**
```
ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  (Classic token)
```

## 📊 **What Your App Should Show**

After successful setup, in your search app you should see:

1. **AI Models Available**: In the model dropdown, you'll see models like:
   - `openai/gpt-4.1 (OpenAI GPT-4.1) by GitHub Models (OpenAI)`
   - `anthropic/claude-3 (Claude 3) by GitHub Models (Anthropic)`

2. **Search Working**: AI-powered search should work without needing separate OpenAI/Anthropic keys

3. **Console Logs**: Should show successful model loading and API calls

## 🚀 **Next Steps After Success**

1. **Test Different Models**: Try searching with different AI models
2. **Check Rate Limits**: GitHub Models API has its own rate limits
3. **Monitor Usage**: Keep track of API usage in GitHub settings
4. **Production Setup**: Consider rate limiting and error handling for production

## 📞 **If Still Having Issues**

1. **Share Console Output**: Copy any error messages from browser console
2. **Token Permissions**: Double-check token was created with proper permissions
3. **GitHub Status**: Check if GitHub Models API is having issues
4. **Alternative**: If GitHub Models isn't working, we can fall back to direct OpenAI/Anthropic API keys

---

**🎉 Once working, you'll have AI-powered search using just your GitHub token - no need for separate API keys!**
