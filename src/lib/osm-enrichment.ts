import { haversineDistanceMi, type LatLng } from './geo'

export interface OsmDetails {
  cuisine: string | null
  website: string | null
  phone: string | null
  openingHours: string | null
}

export const EMPTY_OSM_DETAILS: OsmDetails = {
  cuisine: null,
  website: null,
  phone: null,
  openingHours: null,
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

const OSM_TYPE: Record<string, string> = { n: 'node', w: 'way', r: 'relation' }

/** Places/bookmarks store an OSM id as e.g. "osm:n6053555793" - a lowercase node/way/relation
 *  letter plus the numeric OSM id, built by place-search.ts's osmIdOf(). Returns null for
 *  anything else (manual entries, legacy ids from before that fix), which callers treat as
 *  "nothing to fetch" rather than an error. */
function parseOsmId(osmId: string): { type: string; numericId: string } | null {
  const match = /^osm:([nwr])(\d+)$/.exec(osmId)
  if (!match) return null
  return { type: OSM_TYPE[match[1]], numericId: match[2] }
}

/**
 * Fetches cuisine/website/phone/hours tags for a place from OpenStreetMap via the free, keyless
 * Overpass API. Returns null only when `osmId` isn't a real OSM id - a network/HTTP failure
 * throws instead, so callers can tell "nothing to fetch, stop trying" apart from "fetch failed,
 * try again later" (see useCachedOsmSync in use-osm-enrichment.ts).
 */
export async function fetchOsmDetails(osmId: string): Promise<OsmDetails | null> {
  const parsed = parseOsmId(osmId)
  if (!parsed) return null

  const query = `[out:json];${parsed.type}(${parsed.numericId});out tags;`
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })
  if (!res.ok) throw new Error(`Overpass request failed: ${res.status}`)

  const body = (await res.json()) as { elements?: { tags?: Record<string, string> }[] }
  const tags = body.elements?.[0]?.tags ?? {}
  return {
    cuisine: tags.cuisine ?? null,
    website: tags.website ?? tags['contact:website'] ?? null,
    phone: tags.phone ?? tags['contact:phone'] ?? null,
    openingHours: tags.opening_hours ?? null,
  }
}

interface NominatimBackfillResult {
  osm_type: 'node' | 'way' | 'relation'
  osm_id: number
  lat: string
  lon: string
}

/**
 * Best-effort lookup of an OSM id for a place saved before this feature existed, by re-matching
 * its name + location text against Nominatim - used by the "Find on OpenStreetMap" menu action.
 * When the place has a stored coordinate, picks the closest same-name candidate instead of just
 * the top result, since a chain name (e.g. a bakery with several locations) can otherwise match
 * the wrong branch.
 */
export async function findOsmId(
  name: string,
  location: string | null,
  near: LatLng | null,
): Promise<string | null> {
  const query = [name, location].filter(Boolean).join(', ')
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '5',
  })
  const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Nominatim search failed: ${res.status}`)

  const results = (await res.json()) as NominatimBackfillResult[]
  if (results.length === 0) return null

  const best = near
    ? results.reduce<{ result: NominatimBackfillResult; distance: number } | null>(
        (closest, result) => {
          const distance = haversineDistanceMi(near, {
            lat: Number(result.lat),
            lng: Number(result.lon),
          })
          return !closest || distance < closest.distance ? { result, distance } : closest
        },
        null,
      )?.result
    : results[0]

  if (!best) return null
  return `osm:${best.osm_type[0]}${best.osm_id}`
}

export interface OsmSyncResult {
  /** Set only when a match was newly found via findOsmId - undefined when the record already
   *  had an osmId (nothing to change there) or when no match was found at all. */
  osmId?: string
  details: OsmDetails
}

/**
 * Matches a place/bookmark to OpenStreetMap if it doesn't have an osmId yet (via findOsmId),
 * then fetches its cuisine/website/phone/hours (via fetchOsmDetails). Used both by the
 * automatic on-open sync (useCachedOsmSync) and the manual "Find/Refresh from OpenStreetMap"
 * menu action, so a place gets linked the first time its detail page is opened rather than
 * requiring that manual step. Propagates network/HTTP failures so callers can tell "nothing to
 * find" (resolves normally) apart from "couldn't check right now" (throws).
 */
export async function syncOsmDetails(source: {
  name: string
  location: string | null
  lat: number | null
  lng: number | null
  osmId: string | null
}): Promise<OsmSyncResult> {
  let osmId = source.osmId
  if (!osmId) {
    osmId = await findOsmId(
      source.name,
      source.location,
      source.lat != null && source.lng != null ? { lat: source.lat, lng: source.lng } : null,
    )
  }
  if (!osmId) return { details: EMPTY_OSM_DETAILS }

  const details = await fetchOsmDetails(osmId)
  return { osmId: source.osmId ? undefined : osmId, details: details ?? EMPTY_OSM_DETAILS }
}
