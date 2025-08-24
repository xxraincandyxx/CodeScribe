import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // Add this configuration inside the react() plugin call
    react({
      // Use the classic runtime to automatically import React
      jsxRuntime: 'classic',
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
  },
});
