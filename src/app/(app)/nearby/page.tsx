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

  const [nearbyUsers, setNearbyUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
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

    // Only fetch people with same activity as user scheduled
    const query = supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .eq('is_available', true)
      .eq('available_date', today)

    // If activity param passed from schedule — filter by it
    if (activityParam) {
      query.eq('current_activity', activityParam)
    }

    const { data: nearby } = await query

    if (nearby) setNearbyUsers(nearby)
    setLoading(false)
  }

  function getInitials(name: string) {
    return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'
  }

  const filteredUsers = selectedActivity === 'all'
    ? nearbyUsers
    : nearbyUsers.filter(u => u.current_activity === selectedActivity)

  const currentUser = filteredUsers[currentIndex]

  const distance = userProfile?.latitude && currentUser?.latitude
    ? calculateDistance(userProfile.latitude, userProfile.longitude, currentUser.latitude, currentUser.longitude)
    : null

  const distanceLabel = distance !== null ? getDistanceLabel(distance) : null

  function skipUser() {
    if (currentIndex < filteredUsers.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      setCurrentIndex(0)
    }
  }

  function handleActivityFilter(activity: string) {
    setSelectedActivity(activity)
    setCurrentIndex(0)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ padding: '52px 24px 16px', background: '#ffffff', borderBottom: '1px solid #e2e2d8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
          <button
            onClick={() => router.back()}
            style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f5f5f0', border: 'none', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ←
          </button>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0d0d0d', letterSpacing: '-0.5px' }}>
              Nearby matches
            </div>
            <div style={{ fontSize: '13px', color: '#5a5a5a', marginTop: '2px' }}>
              {activityParam
                ? `People available for ${activityLabels[activityParam] || activityParam} today`
                : 'People available today near you'
              }
            </div>
          </div>
        </div>

        {/* Activity filter — only show if no specific activity from schedule */}
        {!activityParam && (
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            <button
              onClick={() => handleActivityFilter('all')}
              style={{ flexShrink: 0, padding: '7px 14px', background: selectedActivity === 'all' ? '#0d0d0d' : '#f5f5f0', color: selectedActivity === 'all' ? '#CAFF00' : '#0d0d0d', border: 'none', borderRadius: '100px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              All
            </button>
            {Object.entries(activityLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => handleActivityFilter(key)}
                style={{ flexShrink: 0, padding: '7px 14px', background: selectedActivity === key ? '#0d0d0d' : '#f5f5f0', color: selectedActivity === key ? '#CAFF00' : '#0d0d0d', border: 'none', borderRadius: '100px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                {activityIcons[key]} {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '16px 24px', maxWidth: '480px', margin: '0 auto' }}>

        {/* AI Match banner */}
        <div
          onClick={() => router.push('/ai-match')}
          style={{ background: '#0d0d0d', borderRadius: '20px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', marginBottom: '16px', position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', right: '-10px', top: '-10px', width: '80px', height: '80px', borderRadius: '50%', background: '#CAFF00', opacity: 0.15 }} />
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
            ✨
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#CAFF00', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px' }}>
              AI Instant Match
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>Let AI pick your best match</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Strolly Ai analyses all nearby people and ranks by compatibility</div>
          </div>
          <div style={{ background: '#CAFF00', borderRadius: '100px', padding: '8px 14px', fontSize: '12px', fontWeight: 700, color: '#0d0d0d', flexShrink: 0 }}>
            Match me →
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5a5a5a', fontSize: '14px' }}>
            Finding people nearby...
          </div>
        )}

        {!loading && filteredUsers.length === 0 && (
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '40px 24px', textAlign: 'center', border: '1.5px solid #e2e2d8' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0d0d0d', marginBottom: '8px' }}>
              No one nearby yet
            </div>
            <div style={{ fontSize: '14px', color: '#ffffff', lineHeight: 1.6, marginBottom: '24px' }}>
              {activityParam
                ? `Nobody has scheduled ${activityLabels[activityParam] || activityParam} for today yet. Share the app to find matches!`
                : 'No one has scheduled an activity for today yet.'
              }
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => router.push('/schedule')}
                style={{ padding: '10px 20px', background: '#ffffff', color: '#0d0d0d', border: '1.5px solid #e2e2d8', borderRadius: '100px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                ← Change time
              </button>
              <button
                onClick={() => router.push('/home')}
                style={{ padding: '10px 20px', background: '#0d0d0d', color: '#CAFF00', border: 'none', borderRadius: '100px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Home
              </button>
            </div>
          </div>
        )}

        {/* Match card */}
        {!loading && currentUser && (
          <>
            <div style={{ fontSize: '11px', color: '#5a5a5a', textAlign: 'center', marginBottom: '12px', fontWeight: 500 }}>
              {currentIndex + 1} of {filteredUsers.length} {filteredUsers.length === 1 ? 'person' : 'people'} available
            </div>

            <div style={{ background: '#0d0d0d', borderRadius: '24px', padding: '24px', marginBottom: '12px' }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                {currentUser.avatar_url ? (
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.full_name}
                    style={{ width: '64px', height: '64px', borderRadius: '18px', objectFit: 'cover', border: '3px solid #CAFF00', flexShrink: 0 }}
                  />
                ) : (
                  <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800, color: '#0d0d0d', flexShrink: 0 }}>
                    {getInitials(currentUser.full_name)}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>
                    {currentUser.full_name}
                  </div>
                  {distanceLabel && (
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                      📍 {distanceLabel}
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                    ⭐ {currentUser.rating || 5} · {currentUser.session_count || 0} sessions
                  </div>
                </div>
              </div>

              {/* Details */}
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '14px', padding: '14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Activity</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#CAFF00' }}>
                    {activityIcons[currentUser.current_activity] || '🏃'} {activityLabels[currentUser.current_activity] || currentUser.current_activity?.replace(/_/g, ' ')}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: currentUser.experience_level ? '10px' : '0' }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Available</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                    {currentUser.available_from} – {currentUser.available_until}
                  </div>
                </div>
                {currentUser.experience_level && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Level</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', textTransform: 'capitalize' }}>
                      {currentUser.experience_level}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => router.push('/chat/' + currentUser.id)}
                  style={{ flex: 1, padding: '14px', background: '#CAFF00', color: '#0d0d0d', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Say hello →
                </button>
                {filteredUsers.length > 1 && (
                  <button
                    onClick={skipUser}
                    style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.1)', color: '#ffffff', border: 'none', borderRadius: '14px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Skip
                  </button>
                )}
              </div>
            </div>

            {/* Dot indicators */}
            {filteredUsers.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                {filteredUsers.map((_, i) => (
                  <div
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    style={{ width: i === currentIndex ? '20px' : '8px', height: '8px', borderRadius: '4px', background: i === currentIndex ? '#0d0d0d' : '#e2e2d8', cursor: 'pointer', transition: 'all 0.2s' }}
                  />
                ))}
              </div>
            )}
          </>
        )}

      </div>

      <BottomNav />
    </div>
  )
}