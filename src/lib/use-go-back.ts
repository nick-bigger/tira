import { useRouter } from '@tanstack/react-router'

/** Handler for a detail page's back button: replays real in-app history when the user actually
 *  navigated here (so it returns to whichever list/map/search view they came from), and only
 *  falls back to a fixed route when there's nothing to go back to - e.g. the page was opened
 *  directly via a shared link or a fresh tab. */
export function useGoBack(fallbackTo: '/' | '/lists') {
  const router = useRouter()
  return () => {
    if (router.history.canGoBack()) {
      router.history.back()
    } else {
      router.navigate({ to: fallbackTo })
    }
  }
}
