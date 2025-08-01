// Quick test to see what's happening with Claude
import { awsBedrockService } from './src/services/awsBedrockService.js';

async function testClaude() {
  try {
    console.log('Testing Claude with simple prompt...');
    
    const testPrompt = 'Please provide a simple JavaScript function that implements the Sieve of Eratosthenes algorithm to find prime numbers up to a given limit.';
    
    const response = await awsBedrockService.generateWithClaude(testPrompt, {
      temperature: 0.7,
      maxTokens: 1000
    });
    
    console.log('Response:', response);
  } catch (error) {
    console.error('Error:', error);
  }
}

testClaude();
