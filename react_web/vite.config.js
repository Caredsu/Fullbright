import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react')) {
              return 'react-vendor'
            }
            return 'vendor'
          }
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/pwa/api': {
        target: 'http://localhost/teacher-eval',
        changeOrigin: true,
        rewrite: (path) => {
          // Remove /pwa/ from path and request from /api/ instead
          return path.replace('/pwa/api/', '/api/');
        }
      }
    }
  }
})
