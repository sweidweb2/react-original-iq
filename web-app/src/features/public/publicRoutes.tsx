import { Route } from 'react-router-dom'

import { NotFoundPage } from '@/features/errors/NotFoundPage'
import { HomePage } from '@/features/home/HomePage'
import { LocaleGate, LocaleRedirect } from '@/i18n'

import { FaqPage } from './FaqPage'
import { AboutPage, ContactPage, ServicesPage } from './pages'
import { PrivacyPage, RefundsPage, TermsPage } from './policyPages'
import { PublicLayout } from './PublicLayout'
import { LOCALIZED_PUBLIC_PATHS } from './publicNav'

/** Bilingual marketing pages under `/:lang`, plus redirects from the unprefixed URLs. */
export function localizedPublicRoutes() {
  return (
    <>
      {LOCALIZED_PUBLIC_PATHS.map((path) => (
        <Route key={path} path={path} element={<LocaleRedirect />} />
      ))}

      <Route
        path="/:lang"
        element={
          <LocaleGate
            fallback={
              <PublicLayout>
                <NotFoundPage />
              </PublicLayout>
            }
          />
        }
      >
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="faq" element={<FaqPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="refunds" element={<RefundsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </>
  )
}
