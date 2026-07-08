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

function cityStateOf(r: NominatimResult): string | null {
  const city = r.address?.city ?? r.address?.town ?? r.address?.village ?? r.address?.hamlet
  if (city && r.address?.state) return `${city}, ${r.address.state}`
  return city ?? null
}

function locationFor(r: NominatimResult): string {
  const cityState = cityStateOf(r)
  if (cityState) return cityState
  // Fall back to the display name with the leading (matched-name) segment dropped.
  const parts = r.display_name.split(', ')
  return parts.slice(1, 3).join(', ') || r.display_name
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

/**
 * Free, keyless place search via OSM Nominatim - matches the no-API-key
 * approach already used for map tiles (see geo.ts). Browsers can't set a
 * User-Agent header, but Nominatim's usage policy accepts the Referer header
 * browsers send automatically as app identification.
 */
export async function searchPlaces(
  query: string,
  opts: { near?: LatLng; signal?: AbortSignal } = {},
): Promise<PlaceSearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const params: Record<string, string> = {}
  if (opts.near) {
    // Hard-restrict to the greater metro area around the selected location -
    // a soft bias (bounded=0) still let unrelated places from anywhere in
    // the world outrank real local matches.
    const { lat, lng } = opts.near
    const span = 0.6
    params.viewbox = `${lng - span},${lat + span},${lng + span},${lat - span}`
    params.bounded = '1'
  }

  const results = await nominatimSearch(trimmed, params, opts.signal)
  return results.map((r) => ({
    id: `osm:${r.place_id}`,
    name: r.name || r.display_name.split(',')[0],
    location: locationFor(r),
    lat: Number(r.lat),
    lng: Number(r.lon),
  }))
}

/**
 * Geocode a free-text city/place name (e.g. "Austin") to candidate
 * coordinates - lets a search be scoped to somewhere other than the
 * browser's current location, e.g. to find a restaurant in a city the
 * user isn't currently in.
 */
export async function searchLocations(
  query: string,
  signal?: AbortSignal,
): Promise<LocationSuggestion[]> {
  const trimmed = query.trim()
  if (!trimmed) return []
  const results = await nominatimSearch(trimmed, { limit: '6', featureType: 'settlement' }, signal)
  return results.map((r) => ({
    id: `osm:${r.place_id}`,
    label: [cityStateOf(r) ?? r.name, r.address?.country]
      .filter((p): p is string => !!p)
      .join(', '),
    lat: Number(r.lat),
    lng: Number(r.lon),
  }))
}

/**
 * Geocode a free-text street address (e.g. "123 Main St, Austin") to
 * coordinates - used by manual place entry so a hand-typed place can still
 * get a real pin on the map instead of a mocked one.
 */
export async function searchAddresses(
  query: string,
  signal?: AbortSignal,
): Promise<LocationSuggestion[]> {
  const trimmed = query.trim()
  if (!trimmed) return []
  const results = await nominatimSearch(trimmed, { limit: '6' }, signal)
  return results.map((r) => {
    const parts = r.display_name.split(', ')
    return {
      id: `osm:${r.place_id}`,
      label: parts.length > 4 ? parts.slice(0, 4).join(', ') : r.display_name,
      lat: Number(r.lat),
      lng: Number(r.lon),
    }
  })
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
