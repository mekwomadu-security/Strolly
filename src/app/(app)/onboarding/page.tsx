'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ACTIVITIES = [
  { id: 'gym',           label: 'Gym',             icon: '🏋️', cat: 'Gym & Fitness' },
  { id: 'crossfit',      label: 'CrossFit',         icon: '🔥', cat: 'Gym & Fitness' },
  { id: 'powerlifting',  label: 'Powerlifting',     icon: '🏋️', cat: 'Gym & Fitness' },
  { id: 'yoga',          label: 'Yoga',             icon: '🧘', cat: 'Gym & Fitness' },
  { id: 'pilates',       label: 'Pilates',          icon: '🤸', cat: 'Gym & Fitness' },
  { id: 'boxing',        label: 'Boxing',           icon: '🥊', cat: 'Gym & Fitness' },
  { id: 'mma',           label: 'MMA',              icon: '🥋', cat: 'Gym & Fitness' },
  { id: 'jogging',       label: 'Jogging',          icon: '🏃', cat: 'Outdoor' },
  { id: 'trail_running', label: 'Trail running',    icon: '🌲', cat: 'Outdoor' },
  { id: 'cycling',       label: 'Cycling',          icon: '🚴', cat: 'Outdoor' },
  { id: 'mtb',           label: 'Mountain biking',  icon: '⛰️', cat: 'Outdoor' },
  { id: 'hiking',        label: 'Hiking',           icon: '🥾', cat: 'Outdoor' },
  { id: 'rock_climbing', label: 'Rock climbing',    icon: '🧗', cat: 'Outdoor' },
  { id: 'dog_walk',      label: 'Dog walk',         icon: '🐕', cat: 'Outdoor' },
  { id: 'skateboarding', label: 'Skateboarding',    icon: '🛹', cat: 'Outdoor' },
  { id: 'football',      label: 'Football',         icon: '⚽', cat: 'Team Sports' },
  { id: 'basketball',    label: 'Basketball',       icon: '🏀', cat: 'Team Sports' },
  { id: 'volleyball',    label: 'Volleyball',       icon: '🏐', cat: 'Team Sports' },
  { id: 'rugby',         label: 'Rugby',            icon: '🏉', cat: 'Team Sports' },
  { id: 'cricket',       label: 'Cricket',          icon: '🏏', cat: 'Team Sports' },
  { id: 'basketball',    label: 'Basketball',       icon: '🏀', cat: 'Team Sports' },
  { id: 'hockey',        label: 'Hockey',           icon: '🏒', cat: 'Team Sports' },
  { id: 'tennis',        label: 'Tennis',           icon: '🎾', cat: 'Racket Sports' },
  { id: 'badminton',     label: 'Badminton',        icon: '🏸', cat: 'Racket Sports' },
  { id: 'squash',        label: 'Squash',           icon: '🎾', cat: 'Racket Sports' },
  { id: 'table_tennis',  label: 'Table tennis',     icon: '🏓', cat: 'Racket Sports' },
  { id: 'pickleball',    label: 'Pickleball',       icon: '🏓', cat: 'Racket Sports' },
  { id: 'padel',         label: 'Padel',            icon: '🎾', cat: 'Racket Sports' },
  { id: 'swimming',      label: 'Swimming',         icon: '🏊', cat: 'Water' },
  { id: 'surfing',       label: 'Surfing',          icon: '🏄', cat: 'Water' },
  { id: 'kayaking',      label: 'Kayaking',         icon: '🛶', cat: 'Water' },
  { id: 'paddleboard',   label: 'Paddleboarding',   icon: '🏄', cat: 'Water' },
  { id: 'golf',          label: 'Golf',             icon: '⛳', cat: 'Other' },
  { id: 'gymnastics',    label: 'Gymnastics',       icon: '🤸', cat: 'Other' },
  { id: 'dance',         label: 'Dance',            icon: '💃', cat: 'Other' },
  { id: 'martial_arts',  label: 'Martial arts',     icon: '🥋', cat: 'Other' },
  { id: 'snow_ski',      label: 'Skiing',           icon: '⛷️', cat: 'Winter' },
  { id: 'snowboard',     label: 'Snowboarding',     icon: '🏂', cat: 'Winter' },
  { id: 'ice_skating',   label: 'Ice skating',      icon: '⛸️', cat: 'Winter' },
]

