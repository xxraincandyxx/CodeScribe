import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
  plugins: [
    react({
      // Use the classic runtime to automatically import React
      jsxRuntime: 'classis',
    }),
    viteCompression(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/'),
      '@components/*': path.resolve(__dirname, './src/'),
      '@constant/*': path.resolve(__dirname, './src/constant/'),
      '@declare/*': path.resolve(__dirname, './src/declare/'),
      '@THREE/*': path.resolve(__dirname, './src/THREE/'),
    },
  },
});
