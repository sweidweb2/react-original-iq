import { type FormEvent, useMemo, useState } from 'react'

import { Field, FieldError, FieldGroup, Form } from '@/components/forms'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { SearchField } from '@/components/ui/search-field'
import { toast } from '@/components/ui/toast'
import { type FieldErrors, parseForm } from '@/lib/form'
import { createLead } from '@/services/contact'

import { countries } from './countries'
import { leadSchema, type LeadValues } from './lead.schema'

const emptyValues: LeadValues = { country: '', dialCode: '', phone: '' }

type LeadModalProps = {
  open: boolean
  onClose: () => void
}

export function LeadModal({ open, onClose }: LeadModalProps) {
  const [values, setValues] = useState<LeadValues>(emptyValues)
  const [query, setQuery] = useState('')
  const [listOpen, setListOpen] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<keyof LeadValues>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return countries
    return countries.filter((country) => country.name.toLowerCase().includes(term))
  }, [query])

  function close() {
    setValues(emptyValues)
    setQuery('')
    setListOpen(false)
    setFieldErrors({})
    setFormError(null)
    setIsSubmitting(false)
    onClose()
  }

  function selectCountry(name: string, dialCode: string) {
    setValues((current) => ({ ...current, country: name, dialCode }))
    setQuery(name)
    setListOpen(false)
    setFieldErrors((current) => ({ ...current, country: undefined, dialCode: undefined }))
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseForm(leadSchema, values)
    if (!parsed.success) {
      setFieldErrors(parsed.fieldErrors)
      return
    }

    setFieldErrors({})
    setFormError(null)
    setIsSubmitting(true)
    try {
      await createLead(parsed.data)
      toast.success("Thanks — we'll reach out to assist you.")
      close()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not send your details')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Struggling with school or university work?"
      description="Leave your country and phone number, and we'll reach out to assist you."
      footer={
        <Button type="submit" form="home-lead-form" disabled={isSubmitting}>
          {isSubmitting ? 'Sending…' : 'Send'}
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
                label="Country"
                placeholder="Search and select your country..."
                value={query}
                onValueChange={(next) => {
                  setQuery(next)
                  setListOpen(true)
                  if (next !== values.country) {
                    setValues((current) => ({ ...current, country: '', dialCode: '' }))
                  }
                }}
              />
              {listOpen ? (
                <ul
                  role="listbox"
                  aria-label="Countries"
                  className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-card py-1 shadow-md"
                >
                  {matches.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-muted-foreground">No results found</li>
                  ) : (
                    matches.map((country) => (
                      <li key={country.name}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={values.country === country.name}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                          onMouseDown={(event) => {
                            event.preventDefault()
                            selectCountry(country.name, country.dialCode)
                          }}
                        >
                          <span>{country.name}</span>
                          <span className="text-muted-foreground">{country.dialCode}</span>
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
                aria-label="Country code"
                value={values.dialCode}
                placeholder="Code"
                readOnly
                disabled={!values.dialCode}
              />
            </Field>
            <Field>
              <Input
                aria-label="Phone number"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder={values.dialCode ? `${values.dialCode} Phone Number` : 'Phone Number'}
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
