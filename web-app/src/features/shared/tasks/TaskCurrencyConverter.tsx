import { useEffect, useId, useState } from 'react'

import { InlineSpinner } from '@/components/feedback'
import { Field, FieldLabel } from '@/components/forms'
import { Select } from '@/components/ui/select'
import {
  type FxRates,
  getFxRates,
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '@/services/fx'

import { SectionCard } from '../PortalPageShell'

function formatMoney(amount: number, currency: SupportedCurrency): string {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount)
}

function formatUpdated(iso: string | null): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    date,
  )
}

export function TaskCurrencyConverter({ amountUsd }: { amountUsd: number }) {
  const selectId = useId()
  const [rates, setRates] = useState<FxRates | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [currency, setCurrency] = useState<SupportedCurrency>('EUR')

  useEffect(() => {
    let cancelled = false
    getFxRates('USD')
      .then((data) => {
        if (!cancelled) setRates(data)
      })
      .catch(() => {
        if (!cancelled) setHasError(true)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const available = SUPPORTED_CURRENCIES.filter((code) => code !== 'USD' && rates?.rates[code])
  const selected = available.includes(currency) ? currency : available[0]
  const rate = selected ? rates?.rates[selected] : undefined
  const updated = formatUpdated(rates?.fetchedAt ?? null)

  return (
    <SectionCard title="Currency conversion" description="Task price in your local currency.">
      {isLoading ? (
        <InlineSpinner label="Loading rates…" />
      ) : hasError || !rates || rates.fallback || available.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Exchange rates are unavailable right now. Prices are charged in USD.
        </p>
      ) : (
        <div className="flex flex-col gap-3 text-sm">
          <Field>
            <FieldLabel htmlFor={selectId}>Currency</FieldLabel>
            <Select
              id={selectId}
              value={selected}
              onChange={(event) => setCurrency(event.target.value as SupportedCurrency)}
            >
              {available.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
          </Field>

          <div>
            <p className="text-muted-foreground">
              <span dir="ltr">{formatMoney(amountUsd, 'USD')}</span> ≈
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums" dir="ltr">
              {rate && selected ? formatMoney(amountUsd * rate, selected) : '—'}
            </p>
          </div>

          {rate ? (
            <p className="text-xs text-muted-foreground tabular-nums" dir="ltr">
              1 USD = {rate.toFixed(4)} {selected}
            </p>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Estimate only; payments are charged in USD.
            {updated ? ` Rates updated ${updated}.` : null}
          </p>
        </div>
      )}
    </SectionCard>
  )
}
