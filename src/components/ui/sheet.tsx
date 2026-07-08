import { Dialog as DialogPrimitive } from 'radix-ui'
import * as React from 'react'

import { cn } from '@/lib/utils'

function Sheet({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />
}

function SheetClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-foreground/45 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
        className,
      )}
      {...props}
    />
  )
}

/** Bottom sheet built on radix Dialog - slides up from the bottom, matches the app's brutal styling. */
function SheetContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <SheetOverlay />
      <DialogPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[88svh] w-full max-w-md flex-col gap-0 rounded-t-2xl border-t-[3px] border-border bg-card px-5 pt-5 shadow-[0_-6px_0px_var(--border)] outline-hidden',
          'pb-[max(1.25rem,env(safe-area-inset-bottom))]',
          'data-open:animate-in data-open:duration-300 data-open:slide-in-from-bottom',
          'data-closed:animate-out data-closed:duration-200 data-closed:slide-out-to-bottom',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn('font-display text-xl font-bold', className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-sm font-bold opacity-60', className)}
      {...props}
    />
  )
}

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetOverlay, SheetTitle }
