import { describe, expect, it } from 'vitest'
import {
  ABOUT_SECTIONS,
  getSeoPage,
  jsonLd,
  normalizePath,
  resolveSeo,
  robotsContent,
  SEO_PATHS,
  SITE_HOST,
  SITE_URL,
} from './seo'

describe('normalizePath', () => {
  it('strips trailing slashes except for home', () => {
    expect(normalizePath('')).toBe('/')
    expect(normalizePath('/')).toBe('/')
    expect(normalizePath('/cart/')).toBe('/cart')
    expect(normalizePath('/about///')).toBe('/about')
  })
})

describe('getSeoPage / resolveSeo', () => {
  it('gives every route a distinct title, description, canonical, and og image', () => {
    const titles = new Set<string>()
    const descriptions = new Set<string>()
    const canonicals = new Set<string>()
    const images = new Set<string>()

    for (const path of SEO_PATHS) {
      const page = resolveSeo(path)
      expect(page.title.length).toBeGreaterThan(0)
      expect(page.description.length).toBeGreaterThan(0)
      expect(page.canonical).toBe(`${SITE_URL}${path === '/' ? '/' : path}`)
      expect(page.ogImageUrl).toBe(`${SITE_URL}/og/${page.slug}.png`)
      expect(page.ogImage).toBe(`/og/${page.slug}.png`)
      titles.add(page.title)
      descriptions.add(page.description)
      canonicals.add(page.canonical)
      images.add(page.ogImage)
    }

    expect(titles.size).toBe(SEO_PATHS.length)
    expect(descriptions.size).toBe(SEO_PATHS.length)
    expect(canonicals.size).toBe(SEO_PATHS.length)
    expect(images.size).toBe(SEO_PATHS.length)
  })

  it('falls back to the home pair for unknown paths', () => {
    const home = getSeoPage('/')
    const unknown = getSeoPage('/not-a-page')
    expect(unknown).toEqual(home)
    expect(resolveSeo('/missing').ogImage).toBe('/og/home.png')
    expect(resolveSeo('/missing').canonical).toBe(`${SITE_URL}/`)
  })
})

describe('robotsContent', () => {
  it('indexes the production host and noindexes everything else', () => {
    expect(robotsContent(SITE_HOST)).toBe('index, follow')
    expect(robotsContent('localhost')).toBe('noindex, nofollow')
    expect(robotsContent('whiskyindex.vercel.app')).toBe('noindex, nofollow')
  })
})

describe('jsonLd', () => {
  it('emits WebSite on every page and AboutPage on /about', () => {
    const home = jsonLd('/')
    expect(home['@type']).toBe('WebSite')
    expect(home.url).toBe(SITE_URL)
    expect(home.inLanguage).toBe('ru')

    const about = jsonLd('/about')
    const graph = about['@graph'] as Array<Record<string, unknown>>
    expect(graph).toHaveLength(2)
    expect(graph[0]['@type']).toBe('WebSite')
    expect(graph[1]['@type']).toBe('AboutPage')
    expect(graph[1].url).toBe(`${SITE_URL}/about`)
    const entity = graph[1].mainEntity as Array<{ name: string }>
    expect(entity.map((item) => item.name)).toEqual(ABOUT_SECTIONS.map((section) => section.name))
  })
})
