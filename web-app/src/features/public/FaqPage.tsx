import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'

import { buttonVariants } from '@/components/ui/button'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'

import { faqCategories } from './content/faq'

export function FaqPage() {
  useDocumentTitle('FAQ')
  const [categoryId, setCategoryId] = useState('all')
  const [openKey, setOpenKey] = useState<string | null>(null)
  const visible =
    categoryId === 'all'
      ? faqCategories
      : faqCategories.filter((category) => category.id === categoryId)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Frequently Asked Questions</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Answers about tutoring, plans, and how Original IQ supports students.
      </p>

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="FAQ categories">
        <CategoryButton active={categoryId === 'all'} onClick={() => setCategoryId('all')}>
          All
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
              {category.items.map((item) => {
                const key = `${category.id}:${item.question}`
                const open = openKey === key
                return (
                  <div key={key}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium"
                      aria-expanded={open}
                      onClick={() => setOpenKey(open ? null : key)}
                    >
                      {item.question}
                      <ChevronDown
                        className={cn('size-4 shrink-0 transition', open && 'rotate-180')}
                        aria-hidden
                      />
                    </button>
                    {open ? (
                      <p className="px-4 pb-4 text-sm text-muted-foreground">{item.answer}</p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-lg border border-border bg-primary/10 px-5 py-6 text-center">
        <h2 className="text-lg font-semibold">Still Have Questions?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Our team can help you choose the right plan.
        </p>
        <Link to="/contact" className={`${buttonVariants()} mt-4`}>
          Contact us
        </Link>
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
