import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Bind to all interfaces so the port is reachable from outside the container.
    host: true,
    watch: {
      // Bind mounts on Docker Desktop (macOS) do not deliver inotify events,
      // so the watcher has to poll — the same reason the API sets
      // CHOKIDAR_USEPOLLING.
      usePolling: true,
    },
    proxy: {
      // In compose the API is another service, not localhost.
      '/api': process.env.VITE_API_PROXY ?? 'http://localhost:3000',
    },
  },
})
