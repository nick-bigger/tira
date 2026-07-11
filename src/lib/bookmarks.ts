import type { Row } from '@libsql/client/web'
import { db, ensureSchema } from './db'
import type { OsmDetails } from './osm-enrichment'

export interface Bookmark {
  id: string
  name: string
  location: string | null
  lat: number | null
  lng: number | null
  createdAt: string
  osmId: string | null
  cuisine: string | null
  website: string | null
  phone: string | null
  openingHours: string | null
  osmSyncedAt: string | null
}

function rowToBookmark(row: Row): Bookmark {
  return {
    id: row.id as string,
    name: row.name as string,
    location: (row.location as string | null) ?? null,
    lat: row.lat === null ? null : Number(row.lat),
    lng: row.lng === null ? null : Number(row.lng),
    createdAt: row.created_at as string,
    osmId: (row.osm_id as string | null) ?? null,
    cuisine: (row.cuisine as string | null) ?? null,
    website: (row.website as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    openingHours: (row.opening_hours as string | null) ?? null,
    osmSyncedAt: (row.osm_synced_at as string | null) ?? null,
  }
}

export async function listBookmarks(): Promise<Bookmark[]> {
  await ensureSchema()
  const result = await db.execute('SELECT * FROM bookmarks ORDER BY created_at DESC')
  return result.rows.map(rowToBookmark)
}

export interface NewBookmarkInput {
  name: string
  location: string
  lat?: number
  lng?: number
  osmId?: string
}

export async function createBookmark(input: NewBookmarkInput): Promise<string> {
  await ensureSchema()
  const id = crypto.randomUUID()
  await db.execute({
    sql: 'INSERT INTO bookmarks (id, name, location, lat, lng, osm_id) VALUES (?, ?, ?, ?, ?, ?)',
    args: [
      id,
      input.name,
      input.location || null,
      input.lat ?? null,
      input.lng ?? null,
      input.osmId ?? null,
    ],
  })
  return id
}

export async function deleteBookmark(id: string): Promise<void> {
  await ensureSchema()
  await db.execute({ sql: 'DELETE FROM bookmarks WHERE id = ?', args: [id] })
}

/** Caches OSM tags (and, when newly discovered, an osmId) onto a bookmark - mirrors
 *  updatePlaceOsmEnrichment in places.ts, used by the auto-sync-on-open and the manual
 *  "Find/Refresh from OpenStreetMap" action. */
export async function updateBookmarkOsmEnrichment(
  id: string,
  details: OsmDetails,
  osmId?: string,
): Promise<void> {
  await ensureSchema()
  if (osmId !== undefined) {
    await db.execute({
      sql: "UPDATE bookmarks SET osm_id = ?, cuisine = ?, website = ?, phone = ?, opening_hours = ?, osm_synced_at = datetime('now') WHERE id = ?",
      args: [osmId, details.cuisine, details.website, details.phone, details.openingHours, id],
    })
  } else {
    await db.execute({
      sql: "UPDATE bookmarks SET cuisine = ?, website = ?, phone = ?, opening_hours = ?, osm_synced_at = datetime('now') WHERE id = ?",
      args: [details.cuisine, details.website, details.phone, details.openingHours, id],
    })
  }
}
