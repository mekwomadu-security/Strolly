'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'

const days = ['Today', 'Tomorrow', 'In 2 days', 'In 3 days', 'In 4 days', 'In 5 days', 'In 6 days']

const outdoorActivities = [
  'jogging', 'cycling', 'football', 'yoga', 'swimming' ,
  'dog_walk', 'badminton', 'tennis','Golfing',
]

const gymActivities = [
  { category: 'Cardio', options: ['Treadmill', 'Elliptical', 'Cycling', 'Rowing', 'Stairmaster', 'Jump rope', 'HIIT cardio'] },
  { category: 'Strength', options: ['Bench press', 'Squat', 'Deadlift', 'Pull ups', 'Push ups', 'Shoulder press', 'Bicep curls', 'Tricep dips', 'Lat pulldown', 'Cable rows'] },
  { category: 'Classes', options: ['Yoga', 'Pilates', 'Zumba', 'Spin class', 'Boxing', 'CrossFit', 'Body pump', 'Aerobics'] },
  { category: 'Functional', options: ['Kettlebell', 'Battle ropes', 'TRX', 'Resistance bands', 'Foam rolling', 'Stretching'] },
  { category: 'Sports', options: ['Basketball', 'Volleyball', 'Badminton', 'Table tennis', 'Swimming'] },
]

function getDateFromDay(day: string): string {
  const today = new Date()
  switch (day) {
    case 'Today': return today.toISOString().split('T')[0]
    case 'Tomorrow': return new Date(today.getTime() + 86400000).toISOString().split('T')[0]
    case 'In 2 days': return new Date(today.getTime() + 2 * 86400000).toISOString().split('T')[0]
    case 'In 3 days': return new Date(today.getTime() + 3 * 86400000).toISOString().split('T')[0]
    case 'In 4 days': return new Date(today.getTime() + 4 * 86400000).toISOString().split('T')[0]
    case 'In 5 days': return new Date(today.getTime() + 5 * 86400000).toISOString().split('T')[0]
    case 'In 6 days': return new Date(today.getTime() + 6 * 86400000).toISOString().split('T')[0]
    default: return today.toISOString().split('T')[0]
  }
}

