import { BookmarkIcon, PlusIcon } from '@/components/icons'
import { AppTileLayer, FitBounds, LocateControl } from '@/components/map-controls'
import { PinIcon } from '@/components/pin-icon'
import type { Bookmark } from '@/lib/bookmarks'
import { coordinateFor, placeDistanceMi, type LatLng } from '@/lib/geo'
import { useGeolocation } from '@/lib/use-geolocation'
import { useNavigate } from '@tanstack/react-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet'

const bookmarkIcon = L.divIcon({
  className: '',
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-6px)">
      <div style="border:2.5px solid #2b1810;border-radius:999px;width:2.15rem;height:2.15rem;
        display:flex;align-items:center;justify-content:center;box-shadow:3px 3px 0 #2b1810;
        background:#a65a34;color:#f7eedd">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 4a2 2 0 012-2h8a2 2 0 012 2v17l-6-3.4L6 21V4z" />
        </svg>
      </div>
      <div style="width:0;height:0;border-left:6px solid transparent;
        border-right:6px solid transparent;border-top:8px solid #2b1810;margin-top:-2px"></div>
    </div>`,
  iconSize: [34, 40],
  iconAnchor: [17, 40],
})

/** Clears the selected-bookmark card when the user taps blank map area. */
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

export interface BookmarkMapViewProps {
  bookmarks: Bookmark[]
  onRank: (bookmark: Bookmark) => void
  onRemove: (bookmark: Bookmark) => void
  removingId: string | null
}

export function BookmarkMapView({ bookmarks, onRank, onRemove, removingId }: BookmarkMapViewProps) {
  const navigate = useNavigate()
  const { position, locate } = useGeolocation()
  const points = useMemo(() => bookmarks.map((b) => coordinateFor(b)), [bookmarks])
  const bounds = useMemo<[number, number][]>(() => points.map((p) => [p.lat, p.lng]), [points])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = bookmarks.find((b) => b.id === selectedId) ?? null
  const selectedCoord = selected ? coordinateFor(selected) : null
  const dist = selected && position ? placeDistanceMi(selected, position) : null

  useEffect(() => {
    locate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <div className="brutal relative h-[min(62vh,620px)] overflow-hidden">
        <MapContainer
          center={[39.8, -98.5]}
          zoom={4}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <AppTileLayer />
          <FitBounds points={bounds} />
          <DeselectOnMapClick onDeselect={() => setSelectedId(null)} />
          <RecenterOnSelect target={selectedCoord} />
          {bookmarks.map((b, i) => {
            const coord = points[i]
            return (
              <Marker
                key={b.id}
                position={[coord.lat, coord.lng]}
                icon={bookmarkIcon}
                eventHandlers={{ click: () => setSelectedId(b.id) }}
              />
            )
          })}
          <LocateControl />
        </MapContainer>
        {selected && (
          <div className="brutal-sm brutal-hover absolute right-3 bottom-3 left-3 z-[1000] bg-card px-4 pt-3 pb-6 text-foreground">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate({ to: '/bookmark/$id', params: { id: selected.id } })}
                className="min-w-0 flex-1 cursor-pointer text-left"
              >
                <span className="block truncate font-display font-bold">{selected.name}</span>
                {selected.location && (
                  <span className="flex items-center gap-1 truncate text-xs font-bold opacity-60">
                    <PinIcon className="h-3 w-3 shrink-0" />
                    {selected.location}
                  </span>
                )}
              </button>
              <span className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => onRank(selected)}
                  aria-label="Rank it"
                  className="brutal-xs flex h-8 w-8 items-center justify-center bg-card"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={removingId === selected.id}
                  onClick={() => onRemove(selected)}
                  aria-label="Remove bookmark"
                  className="brutal-xs flex h-8 w-8 items-center justify-center bg-card text-accent disabled:opacity-40"
                >
                  <BookmarkIcon filled className="h-4 w-4" />
                </button>
              </span>
            </div>
            {dist != null && (
              <span className="absolute bottom-2 left-4 text-[11px] font-bold text-muted-foreground">
                {dist.toFixed(1)} mi
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
