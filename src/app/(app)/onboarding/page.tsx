'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const activities = [
  { id: 'gym', label: 'Gym', icon: '🏋️' },
  { id: 'jogging', label: 'Jogging', icon: '🏃' },
  { id: 'cycling', label: 'Cycling', icon: '🚴' },
  { id: 'football', label: 'Football', icon: '⚽' },
  { id: 'yoga', label: 'Yoga', icon: '🧘' },
  { id: 'swimming', label: 'Swimming', icon: '🏊' },
  { id: 'dog_walk', label: 'Dog walk', icon: '🐕' },
  { id: 'badminton', label: 'Badminton', icon: '🏸' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [city, setCity] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleActivity(id: string) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  async function handleFinish() {
    if (!city.trim()) {
      setError('Please enter your city')
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
        activities: selected,
        city: city.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/home')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', padding: '40px 24px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontFamily: 'sans-serif', fontSize: '32px', fontWeight: 800, letterSpacing: '-2px', color: '#0d0d0d' }}>
            Str<span style={{ background: '#0d0d0d', color: '#CAFF00', padding: '2px 10px', borderRadius: '8px', marginLeft: '2px' }}>olly</span>
          </div>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
          <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: step >= 1 ? '#0d0d0d' : '#e2e2d8' }}></div>
          <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: step >= 2 ? '#0d0d0d' : '#e2e2d8' }}></div>
        </div>

        {step === 1 && (
          <div>
            <div style={{ fontFamily: 'sans-serif', fontSize: '26px', fontWeight: 800, color: '#0d0d0d', marginBottom: '8px', letterSpacing: '-0.5px' }}>
              What do you like to do?
            </div>
            <div style={{ fontSize: '14px', color: '#5a5a5a', marginBottom: '24px' }}>
              Pick all that apply — we'll find matches nearby.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              {activities.map(a => (
                <div
                  key={a.id}
                  onClick={() => toggleActivity(a.id)}
                  style={{
                    background: selected.includes(a.id) ? '#CAFF00' : '#ffffff',
                    border: `2px solid ${selected.includes(a.id) ? '#a8d900' : '#e2e2d8'}`,
                    borderRadius: '20px',
                    padding: '20px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    position: 'relative',
                  }}
                >
                  {selected.includes(a.id) && (
                    <div style={{ position: 'absolute', top: '12px', right: '12px', width: '20px', height: '20px', background: '#0d0d0d', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#CAFF00' }}>✓</div>
                  )}
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>{a.icon}</div>
                  <div style={{ fontFamily: 'sans-serif', fontSize: '14px', fontWeight: 700, color: '#0d0d0d' }}>{a.label}</div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={selected.length === 0}
              style={{ width: '100%', padding: '16px', background: selected.length > 0 ? '#0d0d0d' : '#e2e2d8', color: selected.length > 0 ? '#CAFF00' : '#999', fontFamily: 'sans-serif', fontSize: '16px', fontWeight: 700, border: 'none', borderRadius: '16px', cursor: selected.length > 0 ? 'pointer' : 'not-allowed' }}
            >
              Continue →
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ fontFamily: 'sans-serif', fontSize: '26px', fontWeight: 800, color: '#0d0d0d', marginBottom: '8px', letterSpacing: '-0.5px' }}>
              Where are you based?
            </div>
            <div style={{ fontSize: '14px', color: '#5a5a5a', marginBottom: '24px' }}>
              We'll find fitness partners in your city.
            </div>
            <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1.5px solid #e2e2d8', marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                Your city
              </label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="e.g. Regina, London, Toronto"
                style={{ width: '100%', padding: '14px 16px', background: '#f5f5f0', border: '1.5px solid #e2e2d8', borderRadius: '14px', fontSize: '15px', color: '#0d0d0d', outline: 'none' }}
              />
            </div>

            {/* Selected activities summary */}
            <div style={{ background: '#f0ffe0', borderRadius: '16px', padding: '16px', border: '1.5px solid #a8d900', marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#5a5a5a', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your activities</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {selected.map(id => {
                  const a = activities.find(x => x.id === id)
                  return (
                    <span key={id} style={{ padding: '4px 12px', background: '#CAFF00', borderRadius: '100px', fontSize: '12px', fontWeight: 600, color: '#0d0d0d' }}>
                      {a?.icon} {a?.label}
                    </span>
                  )
                })}
              </div>
            </div>

            {error && (
              <div style={{ padding: '12px 16px', background: '#fff0f0', border: '1.5px solid #ffcccc', borderRadius: '12px', fontSize: '13px', color: '#cc0000', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setStep(1)}
                style={{ padding: '16px 20px', background: 'transparent', border: '1.5px solid #e2e2d8', borderRadius: '16px', fontSize: '15px', fontWeight: 600, color: '#0d0d0d', cursor: 'pointer' }}
              >
                ← Back
              </button>
              <button
                onClick={handleFinish}
                disabled={loading}
                style={{ flex: 1, padding: '16px', background: '#CAFF00', color: '#0d0d0d', fontFamily: 'sans-serif', fontSize: '16px', fontWeight: 700, border: 'none', borderRadius: '16px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Saving…' : "Let's go →"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}