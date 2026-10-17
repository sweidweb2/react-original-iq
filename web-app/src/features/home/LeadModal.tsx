import { type FormEvent, useMemo, useState } from 'react'

import { Field, FieldError, FieldGroup, Form } from '@/components/forms'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { SearchField } from '@/components/ui/search-field'
import { toast } from '@/components/ui/toast'
import { useI18n } from '@/i18n'
import { type FieldErrors, parseForm } from '@/lib/form'
import { createLead } from '@/services/contact'

import { countries, type Country } from './countries'
import { useHomeDictionary } from './i18n'
import { createLeadSchema, type LeadValues } from './lead.schema'

const emptyValues: LeadValues = { country: '', dialCode: '', phone: '' }

type LeadModalProps = {
  open: boolean
  onClose: () => void
}

export function LeadModal({ open, onClose }: LeadModalProps) {
  const { locale } = useI18n()
  const t = useHomeDictionary().lead
  const schema = useMemo(() => createLeadSchema(t.validation), [t.validation])
  const [values, setValues] = useState<LeadValues>(emptyValues)
  const [query, setQuery] = useState('')
  const [listOpen, setListOpen] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<keyof LeadValues>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedName = countries.find((c) => c.name.en === values.country)?.name[locale] ?? ''

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return countries
    return countries.filter(
      (country) =>
        country.name[locale].toLowerCase().includes(term) ||
        country.name.en.toLowerCase().includes(term),
    )
  }, [query, locale])

  function close() {
    setValues(emptyValues)
    setQuery('')
    setListOpen(false)
    setFieldErrors({})
    setFormError(null)
    setIsSubmitting(false)
    onClose()
  }

  function selectCountry(country: Country) {
    setValues((current) => ({ ...current, country: country.name.en, dialCode: country.dialCode }))
    setQuery(country.name[locale])
    setListOpen(false)
    setFieldErrors((current) => ({ ...current, country: undefined, dialCode: undefined }))
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseForm(schema, values)
    if (!parsed.success) {
      setFieldErrors(parsed.fieldErrors)
      return
    }

    setFieldErrors({})
    setFormError(null)
    setIsSubmitting(true)
    try {
      await createLead(parsed.data)
      toast.success(t.success)
      close()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t.failed)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={t.title}
      description={t.description}
      footer={
        <Button type="submit" form="home-lead-form" disabled={isSubmitting}>
          {isSubmitting ? t.sending : t.send}
        </Button>
      }
    >
      <Form id="home-lead-form" onSubmit={onSubmit}>
        {formError ? <Alert tone="danger" className="mb-4" title={formError} /> : null}
        <FieldGroup>
          <Field>
            <div
              className="relative"
              onFocus={() => setListOpen(true)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setListOpen(false)
                }
              }}
            >
              <SearchField
                label={t.countryLabel}
                placeholder={t.countryPlaceholder}
                clearLabel={t.clearSearch}
                value={query}
                onValueChange={(next) => {
                  setQuery(next)
                  setListOpen(true)
                  if (next !== selectedName) {
                    setValues((current) => ({ ...current, country: '', dialCode: '' }))
                  }
                }}
              />
              {listOpen ? (
                <ul
                  role="listbox"
                  aria-label={t.countriesLabel}
                  className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-card py-1 shadow-md"
                >
                  {matches.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-muted-foreground">{t.noResults}</li>
                  ) : (
                    matches.map((country) => (
                      <li key={country.name.en}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={values.country === country.name.en}
                          className="flex w-full items-center justify-between px-3 py-2 text-start text-sm hover:bg-muted"
                          onMouseDown={(event) => {
                            event.preventDefault()
                            selectCountry(country)
                          }}
                        >
                          <span>{country.name[locale]}</span>
                          <bdi dir="ltr" className="text-muted-foreground">
                            {country.dialCode}
                          </bdi>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              ) : null}
            </div>
            <FieldError>{fieldErrors.country}</FieldError>
          </Field>

          <div className="grid grid-cols-[5.5rem_1fr] gap-2">
            <Field>
              <Input
                aria-label={t.codeLabel}
                dir="ltr"
                value={values.dialCode}
                placeholder={t.codePlaceholder}
                readOnly
                disabled={!values.dialCode}
              />
            </Field>
            <Field>
              <Input
                aria-label={t.phoneLabel}
                dir="ltr"
                className="rtl:text-end"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder={t.phonePlaceholder}
                value={values.phone}
                onChange={(event) => {
                  const phone = event.target.value
                  setValues((current) => ({ ...current, phone }))
                  setFieldErrors((current) => ({ ...current, phone: undefined }))
                }}
              />
              <FieldError>{fieldErrors.phone}</FieldError>
            </Field>
          </div>
        </FieldGroup>
      </Form>
    </Dialog>
  )
}
