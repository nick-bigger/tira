// Continental US bounding box - pins are mocked (deterministically, from the
// place id) until places store real geocoded coordinates.
const LAT_RANGE: [number, number] = [25.8, 48.5]
const LNG_RANGE: [number, number] = [-122.5, -71.0]

function hashString(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export interface LatLng {
  lat: number
  lng: number
}

/** Deterministic mock coordinate for a place, stable across renders. */
export function mockCoordinate(placeId: string): LatLng {
  const h = hashString(placeId)
  const latFrac = (h % 10000) / 10000
  const lngFrac = ((h >>> 12) % 10000) / 10000
  return {
    lat: LAT_RANGE[0] + latFrac * (LAT_RANGE[1] - LAT_RANGE[0]),
    lng: LNG_RANGE[0] + lngFrac * (LNG_RANGE[1] - LNG_RANGE[0]),
  }
}

const EARTH_RADIUS_MI = 3958.8

export function haversineDistanceMi(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(h))
}

export function placeDistanceMi(placeId: string, from: LatLng): number {
  return haversineDistanceMi(from, mockCoordinate(placeId))
}
