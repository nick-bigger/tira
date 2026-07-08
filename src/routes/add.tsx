import { createFileRoute, redirect } from '@tanstack/react-router'

// Add place is now an overlay on the homepage rather than its own page - this
// route only exists so /add still works as a deep link/bookmark.
export const Route = createFileRoute('/add')({
  beforeLoad: () => {
    throw redirect({ to: '/', search: { add: true } })
  },
})
