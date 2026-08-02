'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const days = ['Today', 'Tomorrow', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const times = ['6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM']
const durations = ['30 min', '45 min', '1 hour', '1.5 hours', '2 hours', '2.5 hours', '3 hours']

const activities = [
  { id: 'gym', label: 'Gym', icon: '🏋️' },
  { id: 'jogging', label: 'Jogging', icon: '🏃' },
  { id: 'cycling', label: 'Cycling', icon: '🚴' },
  { id: 'football', label: 'Football', icon: '⚽' },
  { id: 'yoga', label: 'Yoga', icon: '🧘' },
  { id: 'swimming', label: 'Swimming', icon: '🏊' },
  { id: 'dog_walk', label: 'Dog walk', icon: '🐕' },
  { id: 'badminton', label: 'Badminton', icon: '🏸' },
  { id: 'tennis', label: 'Tennis', icon: '🎾' },
]

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

interface Gym {
  id: string
  name: string
  city: string
  is_verified: boolean
}

export default function SchedulePage() {
  const router = useRouter()
  const [selectedActivity, setSelectedActivity] = useState('')
  const [selectedDay, setSelectedDay] = useState('Today')
  const [availableFrom, setAvailableFrom] = useState('')
  const [availableUntil, setAvailableUntil] = useState('')
  const [selectedDuration, setSelectedDuration] = useState('1 hour')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Gym specific
  const [gymSearchQuery, setGymSearchQuery] = useState('')
  const [gymSearchResults, setGymSearchResults] = useState<Gym[]>([])
  const [gymSearching, setGymSearching] = useState(false)
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null)
  const [selectedGymActivity, setSelectedGymActivity] = useState('')
  const [openCategory, setOpenCategory] = useState<string | null>(null)
  const [addingGym, setAddingGym] = useState(false)

  const isGym = selectedActivity === 'gym'

  async function searchGyms(query: string) {
    setGymSearchQuery(query)
    if (query.length < 2) { setGymSearchResults([]); return }
    setGymSearching(true)

    const supabase = createClient()
    const { data } = await supabase
      .from('gyms')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(8)

    if (data) setGymSearchResults(data)
    setGymSearching(false)
  }

  async function addNewGym() {
    if (!gymSearchQuery.trim() || addingGym) return
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
        name: gymSearchQuery.trim(),
        city: profile?.city || '',
        created_by: user.id,
        is_verified: false,
      })
      .select()
      .single()

    if (newGym) setSelectedGym(newGym)
    setAddingGym(false)
  }

  async function handleFindMatches() {
    if (!selectedActivity) { setError('Please pick an activity'); return }
    if (!availableFrom || !availableUntil) { setError('Please set your availability window'); return }
    if (isGym && !selectedGym) { setError('Please select your gym'); return }
    if (isGym && !selectedGymActivity) { setError('Please pick what you\'re doing at the gym'); return }
    if (times.indexOf(availableFrom) >= times.indexOf(availableUntil)) {
      setError('Available until must be after available from')
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    await supabase
      .from('profiles')
      .update({
        current_activity: selectedActivity,
        available_date: selectedDay,
        available_from: availableFrom,
        available_until: availableUntil,
        available_time: availableFrom,
        available_duration: selectedDuration,
        is_available: true,
        updated_at: new Date().toISOString(),
        // Gym specific fields
        ...(isGym && {
          current_gym_id: selectedGym?.id,
          current_gym_name: selectedGym?.name,
          current_gym_activity: selectedGymActivity,
          gym_checked_in: false,
        }),
      })
      .eq('id', user.id)

    if (isGym) {
      router.push(`/nearby?activity=gym&day=${selectedDay}&from=${encodeURIComponent(availableFrom)}&until=${encodeURIComponent(availableUntil)}&duration=${encodeURIComponent(selectedDuration)}&gym_id=${selectedGym?.id}&gym_name=${encodeURIComponent(selectedGym?.name || '')}&gym_activity=${encodeURIComponent(selectedGymActivity)}`)
    } else {
      router.push(`/nearby?activity=${selectedActivity}&day=${selectedDay}&from=${encodeURIComponent(availableFrom)}&until=${encodeURIComponent(availableUntil)}&duration=${encodeURIComponent(selectedDuration)}`)
    }
  }

  const selectedActivityData = activities.find(a => a.id === selectedActivity)

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0' }}>

      {/* Header */}
      <div style={{ padding: '56px 24px 20px', display: 'flex', alignItems: 'center', gap: '14px', background: '#ffffff', borderBottom: '1px solid #e2e2d8' }}>
        <button
          onClick={() => router.push('/home')}
          style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f5f5f0', border: 'none', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          ←
        </button>
        <div>
          <div style={{ fontFamily: 'sans-serif', fontSize: '20px', fontWeight: 800, color: '#0d0d0d', letterSpacing: '-0.5px' }}>
            Let's go out
          </div>
          <div style={{ fontSize: '12px', color: '#5a5a5a', marginTop: '2px' }}>
            Set your availability window
          </div>
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: '480px', margin: '0 auto' }}>

        {/* Activity picker */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
            I want to do
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {activities.map(a => (
              <button
                key={a.id}
                onClick={() => {
                  setSelectedActivity(a.id)
                  setError(null)
                  if (a.id !== 'gym') {
                    setSelectedGym(null)
                    setSelectedGymActivity('')
                    setGymSearchQuery('')
                    setGymSearchResults([])
                  }
                }}
                style={{
                  padding: '10px 16px',
                  background: selectedActivity === a.id ? '#CAFF00' : '#ffffff',
                  border: `2px solid ${selectedActivity === a.id ? '#a8d900' : '#e2e2d8'}`,
                  borderRadius: '100px',
                  fontSize: '13px',
                  fontWeight: selectedActivity === a.id ? 700 : 500,
                  color: '#0d0d0d',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s',
                }}
              >
                {a.icon} {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* GYM SPECIFIC — Gym picker */}
        {isGym && (
          <div style={{ marginBottom: '28px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
              Which gym?
            </div>

            {selectedGym ? (
              <div style={{ background: '#0d0d0d', borderRadius: '16px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ fontSize: '24px' }}>🏋️</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>{selectedGym.name}</div>
                  {selectedGym.city && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{selectedGym.city}</div>}
                </div>
                <button
                  onClick={() => { setSelectedGym(null); setGymSearchQuery(''); setGymSearchResults([]) }}
                  style={{ fontSize: '12px', color: '#CAFF00', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={gymSearchQuery}
                  onChange={e => searchGyms(e.target.value)}
                  placeholder="Search gym e.g. GoodLife, Planet Fitness..."
                  style={{ width: '100%', padding: '14px 16px', background: '#ffffff', border: '1.5px solid #e2e2d8', borderRadius: '14px', fontSize: '15px', color: '#0d0d0d', outline: 'none', marginBottom: '8px' }}
                  onFocus={e => e.target.style.borderColor = '#a8d900'}
                  onBlur={e => e.target.style.borderColor = '#e2e2d8'}
                />

                {gymSearching && (
                  <div style={{ fontSize: '13px', color: '#5a5a5a', padding: '8px' }}>Searching...</div>
                )}

                {gymSearchResults.length > 0 && (
                  <div style={{ background: '#ffffff', borderRadius: '14px', border: '1.5px solid #e2e2d8', overflow: 'hidden', marginBottom: '8px' }}>
                    {gymSearchResults.map((gym, index) => (
                      <div
                        key={gym.id}
                        onClick={() => { setSelectedGym(gym); setGymSearchResults([]) }}
                        style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: index < gymSearchResults.length - 1 ? '1px solid #e2e2d8' : 'none', cursor: 'pointer' }}
                        onMouseOver={e => e.currentTarget.style.background = '#f5f5f0'}
                        onMouseOut={e => e.currentTarget.style.background = '#ffffff'}
                      >
                        <div style={{ fontSize: '20px' }}>🏋️</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0d0d0d' }}>{gym.name}</div>
                          {gym.city && <div style={{ fontSize: '12px', color: '#5a5a5a' }}>{gym.city}</div>}
                        </div>
                        {gym.is_verified && (
                          <span style={{ padding: '2px 8px', background: '#f0ffe0', borderRadius: '100px', fontSize: '10px', fontWeight: 600, color: '#2d6a00', border: '1px solid #a8d900' }}>✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {gymSearchQuery.length >= 2 && !gymSearching && (
                  <div
                    onClick={addNewGym}
                    style={{ background: '#ffffff', borderRadius: '14px', border: '1.5px dashed #e2e2d8', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                    onMouseOver={e => e.currentTarget.style.borderColor = '#a8d900'}
                    onMouseOut={e => e.currentTarget.style.borderColor = '#e2e2d8'}
                  >
                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>+</div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0d0d0d' }}>Add "{gymSearchQuery}"</div>
                      <div style={{ fontSize: '12px', color: '#5a5a5a' }}>Add this gym to Strolly</div>
                    </div>
                    {addingGym && <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#5a5a5a' }}>Adding...</div>}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* GYM SPECIFIC — Gym activity picker */}
        {isGym && selectedGym && (
          <div style={{ marginBottom: '28px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
              What are you doing?
            </div>

            {selectedGymActivity && (
              <div style={{ background: '#f0ffe0', border: '1.5px solid #a8d900', borderRadius: '14px', padding: '12px 16px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0d0d0d' }}>{selectedGymActivity}</div>
                <button onClick={() => setSelectedGymActivity('')} style={{ fontSize: '12px', color: '#cc0000', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Change</button>
              </div>
            )}

            {gymActivityCategories.map(cat => (
              <div key={cat.category} style={{ marginBottom: '6px' }}>
                <div
                  onClick={() => setOpenCategory(openCategory === cat.category ? null : cat.category)}
                  style={{ background: '#ffffff', borderRadius: openCategory === cat.category ? '14px 14px 0 0' : '14px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', border: '1.5px solid', borderColor: openCategory === cat.category ? '#a8d900' : '#e2e2d8', borderBottom: openCategory === cat.category ? 'none' : '1.5px solid #e2e2d8' }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0d0d0d' }}>{cat.category}</div>
                  <div style={{ transform: openCategory === cat.category ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', fontSize: '14px', color: '#5a5a5a' }}>↓</div>
                </div>
                {openCategory === cat.category && (
                  <div style={{ background: '#ffffff', border: '1.5px solid #a8d900', borderTop: 'none', borderRadius: '0 0 14px 14px', overflow: 'hidden' }}>
                    {cat.activities.map((activity, index) => (
                      <div
                        key={activity}
                        onClick={() => { setSelectedGymActivity(activity); setOpenCategory(null) }}
                        style={{ padding: '10px 16px', fontSize: '13px', color: '#0d0d0d', background: selectedGymActivity === activity ? '#CAFF00' : index % 2 === 0 ? '#ffffff' : '#fafafa', cursor: 'pointer', borderBottom: index < cat.activities.length - 1 ? '1px solid #f0f0f0' : 'none', fontWeight: selectedGymActivity === activity ? 700 : 400, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                        onMouseOver={e => { if (selectedGymActivity !== activity) e.currentTarget.style.background = '#f5f5f0' }}
                        onMouseOut={e => { if (selectedGymActivity !== activity) e.currentTarget.style.background = index % 2 === 0 ? '#ffffff' : '#fafafa' }}
                      >
                        {activity}
                        {selectedGymActivity === activity && <span>✓</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Day picker */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>Day</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {days.map(day => (
              <button key={day} onClick={() => setSelectedDay(day)} style={{ padding: '10px 16px', background: selectedDay === day ? '#0d0d0d' : '#ffffff', border: `2px solid ${selectedDay === day ? '#0d0d0d' : '#e2e2d8'}`, borderRadius: '100px', fontSize: '13px', fontWeight: selectedDay === day ? 700 : 500, color: selectedDay === day ? '#CAFF00' : '#0d0d0d', cursor: 'pointer', transition: 'all 0.15s' }}>
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Time range */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>Available from</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {times.map(time => (
              <button key={time} onClick={() => setAvailableFrom(time)} style={{ padding: '8px 14px', background: availableFrom === time ? '#0d0d0d' : '#ffffff', border: `2px solid ${availableFrom === time ? '#0d0d0d' : '#e2e2d8'}`, borderRadius: '100px', fontSize: '12px', fontWeight: availableFrom === time ? 700 : 500, color: availableFrom === time ? '#CAFF00' : '#0d0d0d', cursor: 'pointer', transition: 'all 0.15s' }}>
                {time}
              </button>
            ))}
          </div>

          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>Available until</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {times.map(time => (
              <button key={time} onClick={() => setAvailableUntil(time)} style={{ padding: '8px 14px', background: availableUntil === time ? '#CAFF00' : '#ffffff', border: `2px solid ${availableUntil === time ? '#a8d900' : '#e2e2d8'}`, borderRadius: '100px', fontSize: '12px', fontWeight: availableUntil === time ? 700 : 500, color: '#0d0d0d', cursor: 'pointer', transition: 'all 0.15s' }}>
                {time}
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>Session duration</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {durations.map(dur => (
              <button key={dur} onClick={() => setSelectedDuration(dur)} style={{ padding: '10px 16px', background: selectedDuration === dur ? '#0d0d0d' : '#ffffff', border: `2px solid ${selectedDuration === dur ? '#0d0d0d' : '#e2e2d8'}`, borderRadius: '100px', fontSize: '13px', fontWeight: selectedDuration === dur ? 700 : 500, color: selectedDuration === dur ? '#CAFF00' : '#0d0d0d', cursor: 'pointer', transition: 'all 0.15s' }}>
                {dur}
              </button>
            ))}
          </div>
        </div>

        {/* Summary card */}
        {selectedActivity && availableFrom && availableUntil && (
          <div style={{ background: '#0d0d0d', borderRadius: '24px', padding: '24px', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#CAFF00', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Your session
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px', marginBottom: '6px' }}>
              {selectedActivityData?.icon} {selectedActivityData?.label}
              {isGym && selectedGym && ` · ${selectedGym.name}`}
            </div>
            {isGym && selectedGymActivity && (
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>
                {selectedGymActivity}
              </div>
            )}
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
              {selectedDay} · {availableFrom} → {availableUntil} · {selectedDuration}
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding: '12px 16px', background: '#fff0f0', border: '1.5px solid #ffcccc', borderRadius: '12px', fontSize: '13px', color: '#cc0000', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleFindMatches}
          disabled={loading || !selectedActivity || !availableFrom || !availableUntil}
          style={{ width: '100%', padding: '18px', background: selectedActivity && availableFrom && availableUntil ? '#CAFF00' : '#e2e2d8', color: selectedActivity && availableFrom && availableUntil ? '#0d0d0d' : '#999', fontSize: '16px', fontWeight: 700, border: 'none', borderRadius: '16px', cursor: selectedActivity && availableFrom && availableUntil ? 'pointer' : 'not-allowed', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Finding matches…' : 'Find matches →'}
        </button>

      </div>
    </div>
  )
}