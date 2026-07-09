import { LocateIcon } from '@/components/icons'
import { useGeolocation } from '@/lib/use-geolocation'
import { useEffect } from 'react'
import { CircleMarker, useMap } from 'react-leaflet'

/** Shared between place-map-view and bookmark-map-view - fits the map to a set of pins. */
export function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView(points[0], 11)
    } else {
      map.fitBounds(points, { padding: [30, 30] })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, JSON.stringify(points)])
  return null
}

/** Shared "locate me" button + user-position marker for both map views. */
export function LocateControl() {
  const map = useMap()
  const { position, error, loading, locate } = useGeolocation()

  useEffect(() => {
    if (position) map.setView([position.lat, position.lng], 12)
  }, [position, map])

  useEffect(() => {
    if (error) alert(error)
  }, [error])

  return (
    <>
      <button
        type="button"
        onClick={locate}
        disabled={loading}
        title="Locate me"
        aria-label="Locate me"
        className="brutal-xs absolute top-3 right-3 z-[1000] flex h-9 w-9 items-center justify-center border-2 bg-card text-foreground disabled:opacity-50"
      >
        <LocateIcon className="h-4 w-4" />
      </button>
      {position && (
        <CircleMarker
          center={[position.lat, position.lng]}
          radius={8}
          pathOptions={{ color: '#2b1810', weight: 2.5, fillColor: '#4a7fd6', fillOpacity: 1 }}
        />
      )}
    </>
  )
}
