import type { Row } from '@libsql/client/web'
import { db, ensureSchema } from './db'

export interface RecentView {
  id: string
  name: string
  location: string | null
  lat: number | null
  lng: number | null
  placeId: string | null
  viewedAt: string
}

function rowToRecentView(row: Row): RecentView {
  return {
    id: row.id as string,
    name: row.name as string,
    location: (row.location as string | null) ?? null,
    lat: row.lat === null ? null : Number(row.lat),
    lng: row.lng === null ? null : Number(row.lng),
    placeId: (row.place_id as string | null) ?? null,
    viewedAt: row.viewed_at as string,
  }
}

/** Shared across both users, so keep only enough history to serve the "recently viewed" list
 *  plus some headroom - unbounded growth here would just be dead rows nobody reads. */
const MAX_STORED = 20

export interface RecordViewInput {
  name: string
  location: string | null
  lat: number | null
  lng: number | null
  placeId?: string | null
}

/** Records that a place was opened from search, for the shared "Recently Viewed" list. Re-viewing
 *  the same spot bumps it to the top instead of leaving a duplicate row behind. */
export async function recordRecentView(input: RecordViewInput): Promise<void> {
  await ensureSchema()
  const placeId = input.placeId ?? null
  await db.execute(
    placeId
      ? { sql: 'DELETE FROM recent_views WHERE place_id = ?', args: [placeId] }
      : {
          sql: `DELETE FROM recent_views
                WHERE place_id IS NULL
                  AND lower(name) = lower(?)
                  AND lower(coalesce(location, '')) = lower(coalesce(?, ''))`,
          args: [input.name, input.location ?? ''],
        },
  )
  await db.execute({
    sql: 'INSERT INTO recent_views (id, name, location, lat, lng, place_id) VALUES (?, ?, ?, ?, ?, ?)',
    args: [crypto.randomUUID(), input.name, input.location || null, input.lat, input.lng, placeId],
  })
  await db.execute({
    sql: `DELETE FROM recent_views WHERE id NOT IN (
            SELECT id FROM recent_views ORDER BY viewed_at DESC LIMIT ?
          )`,
    args: [MAX_STORED],
  })
}

export async function listRecentViews(limit = 5): Promise<RecentView[]> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'SELECT * FROM recent_views ORDER BY viewed_at DESC LIMIT ?',
    args: [limit],
  })
  return result.rows.map(rowToRecentView)
}
