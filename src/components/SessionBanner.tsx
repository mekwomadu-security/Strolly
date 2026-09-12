'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  conversationId: string
  currentUserId: string
  otherId: string
  otherName: string
  activity: string
  availableTime?: string
}

export default function SessionBanner({
  conversationId,
  currentUserId,
  otherId,
  otherName,
  activity,
  availableTime,
}: Props) {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const [completing, setCompleting] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [rating, setRating] = useState(0)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [showEndDropdown, setShowEndDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const activityIcons: Record<string, string> = {
    gym: '🏋️', jogging: '🏃', cycling: '🚴',
    football: '⚽', yoga: '🧘', swimming: '🏊',
    dog_walk: '🐕', badminton: '🏸', tennis: '🎾',
  }

  const activityLabel = (activity || 'workout').replace(/_/g, ' ')
  const icon = activityIcons[activity] || '🏃'

  useEffect(() => {
    fetchSession()
  }, [])

  useEffect(() => {
  fetchSession()

  const supabase = createClient()
  const channel = supabase
    .channel('session-' + conversationId)
    .on(
      'postgres_changes' as any,
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: 'conversation_id=eq.' + conversationId,
      },
      (payload: any) => {
        if (payload.new.status === 'pending_review') {
          setSession(payload.new)
          setShowReview(true)
        }
        if (payload.new.status === 'completed') {
          setDone(true)
          setSession(null)
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [])

useEffect(() => {
  if (!session || session.status !== 'active') return
  const start = new Date(session.started_at).getTime()
  const interval = setInterval(() => {
    setElapsed(Math.floor((Date.now() - start) / 1000))
  }, 1000)
  return () => clearInterval(interval)
}, [session])

  async function fetchSession() {
    const supabase = createClient()
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('conversation_id', conversationId)
      .in('status', ['active', 'pending_review', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data) {
      setSession(data)
      if (data.status === 'pending_review') {
        const { data: myReview } = await supabase
          .from('session_reviews')
          .select('id')
          .eq('session_id', data.id)
          .eq('reviewer_id', currentUserId)
          .maybeSingle()
        if (!myReview) setShowReview(true)
        else setDone(true)
      }
      if (data.status === 'completed') setDone(true)
    }
    setLoading(false)
  }

  async function startSession() {
    const supabase = createClient()
    const { data } = await supabase
      .from('sessions')
      .insert({
        conversation_id: conversationId,
        user1_id: currentUserId,
        user2_id: otherId,
        activity: activity || 'workout',
        status: 'active',
      })
      .select()
      .single()
    if (data) setSession(data)
  }

  async function completeSession() {
    setCompleting(true)
    const supabase = createClient()
    await supabase
      .from('sessions')
      .update({
        status: 'pending_review',
        completed_at: new Date().toISOString(),
        duration_seconds: elapsed,
      })
      .eq('id', session.id)
    setSession((prev: any) => ({ ...prev, status: 'pending_review', duration_seconds: elapsed }))
    setShowReview(true)
    setCompleting(false)
    setShowEndDropdown(false)
  }

  async function closeChat(hoursFromNow: number | null) {
    const supabase = createClient()
    setShowEndDropdown(false)

    if (hoursFromNow === null) {
      // Delete conversation entirely — like they never matched
      await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)
      router.push('/chats')
    } else {
      // Schedule close
      const closedAt = new Date(Date.now() + hoursFromNow * 3600000).toISOString()
      await supabase
        .from('conversations')
        .update({ closed_at: closedAt })
        .eq('id', conversationId)
      router.push('/chats')
    }
  }

  async function submitReview() {
    if (rating === 0) return
    setSubmitting(true)
    const supabase = createClient()

    await supabase.from('session_reviews').insert({
      session_id: session.id,
      reviewer_id: currentUserId,
      reviewee_id: otherId,
      rating,
      note: note.trim() || null,
    })

    const { data: bothReviewed } = await supabase
      .from('session_reviews')
      .select('id')
      .eq('session_id', session.id)

    if (bothReviewed && bothReviewed.length >= 2) {
      await supabase
        .from('sessions')
        .update({ status: 'completed' })
        .eq('id', session.id)
    }

    setSubmitting(false)
    setShowReview(false)
    setDone(true)
    setSession(null)
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  if (loading) return null

  // Done state — inline dropdown on same line
  if (done) {
    return (
      <div style={{ margin: '12px 16px', background: '#f0ffe0', borderRadius: '14px', padding: '10px 16px', border: '1.5px solid #a8d900', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, position: 'relative' }}>
        <div style={{ fontSize: '18px' }}>☑️ </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#0d0d0d' }}>Session completed!</div>
        </div>

        <div ref={dropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowEndDropdown(!showEndDropdown)}
            style={{ padding: '6px 12px', background: '#0d0d0d', color: '#CAFF00', border: 'none', borderRadius: '10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            Close chat {showEndDropdown ? '▲' : '▼'}
          </button>

          {showEndDropdown && (
            <div style={{ position: 'absolute', right: 0, top: '110%', background: '#ffffff', borderRadius: '12px', border: '1.5px solid #e2e2d8', overflow: 'hidden', zIndex: 100, minWidth: '160px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
              <button
                onClick={() => closeChat(null)}
                style={{ width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#0d0d0d', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
              End now
              </button>
              <button
                onClick={() => closeChat(24)}
                style={{ width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#0d0d0d', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
              In 24 hours
              </button>
              <button
                onClick={() => closeChat(48)}
                style={{ width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#0d0d0d', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
              In 48 hours
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Review prompt
  if (showReview) {
    return (
      <div style={{ margin: '12px 16px', background: '#ffffff', borderRadius: '16px', padding: '16px', border: '1.5px solid #e2e2d8', flexShrink: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0d0d0d', marginBottom: '4px', textAlign: 'center' }}>
          🎉 Session complete!
        </div>
        {session?.duration_seconds && (
          <div style={{ fontSize: '11px', color: '#5a5a5a', textAlign: 'center', marginBottom: '12px' }}>
            {formatTime(session.duration_seconds)} · {activityLabel}
          </div>
        )}
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d0d0d', textAlign: 'center', marginBottom: '8px' }}>
          Rate your session with {otherName.split(' ')[0]}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
          {[1, 2, 3, 4, 5].map(star => (
            <button key={star} onClick={() => setRating(star)} style={{ fontSize: '28px', background: 'none', border: 'none', cursor: 'pointer', opacity: star <= rating ? 1 : 0.3 }}>
              ⭐
            </button>
          ))}
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Add a note (optional)..."
          rows={2}
          style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e2d8', borderRadius: '10px', fontSize: '13px', color: '#0d0d0d', resize: 'none', outline: 'none', marginBottom: '10px' }}
        />
        <button
          onClick={submitReview}
          disabled={rating === 0 || submitting}
          style={{ width: '100%', padding: '12px', background: rating > 0 ? '#0d0d0d' : '#e2e2d8', color: rating > 0 ? '#CAFF00' : '#5a5a5a', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: rating > 0 ? 'pointer' : 'not-allowed' }}
        >
          {submitting ? 'Submitting...' : 'Submit review →'}
        </button>
      </div>
    )
  }

  // Active session timer
  if (session?.status === 'active') {
    return (
      <div style={{ margin: '12px 16px', background: '#0d0d0d', borderRadius: '14px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, position: 'relative' }}>
        <div style={{ fontSize: '20px' }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#CAFF00' }}>{activityLabel} · {formatTime(elapsed)}</div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '1px' }}>Session in progress</div>
        </div>

        <div ref={dropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowEndDropdown(!showEndDropdown)}
            style={{ padding: '7px 12px', background: '#CAFF00', color: '#0d0d0d', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            {completing ? '...' : 'End'} {showEndDropdown ? '▲' : '▼'}
          </button>

          {showEndDropdown && (
            <div style={{ position: 'absolute', right: 0, top: '110%', background: '#ffffff', borderRadius: '12px', border: '1.5px solid #e2e2d8', overflow: 'hidden', zIndex: 100, minWidth: '160px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
              <button
                onClick={completeSession}
                style={{ width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#0d0d0d', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                ☑️ End now
              </button>
              <button
                onClick={() => { setShowEndDropdown(false) }}
                style={{ width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#0d0d0d', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                🕐 In 24 hours
              </button>
              <button
                onClick={() => { setShowEndDropdown(false) }}
                style={{ width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#0d0d0d', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                🕐 In 48 hours
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Default — activity bar with start button
  return (
    <div style={{ margin: '12px 16px', background: '#CAFF00', borderRadius: '14px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
      <div style={{ fontSize: '20px' }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0d0d0d' }}>
          {activityLabel}{availableTime ? ` · ${availableTime}` : ''}
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.5)', marginTop: '1px' }}>
          Hey Strolly matched us ✨
        </div>
      </div>
      <button
        onClick={startSession}
        style={{ padding: '8px 14px', background: '#0d0d0d', color: '#CAFF00', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
      >
        Start →
      </button>
    </div>
  )
}