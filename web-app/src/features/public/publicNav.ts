export const PUBLIC_NAV = [
  { to: '/', key: 'home', end: true },
  { to: '/about', key: 'about' },
  { to: '/services', key: 'services' },
  { to: '/faq', key: 'faq' },
  { to: '/contact', key: 'contact' },
] as const

/** Unprefixed public URLs that redirect to `/{locale}/...`. */
export const LOCALIZED_PUBLIC_PATHS = [
  '/',
  '/about',
  '/services',
  '/faq',
  '/contact',
  '/terms',
  '/privacy',
  '/refunds',
] as const
