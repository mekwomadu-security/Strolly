'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const days = ['Today', 'Tomorrow', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const times = [
  '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM',
  '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM',
  '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'
]

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

export default function SchedulePage() {
  const router = useRouter()
  const [selectedActivity, setSelectedActivity] = useState('')
  const [selectedDay, setSelectedDay] = useState('Today')
  const [availableFrom, setAvailableFrom] = useState('')
  const [availableUntil, setAvailableUntil] = useState('')
  const [selectedDuration, setSelectedDuration] = useState('1 hour')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFindMatches() {
    if (!selectedActivity) {
      setError('Please pick an activity')
      return
    }
    if (!availableFrom || !availableUntil) {
      setError('Please set your availability window')
      return
    }
    if (times.indexOf(availableFrom) >= times.indexOf(availableUntil)) {
      setError('Available until must be after available from')
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { error } = await supabase
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
      })
      .eq('id', user.id)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(`/nearby?activity=${selectedActivity}&day=${selectedDay}&from=${encodeURIComponent(availableFrom)}&until=${encodeURIComponent(availableUntil)}&duration=${encodeURIComponent(selectedDuration)}`)
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
                onClick={() => setSelectedActivity(a.id)}
                style={{
                  padding: '10px 16px',
                  background: selectedActivity === a.id ? '#CAFF00' : '#ffffff',
                  border: `2px solid ${selectedActivity === a.id ? '#a8d900' : '#e2e2d8'}`,
                  borderRadius: '100px',
                  fontSize: '13px',
                  fontWeight: selectedActivity === a.id ? 700 : 500,
                  color: '#0d0d0d',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {a.icon} {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Day picker */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Day
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {days.map(day => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                style={{
                  padding: '10px 16px',
                  background: selectedDay === day ? '#0d0d0d' : '#ffffff',
                  border: `2px solid ${selectedDay === day ? '#0d0d0d' : '#e2e2d8'}`,
                  borderRadius: '100px',
                  fontSize: '13px',
                  fontWeight: selectedDay === day ? 700 : 500,
                  color: selectedDay === day ? '#CAFF00' : '#0d0d0d',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Time range picker */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Available from
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {times.map(time => (
              <button
                key={time}
                onClick={() => setAvailableFrom(time)}
                style={{
                  padding: '8px 14px',
                  background: availableFrom === time ? '#0d0d0d' : '#ffffff',
                  border: `2px solid ${availableFrom === time ? '#0d0d0d' : '#e2e2d8'}`,
                  borderRadius: '100px',
                  fontSize: '12px',
                  fontWeight: availableFrom === time ? 700 : 500,
                  color: availableFrom === time ? '#CAFF00' : '#0d0d0d',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {time}
              </button>
            ))}
          </div>

          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Available until
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {times.map(time => (
              <button
                key={time}
                onClick={() => setAvailableUntil(time)}
                style={{
                  padding: '8px 14px',
                  background: availableUntil === time ? '#CAFF00' : '#ffffff',
                  border: `2px solid ${availableUntil === time ? '#a8d900' : '#e2e2d8'}`,
                  borderRadius: '100px',
                  fontSize: '12px',
                  fontWeight: availableUntil === time ? 700 : 500,
                  color: '#0d0d0d',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Session duration
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {durations.map(dur => (
              <button
                key={dur}
                onClick={() => setSelectedDuration(dur)}
                style={{
                  padding: '10px 16px',
                  background: selectedDuration === dur ? '#0d0d0d' : '#ffffff',
                  border: `2px solid ${selectedDuration === dur ? '#0d0d0d' : '#e2e2d8'}`,
                  borderRadius: '100px',
                  fontSize: '13px',
                  fontWeight: selectedDuration === dur ? 700 : 500,
                  color: selectedDuration === dur ? '#CAFF00' : '#0d0d0d',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {dur}
              </button>
            ))}
          </div>
        </div>

        {/* Summary card */}
        {selectedActivity && availableFrom && availableUntil && (
          <div style={{ background: '#0d0d0d', borderRadius: '24px', padding: '24px', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#CAFF00', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Your availability window
            </div>
            <div style={{ fontFamily: 'sans-serif', fontSize: '22px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px', marginBottom: '6px' }}>
              {selectedActivityData?.icon} {selectedActivityData?.label}
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
              {selectedDay} · {availableFrom} → {availableUntil}
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
              Session: {selectedDuration}
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding: '12px 16px', background: '#fff0f0', border: '1.5px solid #ffcccc', borderRadius: '12px', fontSize: '13px', color: '#cc0000', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* Find matches button */}
        <button
          onClick={handleFindMatches}
          disabled={loading || !selectedActivity || !availableFrom || !availableUntil}
          style={{
            width: '100%',
            padding: '18px',
            background: selectedActivity && availableFrom && availableUntil ? '#CAFF00' : '#e2e2d8',
            color: selectedActivity && availableFrom && availableUntil ? '#0d0d0d' : '#999',
            fontFamily: 'sans-serif',
            fontSize: '16px',
            fontWeight: 700,
            border: 'none',
            borderRadius: '16px',
            cursor: selectedActivity && availableFrom && availableUntil ? 'pointer' : 'not-allowed',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Finding matches…' : 'Find matches →'}
        </button>

      </div>
    </div>
  )
}