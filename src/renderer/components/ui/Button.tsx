import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../../utils/cn'

const buttonVariants = cva(
  'inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-emerald-400 text-zinc-950 hover:bg-emerald-300 focus-visible:outline-emerald-300',
        secondary:
          'border border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10 focus-visible:outline-zinc-400',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  },
)

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, asChild = false, ...props }, ref) => {
    const Component = asChild ? Slot : 'button'

    return (
      <Component
        ref={ref}
        className={cn(buttonVariants({ variant, className }))}
        {...props}
      />
    )
  },
)

Button.displayName = 'Button'
