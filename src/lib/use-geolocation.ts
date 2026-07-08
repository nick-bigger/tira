import { useState } from 'react'
import type { LatLng } from './geo'

export function useGeolocation() {
  const [position, setPosition] = useState<LatLng | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function locate() {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.')
      return
    }
    setLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (result) => {
        setPosition({ lat: result.coords.latitude, lng: result.coords.longitude })
        setLoading(false)
      },
      () => {
        setError('Could not determine your location.')
        setLoading(false)
      },
      { enableHighAccuracy: false, timeout: 8000 },
    )
  }

  return { position, error, loading, locate }
}
