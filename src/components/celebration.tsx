const CONFETTI_COLORS = [
  'var(--tier-liked)',
  'var(--tier-okay)',
  'var(--accent)',
  'var(--secondary)',
  '#d97a9c',
]

const PIECES = Array.from({ length: 16 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 5) * 60,
  duration: 700 + ((i * 53) % 400),
  rotate: (i * 71) % 360,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}))

/** One-shot confetti burst for the "new #1 pick" moment - a handful of falling pieces in the
 *  app's own palette. Respects prefers-reduced-motion via the .confetti-piece rule in index.css. */
export function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-24 overflow-hidden" aria-hidden>
      {PIECES.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}ms`,
            animationDuration: `${p.duration}ms`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  )
}
