import React, { useState } from 'react';
import { Github, AlertCircle, CheckCircle } from 'lucide-react';

interface GitHubTokenSetupProps {
  onTokenConfigured: (token: string) => void;
  onSkip: () => void;
}

export const GitHubTokenSetup: React.FC<GitHubTokenSetupProps> = ({
  onTokenConfigured,
  onSkip
}) => {
  const [token, setToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Please enter a GitHub token');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Basic token validation
      if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
        setError('Invalid GitHub token format. Should start with "ghp_" or "github_pat_"');
        setIsSubmitting(false);
        return;
      }

      onTokenConfigured(token);
    } catch (err) {
      setError('Failed to configure GitHub token');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 p-8">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Github className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Quick GitHub Setup
        </h2>
        <p className="text-gray-600">
          Configure your GitHub Personal Access Token to enable search across your repositories, issues, and pull requests.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Need a GitHub Token?</p>
            <p>Go to GitHub → Settings → Developer settings → Personal access tokens → Generate new token</p>
            <p className="mt-1">Required scopes: <code className="bg-blue-100 px-1 rounded">repo</code>, <code className="bg-blue-100 px-1 rounded">user</code></p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="github-token" className="block text-sm font-medium text-gray-700 mb-2">
            GitHub Personal Access Token
          </label>
          <input
            id="github-token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            disabled={isSubmitting}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          </div>
        )}

        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={isSubmitting || !token.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Configuring...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Configure GitHub</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            disabled={isSubmitting}
          >
            Skip for now
          </button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          Your token is stored locally in your browser and never sent to third parties.
        </p>
      </div>
    </div>
  );
};
