import type { LatLng } from '@/lib/geo'
import { useEffect, useState } from 'react'

export interface PlaceSearchResult {
  id: string
  name: string
  location: string
  lat: number
  lng: number
}

export interface LocationSuggestion {
  id: string
  label: string
  lat: number
  lng: number
}

interface NominatimAddress {
  road?: string
  city?: string
  town?: string
  village?: string
  hamlet?: string
  state?: string
  country?: string
}

interface NominatimResult {
  place_id: number
  lat: string
  lon: string
  display_name: string
  name?: string
  address?: NominatimAddress
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const PHOTON_URL = 'https://photon.komoot.io/api/'

const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000

/** Small TTL cache shared by the three geocoding search functions below - dedupes the network
 *  call when a user retypes/backspaces to the same query or reopens the overlay on the same
 *  search within a session, without letting results go stale for the whole session. */
class TtlCache<T> {
  private store = new Map<string, { value: T; expiresAt: number }>()

  get(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS })
  }
}

// Rounded to ~1km precision for the cache key only - searchPlaces' bbox already spans ~130km,
// so small GPS jitter shouldn't fragment the cache into near-duplicate entries.
function roundCoord(n: number): number {
  return Math.round(n * 100) / 100
}

function cityStateOf(r: NominatimResult): string | null {
  const city = r.address?.city ?? r.address?.town ?? r.address?.village ?? r.address?.hamlet
  if (city && r.address?.state) return `${city}, ${r.address.state}`
  return city ?? null
}

/**
 * Street-level location for a place search result (e.g. "N Lamar Blvd, Austin, TX") -
 * distinct from cityStateOf, which is used for city-only geocoding (searchLocations) and
 * deliberately omits the street.
 */
function locationFor(r: NominatimResult): string {
  const city = r.address?.city ?? r.address?.town ?? r.address?.village ?? r.address?.hamlet
  const parts = [r.address?.road, city, r.address?.state].filter((p): p is string => !!p)
  if (parts.length > 0) return parts.join(', ')
  // Fall back to the display name with the leading (matched-name) segment dropped.
  const displayParts = r.display_name.split(', ')
  return displayParts.slice(1, 3).join(', ') || r.display_name
}

async function nominatimSearch(
  query: string,
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<NominatimResult[]> {
  const search = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '8',
    ...params,
  })
  const res = await fetch(`${NOMINATIM_URL}?${search.toString()}`, {
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!res.ok) throw new Error(`Nominatim search failed: ${res.status}`)
  return (await res.json()) as NominatimResult[]
}

interface PhotonProperties {
  osm_type: string
  osm_id: number
  name?: string
  street?: string
  city?: string
  town?: string
  village?: string
  district?: string
  state?: string
  country?: string
}

interface PhotonFeature {
  properties: PhotonProperties
  geometry: { coordinates: [number, number] }
}

interface PhotonResponse {
  features: PhotonFeature[]
}

function locationForPhoton(p: PhotonProperties): string {
  const city = p.city ?? p.town ?? p.village ?? p.district
  const parts = [p.street, city, p.state].filter((v): v is string => !!v)
  if (parts.length > 0) return parts.join(', ')
  return city ?? p.state ?? p.country ?? ''
}

