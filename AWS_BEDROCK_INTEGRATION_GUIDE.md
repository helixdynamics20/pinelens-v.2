# AWS Bedrock AI Integration Guide

## Overview

This project now includes full AWS Bedrock integration for AI-powered natural language query processing. The system can understand user queries, determine which MCP (Model Context Protocol) servers to call, and format responses intelligently.

## Features

### 🤖 Advanced AI Query Processing
- **Natural Language Understanding**: Uses AWS Bedrock Claude models to understand user intent
- **Smart MCP Routing**: Automatically determines which services (GitHub, Jira, etc.) to query
- **Intelligent Response Formatting**: AI formats results in the most appropriate way

### 🚀 Multiple AWS Models Supported
- **Claude 3.5 Sonnet**: Best for structured analysis and complex reasoning
- **Claude 3 Haiku**: Fast responses for simple queries
- **Amazon Titan**: Good for general text generation
- **Meta Llama**: Excellent for conversation and code
- **Mistral**: Strong multilingual capabilities

## Configuration

### Environment Variables

Create a `.env` file in the project root with your AWS credentials:

```env
# AWS Configuration - Primary AI Provider
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_access_key_here
AWS_DEFAULT_REGION=ap-south-1
AWS_REGION=ap-south-1
AWS_BEDROCK_ENABLED=true

# AWS Bedrock Configuration
AWS_BEDROCK_REGION=ap-south-1
```

### Required Permissions

Your AWS IAM user/role needs the following permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel",
                "bedrock:ListFoundationModels"
            ],
            "Resource": "*"
        }
    ]
}
```

## Usage

### 1. Access AI Search Interface

Navigate to the "AI Search" tab in the application header.

### 2. Natural Language Queries

You can ask questions in natural language:

```
"Show me my recent GitHub pull requests"
"Find Python machine learning projects"
"Get issues assigned to me in Jira"
"Search for documentation about authentication"
```

### 3. Query Processing Flow

1. **Intent Analysis**: AI analyzes your query to understand what you want
2. **Action Planning**: Determines which MCP servers to call and with what parameters
3. **Execution**: Calls the appropriate services in parallel
4. **Response Formatting**: AI formats the results into a readable response

## Architecture

### Core Components

```
User Query → AWS Bedrock → Query Intent → MCP Actions → Formatted Response
```

### Key Services

1. **`awsBedrockService.ts`**: Handles AWS Bedrock API calls
2. **`enhancedAIQueryProcessor.ts`**: Main query processing logic
3. **`AISearchInterface.tsx`**: React component for the user interface

### Model Selection Strategy

The system automatically selects the best model based on query type:

- **Analysis/Structured**: Claude 3.5 Sonnet (best for JSON responses)
- **Code**: Claude models (excellent code understanding)
- **General**: Claude as default (balanced performance)

## Examples

### Example 1: Repository Search
```
Query: "find react typescript projects"

AI Response:
Intent: Search for repositories using React and TypeScript
Actions: 
- GitHub search_repositories with language filters
- Priority: 9/10

Result: Formatted list of matching repositories with stars, descriptions, and links
```

### Example 2: Issue Management
```
Query: "show me open bugs assigned to me"

AI Response:  
Intent: Find open issues with bug labels assigned to current user
Actions:
- GitHub search_issues (assignee:@me, label:bug, state:open)  
- Jira search_issues (assignee:currentUser, type:bug)
- Priority: 10/10, 8/10

Result: Combined view of issues from both systems
```

## Error Handling

The system includes comprehensive error handling:

- **Service Unavailable**: Falls back to basic search if AWS is not configured
- **API Limits**: Graceful degradation with retry logic
- **Network Issues**: Timeout handling and error messages
- **Invalid Queries**: Provides suggestions and examples

## Performance Optimizations

- **Parallel Execution**: Multiple MCP calls happen simultaneously
- **Caching**: Results cached to avoid redundant API calls
- **Streaming**: Large responses streamed for better UX
- **Timeout Management**: Prevents hanging requests

## Security Considerations

- **Credentials**: Environment variables only, never committed to code
- **Data Privacy**: Queries processed securely through AWS
- **Access Control**: Respects existing MCP server permissions
- **Audit Logging**: All AI requests logged for debugging

## Troubleshooting

### Common Issues

1. **"AWS Bedrock service is not configured"**
   - Check your `.env` file has the correct AWS credentials
   - Verify IAM permissions for Bedrock access
   - Ensure AWS region supports Bedrock

2. **"Failed to generate response"**
   - Check AWS quota limits
   - Verify model availability in your region
   - Check network connectivity

3. **"No MCP servers available"**
   - Configure at least one MCP server (GitHub, Jira, etc.)
   - Check MCP server connection status

### Debug Mode

Enable debug mode by clicking the debug button to see:
- Raw AI responses
- MCP execution details
- Performance metrics
- Error stack traces

## Development

### Adding New Models

To add support for new AWS Bedrock models:

1. Update `awsBedrockService.ts` with the new model ID
2. Add model-specific request/response parsing
3. Update the model selection logic in `enhancedAIQueryProcessor.ts`

### Extending Query Types

To support new types of queries:

1. Update the system prompt in `buildSystemPrompt()`
2. Add new MCP action types
3. Update the response formatting logic

### Testing

Run the built-in AWS Bedrock test:
1. Go to AI Search tab
2. Click "Test AWS Bedrock" button
3. Verify successful connection

## Cost Optimization

- **Model Selection**: Use cheaper models (Haiku) for simple queries
- **Token Limits**: Set appropriate max token limits
- **Caching**: Cache frequent queries to reduce API calls
- **Monitoring**: Monitor AWS costs through CloudWatch

## Future Enhancements

- [ ] Support for more AWS regions
- [ ] Custom model fine-tuning
- [ ] Voice query support
- [ ] Multi-language support
- [ ] Advanced analytics and insights
- [ ] Real-time collaboration features

## Support

For issues or questions:
1. Check the debug panel for detailed error information
2. Review AWS CloudWatch logs
3. Verify IAM permissions and quotas
4. Check the GitHub repository for updates
