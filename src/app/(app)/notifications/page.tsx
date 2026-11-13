'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  group_id: string | null
  sender_id: string | null
  is_read: boolean
  created_at: string
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchAndMarkRead()
  }, [])

  async function fetchAndMarkRead() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) setNotifications(data.map(n => ({ ...n, is_read: true })))
    setLoading(false)
  }

  async function handleAcceptMatchRequest(notif: Notification) {
    if (!notif.sender_id) return
    setActioning(prev => ({ ...prev, [notif.id]: true }))

    await fetch('/api/match-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept', senderId: notif.sender_id }),
    })

    setNotifications(prev => prev.filter(n => n.id !== notif.id))
    router.push('/chat/' + notif.sender_id)
  }

  async function handleDeclineMatchRequest(notif: Notification) {
    if (!notif.sender_id) return
    setActioning(prev => ({ ...prev, [notif.id]: true }))

    await fetch('/api/match-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'decline', senderId: notif.sender_id }),
    })

    setNotifications(prev => prev.filter(n => n.id !== notif.id))
  }

  async function handleAcceptInvite(groupId: string, notifId: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('group_members').update({ status: 'active' }).eq('group_id', groupId).eq('user_id', user.id)
    await supabase.from('group_members').upsert({ group_id: groupId, user_id: user.id, status: 'active', role: 'member' }, { onConflict: 'group_id,user_id' })
    await supabase.from('notifications').delete().eq('user_id', user.id).eq('group_id', groupId)

    setNotifications(prev => prev.filter(n => n.group_id !== groupId))
    await new Promise(r => setTimeout(r, 800))
    router.push('/groups/' + groupId)
  }

  async function handleDeclineInvite(groupId: string, notifId: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', user.id)
    await supabase.from('notifications').delete().eq('user_id', user.id).eq('group_id', groupId)

    setNotifications(prev => prev.filter(n => n.group_id !== groupId))
  }

  async function dismissNotification(notifId: string) {
    const supabase = createClient()
    await supabase.from('notifications').delete().eq('id', notifId)
    setNotifications(prev => prev.filter(n => n.id !== notifId))
  }

  function getTimeAgo(timestamp: string) {
    const diff = Date.now() - new Date(timestamp).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  function getIcon(type: string) {
    switch (type) {
      case 'match_request': return '👋'
      case 'match_accepted': return '🎉'
      case 'group_invite': return '👥'
      case 'group_added': return '✅'
      case 'group_accepted': return '🎉'
      case 'group_join': return '👋'
      case 'match': return '✨'
      case 'message': return '💬'
      default: return '🔔'
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', paddingBottom: '80px' }}>

      <div style={{ padding: '56px 24px 16px', background: '#ffffff', borderBottom: '1px solid #e2e2d8' }}>
        <div style={{ fontSize: '24px', fontWeight: 800, color: '#0d0d0d', letterSpacing: '-0.5px' }}>
          Notifications
        </div>
        <div style={{ fontSize: '13px', color: '#5a5a5a', marginTop: '2px' }}>
          {notifications.length === 0 ? 'All caught up' : `${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`}
        </div>
      </div>

      <div style={{ padding: '16px 24px', maxWidth: '480px', margin: '0 auto' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#5a5a5a', fontSize: '14px' }}>
            Loading...
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '40px', textAlign: 'center', border: '1.5px solid #e2e2d8' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔔</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0d0d0d', marginBottom: '8px' }}>
              No notifications
            </div>
            <div style={{ fontSize: '14px', color: '#5a5a5a', lineHeight: 1.6 }}>
              Notifications appear here when someone sends you a match request or invites you to a group.
            </div>
          </div>
        )}

        {!loading && notifications.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {notifications.map(notif => (
              <div
                key={notif.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '20px',
                  padding: '16px 18px',
                  border: notif.type === 'match_request' ? '1.5px solid #CAFF00' : '1.5px solid #e2e2d8',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '12px',
                    background: notif.type === 'match_request' ? '#0d0d0d' : '#f5f5f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px', flexShrink: 0
                  }}>
                    {getIcon(notif.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0d0d0d', marginBottom: '4px' }}>
                      {notif.title}
                    </div>
                    <div style={{ fontSize: '13px', color: '#5a5a5a', lineHeight: 1.5, marginBottom: '6px' }}>
                      {notif.message}
                    </div>
                    <div style={{ fontSize: '11px', color: '#5a5a5a' }}>
                      {getTimeAgo(notif.created_at)}
                    </div>

                    {/* Match request — Accept / Decline */}
                    {notif.type === 'match_request' && notif.sender_id && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        <button
                          onClick={() => handleAcceptMatchRequest(notif)}
                          disabled={actioning[notif.id]}
                          style={{ padding: '8px 18px', background: '#CAFF00', color: '#0d0d0d', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: actioning[notif.id] ? 0.6 : 1 }}
                        >
                          {actioning[notif.id] ? '...' : 'Accept'}
                        </button>
                        <button
                          onClick={() => handleDeclineMatchRequest(notif)}
                          disabled={actioning[notif.id]}
                          style={{ padding: '8px 16px', background: '#fff0f0', color: '#cc0000', border: '1px solid #ffcccc', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: actioning[notif.id] ? 0.6 : 1 }}
                        >
                          Decline
                        </button>
                      </div>
                    )}

                    {/* Match accepted — open chat */}
                    {notif.type === 'match_accepted' && notif.sender_id && (
                      <button
                        onClick={() => { dismissNotification(notif.id); router.push('/chat/' + notif.sender_id) }}
                        style={{ marginTop: '10px', padding: '8px 16px', background: '#0d0d0d', color: '#CAFF00', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Open chat →
                      </button>
                    )}

                    {/* Group invite */}
                    {notif.type === 'group_invite' && notif.group_id && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        <button
                          onClick={() => handleAcceptInvite(notif.group_id!, notif.id)}
                          style={{ padding: '8px 18px', background: '#CAFF00', color: '#0d0d0d', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDeclineInvite(notif.group_id!, notif.id)}
                          style={{ padding: '8px 16px', background: '#fff0f0', color: '#cc0000', border: '1px solid #ffcccc', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Decline
                        </button>
                      </div>
                    )}

                    {/* View group */}
                    {(notif.type === 'group_added' || notif.type === 'group_accepted' || notif.type === 'group_join') && notif.group_id && (
                      <button
                        onClick={() => router.push('/groups/' + notif.group_id)}
                        style={{ marginTop: '10px', padding: '8px 16px', background: '#0d0d0d', color: '#CAFF00', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        View group →
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => dismissNotification(notif.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#5a5a5a', flexShrink: 0, lineHeight: 1 }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
