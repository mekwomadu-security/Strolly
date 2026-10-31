'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'

interface Profile {
  id: string
  full_name: string
  city: string
  activities: string[]
  experience_level: string
  preferred_time: string
  avatar_url: string
  current_activity: string
  available_from: string
  available_until: string
  available_date: string
  available_duration: string
  rating: number
  session_count: number
  latitude: number
  longitude: number
}

const activityIcons: Record<string, string> = {
  gym: '🏋️', jogging: '🏃', cycling: '🚴',
  football: '⚽', yoga: '🧘', swimming: '🏊',
  dog_walk: '🐕', badminton: '🏸', tennis: '🎾',
}

const activityLabels: Record<string, string> = {
  gym: 'Gym', jogging: 'Jogging', cycling: 'Cycling',
  football: 'Football', yoga: 'Yoga', swimming: 'Swimming',
  dog_walk: 'Dog walk', badminton: 'Badminton', tennis: 'Tennis',
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function getDistanceLabel(km: number): string {
  if (km < 0.1) return 'Same building'
  if (km < 1.0) return `${Math.round(km * 1000)}m away`
  return `${km.toFixed(1)}km away`
}

export default function NearbyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activityParam = searchParams.get('activity')

  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [primaryIndex, setPrimaryIndex] = useState(0)
  const [otherIndex, setOtherIndex] = useState(0)
  const [selectedActivity, setSelectedActivity] = useState(activityParam || 'all')

  useEffect(() => {
    fetchNearbyUsers()
  }, [])

  async function fetchNearbyUsers() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const today = new Date().toISOString().split('T')[0]

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile) setUserProfile(profile)

    const { data: nearby } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .eq('is_available', true)
      .eq('available_date', today)
      .eq('is_in_session', false)

    if (nearby) setAllUsers(nearby)
    setLoading(false)
  }

  function getInitials(name: string) {
    return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'
  }

  function getDistance(u: Profile) {
    if (!userProfile?.latitude || !u.latitude) return null
    return calculateDistance(userProfile.latitude, userProfile.longitude, u.latitude, u.longitude)
  }

  const primaryUsers = selectedActivity === 'all'
    ? allUsers
    : allUsers.filter(u => u.current_activity === selectedActivity)

  const otherUsers = selectedActivity === 'all'
    ? []
    : allUsers.filter(u => u.current_activity !== selectedActivity)

  const currentPrimary = primaryUsers[primaryIndex]
  const currentOther = otherUsers[otherIndex]

  const primaryDistance = currentPrimary ? getDistance(currentPrimary) : null
  const primaryDistanceLabel = primaryDistance !== null ? getDistanceLabel(primaryDistance!) : null

  const otherDistance = currentOther ? getDistance(currentOther) : null
  const otherDistanceLabel = otherDistance !== null ? getDistanceLabel(otherDistance!) : null

  function handleActivityFilter(activity: string) {
    setSelectedActivity(activity)
    setPrimaryIndex(0)
    setOtherIndex(0)
  }

  function renderMatchCard(
    user: Profile,
    index: number,
    total: number,
    distLabel: string | null,
    onSkip: () => void,
    onAccept: () => void,
    isPrimary: boolean
  ) {
    return (
      <div style={{
        background: isPrimary ? '#0d0d0d' : '#ffffff',
        borderRadius: '24px',
        padding: '20px',
        marginBottom: '12px',
        border: isPrimary ? 'none' : '1.5px solid #CAFF00',
      }}>

        {/* Label */}
        <div style={{ fontSize: '10px', fontWeight: 800, color: isPrimary ? '#CAFF00' : '#0d0d0d', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>
          {isPrimary
            ? `${activityIcons[selectedActivity] || '🏃'} ${activityLabels[selectedActivity] || selectedActivity} · ${index + 1} of ${total}`
            : `✦ Other activity · ${index + 1} of ${total}`
          }
        </div>

        {/* User row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>

          {/* Clickable avatar */}
          <div
            onClick={() => router.push('/user/' + user.id)}
            style={{ flexShrink: 0, cursor: 'pointer', position: 'relative' }}
          >
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                style={{ width: '54px', height: '54px', borderRadius: '14px', objectFit: 'cover', border: `2.5px solid ${isPrimary ? '#CAFF00' : '#0d0d0d'}`, display: 'block' }}
              />
            ) : (
              <div style={{ width: '54px', height: '54px', borderRadius: '14px', background: isPrimary ? '#CAFF00' : '#0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: isPrimary ? '#0d0d0d' : '#CAFF00' }}>
                {getInitials(user.full_name)}
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Clickable name */}
            <div
              onClick={() => router.push('/user/' + user.id)}
              style={{ fontSize: '16px', fontWeight: 800, color: isPrimary ? '#ffffff' : '#0d0d0d', letterSpacing: '-0.3px', cursor: 'pointer' }}
            >
              {user.full_name}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
              {distLabel && (
                <span style={{ fontSize: '11px', color: isPrimary ? 'rgba(255,255,255,0.5)' : '#5a5a5a' }}>📍 {distLabel}</span>
              )}
              <span style={{ fontSize: '11px', color: isPrimary ? 'rgba(255,255,255,0.5)' : '#5a5a5a' }}>
                ⭐ {user.rating || 5} · {user.session_count || 0} sessions
              </span>
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div style={{ background: isPrimary ? 'rgba(255,255,255,0.06)' : '#f5f5f0', borderRadius: '12px', padding: '12px', marginBottom: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '10px', color: isPrimary ? 'rgba(255,255,255,0.35)' : '#5a5a5a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Activity</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: isPrimary ? '#CAFF00' : '#0d0d0d' }}>
                {activityIcons[user.current_activity] || '🏃'} {activityLabels[user.current_activity] || user.current_activity?.replace(/_/g, ' ')}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: isPrimary ? 'rgba(255,255,255,0.35)' : '#5a5a5a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Available</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: isPrimary ? '#ffffff' : '#0d0d0d' }}>
                {user.available_from} – {user.available_until}
              </div>
            </div>
            {user.available_duration && (
              <div>
                <div style={{ fontSize: '10px', color: isPrimary ? 'rgba(255,255,255,0.35)' : '#5a5a5a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Duration</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: isPrimary ? '#ffffff' : '#0d0d0d' }}>
                  {user.available_duration}
                </div>
              </div>
            )}
            {user.experience_level && (
              <div>
                <div style={{ fontSize: '10px', color: isPrimary ? 'rgba(255,255,255,0.35)' : '#5a5a5a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Level</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: isPrimary ? '#ffffff' : '#0d0d0d', textTransform: 'capitalize' }}>
                  {user.experience_level}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end' }}>
          {total > 1 && (
            <button
              onClick={onSkip}
              style={{
                padding: '8px 16px',
                background: isPrimary ? 'rgba(255,255,255,0.08)' : '#f5f5f0',
                color: isPrimary ? 'rgba(255,255,255,0.7)' : '#5a5a5a',
                border: isPrimary ? 'none' : '1px solid #e2e2d8',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Skip
            </button>
          )}
          <button
            onClick={onAccept}
            style={{
              padding: '8px 18px',
              background: isPrimary ? '#CAFF00' : '#0d0d0d',
              color: isPrimary ? '#0d0d0d' : '#CAFF00',
              border: 'none',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Say hello →
          </button>
        </div>

        {/* Dot indicators */}
        {total > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginTop: '12px' }}>
            {Array.from({ length: total }).map((_, i) => (
              <div
                key={i}
                onClick={() => isPrimary ? setPrimaryIndex(i) : setOtherIndex(i)}
                style={{
                  width: i === index ? '18px' : '6px',
                  height: '6px',
                  borderRadius: '3px',
                  background: isPrimary
                    ? (i === index ? '#CAFF00' : 'rgba(255,255,255,0.2)')
                    : (i === index ? '#0d0d0d' : '#e2e2d8'),
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ padding: '52px 24px 16px', background: '#ffffff', borderBottom: '1px solid #e2e2d8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
          <button
            onClick={() => router.back()}
            style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f5f5f0', border: 'none', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ←
          </button>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0d0d0d', letterSpacing: '-0.5px' }}>Nearby matches</div>
            <div style={{ fontSize: '13px', color: '#5a5a5a', marginTop: '2px' }}>
              {activityParam
                ? `Looking for ${activityLabels[activityParam]} partners today`
                : 'People available today near you'
              }
            </div>
          </div>
        </div>

        {/* Selected activity badge */}
        {activityParam && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', color: '#5a5a5a' }}>You scheduled:</div>
            <div style={{ padding: '4px 12px', background: '#0d0d0d', color: '#CAFF00', borderRadius: '100px', fontSize: '12px', fontWeight: 700 }}>
              {activityIcons[activityParam]} {activityLabels[activityParam]} · {primaryUsers.length} available
            </div>
          </div>
        )}

        {/* Activity filter tabs */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            onClick={() => handleActivityFilter('all')}
            style={{ flexShrink: 0, padding: '7px 14px', background: selectedActivity === 'all' ? '#0d0d0d' : '#f5f5f0', color: selectedActivity === 'all' ? '#CAFF00' : '#0d0d0d', border: 'none', borderRadius: '100px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            All ({allUsers.length})
          </button>

          {/* Always show selected activity first */}
          {activityParam && (
            <button
              onClick={() => handleActivityFilter(activityParam)}
              style={{ flexShrink: 0, padding: '7px 14px', background: selectedActivity === activityParam ? '#0d0d0d' : '#f5f5f0', color: selectedActivity === activityParam ? '#CAFF00' : '#0d0d0d', border: 'none', borderRadius: '100px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              {activityIcons[activityParam]} {activityLabels[activityParam]} ({primaryUsers.length})
            </button>
          )}

          {/* Other activities with people */}
          {Object.entries(activityLabels).map(([key, label]) => {
            if (key === activityParam) return null
            const count = allUsers.filter(u => u.current_activity === key).length
            if (count === 0) return null
            return (
              <button
                key={key}
                onClick={() => handleActivityFilter(key)}
                style={{ flexShrink: 0, padding: '7px 14px', background: selectedActivity === key ? '#0d0d0d' : '#f5f5f0', color: selectedActivity === key ? '#CAFF00' : '#0d0d0d', border: 'none', borderRadius: '100px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                {activityIcons[key]} {label} ({count})
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '16px 24px', maxWidth: '480px', margin: '0 auto' }}>

        {/* AI Match banner */}
        <div
          onClick={() => router.push('/ai-match')}
          style={{ background: '#0d0d0d', borderRadius: '18px', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: '14px', position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', right: '-10px', top: '-10px', width: '70px', height: '70px', borderRadius: '50%', background: '#CAFF00', opacity: 0.12 }} />
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>✨</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#CAFF00', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1px' }}>AI Instant Match</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>Let Strolly AI pick your best match</div>
          </div>
          <div style={{ background: '#CAFF00', borderRadius: '100px', padding: '6px 12px', fontSize: '11px', fontWeight: 700, color: '#0d0d0d', flexShrink: 0 }}>
            Match →
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#5a5a5a', fontSize: '14px' }}>
            Finding people nearby...
          </div>
        )}

        {/* No one at all */}
        {!loading && allUsers.length === 0 && (
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '40px 24px', textAlign: 'center', border: '1.5px solid #e2e2d8' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0d0d0d', marginBottom: '8px' }}>No one nearby yet</div>
            <div style={{ fontSize: '14px', color: '#5a5a5a', lineHeight: 1.6, marginBottom: '24px' }}>
              No one has scheduled an activity for today yet.
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button onClick={() => router.push('/schedule')} style={{ padding: '10px 20px', background: '#ffffff', color: '#0d0d0d', border: '1.5px solid #e2e2d8', borderRadius: '100px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                ← Change time
              </button>
              <button onClick={() => router.push('/home')} style={{ padding: '10px 20px', background: '#0d0d0d', color: '#CAFF00', border: 'none', borderRadius: '100px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                Home
              </button>
            </div>
          </div>
        )}

        {/* No primary matches for selected activity */}
        {!loading && allUsers.length > 0 && primaryUsers.length === 0 && selectedActivity !== 'all' && (
          <div style={{ background: '#0d0d0d', borderRadius: '20px', padding: '24px 20px', marginBottom: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>{activityIcons[selectedActivity] || '🏃'}</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
              Nobody doing {activityLabels[selectedActivity]} today
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginBottom: '18px', lineHeight: 1.6 }}>
              No one has scheduled {activityLabels[selectedActivity]?.toLowerCase()} for today yet. Others are available below 👇
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                onClick={() => router.push('/schedule')}
                style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.1)', color: '#ffffff', border: 'none', borderRadius: '100px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                ← Change activity
              </button>
              <button
                onClick={() => router.push('/ai-match')}
                style={{ padding: '8px 14px', background: '#CAFF00', color: '#0d0d0d', border: 'none', borderRadius: '100px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                ✨ AI Match
              </button>
            </div>
          </div>
        )}

        {/* Primary match card */}
        {!loading && currentPrimary && renderMatchCard(
          currentPrimary,
          primaryIndex,
          primaryUsers.length,
          primaryDistanceLabel,
          () => setPrimaryIndex(i => i < primaryUsers.length - 1 ? i + 1 : 0),
          () => router.push('/chat/' + currentPrimary.id),
          true
        )}

        {/* Other activities separator + card */}
        {!loading && currentOther && selectedActivity !== 'all' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '8px 0 12px' }}>
              <div style={{ flex: 1, height: '1px', background: '#e2e2d8' }} />
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                Other activities available
              </div>
              <div style={{ flex: 1, height: '1px', background: '#e2e2d8' }} />
            </div>

            {renderMatchCard(
              currentOther,
              otherIndex,
              otherUsers.length,
              otherDistanceLabel,
              () => setOtherIndex(i => i < otherUsers.length - 1 ? i + 1 : 0),
              () => router.push('/chat/' + currentOther.id),
              false
            )}
          </>
        )}

      </div>

      <BottomNav />
    </div>
  )
}