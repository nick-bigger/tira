import { createClient } from '@libsql/client/web'

// Force the HTTP transport (vs. the default websocket) - simpler and more
// reliable for a low-traffic browser client than holding a persistent socket.
const httpUrl = import.meta.env.VITE_TURSO_DB_URL.replace(/^libsql:/, 'https:')

export const db = createClient({
  url: httpUrl,
  authToken: import.meta.env.VITE_TURSO_AUTH_TOKEN,
})

let schemaReady: Promise<void> | null = null

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
      .then(() => undefined)
  }
  return schemaReady
}
