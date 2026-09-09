import { readFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

/**
 * @typedef {{ slug: string, kicker: string, ogSubtitle: string }} OgPage
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
/** @type {Record<string, OgPage>} */
const catalog = JSON.parse(readFileSync(join(root, 'src/lib/seoPages.json'), 'utf8'))
const outDir = join(root, 'public/og')
const cardUrl = pathToFileURL(join(root, 'og/card.html')).href

await mkdir(outDir, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
})

for (const entry of Object.values(catalog)) {
  const url = new URL(cardUrl)
  url.searchParams.set('kicker', entry.kicker)
  url.searchParams.set('subtitle', entry.ogSubtitle)
  await page.goto(url.href)
  await page.waitForFunction(() => {
    const img = document.querySelector('img.og-logo')
    return Boolean(img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0)
  })
  await page.locator('.og-card').screenshot({
    path: join(outDir, `${entry.slug}.png`),
    type: 'png',
  })
  console.log(`wrote public/og/${entry.slug}.png`)
}

await browser.close()