async function photonSearch(
  query: string,
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<PhotonFeature[]> {
  const search = new URLSearchParams({ q: query, limit: '8', ...params })
  const res = await fetch(`${PHOTON_URL}?${search.toString()}`, {
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!res.ok) throw new Error(`Photon search failed: ${res.status}`)
  const body = (await res.json()) as PhotonResponse
  return body.features.filter((f) => f.properties.name)
}

/**
 * Fuzzy, keyless place search via Photon (Komoot's geocoder, built on OSM
 * data with typo-tolerant matching) - unlike Nominatim's free-text search,
 * it still finds a place when the query has a typo (e.g. "chiptole" ->
 * "Chipotle"). Falls back to Nominatim's exact matching if Photon errors.
 */
const placeSearchCache = new TtlCache<PlaceSearchResult[]>()

export async function searchPlaces(
  query: string,
  opts: { near?: LatLng; signal?: AbortSignal } = {},
): Promise<PlaceSearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const cacheKey = `${trimmed.toLowerCase()}|${opts.near ? roundCoord(opts.near.lat) : ''}|${opts.near ? roundCoord(opts.near.lng) : ''}`
  const cached = placeSearchCache.get(cacheKey)
  if (cached) return cached

  const params: Record<string, string> = {}
  if (opts.near) {
    // Hard-restrict to the greater metro area around the selected location -
    // a soft bias still let unrelated places from anywhere in the world
    // outrank real local matches.
    const { lat, lng } = opts.near
    const span = 0.6
    params.bbox = `${lng - span},${lat - span},${lng + span},${lat + span}`
    params.lat = String(lat)
    params.lon = String(lng)
  }

  let places: PlaceSearchResult[]
  try {
    const features = await photonSearch(trimmed, params, opts.signal)
    places = features.map((f) => {
      const [lng, lat] = f.geometry.coordinates
      return {
        id: `osm:${f.properties.osm_type}${f.properties.osm_id}`,
        name: f.properties.name ?? trimmed,
        location: locationForPhoton(f.properties),
        lat,
        lng,
      }
    })
  } catch (err) {
    if (opts.signal?.aborted) throw err

    const nominatimParams: Record<string, string> = {}
    if (opts.near) {
      const { lat, lng } = opts.near
      const span = 0.6
      nominatimParams.viewbox = `${lng - span},${lat + span},${lng + span},${lat - span}`
      nominatimParams.bounded = '1'
    }
    const results = await nominatimSearch(trimmed, nominatimParams, opts.signal)
    places = results.map((r) => ({
      id: `osm:${r.place_id}`,
      name: r.name || r.display_name.split(',')[0],
      location: locationFor(r),
      lat: Number(r.lat),
      lng: Number(r.lon),
    }))
  }

  placeSearchCache.set(cacheKey, places)
  return places
}

/**
 * Geocode a free-text city/place name (e.g. "Austin") to candidate
 * coordinates - lets a search be scoped to somewhere other than the
 * browser's current location, e.g. to find a restaurant in a city the
 * user isn't currently in.
 */
const locationSearchCache = new TtlCache<LocationSuggestion[]>()

export async function searchLocations(
  query: string,
  signal?: AbortSignal,
): Promise<LocationSuggestion[]> {
  const trimmed = query.trim()
  if (!trimmed) return []
  const cacheKey = trimmed.toLowerCase()
  const cached = locationSearchCache.get(cacheKey)
  if (cached) return cached

  const results = await nominatimSearch(trimmed, { limit: '6', featureType: 'settlement' }, signal)
  const suggestions = results.map((r) => ({
    id: `osm:${r.place_id}`,
    label: [cityStateOf(r) ?? r.name, r.address?.country]
      .filter((p): p is string => !!p)
      .join(', '),
    lat: Number(r.lat),
    lng: Number(r.lon),
  }))
  locationSearchCache.set(cacheKey, suggestions)
  return suggestions
}

/**
 * Geocode a free-text street address (e.g. "123 Main St, Austin") to
 * coordinates - used by manual place entry so a hand-typed place can still
 * get a real pin on the map instead of a mocked one.
 */
const addressSearchCache = new TtlCache<LocationSuggestion[]>()

export async function searchAddresses(
  query: string,
  signal?: AbortSignal,
): Promise<LocationSuggestion[]> {
  const trimmed = query.trim()
  if (!trimmed) return []
  const cacheKey = trimmed.toLowerCase()
  const cached = addressSearchCache.get(cacheKey)
  if (cached) return cached

  const results = await nominatimSearch(trimmed, { limit: '6' }, signal)
  const suggestions = results.map((r) => {
    const parts = r.display_name.split(', ')
    return {
      id: `osm:${r.place_id}`,
      label: parts.length > 4 ? parts.slice(0, 4).join(', ') : r.display_name,
      lat: Number(r.lat),
      lng: Number(r.lon),
    }
  })
  addressSearchCache.set(cacheKey, suggestions)
  return suggestions
}

const DEBOUNCE_MS = 450

/** Debounced, cancellation-safe wrapper around searchPlaces for live-typing UIs. */
export function useDebouncedPlaceSearch(query: string, near?: LatLng) {
  const [results, setResults] = useState<PlaceSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)
    const timer = setTimeout(() => {
      searchPlaces(trimmed, { near, signal: controller.signal })
        .then((r) => {
          setResults(r)
          setLoading(false)
        })
        .catch((err) => {
          if (controller.signal.aborted) return
          setError(err instanceof Error ? err.message : 'Search failed')
          setResults([])
          setLoading(false)
        })
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, near?.lat, near?.lng])

  return { results, loading, error }
}

/** Shared debounce/cancellation plumbing for the near-less geocoding searches. */
function useDebouncedGeocode(
  query: string,
  search: (query: string, signal?: AbortSignal) => Promise<LocationSuggestion[]>,
) {
  const [results, setResults] = useState<LocationSuggestion[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    const timer = setTimeout(() => {
      search(trimmed, controller.signal)
        .then((r) => {
          setResults(r)
          setLoading(false)
        })
        .catch(() => {
          if (controller.signal.aborted) return
          setResults([])
          setLoading(false)
        })
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  return { results, loading }
}

/** Debounced city/place typeahead - see searchLocations. */
export function useDebouncedLocationSearch(query: string) {
  return useDebouncedGeocode(query, searchLocations)
}

/** Debounced street-address typeahead - see searchAddresses. */
export function useDebouncedAddressSearch(query: string) {
  return useDebouncedGeocode(query, searchAddresses)
}
