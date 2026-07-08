export function TiraMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="7" width="18" height="14" rx="1.5" />
      <line x1="3" y1="12.3" x2="21" y2="12.3" />
      <line x1="3" y1="16.6" x2="21" y2="16.6" />
      <circle cx="7" cy="4" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="3.2" r="1" fill="currentColor" stroke="none" />
      <circle cx="17" cy="4" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
