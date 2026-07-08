import { TiraMark } from '@/components/tira-mark'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { isUnlocked, tryUnlock } from '@/lib/auth'
import { useState, type FormEvent, type ReactNode } from 'react'

export function AuthGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(isUnlocked)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setChecking(true)
    const ok = await tryUnlock(password)
    setChecking(false)
    if (ok) {
      setUnlocked(true)
    } else {
      setError(true)
      setPassword('')
    }
  }

  if (unlocked) return children

  return (
    <div className="flex min-h-svh items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="brutal w-full max-w-sm bg-card px-6 py-8 text-center"
      >
        <TiraMark className="mx-auto mb-3 h-14 w-14" />
        <h1 className="mb-6 font-display text-4xl font-bold">Tira</h1>
        <label className="brutal-sm flex items-center gap-2 bg-background px-3 py-2">
          <svg className="h-4 w-4 shrink-0 opacity-70" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 17a2 2 0 002-2 2 2 0 00-2-2 2 2 0 00-2 2 2 2 0 002 2zm6-9h-1V6a5 5 0 00-10 0v2H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V10a2 2 0 00-2-2zm-7-2a3 3 0 016 0v2H9V6zm9 14H6V10h12v10z" />
          </svg>
          <Input
            type="password"
            placeholder="Password"
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(false)
            }}
            className="h-auto w-full rounded-none border-0 bg-transparent p-0 text-base font-bold shadow-none outline-none placeholder:opacity-60 focus-visible:ring-0"
          />
        </label>
        {error && <p className="mt-2 text-sm font-bold text-destructive">Wrong password.</p>}
        <Button
          type="submit"
          disabled={checking || !password}
          className="brutal-sm mt-4 h-auto w-full border-0 bg-primary py-2.5 font-display font-bold text-primary-foreground"
        >
          Unlock
        </Button>
      </form>
    </div>
  )
}
