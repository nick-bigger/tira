import { FitBounds, LocateControl } from '@/components/map-controls'
import type { Tier } from '@/components/tier-icon'
import { coordinateFor } from '@/lib/geo'
import type { PlaceWithScore } from '@/lib/places'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useMemo } from 'react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'

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
    popupAnchor: [0, -38],
  })
}

export interface PlaceMapViewProps {
  places: PlaceWithScore[]
}

export function PlaceMapView({ places }: PlaceMapViewProps) {
  const points = useMemo(() => places.map((p) => coordinateFor(p)), [places])
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
          {places.map((place, i) => {
            const coord = points[i]
            return (
              <Marker key={place.id} position={[coord.lat, coord.lng]} icon={scoreIcon(place)}>
                <Popup>
                  <p className="font-display font-bold">{place.name}</p>
                  {place.location && <p className="text-xs opacity-70">{place.location}</p>}
                </Popup>
              </Marker>
            )
          })}
          <LocateControl />
        </MapContainer>
      </div>
      <p className="mt-2.5 text-center text-xs font-bold opacity-55">
        Pins use real coordinates when a place was added via search or matched to a real address -
        older places are still mocked until re-saved.
      </p>
    </div>
  )
}
