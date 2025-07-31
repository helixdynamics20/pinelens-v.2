# AWS Bedrock Models Configuration Guide

## Available Models in AP-South-1 (Mumbai) Region

Your PineLens AI Search is now configured to use models that are available in the **ap-south-1** region.

### ✅ Currently Configured Models

| Model | Provider | Model ID | Use Case | Priority |
|-------|----------|----------|----------|----------|
| **Claude 3 Haiku** | Anthropic | `anthropic.claude-3-haiku-20240307-v1:0` | Structured queries, Analysis, Code | Primary |
| **Titan Text Express** | Amazon | `amazon.titan-text-express-v1` | General queries, Fast responses | Secondary |
| **Titan Text Lite** | Amazon | `amazon.titan-text-lite-v1` | Simple queries, Cost-effective | Fallback |
| **Llama 3 8B** | Meta | `meta.llama3-8b-instruct-v1:0` | Conversational AI | Optional |
| **Mistral 7B** | Mistral AI | `mistral.mistral-7b-instruct-v0:2` | Multilingual, General | Optional |

### 🎯 Model Selection Strategy

**For Structured/Analysis Queries:**
1. **Claude 3 Haiku** (Primary) - Best for JSON parsing, code analysis, structured responses
2. **Titan Text Express** (Fallback) - Good general-purpose alternative

**For General Queries:**
1. **Titan Text Express** (Primary) - Fast, cost-effective for simple queries
2. **Claude 3 Haiku** (Fallback) - Higher quality when needed

## 🔧 AWS Console Setup Required

### Step 1: Enable Model Access
1. Go to **AWS Bedrock Console** → **Model Access**
2. Request access for these models:
   - ✅ **Anthropic Claude 3 Haiku**
   - ✅ **Amazon Titan Text Express**
   - ✅ **Amazon Titan Text Lite**
   - ✅ **Meta Llama 3 8B Instruct** (Optional)
   - ✅ **Mistral 7B Instruct** (Optional)

### Step 2: Verify Region
- Ensure you're working in **ap-south-1 (Asia Pacific - Mumbai)**
- Your `.env` file is already configured for this region

### Step 3: Test Access
Use the AWS Bedrock Test component in your app to verify model access.

## 💡 Model Capabilities

### **Claude 3 Haiku** (Recommended)
- **Best for:** Structured JSON responses, code analysis, complex reasoning
- **Strengths:** High accuracy, excellent instruction following
- **Cost:** Moderate
- **Speed:** Fast

### **Amazon Titan Text Express**
- **Best for:** General text generation, summaries, simple queries
- **Strengths:** Cost-effective, fast responses, good for basic tasks
- **Cost:** Low
- **Speed:** Very fast

### **Meta Llama 3 8B**
- **Best for:** Conversational AI, creative tasks
- **Strengths:** Good reasoning, open-source flexibility
- **Cost:** Low-moderate
- **Speed:** Moderate

### **Mistral 7B**
- **Best for:** Multilingual tasks, efficient processing
- **Strengths:** Compact model, good performance-to-size ratio
- **Cost:** Low
- **Speed:** Fast

## 🚨 Important Notes

1. **Model Availability:** Not all Bedrock models are available in all regions
2. **Access Request:** Some models require explicit access request approval
3. **Cost Optimization:** The system automatically selects cost-effective models for different query types
4. **Fallback Strategy:** If the primary model fails, the system automatically tries alternatives

## 🧪 Testing Your Configuration

1. **Open your app:** `http://localhost:5173`
2. **Go to AI Search tab**
3. **Try these test queries:**
   - "find Python projects with machine learning" (tests repository search)
   - "show me recent GitHub issues" (tests structured queries)
   - "summarize my recent activity" (tests general queries)

## 📊 Monitoring and Debugging

Your app includes built-in debugging tools:
- **AWS Config Debug** - Shows environment variables and connection status
- **AWS Bedrock Test** - Tests individual model calls
- **Error Display** - Shows detailed error information with troubleshooting

## 🔄 Model Updates

To add or change models:

1. **Update `awsBedrockService.ts`:**
   - Modify `getAvailableModels()` method
   - Add new model methods if needed
   - Update selection strategy in `generateResponse()`

2. **Request new model access in AWS Console**

3. **Test the changes using the debug tools**

## 💰 Cost Considerations

Models are ordered by cost-effectiveness for your region:

1. **Amazon Titan Text Lite** - Lowest cost
2. **Amazon Titan Text Express** - Low cost, good performance
3. **Mistral 7B** - Low-moderate cost
4. **Meta Llama 3 8B** - Moderate cost
5. **Claude 3 Haiku** - Higher cost, best quality

The smart selection strategy automatically optimizes for cost while maintaining quality.
