'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  id: string
  full_name: string
  city: string
  activities: string[]
  current_activity: string
  available_date: string
  available_from: string
  available_until: string
  available_duration: string
}

export default function NearbyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activity = searchParams.get('activity') || ''
  const day = searchParams.get('day') || ''
  const from = searchParams.get('from') || ''
  const until = searchParams.get('until') || ''
  const duration = searchParams.get('duration') || ''

  const [matches, setMatches] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)

  const activityIcons: Record<string, string> = {
    gym: '🏋️', jogging: '🏃', cycling: '🚴',
    football: '⚽', yoga: '🧘', swimming: '🏊',
    dog_walk: '🐕', badminton: '🏸', tennis: '🎾',
  }

  useEffect(() => {
    fetchNearbyUsers()
  }, [])

  async function fetchNearbyUsers() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setCurrentUser(user)

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .eq('current_activity', activity)
      .eq('available_date', day)
      .eq('is_available', true)
      .lte('available_from', until)
      .gte('available_until', from)

    if (!error && data) {
      setMatches(data)
    }
    setLoading(false)
  }

  const activityLabel = activity.replace('_', ' ')
  const icon = activityIcons[activity] || '🏃'

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0' }}>

      {/* Header */}
      <div style={{ padding: '56px 24px 20px', background: '#ffffff', borderBottom: '1px solid #e2e2d8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
          <button
            onClick={() => router.push('/schedule')}
            style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f5f5f0', border: 'none', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ←
          </button>
          <div>
            <div style={{ fontFamily: 'sans-serif', fontSize: '20px', fontWeight: 800, color: '#0d0d0d', letterSpacing: '-0.5px' }}>
              Nearby matches
            </div>
            <div style={{ fontSize: '12px', color: '#5a5a5a', marginTop: '2px' }}>
              {icon} {activityLabel} · {day} · {from} → {until}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: '480px', margin: '0 auto' }}>

        {/* AI Match Banner */}
        <div
          onClick={() => router.push(`/ai-match?activity=${activity}&day=${day}&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&duration=${encodeURIComponent(duration)}`)}
          style={{ background: '#0d0d0d', borderRadius: '24px', padding: '20px', marginBottom: '20px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: '#CAFF00', opacity: 0.12 }}></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>✨</div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#CAFF00', letterSpacing: '0.06em', textTransform: 'uppercase' }}>AI Instant Match</div>
          </div>
          <div style={{ fontFamily: 'sans-serif', fontSize: '18px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px', marginBottom: '6px' }}>
            Let AI pick your best match
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '14px' }}>
            Claude analyses all nearby people and ranks by compatibility
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', background: '#CAFF00', color: '#0d0d0d', borderRadius: '100px', fontSize: '13px', fontWeight: 800 }}>
            Match me now →
          </div>
        </div>

        {/* Nearby users */}
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
          {loading ? 'Searching...' : `${matches.length} people available`}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#5a5a5a', fontSize: '14px' }}>
            Finding people near you...
          </div>
        )}

        {!loading && matches.length === 0 && (
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '32px', textAlign: 'center', border: '1.5px solid #e2e2d8' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
            <div style={{ fontFamily: 'sans-serif', fontSize: '18px', fontWeight: 800, color: '#0d0d0d', marginBottom: '8px' }}>
              No one nearby yet
            </div>
            <div style={{ fontSize: '14px', color: '#5a5a5a', lineHeight: 1.6 }}>
              You're one of the first Strolly users! Share the app with friends to find matches.
            </div>
          </div>
        )}

        {!loading && matches.map(match => (
          <div
            key={match.id}
            style={{ background: '#ffffff', borderRadius: '20px', padding: '16px', marginBottom: '12px', border: '1.5px solid #e2e2d8', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}
            onClick={() => router.push(`/chat/${match.id}`)}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#CAFF00', color: '#0d0d0d', fontFamily: 'sans-serif', fontWeight: 800, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid #0d0d0d' }}>
              {match.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'sans-serif', fontSize: '15px', fontWeight: 700, color: '#0d0d0d' }}>
                {match.full_name}
              </div>
              <div style={{ fontSize: '12px', color: '#5a5a5a', marginTop: '3px' }}>
                {match.city} · {match.available_from} → {match.available_until}
              </div>
              <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                <span style={{ padding: '3px 8px', background: '#CAFF00', borderRadius: '100px', fontSize: '10px', fontWeight: 600, color: '#0d0d0d' }}>
                  {match.available_from} → {match.available_until}
                </span>
                <span style={{ padding: '3px 8px', background: '#f5f5f0', borderRadius: '100px', fontSize: '10px', fontWeight: 600, color: '#5a5a5a' }}>
                  {match.available_duration}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Bottom actions */}
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <button
            onClick={() => router.push('/schedule')}
            style={{ flex: 1, padding: '14px', background: '#ffffff', border: '1.5px solid #e2e2d8', borderRadius: '16px', fontSize: '14px', fontWeight: 600, color: '#0d0d0d', cursor: 'pointer' }}
          >
            ← Change time
          </button>
          <button
            onClick={() => router.push('/home')}
            style={{ flex: 1, padding: '14px', background: '#0d0d0d', border: 'none', borderRadius: '16px', fontSize: '14px', fontWeight: 600, color: '#CAFF00', cursor: 'pointer' }}
          >
            Home
          </button>
        </div>

      </div>
    </div>
  )
}