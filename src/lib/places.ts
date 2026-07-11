import type { Tier } from '@/components/tier-icon'
import type { Row } from '@libsql/client/web'
import { db, ensureSchema } from './db'
import type { OsmDetails } from './osm-enrichment'
import { scoreFor } from './ranking'

export interface Place {
  id: string
  name: string
  location: string | null
  notes: string | null
  visitedDate: string | null
  tier: Tier
  position: number
  createdAt: string
  lat: number | null
  lng: number | null
  isManual: boolean
  osmId: string | null
  cuisine: string | null
  website: string | null
  phone: string | null
  openingHours: string | null
  osmSyncedAt: string | null
}

export interface PlaceWithScore extends Place {
  score: number
  rankInTier: number
}

function rowToPlace(row: Row): Place {
  return {
    id: row.id as string,
    name: row.name as string,
    location: (row.location as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    visitedDate: (row.visited_date as string | null) ?? null,
    tier: row.tier as Tier,
    position: Number(row.position),
    createdAt: row.created_at as string,
    lat: row.lat === null ? null : Number(row.lat),
    lng: row.lng === null ? null : Number(row.lng),
    isManual: Number(row.is_manual) === 1,
    osmId: (row.osm_id as string | null) ?? null,
    cuisine: (row.cuisine as string | null) ?? null,
    website: (row.website as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    openingHours: (row.opening_hours as string | null) ?? null,
    osmSyncedAt: (row.osm_synced_at as string | null) ?? null,
  }
}

const TIERS: Tier[] = ['liked', 'okay', 'nope']

export async function listPlacesByTier(): Promise<Record<Tier, PlaceWithScore[]>> {
  await ensureSchema()
  const result = await db.execute('SELECT * FROM places ORDER BY tier, position ASC')
  const byTier: Record<Tier, Place[]> = { liked: [], okay: [], nope: [] }
  for (const row of result.rows) {
    const place = rowToPlace(row)
    byTier[place.tier].push(place)
  }

  const withScores: Record<Tier, PlaceWithScore[]> = { liked: [], okay: [], nope: [] }
  for (const tier of TIERS) {
    withScores[tier] = byTier[tier].map((p, idx) => ({
      ...p,
      score: scoreFor(tier, p.position, byTier[tier].length),
      rankInTier: idx + 1,
    }))
  }
  return withScores
}

export async function getPlacesInTier(tier: Tier): Promise<Place[]> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'SELECT * FROM places WHERE tier = ? ORDER BY position ASC',
    args: [tier],
  })
  return result.rows.map(rowToPlace)
}

export async function getPlace(id: string): Promise<Place | null> {
  await ensureSchema()
  const result = await db.execute({ sql: 'SELECT * FROM places WHERE id = ?', args: [id] })
  if (result.rows.length === 0) return null
  return rowToPlace(result.rows[0])
}

export interface NewPlaceInput {
  name: string
  location: string
  notes: string
  visitedDate: string
  tier: Tier
  insertionIndex: number
  lat?: number
  lng?: number
  isManual: boolean
  osmId?: string
}

export async function createPlace(input: NewPlaceInput): Promise<string> {
  await ensureSchema()
  const id = crypto.randomUUID()
  await db.batch(
    [
      {
        sql: 'UPDATE places SET position = position + 1 WHERE tier = ? AND position >= ?',
        args: [input.tier, input.insertionIndex],
      },
      {
        sql: 'INSERT INTO places (id, name, location, notes, visited_date, tier, position, lat, lng, is_manual, osm_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [
          id,
          input.name,
          input.location || null,
          input.notes || null,
          input.visitedDate || null,
          input.tier,
          input.insertionIndex,
          input.lat ?? null,
          input.lng ?? null,
          input.isManual ? 1 : 0,
          input.osmId ?? null,
        ],
      },
    ],
    'write',
  )
  return id
}

/**
 * Caches OSM tags fetched via osm-enrichment.ts onto a place - called either lazily (first
 * detail-page view of a place that already has an osm_id, no `osmId` field passed) or from the
 * "Find/Refresh on OpenStreetMap" menu action (which also passes a freshly-discovered `osmId`
 * for places saved before this feature existed).
 */
export async function updatePlaceOsmEnrichment(
  id: string,
  details: OsmDetails,
  osmId?: string,
): Promise<void> {
  await ensureSchema()
  if (osmId !== undefined) {
    await db.execute({
      sql: "UPDATE places SET osm_id = ?, cuisine = ?, website = ?, phone = ?, opening_hours = ?, osm_synced_at = datetime('now') WHERE id = ?",
      args: [osmId, details.cuisine, details.website, details.phone, details.openingHours, id],
    })
  } else {
    await db.execute({
      sql: "UPDATE places SET cuisine = ?, website = ?, phone = ?, opening_hours = ?, osm_synced_at = datetime('now') WHERE id = ?",
      args: [details.cuisine, details.website, details.phone, details.openingHours, id],
    })
  }
}

export interface PlaceDetailsInput {
  name: string
  location: string
  notes: string
  visitedDate: string
}

export async function updatePlaceDetails(id: string, fields: PlaceDetailsInput): Promise<void> {
  await ensureSchema()
  await db.execute({
    sql: 'UPDATE places SET name = ?, location = ?, notes = ?, visited_date = ? WHERE id = ?',
    args: [
      fields.name,
      fields.location || null,
      fields.notes || null,
      fields.visitedDate || null,
      id,
    ],
  })
}

export async function updatePlaceNotes(id: string, notes: string): Promise<void> {
  await ensureSchema()
  await db.execute({
    sql: 'UPDATE places SET notes = ? WHERE id = ?',
    args: [notes || null, id],
  })
}

export async function updatePlaceVisitedDate(id: string, visitedDate: string): Promise<void> {
  await ensureSchema()
  await db.execute({
    sql: 'UPDATE places SET visited_date = ? WHERE id = ?',
    args: [visitedDate || null, id],
  })
}

/**
 * Moves an existing place to a new tier/position - used by the "Rank Again" flow, which
 * re-runs the pairwise comparison against every other place in the chosen tier (this place
 * excluded) and lands on a fresh insertion index. Tier positions are always kept contiguous
 * (0..count-1), so removing the place first compacts its old tier down to exactly the index
 * space the comparison ran against, and the same logic works whether or not the tier changed.
 */
export async function rerankPlace(id: string, tier: Tier, insertionIndex: number): Promise<void> {
  await ensureSchema()
  const place = await getPlace(id)
  if (!place) return
  await db.batch(
    [
      {
        sql: 'UPDATE places SET position = position - 1 WHERE tier = ? AND position > ?',
        args: [place.tier, place.position],
      },
      {
        sql: 'UPDATE places SET position = position + 1 WHERE tier = ? AND position >= ?',
        args: [tier, insertionIndex],
      },
      {
        sql: 'UPDATE places SET tier = ?, position = ? WHERE id = ?',
        args: [tier, insertionIndex, id],
      },
    ],
    'write',
  )
}

export async function deletePlace(id: string): Promise<void> {
  await ensureSchema()
  const place = await getPlace(id)
  if (!place) return
  await db.batch(
    [
      { sql: 'DELETE FROM places WHERE id = ?', args: [id] },
      {
        sql: 'UPDATE places SET position = position - 1 WHERE tier = ? AND position > ?',
        args: [place.tier, place.position],
      },
    ],
    'write',
  )
}
