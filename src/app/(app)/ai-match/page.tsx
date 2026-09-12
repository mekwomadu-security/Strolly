'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLocation } from '@/hooks/useLocation'
import BottomNav from '@/components/BottomNav'

const activities = [

  { id: 'gym', label: 'Gym', icon: '🏋️' },
  { id: 'jogging', label: 'Jogging', icon: '🏃' },
  { id: 'cycling', label: 'Cycling', icon: '🚴' },
  { id: 'football', label: 'Football', icon: '⚽' },
  { id: 'yoga', label: 'Yoga', icon: '🧘' },
  { id: 'swimming', label: 'Swimming', icon: ' 🏊🏾‍♀️' },
  { id: 'dog_walk', label: 'Dog walk', icon: '🐕' },
  { id: 'badminton', label: 'Badminton', icon: '🏸' },
  { id: 'tennis', label: 'Tennis', icon: '🎾' },
  { id: 'golfing', label: 'Golfing', icon: '🏌🏿‍♂️' },
]

export default function AIMatchPage() {
  const router = useRouter()
  const { location, error: locationError } = useLocation()
  const [step, setStep] = useState<'pick' | 'scanning' | 'result' | 'error'>('pick')
  const [selectedActivity, setSelectedActivity] = useState('')
  const [match, setMatch] = useState<any>(null)
  const [error, setError] = useState('')
  const [scanTitle, setScanTitle] = useState('Scanning nearby')
  const [scanSub, setScanSub] = useState('Looking for people active right now...')
  const [userActivities, setUserActivities] = useState<string[]>([])
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const [matches, setMatches] = useState<any[]>([])

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

  async function findMatch() {
    if (!selectedActivity) return
    setStep('scanning')

    const scanSteps = [
      { title: 'Scanning nearby', sub: 'Looking for people active right now...' },
      { title: 'Scanning nearby', sub: 'Finding people near your location...' },
      { title: 'Ranking matches', sub: 'AI weighing compatibility...' },
      { title: 'Ranking matches', sub: 'Calculating distance scores...' },
      { title: 'Best match found!', sub: 'Preparing your match...' },
    ]

    for (let i = 0; i < scanSteps.length; i++) {
      await new Promise(r => setTimeout(r, 900))
      setScanTitle(scanSteps[i].title)
      setScanSub(scanSteps[i].sub)
    }

    const now = new Date()
    const currentHour = now.getHours()
    const currentMin = now.getMinutes()
    const availableFrom = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`
    const availableUntil = `${String(Math.min(currentHour + 3, 23)).padStart(2, '0')}:00`

    try {
      const response = await fetch('/api/ai-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity: selectedActivity,
          latitude: location?.latitude,
          longitude: location?.longitude,
          availableFrom,
          availableUntil,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'No matches found nearby')
        setStep('error')
        return
      }

      setMatch(data.match)
      setMatches(data.match.allMatches || [])
      setCurrentMatchIndex(0)
      setStep('result')
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setStep('error')
    }
  }

  function skipMatch() {
  if (currentMatchIndex < matches.length - 1) {
    const nextIndex = currentMatchIndex + 1
    setCurrentMatchIndex(nextIndex)
    const next = matches[nextIndex]
    setMatch(next)
  } else {
    setStep('pick')
  }
}

  const displayActivities = userActivities.length > 0
    ? activities.filter(a => userActivities.includes(a.id))
    : activities

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', paddingBottom: '80px' }}>

      <style>{`
        @keyframes ping1 { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2.5); opacity: 0; } }
        @keyframes ping2 { 0% { transform: scale(1); opacity: 0.4; } 100% { transform: scale(3.2); opacity: 0; } }
        @keyframes ping3 { 0% { transform: scale(1); opacity: 0.2; } 100% { transform: scale(4); opacity: 0; } }
        @keyframes dotPulse { 0%,100% { opacity: 0.2; } 50% { opacity: 1; } }
        @keyframes errorPulse { 0%,100% { transform: scale(1); opacity: 0.3; } 50% { transform: scale(1.8); opacity: 0; } }
        @keyframes sadBounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      `}</style>

      {/* Header */}
      <div style={{ padding: '52px 24px 20px', background: '#f5f5f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => router.back()}
          style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ffffff', border: '1px solid #e2e2d8', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          ←
        </button>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0d0d0d', letterSpacing: '-0.5px' }}>AI Instant Match</div>
          <div style={{ fontSize: '12px', color: '#5a5a5a', marginTop: '1px' }}>Finds your best partner right now</div>
        </div>
      </div>

      {/* Pick + Scanning */}
      {(step === 'pick' || step === 'scanning') && (
        <div style={{ padding: '0 24px', maxWidth: '480px', margin: '0 auto' }}>

          {step === 'pick' && (
            <>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
                I want to do
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                {displayActivities.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedActivity(a.id)}
                    style={{
                      padding: '8px 14px',
                      background: selectedActivity === a.id ? '#0d0d0d' : '#ffffff',
                      color: selectedActivity === a.id ? '#CAFF00' : '#0d0d0d',
                      border: `1.5px solid ${selectedActivity === a.id ? '#0d0d0d' : '#e2e2d8'}`,
                      borderRadius: '100px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {a.icon} {a.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Signature black card */}
          <div style={{ background: '#1a1a1a', borderRadius: '20px', padding: '20px 20px 16px', marginBottom: '14px', position: 'relative', overflow: 'hidden', minHeight: '130px' }}>

            {/* Scanning — animated rings */}
            {step === 'scanning' && (
              <div style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', width: '64px', height: '64px' }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#CAFF00', animation: 'ping1 1.5s ease-out infinite' }} />
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#CAFF00', animation: 'ping2 1.5s ease-out infinite 0.3s' }} />
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#CAFF00', animation: 'ping3 1.5s ease-out infinite 0.6s' }} />
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                  ✨
                </div>
              </div>
            )}

            {/* Pick — static lime circle */}
            {step === 'pick' && (
              <div style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', width: '64px', height: '64px', borderRadius: '50%', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                ✨
              </div>
            )}

            <div style={{ fontSize: '10px', fontWeight: 800, color: '#CAFF00', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Strolly AI
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
              {step === 'pick' ? 'Ready to scan' : scanTitle}
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginBottom: '10px' }}>
              {step === 'pick'
                ? (selectedActivity
                  ? `Finding ${displayActivities.find(a => a.id === selectedActivity)?.label} partners near you`
                  : 'Pick an activity and tap below')
                : scanSub
              }
            </div>

            {step === 'pick' && location && (
              <div style={{ fontSize: '11px', color: '#CAFF00', fontWeight: 600, marginBottom: '10px' }}>
                📍 Location ready
              </div>
            )}
            {step === 'pick' && locationError && (
              <div style={{ fontSize: '11px', color: 'rgba(255,120,120,0.9)', marginBottom: '10px' }}>
                ⚠️ Enable location for better matches
              </div>
            )}

            {/* Animated dots */}
            <div style={{ display: 'flex', gap: '5px' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: step === 'scanning' ? '#CAFF00' : 'rgba(255,255,255,0.2)',
                  animation: step === 'scanning' ? `dotPulse 1.2s ease-in-out infinite ${i * 0.2}s` : 'none',
                }} />
              ))}
            </div>
          </div>

          {step === 'pick' && (
            <button
              onClick={findMatch}
              disabled={!selectedActivity}
              style={{
                width: '100%', padding: '16px',
                background: '#CAFF00', color: '#0d0d0d',
                border: 'none', borderRadius: '16px',
                fontSize: '16px', fontWeight: 800,
                cursor: selectedActivity ? 'pointer' : 'not-allowed',
                opacity: selectedActivity ? 1 : 0.5,
              }}
            >
              Find my match now
            </button>
          )}
        </div>
      )}

      {/* Result */}
      {step === 'result' && match && (
        <div style={{ padding: '0 24px', maxWidth: '480px', margin: '0 auto' }}>
          <div style={{ background: '#0d0d0d', borderRadius: '24px', padding: '24px', marginBottom: '14px' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#CAFF00', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
              ✨ Best match found
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              {match.avatar ? (
                <img src={match.avatar} alt={match.name} style={{ width: '64px', height: '64px', borderRadius: '18px', objectFit: 'cover', border: '3px solid #CAFF00' }} />
              ) : (
                <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800, color: '#0d0d0d' }}>
                  {match.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>{match.name}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>📍 {match.distanceLabel}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>⭐ {match.rating}/5 · {match.sessionCount} sessions</div>
              </div>
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#CAFF00', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#0d0d0d', lineHeight: 1 }}>{match.scorePercent}</div>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: '#0d0d0d' }}>%</div>
                </div>
                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>match</div>
              </div>
            </div>

            {/* Score breakdown */}
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '14px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Score breakdown</div>
              {[
                { label: '📍 Distance', score: match.distanceScore, max: 40 },
                { label: '🏃 Activity', score: match.activityScore, max: 35 },
                { label: '🕐 Time', score: match.timeScore, max: 25 },
                { label: '⭐ Rating', score: match.ratingScore, max: 10 },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', width: '90px', flexShrink: 0 }}>{item.label}</div>
                  <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${(item.score / item.max) * 100}%`, height: '100%', background: '#CAFF00', borderRadius: '2px' }} />
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#CAFF00', width: '36px', textAlign: 'right', flexShrink: 0 }}>{item.score}/{item.max}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, fontStyle: 'italic', marginBottom: '20px' }}>
              "{match.reasoning}"
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => router.push('/chat/' + match.id)}
                style={{ flex: 1, padding: '14px', background: '#CAFF00', color: '#0d0d0d', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}
              >
                Accept match →
              </button>
              <button
                onClick={skipMatch}
                style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.1)', color: '#ffffff', border: 'none', borderRadius: '14px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              >
                Skip
              </button>
            </div>

            {matches.length > 1 && (
              <div style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '12px' }}>
                Match {currentMatchIndex + 1} of {matches.length}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error — animated */}
      {step === 'error' && (
        <div style={{ padding: '0 24px', maxWidth: '480px', margin: '0 auto' }}>
          <div style={{ background: '#1a1a1a', borderRadius: '20px', padding: '28px 24px', position: 'relative', overflow: 'hidden' }}>

            {/* Animated ✨ star on the right */}
            <div style={{ position: 'absolute', right: '20px', top: '24px', width: '56px', height: '56px' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#CAFF00', opacity: 0.3, animation: 'errorPulse 2s ease-out infinite' }} />
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#CAFF00', opacity: 0.2, animation: 'errorPulse 2s ease-out infinite 0.4s' }} />
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                ✨
              </div>
            </div>

            <div style={{ fontSize: '10px', fontWeight: 800, color: '#CAFF00', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px' }}>
              Strolly AI
            </div>

            {/* Sad face bouncing */}
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '40px', animation: 'sadBounce 2s ease-in-out infinite', display: 'inline-block' }}>
                😔
              </div>
            </div>

            <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginBottom: '8px', textAlign: 'center' }}>
              No matches found
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginBottom: '24px', textAlign: 'center', lineHeight: 1.6 }}>
              {error || 'No one nearby is available right now. Try a different activity or check back soon.'}
            </div>

            <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', marginBottom: '20px' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
              ))}
            </div>

            <button
              onClick={() => setStep('pick')}
              style={{ width: '100%', padding: '14px', background: '#CAFF00', color: '#0d0d0d', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 800, cursor: 'pointer' }}
            >
              Try again
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}