import { AppTileLayer, FitBounds, LocateControl } from '@/components/map-controls'
import { PinIcon } from '@/components/pin-icon'
import { TIER_BADGE_FILL, type Tier } from '@/components/tier-icon'
import { coordinateFor, placeDistanceMi, type LatLng } from '@/lib/geo'
import type { PlaceWithScore } from '@/lib/places'
import { useGeolocation } from '@/lib/use-geolocation'
import { useNavigate } from '@tanstack/react-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet'

const TIER_HEX: Record<Tier, { bg: string; fg: string }> = {
  liked: { bg: '#5c8f5f', fg: '#f7eedd' },
  okay: { bg: '#c2924a', fg: '#2b1810' },
  nope: { bg: '#bd5a4d', fg: '#f7eedd' },
}

function scoreIcon(place: PlaceWithScore): L.DivIcon {
  const { bg, fg } = TIER_HEX[place.tier]
  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-6px)">
        <div style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:0.8rem;
          border:2.5px solid #2b1810;border-radius:999px;width:2.15rem;height:2.15rem;
          display:flex;align-items:center;justify-content:center;box-shadow:3px 3px 0 #2b1810;
          background:${bg};color:${fg}">${place.score.toFixed(1)}</div>
        <div style="width:0;height:0;border-left:6px solid transparent;
          border-right:6px solid transparent;border-top:8px solid #2b1810;margin-top:-2px"></div>
      </div>`,
    iconSize: [34, 40],
    iconAnchor: [17, 40],
  })
}

/** Clears the selected-place card when the user taps blank map area. */
function DeselectOnMapClick({ onDeselect }: { onDeselect: () => void }) {
  useMapEvents({ click: onDeselect })
  return null
}

/** Pans the map to whichever pin was just selected, without changing zoom. */
function RecenterOnSelect({ target }: { target: LatLng | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 13), { duration: 0.5 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.lat, target?.lng])
  return null
}

export interface PlaceMapViewProps {
  places: PlaceWithScore[]
  /** Reports the selected-place card's rendered height (or null when none is shown), so a
   * caller-owned floating button can reposition itself above the card instead of overlapping it. */
  onCardHeightChange?: (height: number | null) => void
}

export function PlaceMapView({ places, onCardHeightChange }: PlaceMapViewProps) {
  const navigate = useNavigate()
  const { position, locate } = useGeolocation()
  const points = useMemo(() => places.map((p) => coordinateFor(p)), [places])
  const bounds = useMemo<[number, number][]>(() => points.map((p) => [p.lat, p.lng]), [points])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = places.find((p) => p.id === selectedId) ?? null
  const selectedCoord = selected ? coordinateFor(selected) : null
  const dist = selected && position ? placeDistanceMi(selected, position) : null
  const cardRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    locate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selected) {
      onCardHeightChange?.(null)
      return undefined
    }
    const el = cardRef.current
    if (!el) return undefined
    // Reads el.offsetHeight (border-box, includes padding) rather than the ResizeObserver
    // entry's contentRect (content-box only) - this card's height is mostly padding, so
    // contentRect drastically undershoots how much room the floating button needs to clear it.
    const observer = new ResizeObserver(() => onCardHeightChange?.(el.offsetHeight))
    observer.observe(el)
    onCardHeightChange?.(el.offsetHeight)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border-0 shadow-none sm:h-[min(62vh,620px)] sm:flex-none sm:rounded-[var(--radius-lg)] sm:border-[3px] sm:border-border sm:shadow-[6px_6px_0px_var(--border)]">
        <MapContainer
          center={[39.8, -98.5]}
          zoom={4}
          scrollWheelZoom={false}
          className="min-h-0 w-full flex-1"
        >
          <AppTileLayer />
          <FitBounds points={bounds} />
          <DeselectOnMapClick onDeselect={() => setSelectedId(null)} />
          <RecenterOnSelect target={selectedCoord} />
          {places.map((place, i) => {
            const coord = points[i]
            return (
              <Marker
                key={place.id}
                position={[coord.lat, coord.lng]}
                icon={scoreIcon(place)}
                eventHandlers={{ click: () => setSelectedId(place.id) }}
              />
            )
          })}
          <LocateControl />
        </MapContainer>
        {selected && (
          <button
            ref={cardRef}
            type="button"
            onClick={() => navigate({ to: '/place/$id', params: { id: selected.id } })}
            className="brutal-sm absolute right-3 bottom-3 left-3 z-[1000] block cursor-pointer bg-card py-3 pr-16 pb-6 pl-4 text-left text-foreground"
          >
            <span
              className={`brutal-xs absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full font-display text-sm font-bold ${TIER_BADGE_FILL[selected.tier]}`}
            >
              {selected.score.toFixed(1)}
            </span>
            <span className="block min-w-0 flex-1">
              <span className="block truncate font-display font-bold">{selected.name}</span>
              {selected.location && (
                <span className="flex items-center gap-1 truncate text-xs font-bold opacity-60">
                  <PinIcon className="h-3 w-3 shrink-0" />
                  {selected.location}
                </span>
              )}
            </span>
            {dist != null && (
              <span className="absolute bottom-2 left-4 text-[11px] font-bold text-muted-foreground">
                {dist.toFixed(1)} mi
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
