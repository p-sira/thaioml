import type { ReactNode } from 'react'
import { classNames } from '@/lib/classNames'

export const fieldStyles = 'w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm outline-none placeholder:text-foreground-muted focus:border-accent focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:bg-surface disabled:text-foreground-muted sm:text-sm'

export function FormField({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-foreground-muted">{hint}</p>}
    </div>
  )
}

export function statusMessageStyles(message: string) {
  return classNames('text-sm', message.toLowerCase().includes('fail') ? 'text-red-600' : 'text-green-600')
}
