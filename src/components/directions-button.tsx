import { BADGE_CLASS } from '@/components/place-osm-details'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  directionsUrl,
  getSavedMapProvider,
  saveMapProvider,
  type DirectionsTarget,
  type MapProvider,
} from '@/lib/directions'
import { CompassIcon } from 'lucide-react'
import { useState } from 'react'

const MAP_PROVIDER_LABEL: Record<MapProvider, string> = {
  apple: 'Apple Maps',
  google: 'Google Maps',
}

/** "Directions" badge, shared by the ranked-place and bookmark detail pages - takes any
 *  DirectionsTarget so it works for both PlaceWithScore and Bookmark. The very first tap (no
 *  saved provider yet) prompts once for Apple vs Google Maps; every tap after that goes straight
 *  to the saved provider - there's no separate control to re-open that picker later. */
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
    <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            if (provider) {
              e.preventDefault()
              go(provider)
            }
          }}
          className={BADGE_CLASS}
        >
          <CompassIcon className="h-3.5 w-3.5 shrink-0" />
          Directions
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="brutal-sm w-40 border-0 bg-card p-1">
        {(Object.keys(MAP_PROVIDER_LABEL) as MapProvider[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => go(p)}
            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left font-display text-sm font-bold hover:bg-muted"
          >
            {MAP_PROVIDER_LABEL[p]}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
