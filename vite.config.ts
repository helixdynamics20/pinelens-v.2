import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
});
