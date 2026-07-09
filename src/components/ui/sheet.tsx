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

/**
 * Bottom sheet on mobile, centered modal on desktop (sm: and up) - same brutal-styled
 * radix Dialog content, just repositioned/re-animated past the sm breakpoint so it isn't
 * stranded at the bottom of a tall desktop viewport. Pass `fullScreen` for flows that are
 * a whole page in their own right (e.g. search) rather than a quick action on top of one -
 * it covers the entire viewport, including on desktop, instead of floating as a sheet/modal.
 */
function SheetContent({
  className,
  children,
  fullScreen = false,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { fullScreen?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <SheetOverlay />
      <DialogPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          fullScreen
            ? [
                'fixed inset-0 z-50 flex flex-col gap-0 bg-card px-5 outline-hidden',
                'pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]',
                'data-open:animate-in data-open:duration-250 data-open:slide-in-from-bottom',
                'data-closed:animate-out data-closed:duration-200 data-closed:slide-out-to-bottom',
              ]
            : [
                'fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[88svh] w-full max-w-md flex-col gap-0 rounded-t-2xl border-t-[3px] border-border bg-card px-5 pt-5 shadow-[0_-6px_0px_var(--border)] outline-hidden',
                'pb-[max(1.25rem,env(safe-area-inset-bottom))]',
                'sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[85vh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border-[3px] sm:pb-5 sm:shadow-[8px_8px_0px_var(--border)]',
                'data-open:animate-in data-open:duration-300 data-open:slide-in-from-bottom',
                'data-closed:animate-out data-closed:duration-200 data-closed:slide-out-to-bottom',
                'sm:data-open:fade-in-0 sm:data-open:slide-in-from-bottom-0 sm:data-open:zoom-in-95',
                'sm:data-closed:fade-out-0 sm:data-closed:slide-out-to-bottom-0 sm:data-closed:zoom-out-95',
              ],
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
