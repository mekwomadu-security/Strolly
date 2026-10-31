'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  is_in_session: boolean
  current_activity: string
  available_from: string
  available_until: string
}

interface Photo {
  id: string
  photo_url: string
  position: number
}

const activityPhotos: Record<string, string> = {
  gym: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300&q=80',
  jogging: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=300&q=80',
  cycling: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=300&q=80',
  football: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=300&q=80',
  yoga: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=300&q=80',
  swimming: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=300&q=80',
  dog_walk: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=300&q=80',
  badminton: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=300&q=80',
  tennis: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=300&q=80',
}

const activityLabels: Record<string, string> = {
  gym: 'Gym', jogging: 'Jogging', cycling: 'Cycling',
  football: 'Football', yoga: 'Yoga', swimming: 'Swimming',
  dog_walk: 'Dog walk', badminton: 'Badminton', tennis: 'Tennis',
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [isInSession, setIsInSession] = useState(false)
  const [togglingSession, setTogglingSession] = useState(false)

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

    if (profileData) {
      setProfile(profileData)
      setIsInSession(profileData.is_in_session || false)
    }

    const { data: photosData } = await supabase
      .from('profile_photos')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })

    if (photosData) setPhotos(photosData)
    setLoading(false)
  }

  async function toggleSession() {
    setTogglingSession(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const newStatus = !isInSession
    await supabase
      .from('profiles')
      .update({ is_in_session: newStatus })
      .eq('id', user.id)

    setIsInSession(newStatus)
    setTogglingSession(false)
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

      {/* Hero header */}
      <div style={{ position: 'relative', height: '260px', overflow: 'hidden' }}>
        {profile?.activities?.[0] && activityPhotos[profile.activities[0]] ? (
          <img src={activityPhotos[profile.activities[0]]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.4)' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#0d0d0d' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.88))' }} />

        {/* Back + Edit */}
        <div style={{ position: 'absolute', top: '52px', left: '20px', right: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => router.push('/home')} style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <button onClick={() => router.push('/profile/edit')} style={{ padding: '7px 16px', background: '#CAFF00', color: '#0d0d0d', border: 'none', borderRadius: '100px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Edit profile</button>
        </div>

        {/* Profile info */}
        <div style={{ position: 'absolute', bottom: '16px', left: '20px', right: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '14px', marginBottom: '10px' }}>
            <div style={{ flexShrink: 0, position: 'relative' }}>
              {mainPhoto ? (
                <img src={mainPhoto} alt="Profile" onClick={() => setSelectedPhoto(mainPhoto)} style={{ width: '72px', height: '72px', borderRadius: '20px', objectFit: 'cover', border: '3px solid #CAFF00', cursor: 'pointer' }} />
              ) : (
                <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 800, color: '#0d0d0d' }}>{initials}</div>
              )}
              {photos.length > 1 && (
                <div style={{ position: 'absolute', bottom: '-6px', right: '-6px', background: '#0d0d0d', borderRadius: '100px', padding: '2px 6px', fontSize: '9px', fontWeight: 700, color: '#CAFF00', border: '1.5px solid #CAFF00' }}>+{photos.length - 1}</div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>{profile?.full_name}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>📍 {profile?.city}</div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                <div>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>{profile?.session_count || 0}</span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginLeft: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sessions</span>
                </div>
                <div>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>{profile?.rating || 5.0}</span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginLeft: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rating</span>
                </div>
              </div>
            </div>
          </div>
          {profile?.bio && (
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{profile.bio}</div>
          )}
        </div>
      </div>

      <div style={{ padding: '16px 20px', maxWidth: '480px', margin: '0 auto' }}>

        {/* Photo gallery */}
        {photos.length > 0 && (
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '14px 16px', border: '1px solid #e2e2d8', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Photos</div>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
              {photos.map(photo => (
                <img key={photo.id} src={photo.photo_url} alt="Profile" onClick={() => setSelectedPhoto(photo.photo_url)} style={{ width: '90px', height: '90px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0, border: '1px solid #e2e2d8', cursor: 'pointer' }} />
              ))}
            </div>
          </div>
        )}

        {/* Activities */}
        {profile?.activities && profile.activities.length > 0 && (
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '14px 16px', border: '1px solid #e2e2d8', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Activities</div>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
              {profile.activities.map((a: string) => (
                <div key={a} style={{ flexShrink: 0, width: '80px' }}>
                  <div style={{ borderRadius: '12px', overflow: 'hidden', position: 'relative', height: '80px' }}>
                    <img src={activityPhotos[a] || activityPhotos.jogging} alt={activityLabels[a] || a} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.75)', display: 'block' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 6px 5px', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#ffffff' }}>{activityLabels[a] || a}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fitness profile + In Session toggle */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '14px 16px', border: '1px solid #e2e2d8', marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Fitness profile
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {profile?.experience_level && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#5a5a5a' }}>Experience</span>
                <span style={{ fontWeight: 600, color: '#0d0d0d', textTransform: 'capitalize' }}>{profile.experience_level}</span>
              </div>
            )}
            {profile?.preferred_time && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#5a5a5a' }}>Preferred time</span>
                <span style={{ fontWeight: 600, color: '#0d0d0d', textTransform: 'capitalize' }}>{profile.preferred_time}</span>
              </div>
            )}
            {profile?.fitness_goal && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#5a5a5a' }}>Goal</span>
                <span style={{ fontWeight: 600, color: '#0d0d0d', textTransform: 'capitalize' }}>{profile.fitness_goal}</span>
              </div>
            )}

            {/* Divider */}
            <div style={{ height: '1px', background: '#f0f0f0', margin: '4px 0' }} />

            {/* In Session Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d0d0d' }}>
                  {isInSession ? '🔒 In Session' : '✅ Available'}
                </div>
                <div style={{ fontSize: '11px', color: '#5a5a5a', marginTop: '2px' }}>
                  {isInSession
                    ? 'Hidden from search · tap to become visible'
                    : 'Visible to others · tap when matched'}
                </div>
              </div>
              <button
                onClick={toggleSession}
                disabled={togglingSession}
                style={{
                  width: '52px',
                  height: '28px',
                  borderRadius: '14px',
                  background: isInSession ? '#0d0d0d' : '#e2e2d8',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                  opacity: togglingSession ? 0.6 : 1,
                  flexShrink: 0,
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '3px',
                  left: isInSession ? '27px' : '3px',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: isInSession ? '#CAFF00' : '#ffffff',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                }} />
              </button>
            </div>
          </div>
        </div>

        {/* Account settings */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e2d8', overflow: 'hidden', marginBottom: '12px' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e2d8' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Account</div>
          </div>
          {[
            { label: 'Edit profile', icon: '', action: () => router.push('/profile/edit') },
            { label: 'Change password', icon: '', action: () => router.push('/forgot-password') },
            { label: 'Sign out', icon: '', action: handleSignOut },
          ].map((item, index) => (
            <div key={item.label} onClick={item.action} style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderBottom: index < 2 ? '1px solid #e2e2d8' : 'none' }}>
              <span style={{ fontSize: '16px' }}>{item.icon}</span>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#0d0d0d', flex: 1 }}>{item.label}</span>
              <span style={{ fontSize: '14px', color: '#5a5a5a' }}>→</span>
            </div>
          ))}
        </div>

        {/* Delete account */}
        <div onClick={() => router.push('/profile/edit?section=delete')} style={{ background: '#fff0f0', borderRadius: '16px', padding: '13px 16px', border: '1px solid #ffcccc', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
          <span style={{ fontSize: '16px' }}>🗑️</span>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#cc0000', flex: 1 }}>Delete account</span>
          <span style={{ fontSize: '14px', color: '#cc0000' }}>→</span>
        </div>

      </div>

      {/* Photo lightbox */}
      {selectedPhoto && (
        <div onClick={() => setSelectedPhoto(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '24px' }}>
          <button onClick={() => setSelectedPhoto(null)} style={{ position: 'absolute', top: '20px', right: '20px', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          <img src={selectedPhoto} alt="Profile photo" onClick={e => e.stopPropagation()} style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '16px', objectFit: 'contain' }} />
        </div>
      )}

      <BottomNav />
    </div>
  )
}