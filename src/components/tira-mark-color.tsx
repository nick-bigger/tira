/** Colorized variant of TiraMark used for home-screen-facing chrome (header logo badge,
 *  splash screen) - the plain single-color TiraMark stays the app's working mark elsewhere. */
export function TiraMarkColor({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect
        x="4.5"
        y="7.5"
        width="15"
        height="10.5"
        rx="1.2"
        fill="#fff8ec"
        stroke="#6f4e37"
        strokeWidth={2.1}
        strokeLinejoin="round"
      />
      <rect x="4.5" y="11.6" width="15" height="6.4" fill="#c79a6a" />
      <rect x="4.5" y="14.8" width="15" height="3.2" fill="#a65a34" />
      <rect
        x="4.5"
        y="7.5"
        width="15"
        height="10.5"
        rx="1.2"
        fill="none"
        stroke="#6f4e37"
        strokeWidth={2.1}
        strokeLinejoin="round"
      />
      <circle cx="8" cy="4.6" r="1.1" fill="#d97a9c" />
      <circle cx="12" cy="4" r="1.1" fill="#6f4e37" />
      <circle cx="16" cy="4.6" r="1.1" fill="#5c8f5f" />
    </svg>
  )
}
