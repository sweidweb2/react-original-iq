import { useI18n } from '@/i18n'

import { legalContent, type LegalDocumentKey } from './content/legal'
import { LegalPage } from './LegalPage'

function LocalizedLegalPage({ document }: { document: LegalDocumentKey }) {
  const { pick } = useI18n()
  return <LegalPage page={pick(legalContent)[document]} />
}

export function TermsPage() {
  return <LocalizedLegalPage document="terms" />
}

export function PrivacyPage() {
  return <LocalizedLegalPage document="privacy" />
}

export function RefundsPage() {
  return <LocalizedLegalPage document="refunds" />
}
