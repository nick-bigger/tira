import { Label } from '@/components/ui/label'
import { type ReactNode } from 'react'

export const FIELD_INPUT_CLASS =
  'font-bold w-full bg-transparent outline-none placeholder:opacity-50 border-0 rounded-none shadow-none h-auto p-0 focus-visible:ring-0 text-base md:text-base'

export function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="brutal-sm bg-background px-3 py-2">
      <Label htmlFor={id} className="eyebrow mb-0.5 block text-[10px] opacity-60">
        {label}
      </Label>
      {children}
    </div>
  )
}
