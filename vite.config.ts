/**
 * @fileoverview Vite configuration for DJ XU application.
 * Handles browser compatibility for Google Cloud services.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: [
      '@google-cloud/vertexai',
      '@google-cloud/aiplatform',
    ],
  },
  build: {
    rollupOptions: {
      external: [
        '@google-cloud/vertexai',
        '@google-cloud/aiplatform',
      ],
    },
  },
  server: {
    proxy: {
      '/api/vertex': {
        target: 'https://us-central1-aiplatform.googleapis.com/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/vertex/, ''),
        secure: false,
      },
    },
  },
});