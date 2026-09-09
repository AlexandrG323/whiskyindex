import { useEffect } from 'react'
import { jsonLd, resolveSeo, robotsContent } from './seo'

const JSON_LD_ID = 'seo-jsonld'

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function upsertJsonLd(data: Record<string, unknown>) {
  let el = document.getElementById(JSON_LD_ID)
  if (!el) {
    el = document.createElement('script')
    el.id = JSON_LD_ID
    el.setAttribute('type', 'application/ld+json')
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}

/** Keeps document title, social tags, canonical, and JSON-LD in sync with the route. */
export function useDocumentMeta(pathname: string) {
  useEffect(() => {
    const page = resolveSeo(pathname)

    document.title = page.title
    upsertMeta('name', 'description', page.description)
    upsertMeta('name', 'robots', robotsContent(window.location.hostname))
    upsertCanonical(page.canonical)

    upsertMeta('property', 'og:type', 'website')
    upsertMeta('property', 'og:locale', 'ru_RU')
    upsertMeta('property', 'og:site_name', 'Whisky Index')
    upsertMeta('property', 'og:title', page.title)
    upsertMeta('property', 'og:description', page.description)
    upsertMeta('property', 'og:url', page.canonical)
    upsertMeta('property', 'og:image', page.ogImageUrl)
    upsertMeta('property', 'og:image:width', '1200')
    upsertMeta('property', 'og:image:height', '630')
    upsertMeta('property', 'og:image:alt', page.ogImageAlt)

    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', page.title)
    upsertMeta('name', 'twitter:description', page.description)
    upsertMeta('name', 'twitter:image', page.ogImageUrl)

    upsertJsonLd(jsonLd(pathname))
  }, [pathname])
}