const CAT_ORDER = ['Gym & Fitness', 'Outdoor', 'Team Sports', 'Racket Sports', 'Water', 'Winter', 'Other']

interface Activity {
  id: string
  label: string
  icon: string
  cat: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [allActivities, setAllActivities] = useState<Activity[]>(ACTIVITIES)
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleActivity(id: string) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  function removeSelected(id: string) {
    setSelected(prev => prev.filter(a => a !== id))
  }

  function addCustomActivity() {
    const label = search.trim()
    if (!label) return
    const id = 'custom_' + label.toLowerCase().replace(/\s+/g, '_')
    if (allActivities.find(a => a.id === id)) return
    const newActivity: Activity = { id, label, icon: '🏅', cat: 'Custom' }
    setAllActivities(prev => [...prev, newActivity])
    setSelected(prev => [...prev, id])
    setSearch('')
  }

  const q = search.toLowerCase().trim()

  const filteredBySearch = q
    ? allActivities.filter(a => a.label.toLowerCase().includes(q))
    : allActivities

  const exactMatch = allActivities.some(a => a.label.toLowerCase() === q)
  const showAddCustom = q.length >= 2 && !exactMatch

  const categories = [...CAT_ORDER, 'Custom'].filter(cat =>
    filteredBySearch.some(a => a.cat === cat)
  )

