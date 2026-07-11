import { useEffect, useState } from 'react'
import {
  EMPTY_OSM_DETAILS,
  fetchOsmDetails,
  syncOsmDetails,
  type OsmDetails,
  type OsmSyncResult,
} from './osm-enrichment'

interface SyncableRecord {
  name: string
  location: string | null
  lat: number | null
  lng: number | null
  osmId: string | null
  osmSyncedAt: string | null
}

/**
 * On first open of a place/bookmark that hasn't been synced yet, matches it to OpenStreetMap if
 * it doesn't already have an osmId (a legacy record from before this feature, or a manual entry)
 * and fetches cuisine/website/phone/hours, then persists the result so later opens read from the
 * cached columns instead of hitting Nominatim/Overpass again - fetch (and match) once, cache
 * forever, until the "Find/Refresh from OpenStreetMap" menu action forces a re-sync. A thrown
 * failure (network/HTTP) is swallowed and retried on the next open rather than persisted, since
 * only a real - possibly "no match, no tags" - result should mark the record as synced.
 */
export function useCachedOsmSync(
  record: SyncableRecord,
  persist: (result: OsmSyncResult) => Promise<void>,
): { loading: boolean } {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (record.osmSyncedAt) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    syncOsmDetails(record)
      .then((result) => (cancelled ? undefined : persist(result)))
      .catch(() => {
        // Transient failure (fetch or persist) - leave osmSyncedAt unset so this retries on the
        // next view.
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.name, record.location, record.lat, record.lng, record.osmId, record.osmSyncedAt])

  return { loading }
}

/** Ephemeral, unpersisted OSM tag fetch for a place that isn't saved anywhere yet (the raw
 *  search-result preview in the add-place overlay) - nothing to cache into. */
export function useLiveOsmDetails(osmId: string | null | undefined): {
  details: OsmDetails
  loading: boolean
} {
  const [details, setDetails] = useState<OsmDetails>(EMPTY_OSM_DETAILS)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setDetails(EMPTY_OSM_DETAILS)
    if (!osmId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetchOsmDetails(osmId)
      .then((result) => {
        if (!cancelled && result) setDetails(result)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [osmId])

  return { details, loading }
}
