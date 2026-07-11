import { useEffect, useState } from 'react'
import { EMPTY_OSM_DETAILS, fetchOsmDetails, type OsmDetails } from './osm-enrichment'

interface SyncableRecord {
  osmId: string | null
  osmSyncedAt: string | null
}

/**
 * Lazily fetches OSM tags once for a place/bookmark that has a real OSM id but hasn't been
 * synced yet, then persists the result so later views read from the cached columns instead of
 * hitting Overpass again (per the "fetch once, manual refresh only" decision - see the OSM
 * enrichment plan). A thrown fetch error (network/HTTP) is swallowed and retried on the next
 * mount rather than persisted, since only `fetchOsmDetails` returning null (not a real OSM id)
 * or a real - possibly all-empty - tag set should mark the record as synced.
 */
export function useCachedOsmSync(
  record: SyncableRecord,
  persist: (details: OsmDetails) => Promise<void>,
): void {
  useEffect(() => {
    if (!record.osmId || record.osmSyncedAt) return
    let cancelled = false
    void fetchOsmDetails(record.osmId)
      .then((details) => {
        if (cancelled) return
        void persist(details ?? EMPTY_OSM_DETAILS)
      })
      .catch(() => {
        // Transient failure - leave osmSyncedAt unset so this retries on the next view.
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.osmId, record.osmSyncedAt])
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
