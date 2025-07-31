import React from 'react';
import { AlertCircle, RefreshCw, Settings } from 'lucide-react';

interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
  onShowDebug?: () => void;
  showTechnicalDetails?: boolean;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onShowDebug,
  showTechnicalDetails = false
}) => {
  const getErrorType = (errorMessage: string) => {
    if (errorMessage.includes('AWS Bedrock service is not configured')) {
      return {
        type: 'configuration',
        title: 'AWS Configuration Issue',
        suggestion: 'Check your AWS credentials and environment variables'
      };
    }
    if (errorMessage.includes('SyntaxError') || errorMessage.includes('JSON')) {
      return {
        type: 'parsing',
        title: 'Response Parsing Error',
        suggestion: 'The AI response format was invalid - this should be fixed now'
      };
    }
    if (errorMessage.includes('Failed to generate response')) {
      return {
        type: 'api',
        title: 'AWS API Error',
        suggestion: 'Check your AWS permissions and model availability'
      };
    }
    return {
      type: 'unknown',
      title: 'Unexpected Error',
      suggestion: 'Try refreshing and checking your configuration'
    };
  };

  const errorInfo = getErrorType(error);

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-red-800 mb-1">{errorInfo.title}</h3>
          <p className="text-red-700 text-sm mb-2">{errorInfo.suggestion}</p>
          
          {showTechnicalDetails && (
            <details className="mb-3">
              <summary className="text-red-600 text-xs cursor-pointer hover:text-red-800">
                Technical Details
              </summary>
              <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-x-auto text-red-800">
                {error}
              </pre>
            </details>
          )}

          <div className="flex gap-2 mt-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
            )}
            {onShowDebug && (
              <button
                onClick={onShowDebug}
                className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200 transition-colors"
              >
                <Settings className="h-3 w-3" />
                Debug
              </button>
            )}
          </div>

          {errorInfo.type === 'configuration' && (
            <div className="mt-3 text-xs text-red-600">
              <p className="font-medium">Quick fixes:</p>
              <ul className="mt-1 space-y-1">
                <li>• Check if .env file exists with AWS credentials</li>
                <li>• Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set</li>
                <li>• Ensure AWS region (ap-south-1) supports Bedrock</li>
                <li>• Check IAM permissions for bedrock:InvokeModel</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
