import catalog from './seoPages.json'

export const SITE_HOST = 'whiskyindex.online'
export const SITE_URL = `https://${SITE_HOST}`
export const SITE_NAME = 'Whisky Index'

export const SEO_PATHS = Object.keys(catalog) as Array<keyof typeof catalog>

export type SeoPage = {
  path: string
  slug: string
  kicker: string
  title: string
  description: string
  ogSubtitle: string
  ogImage: string
  ogImageAlt: string
}

export type ResolvedSeo = SeoPage & {
  canonical: string
  ogImageUrl: string
}

const FALLBACK_PATH = '/' satisfies keyof typeof catalog

/** About copy used for JSON-LD; keep in lockstep with AboutPage sections. */
export const ABOUT_SECTIONS = [
  {
    name: 'Зачем это',
    text: 'Whisky Index отвечает на простой вопрос: что было выгоднее — собрать «корзину скуфа» из привычных товаров или вложить ту же сумму в акции. Без морали и советов, только цифры.',
  },
  {
    name: 'Как считать',
    text: 'Выбираете период, смотрите стоимость корзины и рост бумаг. Можно сравнить одну акцию с корзиной, несколько бумаг на одном графике или посчитать, на что хватило бы сегодняшней стоимости вложений.',
  },
  {
    name: 'Что внутри корзины',
    text: 'Jameson, кола, кофе Jacobs, Доширак, пельмени, сосиски, колбаса, майонез, огурцы, картошка, Боржоми, уголь и Winston — набор повседневных покупок, по которому удобно мерить инфляцию «по-скуфовски».',
  },
] as const

export function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/'
  const stripped = pathname.replace(/\/+$/, '')
  return stripped.length > 0 ? stripped : '/'
}

function toSeoPage(path: keyof typeof catalog): SeoPage {
  const entry = catalog[path]
  return {
    path,
    slug: entry.slug,
    kicker: entry.kicker,
    title: entry.title,
    description: entry.description,
    ogSubtitle: entry.ogSubtitle,
    ogImage: `/og/${entry.slug}.png`,
    ogImageAlt: entry.ogImageAlt,
  }
}

export function getSeoPage(pathname: string): SeoPage {
  const path = normalizePath(pathname)
  if (path in catalog) return toSeoPage(path as keyof typeof catalog)
  return toSeoPage(FALLBACK_PATH)
}

export function resolveSeo(pathname: string): ResolvedSeo {
  const page = getSeoPage(pathname)
  return {
    ...page,
    canonical: `${SITE_URL}${page.path === '/' ? '/' : page.path}`,
    ogImageUrl: `${SITE_URL}${page.ogImage}`,
  }
}

export function robotsContent(hostname: string): string {
  return hostname === SITE_HOST ? 'index, follow' : 'noindex, nofollow'
}

export function jsonLd(pathname: string): Record<string, unknown> {
  const page = resolveSeo(pathname)
  const website = {
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: 'ru',
    description: getSeoPage('/').description,
  }

  if (page.path !== '/about') {
    return { '@context': 'https://schema.org', ...website }
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      website,
      {
        '@type': 'AboutPage',
        name: page.title,
        url: page.canonical,
        inLanguage: 'ru',
        description: page.description,
        mainEntity: ABOUT_SECTIONS.map((section) => ({
          '@type': 'Thing',
          name: section.name,
          description: section.text,
        })),
      },
    ],
  }
}
