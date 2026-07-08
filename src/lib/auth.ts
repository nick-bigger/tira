const STORAGE_KEY = 'tira-unlocked'

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function isUnlocked(): boolean {
  return localStorage.getItem(STORAGE_KEY) === '1'
}

export async function tryUnlock(password: string): Promise<boolean> {
  const hash = await sha256Hex(password)
  const expected = import.meta.env.VITE_APP_PASSWORD_HASH
  if (expected && hash === expected) {
    localStorage.setItem(STORAGE_KEY, '1')
    return true
  }
  return false
}
