'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'

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

interface Match {
  id: string
  full_name: string
  city: string
  activities: string[]
  current_activity: string
  available_from: string
  available_until: string
  available_date: string
  score: number
  reason: string
}

type ScanState = 'idle' | 'scanning' | 'matched' | 'no_match'

const scanMessages = [
  { status: 'Scanning nearby…', sub: 'Looking for people active right now' },
  { status: 'Found people nearby', sub: 'Analysing compatibility factors' },
  { status: 'Ranking matches…', sub: 'AI weighing compatibility' },
  { status: 'Best match found!', sub: 'Preparing your match' },
]

export default function AiMatchPage() {
  const router = useRouter()
  const [selectedActivity, setSelectedActivity] = useState('')
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [scanStatus, setScanStatus] = useState('Ready to scan')
  const [scanSub, setScanSub] = useState('Pick an activity and tap below')
  const [matches, setMatches] = useState<Match[]>([])
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const [totalScanned, setTotalScanned] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const currentMatch = matches[currentMatchIndex] || null

  async function startScan() {
    if (!selectedActivity) {
      setError('Please pick an activity first')
      return
    }

    setScanState('scanning')
    setError(null)
    setMatches([])
    setCurrentMatchIndex(0)

    // Update user availability in Supabase
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    await supabase
      .from('profiles')
      .update({
        current_activity: selectedActivity,
        is_available: true,
        available_date: 'Today',
        available_from: getCurrentTime(),
        available_until: getTimeInHours(3),
      })
      .eq('id', user.id)

    // Run scan animation
    let step = 0
    const interval = setInterval(() => {
      if (step < scanMessages.length) {
        setScanStatus(scanMessages[step].status)
        setScanSub(scanMessages[step].sub)
        step++
      } else {
        clearInterval(interval)
        callAiMatch()
      }
    }, 900)
  }

  async function callAiMatch() {
    try {
      const response = await fetch('/api/ai-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity: selectedActivity }),
      })

      const data = await response.json()

      if (data.matches && data.matches.length > 0) {
        setMatches(data.matches)
        setTotalScanned(data.total_scanned)
        setScanState('matched')
        setScanStatus('Best match found!')
        setScanSub(`Analysed ${data.total_scanned} people nearby`)
      } else {
        setScanState('no_match')
        setScanStatus('No matches right now')
        setScanSub('Try again in a few minutes or schedule a session')
      }
    } catch (err) {
      setScanState('no_match')
      setScanStatus('Something went wrong')
      setScanSub('Please try again')
      setError('AI match failed. Please try again.')
    }
  }

  function skipMatch() {
    if (currentMatchIndex < matches.length - 1) {
      setCurrentMatchIndex(currentMatchIndex + 1)
    } else {
      setScanState('no_match')
      setScanStatus('No more matches')
      setScanSub('You\'ve seen all available matches')
    }
  }

  function resetScan() {
    setScanState('idle')
    setScanStatus('Ready to scan')
    setScanSub('Pick an activity and tap below')
    setMatches([])
    setCurrentMatchIndex(0)
    setError(null)
  }

  async function acceptMatch() {
    if (!currentMatch) return
    router.push(`/chat/${currentMatch.id}`)
  }

  function getCurrentTime() {
    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const h = hours % 12 || 12
    const m = minutes.toString().padStart(2, '0')
    return `${h}:${m} ${ampm}`
  }

  function getTimeInHours(hoursAhead: number) {
    const now = new Date()
    now.setHours(now.getHours() + hoursAhead)
    const hours = now.getHours()
    const minutes = now.getMinutes()
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const h = hours % 12 || 12
    const m = minutes.toString().padStart(2, '0')
    return `${h}:${m} ${ampm}`
  }

  const activityData = activities.find(a => a.id === selectedActivity)

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ padding: '56px 24px 20px', background: '#ffffff', borderBottom: '1px solid #e2e2d8', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          onClick={() => router.push('/home')}
          style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f5f5f0', border: 'none', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          ←
        </button>
        <div>
          <div style={{ fontFamily: 'sans-serif', fontSize: '20px', fontWeight: 800, color: '#0d0d0d', letterSpacing: '-0.5px' }}>
            AI Instant Match
          </div>
          <div style={{ fontSize: '12px', color: '#5a5a5a', marginTop: '2px' }}>
            Finds your best partner right now
          </div>
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: '480px', margin: '0 auto' }}>

        {/* Activity picker */}
        {scanState === 'idle' && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
              I want to do
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {activities.map(a => (
                <button
                  key={a.id}
                  onClick={() => { setSelectedActivity(a.id); setError(null) }}
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
        )}

        {/* Scan area */}
        <div style={{ background: '#0d0d0d', borderRadius: '28px', padding: '32px 28px', marginBottom: '16px', position: 'relative', overflow: 'hidden', minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

          {/* Animated rings */}
          {scanState === 'scanning' && (
            <>
              {[60, 110, 165, 220].map((size, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    width: `${size}px`,
                    height: `${size}px`,
                    borderRadius: '50%',
                    border: '1.5px solid #CAFF00',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    animation: `scanRing 2.4s ease-out infinite ${i * 0.6}s`,
                    opacity: 0,
                  }}
                />
              ))}
            </>
          )}

          {/* Center icon */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '52px', height: '52px', borderRadius: '50%', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', zIndex: 2 }}>
            {scanState === 'matched' ? '🎯' : scanState === 'no_match' ? '😔' : selectedActivity ? activityData?.icon : '✨'}
          </div>

          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#CAFF00', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Strolly AI
            </div>
            <div style={{ fontFamily: 'sans-serif', fontSize: '22px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px', marginBottom: '6px' }}>
              {scanStatus}
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
              {scanSub}
            </div>
          </div>

          {/* Scanning dots */}
          {scanState === 'scanning' && (
            <div style={{ display: 'flex', gap: '4px', position: 'relative', zIndex: 2 }}>
              {[0, 0.2, 0.4].map((delay, i) => (
                <div
                  key={i}
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#CAFF00',
                    animation: `dotPulse 1.2s ease-in-out infinite ${delay}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* CSS animations */}
        <style>{`
          @keyframes scanRing {
            0% { opacity: 0.8; transform: translate(-50%, -50%) scale(0.5); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
          }
          @keyframes dotPulse {
            0%, 100% { opacity: 0.25; }
            50% { opacity: 1; }
          }
        `}</style>

        {/* Find match button */}
        {scanState === 'idle' && (
          <>
            {error && (
              <div style={{ padding: '12px 16px', background: '#fff0f0', border: '1.5px solid #ffcccc', borderRadius: '12px', fontSize: '13px', color: '#cc0000', marginBottom: '12px' }}>
                {error}
              </div>
            )}
            <button
              onClick={startScan}
              style={{ width: '100%', padding: '18px', background: '#CAFF00', color: '#0d0d0d', fontFamily: 'sans-serif', fontSize: '16px', fontWeight: 700, border: 'none', borderRadius: '16px', cursor: 'pointer' }}
            >
              ✨ Find my match now
            </button>
          </>
        )}

        {/* No match state */}
        {scanState === 'no_match' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={resetScan}
              style={{ width: '100%', padding: '16px', background: '#CAFF00', color: '#0d0d0d', fontSize: '15px', fontWeight: 700, border: 'none', borderRadius: '16px', cursor: 'pointer' }}
            >
              Try again
            </button>
            <button
              onClick={() => router.push('/schedule')}
              style={{ width: '100%', padding: '16px', background: '#ffffff', color: '#0d0d0d', fontSize: '15px', fontWeight: 600, border: '1.5px solid #e2e2d8', borderRadius: '16px', cursor: 'pointer' }}
            >
              Schedule a session instead
            </button>
          </div>
        )}

        {/* Match card */}
        {scanState === 'matched' && currentMatch && (
          <>
            {/* AI reasoning */}
            <div style={{ background: '#f0ffe0', border: '1.5px solid #a8d900', borderRadius: '20px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '100px', background: '#0d0d0d', color: '#CAFF00', fontSize: '10px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>
                ✦ AI reasoning
              </div>
              <div style={{ fontSize: '13px', color: '#0d0d0d', lineHeight: 1.6, marginBottom: '10px' }}>
                Analysed {totalScanned} nearby people. {currentMatch.full_name} ranked #{currentMatchIndex + 1} — {currentMatch.reason}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ padding: '4px 10px', borderRadius: '100px', background: '#CAFF00', color: '#0d0d0d', fontSize: '11px', fontWeight: 600, border: '1.5px solid #a8d900' }}>
                  📍 {currentMatch.city}
                </span>
                <span style={{ padding: '4px 10px', borderRadius: '100px', background: '#CAFF00', color: '#0d0d0d', fontSize: '11px', fontWeight: 600, border: '1.5px solid #a8d900' }}>
                  ⚡ Available now
                </span>
                <span style={{ padding: '4px 10px', borderRadius: '100px', background: '#CAFF00', color: '#0d0d0d', fontSize: '11px', fontWeight: 600, border: '1.5px solid #a8d900' }}>
                  {currentMatch.available_from} → {currentMatch.available_until}
                </span>
              </div>
            </div>

            {/* Match card */}
            <div style={{ background: '#0d0d0d', borderRadius: '24px', padding: '20px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: '#CAFF00', color: '#0d0d0d', fontFamily: 'sans-serif', fontWeight: 800, fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {currentMatch.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontFamily: 'sans-serif', fontSize: '18px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>
                    {currentMatch.full_name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '3px' }}>
                    {currentMatch.current_activity?.replace('_', ' ')} · Available now
                  </div>
                </div>
              </div>

              {/* Score bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>AI match score</div>
                <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#CAFF00', borderRadius: '3px', width: `${currentMatch.score}%`, transition: 'width 1.2s ease' }} />
                </div>
                <div style={{ fontFamily: 'sans-serif', fontSize: '13px', fontWeight: 800, color: '#CAFF00', whiteSpace: 'nowrap' }}>
                  {currentMatch.score}%
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={acceptMatch}
                  style={{ flex: 1, padding: '14px', background: '#CAFF00', color: '#0d0d0d', fontFamily: 'sans-serif', fontSize: '14px', fontWeight: 800, border: 'none', borderRadius: '16px', cursor: 'pointer' }}
                >
                  Accept match →
                </button>
                <button
                  onClick={skipMatch}
                  style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', cursor: 'pointer' }}
                >
                  Skip
                </button>
              </div>
            </div>

            {matches.length > 1 && (
              <div style={{ textAlign: 'center', fontSize: '12px', color: '#5a5a5a' }}>
                Match {currentMatchIndex + 1} of {matches.length}
              </div>
            )}
          </>
        )}

      </div>
      <BottomNav />
    </div>
  )
}