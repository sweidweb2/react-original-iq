import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { LocalizedLink, useI18n } from '@/i18n'
import { cn } from '@/lib/utils'

import { faqContent } from './content/faq'
import { usePublicDictionary } from './i18n'

export function FaqPage() {
  const { pick } = useI18n()
  const t = usePublicDictionary().faq
  const faqCategories = pick(faqContent)
  useDocumentTitle(t.documentTitle)
  const [categoryId, setCategoryId] = useState('all')
  const [openKey, setOpenKey] = useState<string | null>(null)
  const visible =
    categoryId === 'all'
      ? faqCategories
      : faqCategories.filter((category) => category.id === categoryId)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t.intro}</p>

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label={t.categoriesLabel}>
        <CategoryButton active={categoryId === 'all'} onClick={() => setCategoryId('all')}>
          {t.all}
        </CategoryButton>
        {faqCategories.map((category) => (
          <CategoryButton
            key={category.id}
            active={categoryId === category.id}
            onClick={() => setCategoryId(category.id)}
          >
            {category.title}
          </CategoryButton>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-8">
        {visible.map((category) => (
          <section key={category.id}>
            <h2 className="text-lg font-semibold">{category.title}</h2>
            <div className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
              {category.items.map((item, index) => {
                const key = `${category.id}:${index}`
                const panelId = `faq-${category.id}-${index}`
                const open = openKey === key
                return (
                  <div key={key}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start text-sm font-medium"
                      aria-expanded={open}
                      aria-controls={panelId}
                      onClick={() => setOpenKey(open ? null : key)}
                    >
                      {item.question}
                      <ChevronDown
                        className={cn('size-4 shrink-0 transition', open && 'rotate-180')}
                        aria-hidden
                      />
                    </button>
                    <div
                      id={panelId}
                      role="region"
                      hidden={!open}
                      className="px-4 pb-4 text-sm text-muted-foreground"
                    >
                      {item.answer}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-lg border border-border bg-primary/10 px-5 py-6 text-center">
        <h2 className="text-lg font-semibold">{t.stillHaveQuestions}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t.stillHaveQuestionsBody}</p>
        <LocalizedLink to="/contact" className={cn(buttonVariants(), 'mt-4')}>
          {t.contactUs}
        </LocalizedLink>
      </div>
    </div>
  )
}

function CategoryButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={buttonVariants({ variant: active ? 'primary' : 'outline', size: 'sm' })}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