export default function SchedulePage() {
  const router = useRouter()
  const [selectedActivity, setSelectedActivity] = useState('')
  const [selectedDay, setSelectedDay] = useState('Today')
  const [availableFrom, setAvailableFrom] = useState('06:00')
  const [availableUntil, setAvailableUntil] = useState('22:00')
  const [duration, setDuration] = useState('1 hour')
  const [isGym, setIsGym] = useState(false)
  const [selectedGym, setSelectedGym] = useState('')
  const [gymSearch, setGymSearch] = useState('')
  const [gyms, setGyms] = useState<any[]>([])
  const [selectedGymActivity, setSelectedGymActivity] = useState('')
  const [selectedGymCategory, setSelectedGymCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const [userActivities, setUserActivities] = useState<string[]>([])

  useEffect(() => {
    fetchUserActivities()
  }, [])

  async function fetchUserActivities() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('activities')
      .eq('id', user.id)
      .single()
    if (data) setUserActivities(data.activities || [])
  }

  async function searchGyms(query: string) {
    if (!query) { setGyms([]); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('gyms')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(5)
    if (data) setGyms(data)
  }

  async function handleFindMatches() {
    if (!selectedActivity) return
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const realDate = getDateFromDay(selectedDay)

    const updateData: any = {
      current_activity: selectedActivity,
      available_date: realDate,
      available_from: availableFrom,
      available_until: availableUntil,
      available_duration: duration,
      is_available: true,
    }

    if (isGym && selectedGym) {
      updateData.current_gym_id = selectedGym
      updateData.current_gym_activity = selectedGymActivity
    }

    await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)

    setLoading(false)
    router.push('/nearby')
  }

  const displayActivities = userActivities.length > 0
    ? outdoorActivities.filter(a => userActivities.includes(a))
    : outdoorActivities

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ padding: '52px 24px 20px', background: '#ffffff', borderBottom: '1px solid #e2e2d8', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          onClick={() => router.back()}
          style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f5f5f0', border: 'none', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          ←
        </button>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0d0d0d', letterSpacing: '-0.5px' }}>Schedule a session</div>
          <div style={{ fontSize: '13px', color: '#5a5a5a', marginTop: '2px' }}>Set your availability to find matches</div>
        </div>
      </div>

      <div style={{ padding: '20px 24px', maxWidth: '480px', margin: '0 auto' }}>

        {/* Activity picker */}
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '18px', border: '1.5px solid #e2e2d8', marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
            What activity?
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {displayActivities.map(a => (
              <button
                key={a}
                onClick={() => { setSelectedActivity(a); setIsGym(false) }}
                style={{
                  padding: '8px 14px',
                  background: selectedActivity === a && !isGym ? '#CAFF00' : '#f5f5f0',
                  border: `1.5px solid ${selectedActivity === a && !isGym ? '#a8d900' : '#e2e2d8'}`,
                  borderRadius: '100px',
                  fontSize: '13px',
                  fontWeight: selectedActivity === a && !isGym ? 700 : 500,
                  color: '#0d0d0d',
                  cursor: 'pointer',
                }}
              >
                {a.replace(/_/g, ' ')}
              </button>
            ))}
            <button
              onClick={() => { setIsGym(true); setSelectedActivity('gym') }}
              style={{
                padding: '8px 14px',
                background: isGym ? '#CAFF00' : '#f5f5f0',
                border: `1.5px solid ${isGym ? '#a8d900' : '#e2e2d8'}`,
                borderRadius: '100px',
                fontSize: '13px',
                fontWeight: isGym ? 700 : 500,
                color: '#0d0d0d',
                cursor: 'pointer',
              }}
            >
              🏋️ Gym
            </button>
          </div>
        </div>

        {/* Gym search */}
        {isGym && (
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '18px', border: '1.5px solid #e2e2d8', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
              Which gym?
            </div>
            <input
              type="text"
              value={gymSearch}
              onChange={e => { setGymSearch(e.target.value); searchGyms(e.target.value) }}
              placeholder="Search your gym..."
              style={{ width: '100%', padding: '12px 14px', background: '#f5f5f0', border: '1.5px solid #e2e2d8', borderRadius: '12px', fontSize: '14px', color: '#0d0d0d', outline: 'none', marginBottom: '8px' }}
            />
            {gyms.map(gym => (
              <div
                key={gym.id}
                onClick={() => { setSelectedGym(gym.id); setGymSearch(gym.name); setGyms([]) }}
                style={{ padding: '10px 14px', background: selectedGym === gym.id ? '#CAFF00' : '#f5f5f0', borderRadius: '10px', cursor: 'pointer', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}
              >
                {gym.name}
              </div>
            ))}

            {selectedGym && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  What will you do?
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {gymActivities.map(cat => (
                    <button
                      key={cat.category}
                      onClick={() => setSelectedGymCategory(cat.category)}
                      style={{
                        padding: '6px 12px',
                        background: selectedGymCategory === cat.category ? '#0d0d0d' : '#f5f5f0',
                        color: selectedGymCategory === cat.category ? '#CAFF00' : '#0d0d0d',
                        border: 'none', borderRadius: '100px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {cat.category}
                    </button>
                  ))}
                </div>
                {selectedGymCategory && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {gymActivities.find(c => c.category === selectedGymCategory)?.options.map(opt => (
                      <button
                        key={opt}
                        onClick={() => setSelectedGymActivity(opt)}
                        style={{
                          padding: '6px 12px',
                          background: selectedGymActivity === opt ? '#CAFF00' : '#f5f5f0',
                          border: `1.5px solid ${selectedGymActivity === opt ? '#a8d900' : '#e2e2d8'}`,
                          borderRadius: '100px', fontSize: '12px', fontWeight: selectedGymActivity === opt ? 700 : 500,
                          color: '#0d0d0d', cursor: 'pointer',
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Day picker */}
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '18px', border: '1.5px solid #e2e2d8', marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Which day?
          </div>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {days.map(day => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                style={{
                  flexShrink: 0,
                  padding: '8px 16px',
                  background: selectedDay === day ? '#0d0d0d' : '#f5f5f0',
                  color: selectedDay === day ? '#CAFF00' : '#0d0d0d',
                  border: 'none', borderRadius: '100px',
                  fontSize: '13px', fontWeight: selectedDay === day ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                {day}
              </button>
            ))}
          </div>
          <div style={{ fontSize: '11px', color: '#5a5a5a', marginTop: '8px' }}>
            📅 {getDateFromDay(selectedDay)}
          </div>
        </div>

        {/* Time range */}
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '18px', border: '1.5px solid #e2e2d8', marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
            What time?
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: '#5a5a5a', display: 'block', marginBottom: '6px' }}>From</label>
              <input
                type="time"
                value={availableFrom}
                onChange={e => setAvailableFrom(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', background: 'rgb(245, 245, 240)', border: '1.5px solid #e2e2d8', borderRadius: '12px', fontSize: '14px', color: '#0d0d0d', outline: 'none' }}
              />
            </div>
            <div style={{ fontSize: '14px', color: '#5a5a5a', marginTop: '20px' }}>→</div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: '#5a5a5a', display: 'block', marginBottom: '6px' }}>Until</label>
              <input
                type="time"
                value={availableUntil}
                onChange={e => setAvailableUntil(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', background: '#f5f5f0', border: '1.5px solid #e2e2d8', borderRadius: '12px', fontSize: '14px', color: '#0d0d0d', outline: 'none' }}
              />
            </div>
          </div>
        </div>

        {/* Duration */}
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '18px', border: '1.5px solid #e2e2d8', marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
            How long?
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['30 mins', '1 hour', '1.5 hours', '2 hours', '2.5 hours', '3 hours', '4 hours', '5 hours'].map(d => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                style={{
                  padding: '8px 14px',
                  background: duration === d ? '#CAFF00' : '#f5f5f0',
                  border: `1.5px solid ${duration === d ? '#a8d900' : '#e2e2d8'}`,
                  borderRadius: '100px', fontSize: '13px',
                  fontWeight: duration === d ? 700 : 500,
                  color: '#0d0d0d', cursor: 'pointer',
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Find matches button */}
        <button
          onClick={handleFindMatches}
          disabled={!selectedActivity || loading}
          style={{
            width: '100%', padding: '16px',
            background: selectedActivity ? '#0d0d0d' : '#e2e2d8',
            color: selectedActivity ? '#CAFF00' : '#5a5a5a',
            border: 'none', borderRadius: '16px',
            fontSize: '16px', fontWeight: 700,
            cursor: selectedActivity ? 'pointer' : 'not-allowed',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Setting availability...' : 'Find matches →'}
        </button>

      </div>

      <BottomNav />
    </div>
  )
}