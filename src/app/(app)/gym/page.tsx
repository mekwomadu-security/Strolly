'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'

interface Gym {
  id: string
  name: string
  city: string
  address: string
  is_verified: boolean
}

const gymActivityCategories = [
  {
    category: '🏋️ Weightlifting',
    activities: [
      'Powerlifting', 'Bodybuilding', 'Dumbbell workout', 'Barbell workout',
      'Kettlebell workout', 'Resistance bands', 'Machine workout', 'Cable workout',
      'Partner lifting', 'Spotting each other', 'Bench press', 'Deadlifts',
      'Squats', 'Lunges', 'Leg press', 'Shoulder press', 'Chest press',
      'Bicep / tricep', 'Core workout', 'Ab workout',
    ]
  },
  {
    category: '🏃 Cardio',
    activities: [
      'Treadmill running', 'Walking on treadmill', 'Jogging', 'Sprinting',
      'Stair climber', 'Elliptical', 'Stationary bike', 'Spin cycling',
      'Rowing machine', 'Jump rope', 'HIIT', 'Cardio circuits',
    ]
  },
  {
    category: '🤸 Classes & Group',
    activities: [
      'Yoga', 'Hot yoga', 'Pilates', 'Zumba', 'Spin class', 'HIIT class',
      'Boot camp', 'CrossFit', 'Boxing class', 'Kickboxing', 'Martial arts',
      'Dance fitness', 'Mobility class', 'Stretching class',
    ]
  },
  {
    category: '🥊 Partner Activities',
    activities: [
      'Partner workout', 'Workout challenge', 'Boxing pad work',
      'Medicine ball exercises', 'Partner resistance', 'Sled pushing',
      'Sled pulling', 'Battle ropes', 'Partner stretching', 'Swimming',
      'Basketball', 'Volleyball', 'Racquetball', 'Squash',
      'Indoor climbing', 'Walking the track',
    ]
  },
  {
    category: '💬 Social / Casual',
    activities: [
      'Training together', 'Trying a new class', 'Comparing routines',
      'Setting fitness goals', 'Tracking progress', 'Motivating each other',
      'Cool-down together', 'Post-gym walk', 'Post-gym coffee',
      'Progress photos', 'Sharing workout plan',
    ]
  },
]