  async function handleFinish() {
    if (!city.trim()) { setError('Please enter your city'); return }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error: err } = await supabase
      .from('profiles')
      .update({
        activities: selected,
        city: city.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (err) { setError(err.message); setLoading(false); return }
    router.push('/home')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', display: 'flex', flexDirection: 'column' }}>
      <div style={{ maxWidth: '480px', width: '100%', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* ── STEP 1: Activity picker ── */}
        {step === 1 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

            {/* Dark header */}
            <div style={{ background: '#0d0d0d', padding: '52px 24px 16px' }}>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
                {[1,2].map(i => (
                  <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i <= step ? '#CAFF00' : 'rgba(255,255,255,0.15)' }} />
                ))}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#CAFF00', marginBottom: '8px' }}>
                Step 1 of 2
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px', marginBottom: '6px' }}>
                What do you like to do?
              </div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                Pick everything you're into — we'll find partners nearby for each one.
              </div>
            </div>

            {/* Search bar */}
            <div style={{ background: '#0d0d0d', padding: '12px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '10px 14px' }}>
                <span style={{ fontSize: '15px', opacity: 0.5 }}>🔍</span>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search 60+ sports & activities…"
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '15px', color: '#ffffff', fontWeight: 500 }}
                />
                {search && (
                  <button onClick={() => setSearch('')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', color: 'rgba(255,255,255,0.6)', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                )}
              </div>
            </div>

            {/* Selected tags strip */}
            <div style={{ background: '#f5f5f0', padding: '12px 24px 0' }}>
              {selected.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#9a9a90', paddingBottom: '4px' }}>Nothing selected yet</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                  {selected.map(id => {
                    const a = allActivities.find(x => x.id === id)
                    if (!a) return null
                    return (
                      <div
                        key={id}
                        onClick={() => removeSelected(id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#0d0d0d', color: '#CAFF00', borderRadius: '100px', padding: '5px 10px 5px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        {a.icon} {a.label} <span style={{ opacity: 0.6, fontSize: '14px' }}>×</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Scrollable chip list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 8px' }}>

              {/* Add custom button */}
              {showAddCustom && (
                <div
                  onClick={addCustomActivity}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#ffffff', border: '1.5px dashed #e2e2d8', borderRadius: '14px', padding: '14px 16px', cursor: 'pointer', marginBottom: '16px' }}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800, color: '#0d0d0d', flexShrink: 0 }}>+</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0d0d0d' }}>
                    Add <strong>"{search.trim()}"</strong> as a custom activity
                  </div>
                </div>
              )}

              {categories.length === 0 && !showAddCustom && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#9a9a90', fontSize: '14px' }}>
                  No activities match "{search}"
                </div>
              )}

              {categories.map(cat => (
                <div key={cat} style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9a9a90', marginBottom: '10px' }}>
                    {cat}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {filteredBySearch.filter(a => a.cat === cat).map(a => (
                      <button
                        key={a.id}
                        onClick={() => toggleActivity(a.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          background: selected.includes(a.id) ? '#CAFF00' : '#ffffff',
                          border: `1.5px solid ${selected.includes(a.id) ? '#CAFF00' : '#e2e2d8'}`,
                          borderRadius: '100px',
                          padding: '8px 14px',
                          fontSize: '13px', fontWeight: 600,
                          color: '#0d0d0d',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: '15px' }}>{a.icon}</span>
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer CTA */}
            <div style={{ background: '#f5f5f0', padding: '12px 24px 32px', borderTop: '1px solid #e2e2d8' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ fontSize: '13px', color: '#5a5a5a', fontWeight: 500 }}>
                  <strong style={{ color: '#0d0d0d' }}>{selected.length}</strong> selected
                </div>
                <button
                  onClick={() => setStep(2)}
                  disabled={selected.length === 0}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: '#0d0d0d', color: '#CAFF00',
                    border: 'none', borderRadius: '100px',
                    padding: '13px 24px', fontSize: '15px', fontWeight: 700,
                    cursor: selected.length === 0 ? 'default' : 'pointer',
                    opacity: selected.length === 0 ? 0.35 : 1,
                  }}
                >
                  Continue →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: City ── */}
        {step === 2 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

            <div style={{ background: '#0d0d0d', padding: '52px 24px 24px' }}>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
                {[1,2].map(i => (
                  <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i <= step ? '#CAFF00' : 'rgba(255,255,255,0.15)' }} />
                ))}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#CAFF00', marginBottom: '8px' }}>
                Step 2 of 2
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px', marginBottom: '6px' }}>
                Where are you based?
              </div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                We'll find fitness partners in your city.
              </div>
            </div>

            <div style={{ flex: 1, padding: '24px' }}>

              {/* City input */}
              <div style={{ background: '#ffffff', borderRadius: '20px', padding: '20px', border: '1.5px solid #e2e2d8', marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Your city
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="e.g. Regina, London, Toronto"
                  style={{ width: '100%', padding: '12px 14px', background: '#f5f5f0', border: '1.5px solid #e2e2d8', borderRadius: '12px', fontSize: '15px', color: '#0d0d0d', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>

              {/* Selected activities summary */}
              <div style={{ background: '#ffffff', borderRadius: '20px', padding: '16px 20px', border: '1.5px solid #e2e2d8', marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                  Your activities ({selected.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selected.map(id => {
                    const a = allActivities.find(x => x.id === id)
                    if (!a) return null
                    return (
                      <span key={id} style={{ padding: '5px 12px', background: '#CAFF00', borderRadius: '100px', fontSize: '12px', fontWeight: 700, color: '#0d0d0d' }}>
                        {a.icon} {a.label}
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
            </div>

            <div style={{ padding: '12px 24px 32px', borderTop: '1px solid #e2e2d8', display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setStep(1)}
                style={{ padding: '14px 20px', background: 'transparent', border: '1.5px solid #e2e2d8', borderRadius: '100px', fontSize: '15px', fontWeight: 600, color: '#0d0d0d', cursor: 'pointer' }}
              >
                ← Back
              </button>
              <button
                onClick={handleFinish}
                disabled={loading}
                style={{ flex: 1, padding: '14px', background: '#0d0d0d', color: '#CAFF00', fontSize: '15px', fontWeight: 700, border: 'none', borderRadius: '100px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
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
