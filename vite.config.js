import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig({
  // Base path for deployment
  base: './',
  
  // Server options
  server: {
    https: true,
    host: true,
    port: 3000,
    open: true,
  },
  
  // Add the mkcert plugin
  plugins: [mkcert()],
  
  // Build options
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
}); 