export default function GymPage() {
  const router = useRouter()
  const [step, setStep] = useState<'search' | 'activity' | 'checkedin'>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Gym[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null)
  const [selectedActivity, setSelectedActivity] = useState('')
  const [openCategory, setOpenCategory] = useState<string | null>(null)
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [matches, setMatches] = useState<any[]>([])
  const [loadingMatches, setLoadingMatches] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [addingGym, setAddingGym] = useState(false)

  useEffect(() => {
    initUser()
  }, [])

  async function initUser() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setCurrentUserId(user.id)

    const { data: profile } = await supabase
      .from('profiles')
      .select('gym_checked_in, current_gym_name, current_gym_activity, current_gym_id')
      .eq('id', user.id)
      .single()

    if (profile?.gym_checked_in && profile?.current_gym_name) {
      setSelectedGym({ id: profile.current_gym_id, name: profile.current_gym_name, city: '', address: '', is_verified: false })
      setSelectedActivity(profile.current_gym_activity || '')
      setStep('checkedin')
      fetchGymMatches(profile.current_gym_id)
    }
  }

  async function searchGyms(query: string) {
    setSearchQuery(query)
    if (query.length < 2) { setSearchResults([]); return }
    setSearching(true)

    const supabase = createClient()
    const { data } = await supabase
      .from('gyms')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(8)

    if (data) setSearchResults(data)
    setSearching(false)
  }

  async function addNewGym() {
    if (!searchQuery.trim() || addingGym) return
    setAddingGym(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('city')
      .eq('id', user.id)
      .single()

    const { data: newGym } = await supabase
      .from('gyms')
      .insert({
        name: searchQuery.trim(),
        city: profile?.city || '',
        created_by: user.id,
        is_verified: false,
      })
      .select()
      .single()

    if (newGym) {
      setSelectedGym(newGym)
      setStep('activity')
    }
    setAddingGym(false)
  }

  async function handleCheckIn() {
    if (!selectedGym || !selectedActivity) return
    setCheckinLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('profiles')
      .update({
        current_gym_id: selectedGym.id,
        current_gym_name: selectedGym.name,
        current_gym_activity: selectedActivity,
        gym_checked_in: true,
        gym_checkin_time: new Date().toISOString(),
        is_available: true,
        current_activity: 'gym',
        available_date: 'Today',
        available_from: getCurrentTime(),
        available_until: getTimeInHours(2),
      })
      .eq('id', user.id)

    setStep('checkedin')
    setCheckinLoading(false)
    fetchGymMatches(selectedGym.id)
  }

  async function fetchGymMatches(gymId: string) {
    setLoadingMatches(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('current_gym_id', gymId)
      .eq('gym_checked_in', true)
      .neq('id', user.id)

    if (data) setMatches(data)
    setLoadingMatches(false)
  }

  async function handleCheckOut() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('profiles')
      .update({
        gym_checked_in: false,
        is_available: false,
        current_gym_id: null,
        current_gym_name: null,
        current_gym_activity: null,
      })
      .eq('id', user.id)

    setStep('search')
    setSelectedGym(null)
    setSelectedActivity('')
    setMatches([])
    setSearchQuery('')
  }

  function getCurrentTime() {
    const now = new Date()
    const h = now.getHours() % 12 || 12
    const m = now.getMinutes().toString().padStart(2, '0')
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM'
    return `${h}:${m} ${ampm}`
  }

  function getTimeInHours(hours: number) {
    const now = new Date()
    now.setHours(now.getHours() + hours)
    const h = now.getHours() % 12 || 12
    const m = now.getMinutes().toString().padStart(2, '0')
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM'
    return `${h}:${m} ${ampm}`
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ padding: '56px 24px 20px', background: '#ffffff', borderBottom: '1px solid #e2e2d8', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          onClick={() => step === 'search' ? router.push('/home') : step === 'activity' ? setStep('search') : null}
          style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f5f5f0', border: 'none', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'sans-serif', fontSize: '20px', fontWeight: 800, color: '#0d0d0d', letterSpacing: '-0.5px' }}>
            {step === 'search' ? "I'm at the gym" : step === 'activity' ? selectedGym?.name : selectedGym?.name}
          </div>
          <div style={{ fontSize: '12px', color: '#5a5a5a', marginTop: '2px' }}>
            {step === 'search' ? 'Search for your gym' : step === 'activity' ? 'What are you doing today?' : '✅ Checked in'}
          </div>
        </div>
        {step === 'checkedin' && (
          <button
            onClick={handleCheckOut}
            style={{ padding: '8px 14px', background: '#fff0f0', color: '#cc0000', border: '1.5px solid #ffcccc', borderRadius: '100px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            Check out
          </button>
        )}
      </div>

      <div style={{ padding: '24px', maxWidth: '480px', margin: '0 auto' }}>

        {/* STEP 1 — Search gym */}
        {step === 'search' && (
          <div>
            <input
              type="text"
              value={searchQuery}
              onChange={e => searchGyms(e.target.value)}
              placeholder="Search your gym e.g. GoodLife, Planet Fitness..."
              autoFocus
              style={{ width: '100%', padding: '14px 16px', background: '#ffffff', border: '1.5px solid #e2e2d8', borderRadius: '14px', fontSize: '15px', color: '#0d0d0d', outline: 'none', marginBottom: '12px' }}
              onFocus={e => e.target.style.borderColor = '#a8d900'}
              onBlur={e => e.target.style.borderColor = '#e2e2d8'}
            />

            {searching && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#5a5a5a', fontSize: '14px' }}>Searching...</div>
            )}

            {searchResults.length > 0 && (
              <div style={{ background: '#ffffff', borderRadius: '20px', border: '1.5px solid #e2e2d8', overflow: 'hidden', marginBottom: '12px' }}>
                {searchResults.map((gym, index) => (
                  <div
                    key={gym.id}
                    onClick={() => { setSelectedGym(gym); setStep('activity') }}
                    style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: index < searchResults.length - 1 ? '1px solid #e2e2d8' : 'none', cursor: 'pointer' }}
                    onMouseOver={e => e.currentTarget.style.background = '#f5f5f0'}
                    onMouseOut={e => e.currentTarget.style.background = '#ffffff'}
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                      🏋️
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0d0d0d' }}>{gym.name}</div>
                      {gym.city && <div style={{ fontSize: '12px', color: '#5a5a5a', marginTop: '2px' }}>{gym.city}</div>}
                    </div>
                    {gym.is_verified && (
                      <div style={{ padding: '3px 8px', background: '#f0ffe0', borderRadius: '100px', fontSize: '10px', fontWeight: 600, color: '#2d6a00', border: '1px solid #a8d900' }}>
                        ✓ Verified
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && !searching && (
              <div
                onClick={addNewGym}
                style={{ background: '#ffffff', borderRadius: '16px', border: '1.5px dashed #e2e2d8', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                onMouseOver={e => e.currentTarget.style.borderColor = '#a8d900'}
                onMouseOut={e => e.currentTarget.style.borderColor = '#e2e2d8'}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>+</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0d0d0d' }}>Add "{searchQuery}"</div>
                  <div style={{ fontSize: '12px', color: '#5a5a5a', marginTop: '2px' }}>Add this gym to Strolly</div>
                </div>
                {addingGym && <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#5a5a5a' }}>Adding...</div>}
              </div>
            )}

            {searchQuery.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏋️</div>
                <div style={{ fontFamily: 'sans-serif', fontSize: '18px', fontWeight: 800, color: '#0d0d0d', marginBottom: '8px' }}>Which gym are you at?</div>
                <div style={{ fontSize: '14px', color: '#5a5a5a', lineHeight: 1.6 }}>Search above. If it's not there, add it and others can find it too.</div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2 — Pick gym activity with dropdowns */}
        {step === 'activity' && (
          <div>
            <div style={{ background: '#0d0d0d', borderRadius: '20px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '28px' }}>🏋️</div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>{selectedGym?.name}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{selectedGym?.city}</div>
              </div>
            </div>

            {selectedActivity && (
              <div style={{ background: '#f0ffe0', border: '1.5px solid #a8d900', borderRadius: '14px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#2d6a00', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px' }}>Selected</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#0d0d0d' }}>{selectedActivity}</div>
                </div>
                <button
                  onClick={() => setSelectedActivity('')}
                  style={{ fontSize: '12px', color: '#cc0000', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  Change
                </button>
              </div>
            )}

            <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
              What are you doing?
            </div>

            {gymActivityCategories.map(cat => (
              <div key={cat.category} style={{ marginBottom: '8px' }}>
                <div
                  onClick={() => setOpenCategory(openCategory === cat.category ? null : cat.category)}
                  style={{ background: '#ffffff', borderRadius: openCategory === cat.category ? '14px 14px 0 0' : '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', border: '1.5px solid', borderColor: openCategory === cat.category ? '#a8d900' : '#e2e2d8', borderBottom: openCategory === cat.category ? 'none' : '1.5px solid #e2e2d8' }}
                >
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0d0d0d' }}>{cat.category}</div>
                  <div style={{ fontSize: '18px', color: '#5a5a5a', transform: openCategory === cat.category ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    ↓
                  </div>
                </div>

                {openCategory === cat.category && (
                  <div style={{ background: '#ffffff', border: '1.5px solid #a8d900', borderTop: 'none', borderRadius: '0 0 14px 14px', overflow: 'hidden' }}>
                    {cat.activities.map((activity, index) => (
                      <div
                        key={activity}
                        onClick={() => { setSelectedActivity(activity); setOpenCategory(null) }}
                        style={{
                          padding: '12px 16px',
                          fontSize: '14px',
                          color: selectedActivity === activity ? '#0d0d0d' : '#0d0d0d',
                          background: selectedActivity === activity ? '#CAFF00' : index % 2 === 0 ? '#ffffff' : '#fafafa',
                          cursor: 'pointer',
                          borderBottom: index < cat.activities.length - 1 ? '1px solid #f0f0f0' : 'none',
                          fontWeight: selectedActivity === activity ? 700 : 400,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                        onMouseOver={e => { if (selectedActivity !== activity) e.currentTarget.style.background = '#f5f5f0' }}
                        onMouseOut={e => { if (selectedActivity !== activity) e.currentTarget.style.background = index % 2 === 0 ? '#ffffff' : '#fafafa' }}
                      >
                        {activity}
                        {selectedActivity === activity && <span>✓</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {error && (
              <div style={{ padding: '12px 16px', background: '#fff0f0', border: '1.5px solid #ffcccc', borderRadius: '12px', fontSize: '13px', color: '#cc0000', margin: '12px 0' }}>
                {error}
              </div>
            )}

            <button
              onClick={() => {
                if (!selectedActivity) { setError('Please pick what you\'re doing'); return }
                setError(null)
                handleCheckIn()
              }}
              disabled={checkinLoading || !selectedActivity}
              style={{ width: '100%', padding: '16px', background: selectedActivity ? '#0d0d0d' : '#e2e2d8', color: selectedActivity ? '#CAFF00' : '#999', fontSize: '16px', fontWeight: 700, border: 'none', borderRadius: '16px', cursor: selectedActivity ? 'pointer' : 'not-allowed', opacity: checkinLoading ? 0.7 : 1, marginTop: '16px' }}
            >
              {checkinLoading ? 'Checking in...' : '✅ Check in →'}
            </button>
          </div>
        )}

        {/* STEP 3 — Checked in */}
        {step === 'checkedin' && (
          <div>
            <div style={{ background: '#0d0d0d', borderRadius: '24px', padding: '20px', marginBottom: '16px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: '#CAFF00', opacity: 0.1 }} />
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#CAFF00', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>✅ Checked in</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>{selectedGym?.name}</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>{selectedActivity} · {getCurrentTime()}</div>
              <button
                onClick={() => router.push(`/gym-ai-match?gym_id=${selectedGym?.id}&gym_name=${encodeURIComponent(selectedGym?.name || '')}&gym_activity=${encodeURIComponent(selectedActivity)}`)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', background: '#CAFF00', color: '#0d0d0d', border: 'none', borderRadius: '100px', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}
              >
                ✨ AI pick my best match
              </button>
            </div>

            <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
              {loadingMatches ? 'Finding people here...' : `${matches.length} people at this gym now`}
            </div>

            {!loadingMatches && matches.length === 0 && (
              <div style={{ background: '#ffffff', borderRadius: '20px', padding: '32px', textAlign: 'center', border: '1.5px solid #e2e2d8' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
                <div style={{ fontFamily: 'sans-serif', fontSize: '16px', fontWeight: 800, color: '#0d0d0d', marginBottom: '8px' }}>You're the first here!</div>
                <div style={{ fontSize: '13px', color: '#5a5a5a', lineHeight: 1.6 }}>Share Strolly with gym friends so they can check in and find you.</div>
              </div>
            )}

            {matches.map(match => (
              <div
                key={match.id}
                onClick={() => router.push(`/chat/${match.id}`)}
                style={{ background: '#ffffff', borderRadius: '20px', padding: '14px 16px', marginBottom: '10px', border: '1.5px solid #e2e2d8', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                onMouseOver={e => e.currentTarget.style.borderColor = '#a8d900'}
                onMouseOut={e => e.currentTarget.style.borderColor = '#e2e2d8'}
              >
                <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '15px', color: '#0d0d0d', flexShrink: 0, border: '2px solid #0d0d0d' }}>
                  {match.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#0d0d0d' }}>{match.full_name}</div>
                  <div style={{ fontSize: '12px', color: '#5a5a5a', marginTop: '3px' }}>{match.current_gym_activity || 'At the gym'}</div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                    <span style={{ padding: '2px 8px', background: '#CAFF00', borderRadius: '100px', fontSize: '10px', fontWeight: 600, color: '#0d0d0d' }}>Here now</span>
                    {match.current_gym_activity === selectedActivity && (
                      <span style={{ padding: '2px 8px', background: '#0d0d0d', borderRadius: '100px', fontSize: '10px', fontWeight: 600, color: '#CAFF00' }}>Same activity</span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: '18px' }}>→</div>
              </div>
            ))}
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  )
}