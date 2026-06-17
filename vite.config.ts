import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

import { createSaveJsonMiddleware } from './scripts/saveJsonDev';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');

          if (normalizedId.includes('/node_modules/three/')) {
            return 'three-vendor';
          }

          if (
            normalizedId.includes('/node_modules/react/') ||
            normalizedId.includes('/node_modules/react-dom/')
          ) {
            return 'react-vendor';
          }

          if (normalizedId.includes('/src/runtime/three/')) {
            return 'three-runtime';
          }
        },
      },
    },
  },
  plugins: [
    react(),
    {
      name: 'sinan-save-json-dev',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use(createSaveJsonMiddleware(server.config.root));
      },
    },
  ],
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  test: {
    environment: 'node',
    exclude: [...configDefaults.exclude, 'tests/smoke/**'],
    globals: true,
  },
});
