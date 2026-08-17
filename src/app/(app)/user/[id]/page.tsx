'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'

interface Profile {
  id: string
  full_name: string
  bio: string
  city: string
  activities: string[]
  experience_level: string
  preferred_time: string
  fitness_goal: string
  avatar_url: string
  session_count: number
  rating: number
}

interface Photo {
  id: string
  photo_url: string
  position: number
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

export default function UserProfilePage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  const [profile, setProfile] = useState<Profile | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setCurrentUserId(user.id)

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileData) setProfile(profileData)

    const { data: photosData } = await supabase
      .from('profile_photos')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true })

    if (photosData) setPhotos(photosData)
    setLoading(false)
  }

  async function startChat() {
    router.push('/chat/' + userId)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '14px', color: '#5a5a5a' }}>Loading profile...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '14px', color: '#5a5a5a' }}>Profile not found</div>
      </div>
    )
  }

  const initials = profile.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const mainPhoto = photos[0]?.photo_url || profile.avatar_url || null

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', paddingBottom: '100px' }}>

      {/* Header */}
      <div style={{ background: '#0d0d0d', padding: '56px 24px 32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '150px', height: '150px', borderRadius: '50%', background: '#CAFF00', opacity: 0.08 }} />

        <button
          onClick={() => router.back()}
          style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}
        >
          ←
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          {mainPhoto ? (
            <img
              src={mainPhoto}
              alt={profile.full_name}
              style={{ width: '80px', height: '80px', borderRadius: '24px', objectFit: 'cover', border: '3px solid #CAFF00', flexShrink: 0 }}
            />
          ) : (
            <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 800, color: '#0d0d0d', flexShrink: 0 }}>
              {initials}
            </div>
          )}
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>
              {profile.full_name}
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
              📍 {profile.city}
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>{profile.session_count || 0}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sessions</div>
              </div>
              <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>{profile.rating || 5.0}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rating</div>
              </div>
            </div>
          </div>
        </div>

        {profile.bio && (
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
            {profile.bio}
          </div>
        )}
      </div>

      <div style={{ padding: '20px 24px', maxWidth: '480px', margin: '0 auto' }}>

        {/* Message button */}
        {currentUserId !== userId && (
          <button
            onClick={startChat}
            style={{ width: '100%', padding: '16px', background: '#CAFF00', color: '#0d0d0d', fontSize: '16px', fontWeight: 700, border: 'none', borderRadius: '16px', cursor: 'pointer', marginBottom: '16px' }}
          >
            💬 Send a message
          </button>
        )}

        {/* Photo gallery */}
        {photos.length > 0 && (
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '18px', border: '1.5px solid #e2e2d8', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
              Photos
            </div>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
              {photos.map(photo => (
                <img
                  key={photo.id}
                  src={photo.photo_url}
                  alt="Profile"
                  style={{ width: '100px', height: '100px', borderRadius: '14px', objectFit: 'cover', flexShrink: 0, border: '1.5px solid #e2e2d8' }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Activities */}
        {profile.activities && profile.activities.length > 0 && (
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '18px', border: '1.5px solid #e2e2d8', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
              Activities
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {profile.activities.map((a: string) => (
                <span key={a} style={{ padding: '6px 14px', background: '#CAFF00', borderRadius: '100px', fontSize: '13px', fontWeight: 600, color: '#0d0d0d' }}>
                  {activityIcons[a] || '🏃'} {activityLabels[a] || a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Fitness profile */}
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '18px', border: '1.5px solid #e2e2d8', marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Fitness profile
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {profile.experience_level && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#5a5a5a' }}>Experience</span>
                <span style={{ fontWeight: 600, color: '#0d0d0d', textTransform: 'capitalize' }}>{profile.experience_level}</span>
              </div>
            )}
            {profile.preferred_time && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#5a5a5a' }}>Preferred time</span>
                <span style={{ fontWeight: 600, color: '#0d0d0d', textTransform: 'capitalize' }}>{profile.preferred_time}</span>
              </div>
            )}
            {profile.fitness_goal && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#5a5a5a' }}>Goal</span>
                <span style={{ fontWeight: 600, color: '#0d0d0d', textTransform: 'capitalize' }}>{profile.fitness_goal}</span>
              </div>
            )}
          </div>
        </div>

      </div>

      <BottomNav />
    </div>
  )
}