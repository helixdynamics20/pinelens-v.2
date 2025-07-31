# AWS Bedrock Model Troubleshooting Guide

## Common Model Availability Issues

### The Error You Encountered

```
Failed to generate response: Invocation of model ID anthropic.claude-3-5-sonnet-20241022-v2:0 
with on-demand throughput isn't supported. Retry your request with the ID or ARN of an 
inference profile that contains this model.
```

### What This Means

1. **Model Not Available**: The specific Claude 3.5 Sonnet model isn't available in your region (ap-south-1)
2. **On-Demand Throughput**: Some newer models require provisioned throughput instead of on-demand
3. **Inference Profiles**: AWS uses inference profiles to manage model access

## Fixed Model Configuration

I've updated the service to use more widely available models:

### Primary Models (Updated)
- **Claude 3 Haiku**: `anthropic.claude-3-haiku-20240307-v1:0` ✅
- **Amazon Titan Express**: `amazon.titan-text-express-v1` ✅  
- **Meta Llama 3.2 11B**: `meta.llama3-2-11b-instruct-v1:0` ✅
- **Mistral 8x7B**: `mistral.mixtral-8x7b-instruct-v0:1` ✅

### Fallback Strategy

The updated service now tries models in order:
1. **Claude 3 Haiku** (best for structured responses)
2. **Amazon Titan** (fallback if Claude fails)  
3. **Meta Llama** (second fallback)
4. **Error** if all fail

## Regional Model Availability

### ap-south-1 (Mumbai) - Your Region
✅ **Available Models:**
- Claude 3 Haiku
- Claude 3 Sonnet (older version)
- Amazon Titan Text Express
- Meta Llama 3.2 (smaller variants)
- Mistral models

❌ **Not Available:**
- Claude 3.5 Sonnet (latest)
- Claude 3 Opus
- Larger Llama models (90B+)

### Alternative Regions
If you need access to more models, consider:
- **us-east-1** (N. Virginia) - Most models available
- **us-west-2** (Oregon) - Good model selection
- **eu-west-1** (Ireland) - European option

## How to Check Model Availability

### 1. AWS Console Method
```bash
aws bedrock list-foundation-models --region ap-south-1
```

### 2. Test Component
Use the built-in test component in the AI Search interface:
- Go to "AI Search" tab
- Look for "AWS Bedrock Connection Test"
- Click "Test AWS Bedrock Connection"

### 3. Manual Verification
```javascript
// In browser console
console.log('Available models:', awsBedrockService.getAvailableModels());
```

## IAM Permissions Required

Ensure your AWS user has these permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel",
                "bedrock:ListFoundationModels",
                "bedrock:GetFoundationModel"
            ],
            "Resource": "*"
        }
    ]
}
```

## Quota Limits

### Default Limits (ap-south-1)
- **Claude 3 Haiku**: 10,000 tokens/minute
- **Titan Text Express**: 20,000 tokens/minute
- **Llama models**: 5,000 tokens/minute

### Request Quota Increases
If you hit limits:
1. Go to AWS Service Quotas
2. Search for "Amazon Bedrock"
3. Request increase for specific models

## Testing Your Setup

### Environment Variables Check
```bash
# These should all be set
echo $AWS_ACCESS_KEY_ID
echo $AWS_SECRET_ACCESS_KEY  
echo $AWS_DEFAULT_REGION
```

### Quick Test Script
```javascript
// Test in browser console after loading the app
awsBedrockService.generateWithTitan('Hello world', { maxTokens: 50 })
  .then(result => console.log('Success:', result))
  .catch(error => console.error('Failed:', error));
```

## Current Status After Fix

✅ **What's Working Now:**
- Fallback model selection
- Better error handling
- Multiple model support
- Region-appropriate model IDs

🔄 **What to Test:**
1. Go to AI Search tab
2. Check AWS Configuration Debug panel
3. Run connection test
4. Try a simple query

## Production Recommendations

### For Reliability
1. **Use Multiple Regions**: Deploy in regions with better model availability
2. **Implement Caching**: Cache responses to reduce API calls
3. **Monitor Quotas**: Set up CloudWatch alerts for quota usage
4. **Error Handling**: Always have fallback models

### For Cost Optimization
1. **Choose Right Models**: Haiku for simple tasks, Sonnet for complex
2. **Limit Tokens**: Set appropriate maxTokens based on use case
3. **Batch Requests**: Combine multiple queries when possible
4. **Cache Common Queries**: Store frequently asked questions

## Next Steps

1. **Test the Connection**: Use the test component to verify it's working
2. **Try Natural Language Queries**: Test with real search queries
3. **Monitor Usage**: Check AWS billing for Bedrock usage
4. **Scale as Needed**: Request quota increases if you need more capacity

If you continue to have issues, the debug components will show exactly what's failing and why.
