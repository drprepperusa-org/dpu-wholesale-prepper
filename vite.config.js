import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: 'public',
    emptyOutDir: false,
    rollupOptions: {
      input: './index.html'
    }
  },
  server: {
    middlewareMode: false,
    proxy: {
      '/api': 'http://localhost:5001'
    }
  }
})
