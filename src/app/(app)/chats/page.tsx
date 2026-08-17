'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'

interface Conversation {
  id: string
  other_user_id: string
  other_user_name: string
  other_user_avatar: string
  last_message: string
  last_message_time: string
  unread: boolean
}

export default function ChatsPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')

  useEffect(() => {
    fetchConversations()
  }, [])

  async function fetchConversations() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setCurrentUserId(user.id)

    // Get all conversations
    const { data: convs } = await supabase
      .from('conversations')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (!convs || convs.length === 0) {
      setLoading(false)
      return
    }

    // For each conversation get the other user and last message
    const enriched = await Promise.all(convs.map(async conv => {
      const otherId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', otherId)
        .single()

      const { data: messages } = await supabase
        .from('messages')
        .select('content, created_at, sender_id')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)

      const lastMsg = messages?.[0]
      const time = lastMsg ? new Date(lastMsg.created_at) : new Date(conv.created_at)
      const now = new Date()
      const diff = now.getTime() - time.getTime()
      const mins = Math.floor(diff / 60000)
      const hours = Math.floor(diff / 3600000)
      const days = Math.floor(diff / 86400000)
      const timeStr = mins < 60 ? `${mins}m` : hours < 24 ? `${hours}h` : `${days}d`

      return {
        id: conv.id,
        other_user_id: otherId,
        other_user_name: profile?.full_name || 'Unknown',
        other_user_avatar: profile?.avatar_url || '',
        last_message: lastMsg?.content || 'Hey Strollian 👋',
        last_message_time: timeStr,
        unread: lastMsg?.sender_id !== user.id,
      }
    }))

    setConversations(enriched)
    setLoading(false)
  }

  function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ padding: '56px 24px 16px', background: '#ffffff', borderBottom: '1px solid #e2e2d8' }}>
        <div style={{ fontSize: '24px', fontWeight: 800, color: '#0d0d0d', letterSpacing: '-0.5px' }}>
          Chats
        </div>
        <div style={{ fontSize: '13px', color: '#5a5a5a', marginTop: '2px' }}>
          Your conversations
        </div>
      </div>

      <div style={{ padding: '16px 24px', maxWidth: '480px', margin: '0 auto' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#5a5a5a', fontSize: '14px' }}>
            Loading chats...
          </div>
        )}

        {!loading && conversations.length === 0 && (
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '40px', textAlign: 'center', border: '1.5px solid #e2e2d8' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>💬</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0d0d0d', marginBottom: '8px' }}>
              No chats yet
            </div>
            <div style={{ fontSize: '14px', color: '#5a5a5a', lineHeight: 1.6, marginBottom: '20px' }}>
              Match with someone to start a conversation
            </div>
            <button
              onClick={() => router.push('/ai-match')}
              style={{ padding: '12px 24px', background: '#CAFF00', color: '#0d0d0d', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
            >
              ✨ Find a match
            </button>
          </div>
        )}

        {!loading && conversations.length > 0 && (
          <div style={{ background: '#ffffff', borderRadius: '20px', border: '1.5px solid #e2e2d8', overflow: 'hidden' }}>
            {conversations.map((conv, index) => (
              <div
                key={conv.id}
                onClick={() => router.push('/chat/' + conv.other_user_id)}
                style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: index < conversations.length - 1 ? '1px solid #e2e2d8' : 'none', cursor: 'pointer', background: conv.unread ? '#fafff5' : '#ffffff' }}
                onMouseOver={e => e.currentTarget.style.background = '#f5f5f0'}
                onMouseOut={e => e.currentTarget.style.background = conv.unread ? '#fafff5' : '#ffffff'}
              >
                {/* Avatar */}
                <div style={{ flexShrink: 0, position: 'relative' }}>
                  {conv.other_user_avatar ? (
                    <img
                      src={conv.other_user_avatar}
                      alt={conv.other_user_name}
                      style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e2d8' }}
                    />
                  ) : (
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '16px', color: '#0d0d0d', border: '2px solid #0d0d0d' }}>
                      {getInitials(conv.other_user_name)}
                    </div>
                  )}
                  {conv.unread && (
                    <div style={{ position: 'absolute', bottom: '0', right: '0', width: '12px', height: '12px', borderRadius: '50%', background: '#CAFF00', border: '2px solid #ffffff' }} />
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <div style={{ fontSize: '15px', fontWeight: conv.unread ? 700 : 600, color: '#0d0d0d' }}>
                      {conv.other_user_name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#5a5a5a', flexShrink: 0, marginLeft: '8px' }}>
                      {conv.last_message_time}
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: conv.unread ? '#0d0d0d' : '#5a5a5a', fontWeight: conv.unread ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {conv.last_message}
                  </div>
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