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
  is_read: boolean
  created_at: string
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
  }, [])

  async function fetchNotifications() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) setNotifications(data)
    setLoading(false)

    // Mark all as read
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
  }

  async function handleAcceptInvite(groupId: string, notifId: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('group_members')
      .update({ status: 'active' })
      .eq('group_id', groupId)
      .eq('user_id', user.id)

    await supabase
      .from('notifications')
      .delete()
      .eq('id', notifId)

    setNotifications(prev => prev.filter(n => n.id !== notifId))
    router.push('/groups/' + groupId + '/chat')
  }

  async function handleDeclineInvite(groupId: string, notifId: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.id)

    await supabase
      .from('notifications')
      .delete()
      .eq('id', notifId)

    setNotifications(prev => prev.filter(n => n.id !== notifId))
  }

  async function dismissNotification(notifId: string) {
    const supabase = createClient()
    await supabase.from('notifications').delete().eq('id', notifId)
    setNotifications(prev => prev.filter(n => n.id !== notifId))
  }

  function getTimeAgo(timestamp: string) {
    const now = new Date()
    const time = new Date(timestamp)
    const diff = now.getTime() - time.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  function getIcon(type: string) {
    switch (type) {
      case 'group_invite': return '👥'
      case 'group_added': return '✅'
      case 'match': return '✨'
      case 'message': return '💬'
      default: return '🔔'
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ padding: '56px 24px 16px', background: '#ffffff', borderBottom: '1px solid #e2e2d8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0d0d0d', letterSpacing: '-0.5px' }}>
            Notifications
          </div>
          <div style={{ fontSize: '13px', color: '#5a5a5a', marginTop: '2px' }}>
            {notifications.filter(n => !n.is_read).length > 0
              ? `${notifications.filter(n => !n.is_read).length} unread`
              : 'All caught up'}
          </div>
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
              You're all caught up! Notifications will appear here when someone invites you to a group or matches with you.
            </div>
          </div>
        )}

        {!loading && notifications.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {notifications.map(notif => (
              <div
                key={notif.id}
                style={{ background: notif.is_read ? '#ffffff' : '#fafff5', borderRadius: '20px', padding: '16px 18px', border: `1.5px solid ${notif.is_read ? '#e2e2d8' : '#a8d900'}` }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f0ffe0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                    {getIcon(notif.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0d0d0d', marginBottom: '4px' }}>
                      {notif.title}
                    </div>
                    <div style={{ fontSize: '13px', color: '#5a5a5a', lineHeight: 1.5, marginBottom: '8px' }}>
                      {notif.message}
                    </div>
                    <div style={{ fontSize: '11px', color: '#5a5a5a' }}>
                      {getTimeAgo(notif.created_at)}
                    </div>

                    {/* Accept/Decline for group invites */}
                    {notif.type === 'group_invite' && notif.group_id && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        <button
                          onClick={() => handleAcceptInvite(notif.group_id!, notif.id)}
                          style={{ padding: '8px 16px', background: '#CAFF00', color: '#0d0d0d', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
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

                    {/* View group for group_added */}
                    {notif.type === 'group_added' && notif.group_id && (
                      <button
                        onClick={() => router.push('/groups/' + notif.group_id)}
                        style={{ marginTop: '10px', padding: '8px 16px', background: '#0d0d0d', color: '#CAFF00', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        View group →
                      </button>
                    )}
                  </div>

                  {/* Dismiss button */}
                  <button
                    onClick={() => dismissNotification(notif.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#5a5a5a', flexShrink: 0, padding: '0' }}
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