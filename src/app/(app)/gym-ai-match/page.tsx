'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Match {
  id: string
  full_name: string
  current_gym_activity: string
  score: number
  reason: string
}

type ScanState = 'idle' | 'scanning' | 'matched' | 'no_match'

const scanMessages = [
  { status: 'Scanning the gym…', sub: 'Looking for people checked in right now' },
  { status: 'Found people here', sub: 'Analysing compatibility' },
  { status: 'Ranking matches…', sub: 'AI weighing activity + goals' },
  { status: 'Best match found!', sub: 'Preparing your gym match' },
]

export default function GymAiMatchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const gymId = searchParams.get('gym_id') || ''
  const gymName = searchParams.get('gym_name') || ''
  const gymActivity = searchParams.get('gym_activity') || ''

  const [scanState, setScanState] = useState<ScanState>('idle')
  const [scanStatus, setScanStatus] = useState('Ready to scan')
  const [scanSub, setScanSub] = useState('Tap below to find your gym partner')
  const [matches, setMatches] = useState<Match[]>([])
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const [totalScanned, setTotalScanned] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const currentMatch = matches[currentMatchIndex] || null

  async function startScan() {
    setScanState('scanning')
    setError(null)
    setMatches([])
    setCurrentMatchIndex(0)

    let step = 0
    const interval = setInterval(() => {
      if (step < scanMessages.length) {
        setScanStatus(scanMessages[step].status)
        setScanSub(scanMessages[step].sub)
        step++
      } else {
        clearInterval(interval)
        callGymAiMatch()
      }
    }, 900)
  }

  async function callGymAiMatch() {
    try {
      const response = await fetch('/api/gym-ai-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gym_id: gymId, gym_activity: gymActivity, gym_name: gymName }),
      })

      const data = await response.json()

      if (data.matches && data.matches.length > 0) {
        setMatches(data.matches)
        setTotalScanned(data.total_scanned)
        setScanState('matched')
        setScanStatus('Best match found!')
        setScanSub(`Analysed ${data.total_scanned} people at ${gymName}`)
      } else {
        setScanState('no_match')
        setScanStatus('No matches right now')
        setScanSub('You\'re the only one here — share Strolly with gym friends!')
      }
    } catch {
      setScanState('no_match')
      setScanStatus('Something went wrong')
      setScanSub('Please try again')
    }
  }

  function skipMatch() {
    if (currentMatchIndex < matches.length - 1) {
      setCurrentMatchIndex(currentMatchIndex + 1)
    } else {
      setScanState('no_match')
      setScanStatus('No more matches')
      setScanSub('You\'ve seen everyone at the gym')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0' }}>

      {/* Header */}
      <div style={{ padding: '56px 24px 20px', background: '#ffffff', borderBottom: '1px solid #e2e2d8', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          onClick={() => router.push('/gym')}
          style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f5f5f0', border: 'none', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          ←
        </button>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0d0d0d', letterSpacing: '-0.5px' }}>
            AI Gym Match
          </div>
          <div style={{ fontSize: '12px', color: '#5a5a5a', marginTop: '2px' }}>
            🏋️ {gymName} · {gymActivity}
          </div>
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: '480px', margin: '0 auto' }}>

        {/* Scan area */}
        <div style={{ background: '#0d0d0d', borderRadius: '28px', padding: '32px 28px', marginBottom: '16px', position: 'relative', overflow: 'hidden', minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

          {scanState === 'scanning' && (
            <>
              {[60, 110, 165, 220].map((size, i) => (
                <div key={i} style={{ position: 'absolute', width: `${size}px`, height: `${size}px`, borderRadius: '50%', border: '1.5px solid #CAFF00', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', animation: `scanRing 2.4s ease-out infinite ${i * 0.6}s`, opacity: 0 }} />
              ))}
            </>
          )}

          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '52px', height: '52px', borderRadius: '50%', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', zIndex: 2 }}>
            {scanState === 'matched' ? '🎯' : scanState === 'no_match' ? '😔' : '🏋️'}
          </div>

          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#CAFF00', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Strolly AI · Gym Mode
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px', marginBottom: '6px' }}>
              {scanStatus}
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
              {scanSub}
            </div>
          </div>

          {scanState === 'scanning' && (
            <div style={{ display: 'flex', gap: '4px', position: 'relative', zIndex: 2 }}>
              {[0, 0.2, 0.4].map((delay, i) => (
                <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#CAFF00', animation: `dotPulse 1.2s ease-in-out infinite ${delay}s` }} />
              ))}
            </div>
          )}
        </div>

        <style>{`
          @keyframes scanRing { 0% { opacity: 0.8; transform: translate(-50%, -50%) scale(0.5); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(1); } }
          @keyframes dotPulse { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }
        `}</style>

        {/* Scan button */}
        {scanState === 'idle' && (
          <button
            onClick={startScan}
            style={{ width: '100%', padding: '18px', background: '#CAFF00', color: '#0d0d0d', fontSize: '16px', fontWeight: 700, border: 'none', borderRadius: '16px', cursor: 'pointer' }}
          >
            ✨ Find my gym partner now
          </button>
        )}

        {/* No match */}
        {scanState === 'no_match' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={() => { setScanState('idle'); setScanStatus('Ready to scan'); setScanSub('Tap below to find your gym partner') }} style={{ width: '100%', padding: '16px', background: '#CAFF00', color: '#0d0d0d', fontSize: '15px', fontWeight: 700, border: 'none', borderRadius: '16px', cursor: 'pointer' }}>
              Try again
            </button>
            <button onClick={() => router.push('/gym')} style={{ width: '100%', padding: '16px', background: '#ffffff', color: '#0d0d0d', fontSize: '15px', fontWeight: 600, border: '1.5px solid #e2e2d8', borderRadius: '16px', cursor: 'pointer' }}>
              ← Back to gym
            </button>
          </div>
        )}

        {/* Match card */}
        {scanState === 'matched' && currentMatch && (
          <>
            <div style={{ background: '#f0ffe0', border: '1.5px solid #a8d900', borderRadius: '20px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '100px', background: '#0d0d0d', color: '#CAFF00', fontSize: '10px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>
                ✦ AI reasoning
              </div>
              <div style={{ fontSize: '13px', color: '#0d0d0d', lineHeight: 1.6, marginBottom: '10px' }}>
                Analysed {totalScanned} people at {gymName}. {currentMatch.full_name} ranked #{currentMatchIndex + 1} — {currentMatch.reason}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ padding: '4px 10px', borderRadius: '100px', background: '#CAFF00', color: '#0d0d0d', fontSize: '11px', fontWeight: 600, border: '1.5px solid #a8d900' }}>🏋️ {gymName}</span>
                <span style={{ padding: '4px 10px', borderRadius: '100px', background: '#CAFF00', color: '#0d0d0d', fontSize: '11px', fontWeight: 600, border: '1.5px solid #a8d900' }}>Here now</span>
                <span style={{ padding: '4px 10px', borderRadius: '100px', background: '#CAFF00', color: '#0d0d0d', fontSize: '11px', fontWeight: 600, border: '1.5px solid #a8d900' }}>{currentMatch.current_gym_activity}</span>
              </div>
            </div>

            <div style={{ background: '#0d0d0d', borderRadius: '24px', padding: '20px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: '#CAFF00', color: '#0d0d0d', fontWeight: 800, fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {currentMatch.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>{currentMatch.full_name}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '3px' }}>{currentMatch.current_gym_activity} · At {gymName}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>AI match score</div>
                <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#CAFF00', borderRadius: '3px', width: `${currentMatch.score}%` }} />
                </div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#CAFF00', whiteSpace: 'nowrap' }}>{currentMatch.score}%</div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => router.push(`/chat/${currentMatch.id}`)}
                  style={{ flex: 1, padding: '14px', background: '#CAFF00', color: '#0d0d0d', fontSize: '14px', fontWeight: 800, border: 'none', borderRadius: '16px', cursor: 'pointer' }}
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
    </div>
  )
}