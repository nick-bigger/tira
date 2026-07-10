import { CompassIcon } from '@/components/icons'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  directionsUrl,
  getSavedMapProvider,
  saveMapProvider,
  type DirectionsTarget,
  type MapProvider,
} from '@/lib/directions'
import { ChevronDownIcon } from 'lucide-react'
import { useState } from 'react'

const MAP_PROVIDER_LABEL: Record<MapProvider, string> = {
  apple: 'Apple Maps',
  google: 'Google Maps',
}

/** "Get Directions" button + maps-app picker, shared by the ranked-place and bookmark detail
 *  pages - takes any DirectionsTarget so it works for both PlaceWithScore and Bookmark. */
export function DirectionsButton({ place }: { place: DirectionsTarget }) {
  const [provider, setProvider] = useState<MapProvider | null>(getSavedMapProvider)
  const [pickerOpen, setPickerOpen] = useState(false)

  function go(p: MapProvider) {
    saveMapProvider(p)
    setProvider(p)
    setPickerOpen(false)
    window.open(directionsUrl(place, p), '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="mt-4 flex items-stretch gap-2">
      <button
        type="button"
        onClick={() => (provider ? go(provider) : setPickerOpen(true))}
        className="brutal-sm flex h-auto flex-1 items-center justify-center gap-2 border-0 bg-primary py-2.5 font-display text-sm font-bold text-primary-foreground"
      >
        <CompassIcon className="h-4 w-4" />
        Get Directions
      </button>
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Choose maps app"
            className="brutal-sm flex h-auto w-11 shrink-0 items-center justify-center border-0 bg-primary text-primary-foreground"
          >
            <ChevronDownIcon className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={6} className="brutal-sm w-40 border-0 bg-card p-1">
          {(Object.keys(MAP_PROVIDER_LABEL) as MapProvider[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => go(p)}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left font-display text-sm font-bold hover:bg-muted ${
                provider === p ? 'text-primary' : ''
              }`}
            >
              {MAP_PROVIDER_LABEL[p]}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  )
}
