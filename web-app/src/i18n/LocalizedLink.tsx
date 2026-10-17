import { Link, type LinkProps, NavLink, type NavLinkProps } from 'react-router-dom'

import { useI18n } from './useI18n'

type LocalizedLinkProps = Omit<LinkProps, 'to'> & { to: string }
type LocalizedNavLinkProps = Omit<NavLinkProps, 'to'> & { to: string }

export function LocalizedLink({ to, ...props }: LocalizedLinkProps) {
  const { lp } = useI18n()
  return <Link to={lp(to)} {...props} />
}

export function LocalizedNavLink({ to, ...props }: LocalizedNavLinkProps) {
  const { lp } = useI18n()
  return <NavLink to={lp(to)} {...props} />
}
