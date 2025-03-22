import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all  
    port: 5000, // Use port 5000 since it's what Replit exposes
    strictPort: true, // Don't try another port if 5000 is taken

    cors: {
      origin: '*',
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          leaflet: ['leaflet', 'react-leaflet'],
          charts: ['chart.js'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
