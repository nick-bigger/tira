import { FitBounds, LocateControl } from '@/components/map-controls'
import type { Bookmark } from '@/lib/bookmarks'
import { coordinateFor } from '@/lib/geo'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useMemo } from 'react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'

const bookmarkPinIcon = L.divIcon({
  className: '',
  html: `
    <div style="transform:translateY(-4px)">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="#a65a34" stroke="#2b1810" stroke-width="1.2">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z" />
      </svg>
    </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 26],
  popupAnchor: [0, -24],
})

export interface BookmarkMapViewProps {
  bookmarks: Bookmark[]
  onRank: (bookmark: Bookmark) => void
}

export function BookmarkMapView({ bookmarks, onRank }: BookmarkMapViewProps) {
  const points = useMemo(() => bookmarks.map((b) => coordinateFor(b)), [bookmarks])
  const bounds = useMemo<[number, number][]>(() => points.map((p) => [p.lat, p.lng]), [points])

  return (
    <div>
      <div className="brutal relative h-[min(62vh,620px)] overflow-hidden">
        <MapContainer
          center={[39.8, -98.5]}
          zoom={4}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds points={bounds} />
          {bookmarks.map((b, i) => {
            const coord = points[i]
            return (
              <Marker key={b.id} position={[coord.lat, coord.lng]} icon={bookmarkPinIcon}>
                <Popup>
                  <p className="font-display font-bold">{b.name}</p>
                  {b.location && <p className="text-xs opacity-70">{b.location}</p>}
                  <button
                    type="button"
                    onClick={() => onRank(b)}
                    className="mt-2 font-display text-xs font-bold text-accent"
                  >
                    + Rank it
                  </button>
                </Popup>
              </Marker>
            )
          })}
          <LocateControl />
        </MapContainer>
      </div>
      <p className="mt-2.5 text-center text-xs font-bold opacity-55">
        Places you've bookmarked to try - pins use real coordinates from search.
      </p>
    </div>
  )
}
