import { createClient } from '@libsql/client/web'

// Force the HTTP transport (vs. the default websocket) - simpler and more
// reliable for a low-traffic browser client than holding a persistent socket.
const httpUrl = import.meta.env.VITE_TURSO_DB_URL.replace(/^libsql:/, 'https:')

export const db = createClient({
  url: httpUrl,
  authToken: import.meta.env.VITE_TURSO_AUTH_TOKEN,
})

let schemaReady: Promise<void> | null = null

// SQLite has no "ADD COLUMN IF NOT EXISTS" - swallow the duplicate-column error
// so this migration is safe to run against both fresh and already-migrated DBs.
async function addColumnIfMissing(column: string, ddl: string): Promise<void> {
  try {
    await db.execute(ddl)
  } catch (err) {
    if (!(err instanceof Error) || !/duplicate column name/i.test(err.message)) {
      throw new Error(`Failed to add column "${column}"`, { cause: err })
    }
  }
}

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = db
      .execute(
        `
      CREATE TABLE IF NOT EXISTS places (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT,
        notes TEXT,
        visited_date TEXT,
        tier TEXT NOT NULL CHECK (tier IN ('liked', 'okay', 'nope')),
        position INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `,
      )
      .then(() =>
        Promise.all([
          addColumnIfMissing('lat', 'ALTER TABLE places ADD COLUMN lat REAL'),
          addColumnIfMissing('lng', 'ALTER TABLE places ADD COLUMN lng REAL'),
          addColumnIfMissing(
            'is_manual',
            'ALTER TABLE places ADD COLUMN is_manual INTEGER NOT NULL DEFAULT 0',
          ),
          addColumnIfMissing('osm_id', 'ALTER TABLE places ADD COLUMN osm_id TEXT'),
          addColumnIfMissing('cuisine', 'ALTER TABLE places ADD COLUMN cuisine TEXT'),
          addColumnIfMissing('website', 'ALTER TABLE places ADD COLUMN website TEXT'),
          addColumnIfMissing('phone', 'ALTER TABLE places ADD COLUMN phone TEXT'),
          addColumnIfMissing('opening_hours', 'ALTER TABLE places ADD COLUMN opening_hours TEXT'),
          addColumnIfMissing('osm_synced_at', 'ALTER TABLE places ADD COLUMN osm_synced_at TEXT'),
          db
            .execute(
              `
          CREATE TABLE IF NOT EXISTS bookmarks (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            location TEXT,
            lat REAL,
            lng REAL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          )
        `,
            )
            .then(() =>
              Promise.all([
                addColumnIfMissing('osm_id', 'ALTER TABLE bookmarks ADD COLUMN osm_id TEXT'),
                addColumnIfMissing('cuisine', 'ALTER TABLE bookmarks ADD COLUMN cuisine TEXT'),
                addColumnIfMissing('website', 'ALTER TABLE bookmarks ADD COLUMN website TEXT'),
                addColumnIfMissing('phone', 'ALTER TABLE bookmarks ADD COLUMN phone TEXT'),
                addColumnIfMissing(
                  'opening_hours',
                  'ALTER TABLE bookmarks ADD COLUMN opening_hours TEXT',
                ),
                addColumnIfMissing(
                  'osm_synced_at',
                  'ALTER TABLE bookmarks ADD COLUMN osm_synced_at TEXT',
                ),
              ]),
            ),
          db.execute(
            `
          CREATE TABLE IF NOT EXISTS recent_views (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            location TEXT,
            lat REAL,
            lng REAL,
            place_id TEXT,
            viewed_at TEXT NOT NULL DEFAULT (datetime('now'))
          )
        `,
          ),
        ]),
      )
      .then(() => undefined)
  }
  return schemaReady
}
