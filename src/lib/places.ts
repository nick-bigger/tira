import type { Tier } from '@/components/tier-icon'
import type { Row } from '@libsql/client/web'
import { db, ensureSchema } from './db'
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
        sql: 'INSERT INTO places (id, name, location, notes, visited_date, tier, position, lat, lng, is_manual) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
        ],
      },
    ],
    'write',
  )
  return id
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
