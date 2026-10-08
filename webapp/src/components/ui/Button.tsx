import type { ButtonHTMLAttributes } from 'react'
import { classNames } from '@/lib/classNames'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md'

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
} = {}) {
  return classNames(
    'inline-flex items-center justify-center gap-2 rounded-md font-medium transition disabled:pointer-events-none disabled:opacity-50',
    size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm',
    variant === 'primary' && 'bg-foreground text-background hover:opacity-90',
    variant === 'secondary' && 'bg-surface text-foreground hover:bg-border',
    variant === 'ghost' && 'text-foreground hover:bg-surface',
    className,
  )
}

export function Button({
  className,
  variant,
  size,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}) {
  return <button type={type} className={buttonStyles({ variant, size, className })} {...props} />
}
