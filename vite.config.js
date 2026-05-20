import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// GitHub Pages serves project sites under /<repo-name>/. The base path here
// must match the repo name when deploying. Override via VITE_BASE if needed.
const base = process.env.VITE_BASE ?? '/jhu-homeschool-hub/';

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
