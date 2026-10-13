import { legalDocuments } from './content/legal'
import { LegalPage } from './LegalPage'

export function TermsPage() {
  return <LegalPage page={legalDocuments.terms} />
}

export function PrivacyPage() {
  return <LegalPage page={legalDocuments.privacy} />
}

export function RefundsPage() {
  return <LegalPage page={legalDocuments.refunds} />
}
