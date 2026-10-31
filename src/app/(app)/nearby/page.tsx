'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'

function NearbyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNearby()
  }, [])

  async function fetchNearby() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0]
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .eq('is_available', true)
      .eq('is_in_session', false)
      .or(`available_date.eq.${tomorrow},and(available_date.eq.${today},available_until.gte.${currentTime})`)

    setProfiles(data || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '14px', color: '#5a5a5a' }}>Finding people nearby…</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', paddingBottom: '80px' }}>
      <div style={{ padding: '56px 24px 20px', background: '#ffffff', borderBottom: '1px solid #e2e2d8' }}>
        <div style={{ fontSize: '24px', fontWeight: 800, color: '#0d0d0d', letterSpacing: '-0.5px' }}>Nearby</div>
        <div style={{ fontSize: '13px', color: '#5a5a5a', marginTop: '4px' }}>{profiles.length} people available now</div>
      </div>

      <div style={{ padding: '16px 24px', maxWidth: '480px', margin: '0 auto' }}>
        {profiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏃</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#0d0d0d', marginBottom: '8px' }}>No one nearby yet</div>
            <div style={{ fontSize: '14px', color: '#5a5a5a', lineHeight: 1.6 }}>Be the first to set your schedule and get matched!</div>
            <button onClick={() => router.push('/schedule')} style={{ marginTop: '20px', padding: '14px 28px', background: '#CAFF00', color: '#0d0d0d', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>Set my schedule →</button>
          </div>
        ) : (
          profiles.map(profile => (
            <div key={profile.id} onClick={() => router.push(`/chat/${profile.id}`)} style={{ background: '#ffffff', borderRadius: '20px', padding: '16px', border: '1.5px solid #e2e2d8', marginBottom: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: '#CAFF00', color: '#0d0d0d', fontWeight: 800, fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: '52px', height: '52px', borderRadius: '16px', objectFit: 'cover' }} />
                  : profile.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0d0d0d' }}>{profile.full_name || 'Anonymous'}</div>
                <div style={{ fontSize: '12px', color: '#5a5a5a', marginTop: '2px' }}>
                  {profile.activities?.slice(0, 2).join(' · ')} · {profile.available_from}–{profile.available_until}
                </div>
              </div>
              <div style={{ fontSize: '18px' }}>→</div>
            </div>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  )
}

export default function NearbyPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#f5f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5a5a5a' }}>Loading…</div>}>
      <NearbyContent />
    </Suspense>
  )
}
