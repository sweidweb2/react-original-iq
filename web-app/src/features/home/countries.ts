import type { Localized } from '@/i18n'

export type Country = {
  /** English name is the canonical value sent to the API. */
  name: Localized<string>
  dialCode: string
}

export const countries: Country[] = [
  { name: { en: 'Bahrain', ar: 'البحرين' }, dialCode: '+973' },
  { name: { en: 'Egypt', ar: 'مصر' }, dialCode: '+20' },
  { name: { en: 'Iraq', ar: 'العراق' }, dialCode: '+964' },
  { name: { en: 'Jordan', ar: 'الأردن' }, dialCode: '+962' },
  { name: { en: 'Kuwait', ar: 'الكويت' }, dialCode: '+965' },
  { name: { en: 'Lebanon', ar: 'لبنان' }, dialCode: '+961' },
  { name: { en: 'Oman', ar: 'عُمان' }, dialCode: '+968' },
  { name: { en: 'Palestine', ar: 'فلسطين' }, dialCode: '+970' },
  { name: { en: 'Qatar', ar: 'قطر' }, dialCode: '+974' },
  { name: { en: 'Saudi Arabia', ar: 'السعودية' }, dialCode: '+966' },
  { name: { en: 'United Arab Emirates', ar: 'الإمارات العربية المتحدة' }, dialCode: '+971' },
  { name: { en: 'Yemen', ar: 'اليمن' }, dialCode: '+967' },
  { name: { en: 'United States', ar: 'الولايات المتحدة' }, dialCode: '+1' },
  { name: { en: 'United Kingdom', ar: 'المملكة المتحدة' }, dialCode: '+44' },
  { name: { en: 'Canada', ar: 'كندا' }, dialCode: '+1' },
  { name: { en: 'France', ar: 'فرنسا' }, dialCode: '+33' },
  { name: { en: 'Germany', ar: 'ألمانيا' }, dialCode: '+49' },
  { name: { en: 'India', ar: 'الهند' }, dialCode: '+91' },
  { name: { en: 'Pakistan', ar: 'باكستان' }, dialCode: '+92' },
  { name: { en: 'Turkey', ar: 'تركيا' }, dialCode: '+90' },
]
