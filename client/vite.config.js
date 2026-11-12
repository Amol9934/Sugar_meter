import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/.test(id)) {
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    // Same-origin in dev, so the httpOnly session cookie "just works" without CORS.
    proxy: { '/api': { target: process.env.VITE_API_TARGET || 'http://localhost:4000', changeOrigin: true } },
  },
  test: { environment: 'jsdom', setupFiles: './src/test-setup.js', globals: true },
});
