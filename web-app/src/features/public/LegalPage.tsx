import type { MouseEvent } from 'react'

import { Card } from '@/components/ui/card'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

import type { LegalDocument } from './content/legal'
import { usePublicDictionary } from './i18n'

const email = 'info@original-iq.com'

function scrollToSection(event: MouseEvent<HTMLAnchorElement>, id: string) {
  event.preventDefault()
  const target = document.getElementById(id)
  if (!target) return

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  window.history.pushState(null, '', `#${id}`)
}

function RichText({ text }: { text: string }) {
  if (!text.includes(email)) return text
  const [before, after] = text.split(email)
  return (
    <>
      {before}
      <a
        href={`mailto:${email}`}
        dir="ltr"
        className="text-primary underline-offset-4 hover:underline"
      >
        {email}
      </a>
      {after}
    </>
  )
}

export function LegalPage({ page }: { page: LegalDocument }) {
  const t = usePublicDictionary().legal
  useDocumentTitle(page.title)

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-10 lg:grid-cols-[260px_1fr]">
      <nav
        aria-label={t.onThisPage}
        className="h-fit rounded-lg border border-border bg-card p-3 shadow-sm lg:sticky lg:top-24"
      >
        <h2 className="px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {t.onThisPage}
        </h2>
        <ol className="mt-2 flex flex-col">
          {page.sections.map((section, index) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="flex items-start gap-2 rounded-md px-2 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary-dark"
                onClick={(event) => scrollToSection(event, section.id)}
              >
                <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary-dark">
                  {index + 1}
                </span>
                <span>{section.title}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex min-w-0 flex-col gap-4">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">{page.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{page.description}</p>
        </header>
        <Card className="border-s-4 border-s-primary p-4 text-sm">
          {page.company.map((line) => (
            <p key={line}>
              <RichText text={line} />
            </p>
          ))}
        </Card>
        {page.sections.map((section, index) => (
          <Card key={section.id} id={section.id} className="scroll-mt-24 p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary-dark">
                {index + 1}
              </span>
              {section.title}
            </h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-3 text-sm leading-6 text-muted-foreground">
                <RichText text={paragraph} />
              </p>
            ))}
          </Card>
        ))}
      </div>
    </div>
  )
}
