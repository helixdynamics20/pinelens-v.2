import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Make environment variables available in the browser
      'process.env.AWS_ACCESS_KEY_ID': JSON.stringify(env.AWS_ACCESS_KEY_ID),
      'process.env.AWS_SECRET_ACCESS_KEY': JSON.stringify(env.AWS_SECRET_ACCESS_KEY),
      'process.env.AWS_DEFAULT_REGION': JSON.stringify(env.AWS_DEFAULT_REGION),
      'process.env.AWS_REGION': JSON.stringify(env.AWS_REGION),
      'process.env.AWS_BEDROCK_REGION': JSON.stringify(env.AWS_BEDROCK_REGION),
      'process.env.AWS_BEDROCK_ENABLED': JSON.stringify(env.AWS_BEDROCK_ENABLED),
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    server: {
      proxy: {
        // Proxy GitHub Models API to avoid CORS issues
        '/api/github-models': {
          target: 'https://models.github.ai',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/github-models/, ''),
          headers: {
            'Origin': 'https://models.github.ai'
          }
        }
      }
    }
  };
});
