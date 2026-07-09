import type { Row } from '@libsql/client/web'
import { db, ensureSchema } from './db'

export interface Bookmark {
  id: string
  name: string
  location: string | null
  lat: number | null
  lng: number | null
  createdAt: string
}

function rowToBookmark(row: Row): Bookmark {
  return {
    id: row.id as string,
    name: row.name as string,
    location: (row.location as string | null) ?? null,
    lat: row.lat === null ? null : Number(row.lat),
    lng: row.lng === null ? null : Number(row.lng),
    createdAt: row.created_at as string,
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
}

export async function createBookmark(input: NewBookmarkInput): Promise<string> {
  await ensureSchema()
  const id = crypto.randomUUID()
  await db.execute({
    sql: 'INSERT INTO bookmarks (id, name, location, lat, lng) VALUES (?, ?, ?, ?, ?)',
    args: [id, input.name, input.location || null, input.lat ?? null, input.lng ?? null],
  })
  return id
}

export async function deleteBookmark(id: string): Promise<void> {
  await ensureSchema()
  await db.execute({ sql: 'DELETE FROM bookmarks WHERE id = ?', args: [id] })
}
