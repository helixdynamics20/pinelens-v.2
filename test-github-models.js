// Test script for GitHub Models API
// Run this in the browser console to test your GitHub token

async function testGitHubModelsAPI() {
    console.log('🔍 Testing GitHub Models API Integration...\n');
    
    // Get token from localStorage
    const token = localStorage.getItem('github_token');
    
    if (!token) {
        console.error('❌ No GitHub token found in localStorage');
        console.log('💡 Please add your GitHub token first using the "Setup GitHub Token" button');
        return;
    }
    
    console.log('✅ GitHub token found:', token.substring(0, 10) + '...');
    
    try {
        // Test 1: Check basic GitHub API access
        console.log('\n📡 Testing basic GitHub API access...');
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'PineLens-Search-App'
            }
        });
        
        if (userResponse.ok) {
            const userData = await userResponse.json();
            console.log('✅ GitHub API access confirmed');
            console.log(`👤 Connected as: ${userData.name || userData.login}`);
        } else {
            console.error('❌ GitHub API access failed:', userResponse.status);
            return;
        }
        
        // Test 2: Check GitHub Models API access
        console.log('\n🤖 Testing GitHub Models API access...');
        const modelsResponse = await fetch('https://models.github.ai/catalog/models', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'PineLens-Search-App'
            }
        });
        
        if (modelsResponse.ok) {
            const models = await modelsResponse.json();
            console.log(`✅ GitHub Models API access confirmed`);
            console.log(`📋 Found ${models.length} available models:`);
            
            models.forEach((model, index) => {
                console.log(`${index + 1}. ${model.id} (${model.name}) by ${model.publisher}`);
            });
            
            // Test 3: Try a simple chat completion
            if (models.length > 0) {
                console.log('\n💬 Testing chat completion with first model...');
                const testModel = models[0].id;
                
                const chatResponse = await fetch('https://models.github.ai/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github+json',
                        'Content-Type': 'application/json',
                        'X-GitHub-Api-Version': '2022-11-28',
                        'User-Agent': 'PineLens-Search-App'
                    },
                    body: JSON.stringify({
                        model: testModel,
                        messages: [
                            {
                                role: 'user',
                                content: 'Hello! Please respond with "GitHub Models API is working!" if you can read this.'
                            }
                        ],
                        temperature: 0.7,
                        max_tokens: 50
                    })
                });
                
                if (chatResponse.ok) {
                    const chatResult = await chatResponse.json();
                    console.log('✅ Chat completion successful!');
                    console.log('🤖 Model response:', chatResult.choices[0].message.content);
                } else {
                    const errorText = await chatResponse.text();
                    console.error('❌ Chat completion failed:', chatResponse.status, errorText);
                }
            }
            
        } else {
            const errorText = await modelsResponse.text();
            console.error('❌ GitHub Models API access failed:', modelsResponse.status, errorText);
            
            if (modelsResponse.status === 401) {
                console.log('🔑 Authentication failed. Your token might not have the required permissions.');
                console.log('💡 Make sure your GitHub token has access to GitHub Models API.');
            } else if (modelsResponse.status === 403) {
                console.log('🚫 Access denied. You might need a GitHub Copilot subscription.');
                console.log('💡 Check if you have access to GitHub Models at: https://github.com/marketplace/models');
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
    }
    
    console.log('\n🏁 Test completed!');
}

// Export for browser console use
window.testGitHubModelsAPI = testGitHubModelsAPI;

// Auto-run if called directly
if (typeof window !== 'undefined') {
    console.log('🔧 GitHub Models API Test Script Loaded');
    console.log('📝 Run testGitHubModelsAPI() in console to test your setup');
}
