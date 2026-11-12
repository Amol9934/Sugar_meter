import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Same-origin in dev, so the httpOnly session cookie "just works" without CORS.
    proxy: { '/api': { target: process.env.VITE_API_TARGET || 'http://localhost:4000', changeOrigin: true } },
  },
  test: { environment: 'jsdom', setupFiles: './src/test-setup.js', globals: true },
});
