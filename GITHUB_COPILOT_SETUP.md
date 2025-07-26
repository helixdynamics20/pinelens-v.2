# GitHub Copilot Pro Integration Setup

## Overview
PineLens now supports GitHub Copilot Pro models, giving you access to premium AI models like GPT-4, Claude 3.5 Sonnet, o1-preview, and o1-mini directly in your search interface.

## Prerequisites
- Active GitHub Copilot Pro subscription
- GitHub Personal Access Token with appropriate permissions

## Setup Instructions

### 1. Get Your GitHub Personal Access Token
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Select the following scopes:
   - `repo` (if accessing private repositories)
   - `user` (to verify your identity)
   - `read:org` (if using organization features)
4. Copy the generated token

### 2. Configure GitHub Copilot Pro in PineLens
1. Click the "Configure Services" button in the search interface
2. Select "GitHub Copilot Pro" from the service types
3. Enter your GitHub username
4. Paste your Personal Access Token
5. Click "Add Server"

### 3. Verify Your Setup
1. Check that the model dropdown now shows **only** the GitHub Copilot Pro models you have access to with 🚀 icons:
   - 🚀 GPT-4 (GitHub Copilot Pro) - if available to your subscription
   - 🚀 Claude 3.5 Sonnet (GitHub Copilot Pro) - if available to your subscription
   - 🚀 GPT-4o (GitHub Copilot Pro) - if available to your subscription
   - 🚀 o1-preview (GitHub Copilot Pro) - if available to your subscription
   - 🚀 o1-mini (GitHub Copilot Pro) - if available to your subscription

2. Switch to "AI" search mode and see only your accessible models in advanced options
3. **Note**: If no models appear, it means your GitHub token doesn't have access to Copilot Pro models

### 4. Using GitHub Copilot Pro Models
1. Select a GitHub Copilot Pro model from the dropdown
2. Switch to "AI" search mode
3. Enter your search query
4. The system will use your GitHub Copilot Pro subscription to generate responses

## Available Models

### GitHub Copilot Pro Models
- **GPT-4**: Most capable model for complex reasoning and analysis
- **Claude 3.5 Sonnet**: Excellent for writing, analysis, and code review
- **GPT-4o**: Optimized for speed and efficiency
- **o1-preview**: Advanced reasoning model for complex problems
- **o1-mini**: Faster reasoning model for simpler tasks

## Key Features - Updated Behavior

### Dynamic Model Detection
- **Smart Access Checking**: PineLens now tests actual access to each GitHub Copilot Pro model
- **Real-time Availability**: Only models you can actually use are displayed in the interface
- **No False Promises**: No more seeing models you don't have access to
- **Automatic Fallback**: If no premium models are available, a demo model is provided

### Visual Indicators
- **🚀 Premium Badge**: GitHub Copilot Pro models show with rocket icon
- **Provider Labels**: Clear indication of which service provides each model
- **Access Status**: Only accessible models appear in dropdowns and selections

### Seamless Integration
- **API Testing**: System automatically tests each model endpoint for availability
- **Error Handling**: Graceful fallback when models are not accessible
- **Real-time Updates**: Model availability updates when you configure new services

## Troubleshooting

### Models Not Appearing
**This is now the expected behavior!** PineLens only shows models you actually have access to.

1. **If no GitHub Copilot Pro models appear**:
   - Your GitHub token may not have Copilot Pro access
   - Verify your GitHub Copilot Pro subscription is active
   - Check that the token has the required scopes
   - Try generating a new Personal Access Token

2. **If only some models appear**:
   - This is normal - GitHub Copilot Pro access may vary by model
   - Your subscription may have access to specific models only
   - Some models may be temporarily unavailable

3. **If only demo models appear**:
   - No valid API keys or GitHub Copilot Pro access found
   - Configure at least one AI service to see real models

### Authentication Errors
1. Generate a new Personal Access Token
2. Make sure your GitHub account has Copilot Pro enabled
3. Check token expiration date

### API Rate Limits
GitHub Copilot Pro has usage limits. If you encounter rate limiting:
1. Wait a few minutes before making more requests
2. Consider using other available models temporarily
3. Check your GitHub Copilot Pro usage dashboard

## Security Notes
- Your GitHub token is stored locally in your browser
- Tokens are never sent to third-party services
- Consider using a token with minimal required scopes
- Regularly rotate your tokens for security

## Support
If you encounter issues:
1. Check your GitHub Copilot Pro subscription status
2. Verify token permissions in GitHub settings
3. Try generating a new token
4. Check the browser console for error messages
