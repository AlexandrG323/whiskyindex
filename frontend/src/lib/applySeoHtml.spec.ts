import { describe, expect, it } from 'vitest'
import { htmlForRoute } from './applySeoHtml'
import { resolveSeo, SEO_PATHS, SITE_URL } from './seo'

const shell = `<!doctype html>
<html lang="ru">
  <head>
    <title>Whisky Index — Бутылка или портфель?</title>
    <meta
      name="description"
      content="home description"
    />
    <link rel="canonical" href="https://whiskyindex.online/" />
    <meta property="og:title" content="Whisky Index — Бутылка или портфель?" />
    <meta
      property="og:description"
      content="home description"
    />
    <meta property="og:url" content="https://whiskyindex.online/" />
    <meta property="og:image" content="https://whiskyindex.online/og/home.png" />
    <meta
      property="og:image:alt"
      content="Whisky Index — главная: корзина скуфа против акций"
    />
    <meta name="twitter:title" content="Whisky Index — Бутылка или портфель?" />
    <meta
      name="twitter:description"
      content="home description"
    />
    <meta name="twitter:image" content="https://whiskyindex.online/og/home.png" />
  </head>
  <body></body>
</html>
`

describe('htmlForRoute', () => {
  it('stamps a unique og:image into each route shell', () => {
    const images = new Set<string>()
    for (const path of SEO_PATHS) {
      const page = resolveSeo(path)
      const html = htmlForRoute(shell, path)
      expect(html).toContain(`content="${page.ogImageUrl}"`)
      expect(html).toContain(`<title>${page.title}</title>`)
      expect(html).toContain(`href="${page.canonical}"`)
      images.add(page.ogImageUrl)
    }
    expect(images.size).toBe(SEO_PATHS.length)
  })

  it('does not leave the home image on inner routes', () => {
    const cart = htmlForRoute(shell, '/cart')
    expect(cart).toContain(`${SITE_URL}/og/cart.png`)
    expect(cart).not.toContain(`${SITE_URL}/og/home.png`)
    expect(cart).toContain('id="seo-jsonld"')
  })
})
