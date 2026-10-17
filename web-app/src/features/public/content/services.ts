import type { Localized } from '@/i18n/config'

import { servicesAr } from './services.ar'
import { servicesEn } from './services.en'

export type ServiceIconKey =
  | 'literatureReview'
  | 'dataAnalysis'
  | 'academicWriting'
  | 'qualityAssurance'
  | 'researchMethodology'
  | 'learningPlans'
  | 'progressTracking'
  | 'flexibleScheduling'
  | 'originalContent'
  | 'fastTurnaround'
  | 'unlimitedRevisions'
  | 'complicatedSubjects'
  | 'extensiveResearch'
  | 'complicatedRequirements'
  | 'higherDifficulty'
  | 'shorterTimeFrame'
  | 'personalizedPlan'
  | 'instructorRequired'
  | 'sessionsRequired'
  | 'provenSuccess'
  | 'expertMentors'
  | 'qualityAssured'
  | 'personalizedLearning'

export type IconLabel = { icon: ServiceIconKey; label: string }

export type ServicePoint = { icon: ServiceIconKey; title: string; description: string }

export type ServiceSection = {
  id: 'research' | 'tutoring' | 'assignment'
  badge: string
  title: string
  description: string
  accent: string
  accentLight: string
  visualFirst: boolean
  points: ServicePoint[]
  orbit: IconLabel[]
}

export type PricingPlan = {
  kind: 'projects' | 'tutoring'
  title: string
  start: string
  max: string
  endColor: string
  factors: IconLabel[]
}

export type ServicesContent = {
  trendingSubjects: string[]
  heroStats: Array<{ text: string; tone: 'success' | 'accent' | 'warning' }>
  serviceSections: ServiceSection[]
  programSteps: Array<{ title: string; description: string }>
  benefits: ServicePoint[]
  pricingPlans: PricingPlan[]
}

export const servicesContent: Localized<ServicesContent> = {
  en: servicesEn,
  ar: servicesAr,
}
