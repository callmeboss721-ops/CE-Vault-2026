import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@workspace/ce-empire-command-system/styles.css': path.resolve(
        __dirname,
        '../ce-empire-command-system/styles.css'
      ),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 23379,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.CE_API_BASE_URL || 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist/public',
    emptyOutDir: true,
  },
});
