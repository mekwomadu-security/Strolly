'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileData) setProfile(profileData)

    const { data: photosData } = await supabase
      .from('profile_photos')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })

    if (photosData) setPhotos(photosData)
    setLoading(false)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '14px', color: '#5a5a5a' }}>Loading profile...</div>
      </div>
    )
  }

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
  const mainPhoto = photos[0]?.photo_url || profile?.avatar_url || null

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', paddingBottom: '100px' }}>

      {/* Header */}
      <div style={{ background: '#0d0d0d', padding: '56px 24px 32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '150px', height: '150px', borderRadius: '50%', background: '#CAFF00', opacity: 0.08 }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
          <button
            onClick={() => router.push('/home')}
            style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ←
          </button>
          <button
            onClick={() => router.push('/profile/edit')}
            style={{ padding: '8px 16px', background: '#CAFF00', color: '#0d0d0d', border: 'none', borderRadius: '100px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
          >
            Edit profile
          </button>
        </div>

        {/* Photo + info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          {/* Profile photo */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {mainPhoto ? (
              <img
                src={mainPhoto}
                alt="Profile"
                style={{ width: '80px', height: '80px', borderRadius: '24px', objectFit: 'cover', border: '3px solid #CAFF00' }}
              />
            ) : (
              <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 800, color: '#0d0d0d', border: '3px solid rgba(202,255,0,0.3)' }}>
                {initials}
              </div>
            )}
            {photos.length > 1 && (
              <div style={{ position: 'absolute', bottom: '-6px', right: '-6px', background: '#0d0d0d', borderRadius: '100px', padding: '2px 6px', fontSize: '10px', fontWeight: 700, color: '#CAFF00', border: '1.5px solid #CAFF00' }}>
                +{photos.length - 1}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>
              {profile?.full_name}
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
              📍 {profile?.city}
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>{profile?.session_count || 0}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sessions</div>
              </div>
              <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>{profile?.rating || 5.0}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rating</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile?.bio && (
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
            {profile.bio}
          </div>
        )}
      </div>

      <div style={{ padding: '20px 24px', maxWidth: '480px', margin: '0 auto' }}>

        {/* Photo gallery */}
        {photos.length > 1 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Photos
            </div>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {photos.map(photo => (
                <img
                  key={photo.id}
                  src={photo.photo_url}
                  alt="Profile"
                  style={{ width: '100px', height: '100px', borderRadius: '16px', objectFit: 'cover', flexShrink: 0, border: '1.5px solid #e2e2d8' }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Activities */}
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '18px', border: '1.5px solid #e2e2d8', marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Activities
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {profile?.activities?.map((a: string) => (
              <span key={a} style={{ padding: '6px 14px', background: '#CAFF00', borderRadius: '100px', fontSize: '13px', fontWeight: 600, color: '#0d0d0d' }}>
                {activityIcons[a] || '🏃'} {a.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>

        {/* Fitness info */}
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '18px', border: '1.5px solid #e2e2d8', marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Fitness profile
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {profile?.experience_level && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#5a5a5a' }}>Experience</span>
                <span style={{ fontWeight: 600, color: '#0d0d0d', textTransform: 'capitalize' }}>{profile.experience_level}</span>
              </div>
            )}
            {profile?.preferred_time && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#5a5a5a' }}>Preferred time</span>
                <span style={{ fontWeight: 600, color: '#0d0d0d', textTransform: 'capitalize' }}>{profile.preferred_time}</span>
              </div>
            )}
            {profile?.fitness_goal && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#5a5a5a' }}>Goal</span>
                <span style={{ fontWeight: 600, color: '#0d0d0d', textTransform: 'capitalize' }}>{profile.fitness_goal}</span>
              </div>
            )}
          </div>
        </div>

        {/* Account settings */}
        <div style={{ background: '#ffffff', borderRadius: '20px', border: '1.5px solid #e2e2d8', overflow: 'hidden', marginBottom: '12px' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e2d8' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Account
            </div>
          </div>
          {[
            { label: 'Edit profile', icon: '✏️', action: () => router.push('/profile/edit') },
            { label: 'Change password', icon: '🔑', action: () => router.push('/forgot-password') },
            { label: 'Sign out', icon: '👋', action: handleSignOut },
          ].map((item, index) => (
            <div
              key={item.label}
              onClick={item.action}
              style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderBottom: index < 2 ? '1px solid #e2e2d8' : 'none' }}
              onMouseOver={e => e.currentTarget.style.background = '#f5f5f0'}
              onMouseOut={e => e.currentTarget.style.background = '#ffffff'}
            >
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#0d0d0d', flex: 1 }}>{item.label}</span>
              <span style={{ fontSize: '16px', color: '#5a5a5a' }}>→</span>
            </div>
          ))}
        </div>

        {/* Delete account */}
        <div
          style={{ background: '#fff0f0', borderRadius: '20px', padding: '16px 18px', border: '1.5px solid #ffcccc', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          onClick={() => router.push('/profile/edit?section=delete')}
        >
          <span style={{ fontSize: '18px' }}>🗑️</span>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#cc0000', flex: 1 }}>Delete account</span>
          <span style={{ fontSize: '16px', color: '#cc0000' }}>→</span>
        </div>

      </div>

      {/* Bottom nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '80px', background: '#ffffff', borderTop: '1px solid #e2e2d8', display: 'flex', alignItems: 'flex-start', paddingTop: '12px', zIndex: 100 }}>
        <div onClick={() => router.push('/home')} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <div style={{ fontSize: '20px' }}>🗺️</div>
          <div style={{ fontSize: '10px', color: '#5a5a5a' }}>Nearby</div>
        </div>
        <div onClick={() => router.push('/schedule')} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <div style={{ fontSize: '20px' }}>🕐</div>
          <div style={{ fontSize: '10px', color: '#5a5a5a' }}>Schedule</div>
        </div>
        <div onClick={() => router.push('/ai-match')} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <div style={{ fontSize: '20px' }}>✨</div>
          <div style={{ fontSize: '10px', color: '#5a5a5a' }}>AI Match</div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#CAFF00', marginBottom: '-2px' }}></div>
          <div style={{ fontSize: '20px' }}>👤</div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#0d0d0d' }}>Profile</div>
        </div>
      </div>

    </div>
  )
}