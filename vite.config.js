import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
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
