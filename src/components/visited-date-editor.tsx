import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { updatePlaceVisitedDate, type PlaceWithScore } from '@/lib/places'
import { format } from 'date-fns'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useEffect, useState } from 'react'

export interface VisitedDateEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  place: PlaceWithScore
  onSaved: () => void | Promise<void>
}

/** Focused visited-date-only editor - mirrors NotesEditor's layout (full page takeover on
 *  mobile, centered modal on desktop). */
export function VisitedDateEditor({ open, onOpenChange, place, onSaved }: VisitedDateEditorProps) {
  const [date, setDate] = useState(place.visitedDate ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setDate(place.visitedDate ?? '')
  }, [open, place.visitedDate])

  async function handleSave() {
    setSaving(true)
    await updatePlaceVisitedDate(place.id, date)
    setSaving(false)
    await onSaved()
    onOpenChange(false)
  }

  const dateObj = date ? new Date(`${date}T00:00:00`) : undefined

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/45 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 flex flex-col gap-0 bg-card px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] outline-hidden sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border-[3px] sm:border-border sm:pb-5 sm:shadow-[8px_8px_0px_var(--border)] data-open:animate-in data-open:duration-200 data-open:fade-in-0 sm:data-open:zoom-in-95 data-closed:animate-out data-closed:duration-150 data-closed:fade-out-0 sm:data-closed:zoom-out-95">
          <div className="mb-4 flex items-center justify-between">
            <DialogPrimitive.Title className="font-display text-xl font-bold">
              Visited
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="brutal-xs flex h-7 w-7 shrink-0 items-center justify-center bg-card text-sm font-bold"
              >
                ✕
              </button>
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="sr-only">
            Edit the date you visited {place.name}.
          </DialogPrimitive.Description>
          <div className="flex flex-1 flex-col items-center justify-center gap-2 sm:flex-none">
            <Calendar
              mode="single"
              selected={dateObj}
              onSelect={(d) => setDate(d ? format(d, 'yyyy-MM-dd') : '')}
            />
            {date && (
              <button
                type="button"
                onClick={() => setDate('')}
                className="text-sm font-bold text-accent"
              >
                Clear date
              </button>
            )}
          </div>
          <div className="mt-5 flex shrink-0 gap-2 sm:mt-4">
            <Button
              type="button"
              variant="ghost"
              disabled={saving}
              onClick={() => onOpenChange(false)}
              className="brutal-sm h-auto flex-1 bg-card py-2.5 font-display font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="brutal-sm h-auto flex-1 border-0 bg-primary py-2.5 font-display font-bold text-primary-foreground"
            >
              Save
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
