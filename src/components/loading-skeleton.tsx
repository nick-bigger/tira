/** Shown while the root loader's first fetch is in flight - shimmer blocks in the same
 *  card shapes as the real content so the layout doesn't jump once data arrives. */
export function HomeSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-5 pb-6 sm:px-6 sm:pt-8">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="skeleton h-5 w-40" />
          <div className="skeleton h-3 w-24" />
        </div>
        <div className="skeleton h-8 w-16" />
      </div>
      <div className="skeleton mb-5 h-11 w-full" />
      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="brutal-xs flex flex-col gap-2 bg-card p-3">
            <div className="skeleton h-7 w-7 rounded-lg" />
            <div className="skeleton h-6 w-10" />
            <div className="skeleton h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="brutal-xs flex items-center gap-3 bg-card px-3.5 py-3">
            <div className="skeleton h-8 w-8 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="skeleton h-3 w-2/3" />
              <div className="skeleton h-2.5 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ListsSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex items-center gap-2">
        <div className="skeleton h-10 flex-1" />
        <div className="skeleton h-10 w-24" />
      </div>
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="brutal-sm flex items-center justify-between gap-3 bg-card px-4 py-3.5"
          >
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="skeleton h-4 w-2/3" />
              <div className="skeleton h-3 w-1/3" />
            </div>
            <div className="skeleton h-8 w-12 rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  )
}
