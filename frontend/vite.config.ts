import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vitest/config'
import { htmlForRoute } from './src/lib/applySeoHtml'
import { SEO_PATHS } from './src/lib/seo'

function seoHtmlPlugin(): Plugin {
  return {
    name: 'seo-html',
    apply: 'build',
    writeBundle({ dir }) {
      if (!dir) return
      const template = readFileSync(join(dir, 'index.html'), 'utf8')
      for (const path of SEO_PATHS) {
        const html = htmlForRoute(template, path)
        if (path === '/') {
          writeFileSync(join(dir, 'index.html'), html)
          continue
        }
        const routeDir = join(dir, path.slice(1))
        mkdirSync(routeDir, { recursive: true })
        writeFileSync(join(routeDir, 'index.html'), html)
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), seoHtmlPlugin()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
  },
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
