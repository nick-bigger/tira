import { AppTileLayer } from '@/components/map-controls'
import type { Bookmark } from '@/lib/bookmarks'
import { coordinateFor } from '@/lib/geo'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useMemo } from 'react'
import { MapContainer, Marker } from 'react-leaflet'

const bookmarkPinIcon = L.divIcon({
  className: '',
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-8px)">
      <div style="border:3px solid #2b1810;border-radius:999px;width:3.1rem;height:3.1rem;
        display:flex;align-items:center;justify-content:center;box-shadow:4px 4px 0 #2b1810;
        background:#a65a34;color:#f7eedd">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 4a2 2 0 012-2h8a2 2 0 012 2v17l-6-3.4L6 21V4z" />
        </svg>
      </div>
      <div style="width:0;height:0;border-left:8px solid transparent;
        border-right:8px solid transparent;border-top:11px solid #2b1810;margin-top:-3px"></div>
    </div>`,
  iconSize: [50, 58],
  iconAnchor: [25, 58],
})

export interface BookmarkHeroMapProps {
  bookmark: Bookmark
  className?: string
}

/** Single-pin map used as the bookmark detail page's hero - mirrors PlaceHeroMap but with the
 *  bookmark ribbon icon instead of a score badge, since bookmarks have no ranking yet. */
export function BookmarkHeroMap({ bookmark, className }: BookmarkHeroMapProps) {
  const coord = useMemo(() => coordinateFor(bookmark), [bookmark])

  return (
    <MapContainer
      key={bookmark.id}
      center={[coord.lat, coord.lng]}
      zoom={14}
      scrollWheelZoom={false}
      zoomControl={false}
      attributionControl={false}
      className={className}
    >
      <AppTileLayer />
      <Marker position={[coord.lat, coord.lng]} icon={bookmarkPinIcon} />
    </MapContainer>
  )
}
