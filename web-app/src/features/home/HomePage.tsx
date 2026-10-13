import './home.css'

import { useState } from 'react'

import { useHashScroll } from '@/features/public/useHashScroll'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

import { LeadModal } from './LeadModal'
import { CtaSection } from './sections/CtaSection'
import { FeaturesSection } from './sections/FeaturesSection'
import { HeroSection } from './sections/HeroSection'
import { HowItWorksSection } from './sections/HowItWorksSection'
import { ProcessSection } from './sections/ProcessSection'
import { TestimonialsSection } from './sections/TestimonialsSection'
import { WhatsAppButton } from './WhatsAppButton'

export function HomePage() {
  useDocumentTitle('Learn Smarter, Achieve More')
  useHashScroll()
  const [leadOpen, setLeadOpen] = useState(false)

  return (
    <>
      <HeroSection onOpenLead={() => setLeadOpen(true)} />
      <TestimonialsSection />
      <HowItWorksSection />
      <CtaSection />
      <ProcessSection />
      <FeaturesSection />
      <WhatsAppButton />
      <LeadModal open={leadOpen} onClose={() => setLeadOpen(false)} />
    </>
  )
}
