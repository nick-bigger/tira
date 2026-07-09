export type MapProvider = 'apple' | 'google'

const STORAGE_KEY = 'tira-directions-provider'

export function getSavedMapProvider(): MapProvider | null {
  const v = localStorage.getItem(STORAGE_KEY)
  return v === 'apple' || v === 'google' ? v : null
}

export function saveMapProvider(provider: MapProvider): void {
  localStorage.setItem(STORAGE_KEY, provider)
}

interface DirectionsTarget {
  name: string
  location: string | null
  lat: number | null
  lng: number | null
}

/**
 * Older/manually-entered places may only have a mocked coordinate (see geo.ts) - sending those
 * straight to a maps app would point at a random spot, so fall back to a text search instead of
 * the coordinate whenever we don't have a real lat/lng on file.
 */
export function directionsUrl(place: DirectionsTarget, provider: MapProvider): string {
  const hasCoord = place.lat !== null && place.lng !== null
  const query = [place.name, place.location].filter(Boolean).join(', ')

  if (provider === 'apple') {
    const daddr = hasCoord ? `${place.lat},${place.lng}` : query
    return `https://maps.apple.com/?daddr=${encodeURIComponent(daddr)}`
  }
  const destination = hasCoord ? `${place.lat},${place.lng}` : query
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}
