import { defineConfig } from 'vite';

export default defineConfig({
  // Base path for deployment
  base: './',
  
  // Server options
  server: {
    host: true,
    port: 3000,
    open: true,
  },
  
  // Build options
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
}); 