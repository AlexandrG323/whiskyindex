import { jsonLd, type ResolvedSeo, resolveSeo } from './seo'

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function replaceMeta(
  html: string,
  attr: 'name' | 'property',
  key: string,
  content: string,
): string {
  const re = new RegExp(`(<meta\\b[^>]*?\\b${attr}="${key}"[^>]*?\\bcontent=")([^"]*)(")`, 'i')
  if (!re.test(html)) {
    throw new Error(`index.html is missing meta ${attr}="${key}"`)
  }
  return html.replace(re, `$1${escapeAttr(content)}$3`)
}

function replaceTitle(html: string, title: string): string {
  if (!/<title>[^<]*<\/title>/.test(html)) {
    throw new Error('index.html is missing <title>')
  }
  return html.replace(/<title>[^<]*<\/title>/, `<title>${escapeAttr(title)}</title>`)
}

function replaceCanonical(html: string, href: string): string {
  const re = /(<link\s+rel="canonical"\s+href=")([^"]*)(")/i
  if (!re.test(html)) {
    throw new Error('index.html is missing link rel="canonical"')
  }
  return html.replace(re, `$1${escapeAttr(href)}$3`)
}

function upsertJsonLd(html: string, data: Record<string, unknown>): string {
  const payload = JSON.stringify(data)
  const block = `<script type="application/ld+json" id="seo-jsonld">${payload}</script>`
  if (html.includes('id="seo-jsonld"')) {
    return html.replace(
      /<script type="application\/ld\+json" id="seo-jsonld">[\s\S]*?<\/script>/,
      block,
    )
  }
  return html.replace('</head>', `    ${block}\n  </head>`)
}

/** Stamp unique title / description / OG tags onto a copy of the Vite HTML shell. */
export function applySeoHtml(html: string, page: ResolvedSeo, pathname: string): string {
  let next = html
  next = replaceTitle(next, page.title)
  next = replaceCanonical(next, page.canonical)
  next = replaceMeta(next, 'name', 'description', page.description)
  next = replaceMeta(next, 'property', 'og:title', page.title)
  next = replaceMeta(next, 'property', 'og:description', page.description)
  next = replaceMeta(next, 'property', 'og:url', page.canonical)
  next = replaceMeta(next, 'property', 'og:image', page.ogImageUrl)
  next = replaceMeta(next, 'property', 'og:image:alt', page.ogImageAlt)
  next = replaceMeta(next, 'name', 'twitter:title', page.title)
  next = replaceMeta(next, 'name', 'twitter:description', page.description)
  next = replaceMeta(next, 'name', 'twitter:image', page.ogImageUrl)
  return upsertJsonLd(next, jsonLd(pathname))
}

export function htmlForRoute(template: string, pathname: string): string {
  return applySeoHtml(template, resolveSeo(pathname), pathname)
}
