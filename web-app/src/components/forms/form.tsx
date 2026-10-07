import * as React from 'react'
import { cn } from 'cn'

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field'

/**
 * Domain-agnostic form shell. Pair with Field* primitives (shadcn base-nova)
 * instead of the legacy react-hook-form Form wrapper.
 */
function Form({ className, ...props }: React.ComponentProps<'form'>) {
  return <form data-slot="form" className={cn('flex flex-col gap-6', className)} {...props} />
}

export {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
  Form,
}
