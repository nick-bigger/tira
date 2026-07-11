export type Tier = 'liked' | 'okay' | 'nope'

export const TIER_LABEL: Record<Tier, string> = {
  liked: 'Liked It',
  okay: 'It Was Okay',
  nope: "Didn't Like It",
}

export const TIER_BADGE_FILL: Record<Tier, string> = {
  liked: 'bg-tier-liked text-tier-liked-foreground',
  okay: 'bg-tier-okay text-tier-okay-foreground',
  nope: 'bg-tier-nope text-tier-nope-foreground',
}

export function TierIcon({ tier, className }: { tier: Tier; className?: string }) {
  if (tier === 'liked') {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="4 12 10 18 20 6" />
      </svg>
    )
  }
  if (tier === 'okay') {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={3.5}
        strokeLinecap="round"
      >
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    )
  }
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3.5}
      strokeLinecap="round"
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  )
}
