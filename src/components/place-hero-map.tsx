import { AppTileLayer } from '@/components/map-controls'
import type { Tier } from '@/components/tier-icon'
import { coordinateFor } from '@/lib/geo'
import type { Place } from '@/lib/places'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useMemo } from 'react'
import { MapContainer, Marker } from 'react-leaflet'

const TIER_HEX: Record<Tier, { bg: string; fg: string }> = {
  liked: { bg: '#5c8f5f', fg: '#f7eedd' },
  okay: { bg: '#c2924a', fg: '#2b1810' },
  nope: { bg: '#bd5a4d', fg: '#f7eedd' },
}

function bigScoreIcon(tier: Tier, score: number): L.DivIcon {
  const { bg, fg } = TIER_HEX[tier]
  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-8px)">
        <div style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:1.05rem;
          border:3px solid #2b1810;border-radius:999px;width:3.1rem;height:3.1rem;
          display:flex;align-items:center;justify-content:center;box-shadow:4px 4px 0 #2b1810;
          background:${bg};color:${fg}">${score.toFixed(1)}</div>
        <div style="width:0;height:0;border-left:8px solid transparent;
          border-right:8px solid transparent;border-top:11px solid #2b1810;margin-top:-3px"></div>
      </div>`,
    iconSize: [50, 58],
    iconAnchor: [25, 58],
  })
}

export interface PlaceHeroMapProps {
  place: Place & { tier: Tier }
  score: number
  className?: string
}

/** Single-pin map used as the place detail page's hero - same pin styling as
 *  place-map-view, just bigger, so the detail page reads like "zooming into" one pin. */
export function PlaceHeroMap({ place, score, className }: PlaceHeroMapProps) {
  const coord = useMemo(() => coordinateFor(place), [place])
  const icon = useMemo(() => bigScoreIcon(place.tier, score), [place.tier, score])

  return (
    <MapContainer
      key={place.id}
      center={[coord.lat, coord.lng]}
      zoom={14}
      scrollWheelZoom={false}
      zoomControl={false}
      attributionControl={false}
      className={className}
    >
      <AppTileLayer />
      <Marker position={[coord.lat, coord.lng]} icon={icon} />
    </MapContainer>
  )
}
