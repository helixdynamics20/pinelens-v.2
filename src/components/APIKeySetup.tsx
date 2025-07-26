import React, { useState } from 'react';
import { geminiService } from '../services/geminiService';

interface APIKeySetupProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const APIKeySetup: React.FC<APIKeySetupProps> = ({ isOpen, onClose, onSave }) => {
  const [geminiKey, setGeminiKey] = useState(geminiService.getApiKey() || '');
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyTestResult, setKeyTestResult] = useState<'success' | 'error' | null>(null);

  const handleSave = async () => {
    if (geminiKey.trim()) {
      geminiService.setApiKey(geminiKey.trim());
      
      // Test the API key
      setIsTestingKey(true);
      try {
        const isValid = await geminiService.testApiKey();
        setKeyTestResult(isValid ? 'success' : 'error');
        
        if (isValid) {
          onSave();
          onClose();
        }
      } catch (error) {
        setKeyTestResult('error');
      } finally {
        setIsTestingKey(false);
      }
    } else {
      onSave();
      onClose();
    }
  };

  const handleClear = () => {
    geminiService.setApiKey('');
    setGeminiKey('');
    setKeyTestResult(null);
  };

  const handleTestKey = async () => {
    if (!geminiKey.trim()) return;
    
    setIsTestingKey(true);
    setKeyTestResult(null);
    
    try {
      geminiService.setApiKey(geminiKey.trim());
      const isValid = await geminiService.testApiKey();
      setKeyTestResult(isValid ? 'success' : 'error');
    } catch (error) {
      setKeyTestResult('error');
    } finally {
      setIsTestingKey(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Setup AI API Keys</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Gemini Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">🤖 Google Gemini AI</h3>
            <p className="text-blue-700 text-sm mb-3">
              Access powerful Gemini AI models including Gemini 1.5 Pro, Gemini 1.5 Flash, and Gemini Pro. 
              Get your free API key from Google AI Studio.
            </p>
            <div className="text-sm text-blue-600 space-y-1">
              <p>• <strong>Gemini 1.5 Pro:</strong> Most capable model with 1M token context</p>
              <p>• <strong>Gemini 1.5 Flash:</strong> Fast and efficient responses</p>
              <p>• <strong>Gemini Pro:</strong> Balanced performance for most tasks</p>
            </div>
          </div>

          {/* Gemini API Key */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Google AI API Key (Gemini Models)
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AI..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleTestKey}
                disabled={!geminiKey.trim() || isTestingKey}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 text-sm"
              >
                {isTestingKey ? '⏳' : 'Test'}
              </button>
              <button
                onClick={handleClear}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded text-sm"
              >
                Clear
              </button>
            </div>
            
            {/* Test Result */}
            {keyTestResult === 'success' && (
              <div className="text-green-600 text-sm flex items-center space-x-1">
                <span>✅</span>
                <span>API key is valid and working!</span>
              </div>
            )}
            {keyTestResult === 'error' && (
              <div className="text-red-600 text-sm flex items-center space-x-1">
                <span>❌</span>
                <span>API key is invalid or there was an error. Please check your key.</span>
              </div>
            )}
            
            <div className="text-xs text-gray-500 space-y-1">
              <p>Get your free API key at: <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a></p>
              <p>Free tier includes generous usage limits for personal projects.</p>
            </div>
          </div>

          {/* Getting Started */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">🚀 Getting Started</h4>
            <div className="text-sm text-gray-700 space-y-2">
              <p>1. Visit <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a></p>
              <p>2. Sign in with your Google account</p>
              <p>3. Click "Create API Key" and copy it</p>
              <p>4. Paste it above and click "Test" to verify</p>
              <p>5. Start using Gemini AI in your searches!</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save Gemini API Key
          </button>
        </div>
      </div>
    </div>
  );
};
