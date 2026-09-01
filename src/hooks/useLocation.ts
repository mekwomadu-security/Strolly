'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Location {
  latitude: number
  longitude: number
}

export function useLocation() {
  const [location, setLocation] = useState<Location | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setLocation({ latitude, longitude })
        setLoading(false)

        // Save to profile
        try {
          const supabase = createClient()
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            await supabase
              .from('profiles')
              .update({
                latitude,
                longitude,
                location_updated_at: new Date().toISOString(),
              })
              .eq('id', user.id)
          }
        } catch (err) {
          console.error('Failed to save location:', err)
        }
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes cache
      }
    )
  }, [])

  return { location, error, loading }
}