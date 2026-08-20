'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Chat {
  id: string
  name: string
  avatar: string
  lastMsg: string
  time: string
  unread: boolean
}

interface Session {
  id: string
  activity: string
  duration_seconds: number
  completed_at: string
  other_name: string
  other_avatar: string
  rating: number | null
  note: string | null
}

interface Props {
  chats?: Chat[]
}

const activityIcons: Record<string, string> = {
  gym: '🏋️', jogging: '🏃', cycling: '🚴',
  football: '⚽', yoga: '🧘', swimming: '🏊',
  dog_walk: '🐕', badminton: '🏸', tennis: '🎾',
}

export default function RecentChatsSwiper({ chats = [] }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'chats' | 'activities'>('chats')
  const [sessions, setSessions] = useState<Session[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const safeChats = chats || []
  const touchStartX = useRef<number>(0)
  const touchEndX = useRef<number>(0)

  useEffect(() => {
    fetchSessions()
  }, [])

  async function fetchSessions() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoadingSessions(false); return }

    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(5)

    if (!sessionsData || sessionsData.length === 0) {
      setLoadingSessions(false)
      return
    }

    const enriched = await Promise.all(sessionsData.map(async s => {
      const otherId = s.user1_id === user.id ? s.user2_id : s.user1_id
      const { data: p } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', otherId)
        .single()

      const { data: review } = await supabase
        .from('session_reviews')
        .select('rating, note')
        .eq('session_id', s.id)
        .eq('reviewee_id', user.id)
        .maybeSingle()

      const time = new Date(s.completed_at)
      const diff = Date.now() - time.getTime()
      const days = Math.floor(diff / 86400000)
      const timeStr = days === 0 ? 'Today' : days === 1 ? 'Yesterday' : days + 'd ago'

      return {
        id: s.id,
        activity: s.activity,
        duration_seconds: s.duration_seconds,
        completed_at: timeStr,
        other_name: p?.full_name || 'Unknown',
        other_avatar: p?.avatar_url || '',
        rating: review?.rating || null,
        note: review?.note || null,
      }
    }))

    setSessions(enriched)
    setLoadingSessions(false)
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    touchEndX.current = e.changedTouches[0].clientX
    const diff = touchStartX.current - touchEndX.current
    if (Math.abs(diff) > 50) {
      if (diff > 0) setTab('activities')
      else setTab('chats')
    }
  }

  function formatDuration(seconds: number) {
    if (!seconds) return ''
    const m = Math.floor(seconds / 60)
    return m + ' min'
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ background: '#ffffff', borderRadius: '20px', border: '1.5px solid #e2e2d8', overflow: 'hidden' }}
    >
      {/* Tab switcher */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e2d8' }}>
        <button
          onClick={() => setTab('chats')}
          style={{ flex: 1, padding: '12px', background: tab === 'chats' ? '#0d0d0d' : 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: tab === 'chats' ? '#CAFF00' : '#5a5a5a' }}
        >
          💬 Recent chats
        </button>
        <button
          onClick={() => setTab('activities')}
          style={{ flex: 1, padding: '12px', background: tab === 'activities' ? '#0d0d0d' : 'transparent', border: 'none', borderLeft: '1px solid #e2e2d8', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: tab === 'activities' ? '#CAFF00' : '#5a5a5a' }}
        >
           Recent activities
        </button>
      </div>

      {/* Swipe dots */}
      <div style={{ padding: '6px 16px', background: '#fafafa', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
        <div style={{ width: tab === 'chats' ? '16px' : '6px', height: '4px', borderRadius: '2px', background: tab === 'chats' ? '#0d0d0d' : '#e2e2d8', transition: 'all 0.2s' }} />
        <div style={{ width: tab === 'activities' ? '16px' : '6px', height: '4px', borderRadius: '2px', background: tab === 'activities' ? '#0d0d0d' : '#e2e2d8', transition: 'all 0.2s' }} />
      </div>

      {/* Chats tab */}
      {tab === 'chats' && (
        <>
          <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Conversations</div>
            <button onClick={() => router.push('/chats')} style={{ fontSize: '12px', fontWeight: 600, color: '#0d0d0d', background: 'none', border: 'none', cursor: 'pointer' }}>See all →</button>
          </div>

          {safeChats.length === 0 && (
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0d0d0d', marginBottom: '4px' }}>No chats yet</div>
              <div style={{ fontSize: '12px', color: '#5a5a5a' }}>Match with someone to start chatting</div>
            </div>
          )}

          {safeChats.map((chat, index) => {
            const chatInitials = chat.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
            return (
              <button key={chat.id} onClick={() => router.push('/chat/' + chat.id)} style={{ width: '100%', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: index < safeChats.length - 1 ? '1px solid #f0f0f0' : 'none', background: chat.unread ? '#fafff5' : '#ffffff', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                {chat.avatar ? (
                  <img src={chat.avatar} alt={chat.name} style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1.5px solid #e2e2d8' }} />
                ) : (
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', color: '#0d0d0d', flexShrink: 0, border: '1.5px solid #0d0d0d' }}>
                    {chatInitials}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: chat.unread ? 700 : 600, color: '#0d0d0d' }}>{chat.name}</div>
                  <div style={{ fontSize: '12px', color: '#5a5a5a', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.lastMsg}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                  <div style={{ fontSize: '11px', color: '#5a5a5a' }}>{chat.time}</div>
                  {chat.unread && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#CAFF00', border: '1.5px solid #0d0d0d' }} />}
                </div>
              </button>
            )
          })}
        </>
      )}

      {/* Activities tab */}
      {tab === 'activities' && (
        <>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Past sessions</div>
          </div>

          {loadingSessions && (
            <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: '#5a5a5a' }}>Loading...</div>
          )}

          {!loadingSessions && sessions.length === 0 && (
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏃</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0d0d0d', marginBottom: '4px' }}>No sessions yet</div>
              <div style={{ fontSize: '12px', color: '#5a5a5a' }}>Start a session from any chat to track your activities</div>
            </div>
          )}

          {sessions.map((s, index) => (
            <div key={s.id} style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: '12px', borderBottom: index < sessions.length - 1 ? '1px solid #f0f0f0' : 'none', background: '#ffffff' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                {activityIcons[s.activity] || '🏃'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0d0d0d', textTransform: 'capitalize' }}>{s.activity.replace(/_/g, ' ')}</div>
                <div style={{ fontSize: '12px', color: '#5a5a5a', marginTop: '2px' }}>
                  With {s.other_name.split(' ')[0]}{s.duration_seconds ? ` · ${formatDuration(s.duration_seconds)}` : ''}
                </div>
                {s.rating && (
                  <div style={{ fontSize: '11px', color: '#f5a623', marginTop: '3px' }}>
                    {'★'.repeat(s.rating)}{'☆'.repeat(5 - s.rating)} {s.rating}.0
                  </div>
                )}
                {s.note && (
                  <div style={{ fontSize: '11px', color: '#5a5a5a', marginTop: '3px', fontStyle: 'italic' }}>
                    "{s.note}"
                  </div>
                )}
              </div>
              <div style={{ fontSize: '11px', color: '#5a5a5a', flexShrink: 0 }}>{s.completed_at}</div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}