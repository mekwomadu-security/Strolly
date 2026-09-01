'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LocationCapture() {
  useEffect(() => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        await supabase
          .from('profiles')
          .update({
            latitude,
            longitude,
            location_updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
      },
      (err) => {
        console.log('Location not available:', err.message)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    )
  }, [])

  return null
}