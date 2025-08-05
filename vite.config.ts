import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid()],
  base: './', // Use relative paths for deployment
  server: {
    watch: {
      usePolling: true, // Enable polling for WSL compatibility
      interval: 100     // Check for changes every 100ms
    },
    hmr: {
      overlay: true // Show HMR errors in overlay
    }
  }
})
