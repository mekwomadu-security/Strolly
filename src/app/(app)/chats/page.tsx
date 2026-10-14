'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'

interface Chat {
  id: string
  type: 'direct' | 'group'
  name: string
  avatar: string
  lastMsg: string
  time: string
  unread: boolean
  path: string
}

export default function ChatsPage() {
  const router = useRouter()
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchChats()
  }, [])

  async function fetchChats() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Get 1-on-1 conversations — exclude closed ones
    const { data: convs } = await supabase
      .from('conversations')
      .select('id, user1_id, user2_id, created_at')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .is('closed_at', null)
      .order('created_at', { ascending: false })

    const directChats: Chat[] = await Promise.all((convs || []).map(async conv => {
      const otherId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id
      const { data: p } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', otherId)
        .single()
      const { data: msgs } = await supabase
        .from('messages')
        .select('content, created_at, sender_id')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
      const lastMsg = msgs?.[0]
      const time = new Date(lastMsg?.created_at || conv.created_at)
      const diff = Date.now() - time.getTime()
      const timeStr = diff < 3600000
        ? Math.floor(diff / 60000) + 'm'
        : diff < 86400000
        ? Math.floor(diff / 3600000) + 'h'
        : Math.floor(diff / 86400000) + 'd'
      return {
        id: conv.id,
        type: 'direct' as const,
        name: p?.full_name || 'Unknown',
        avatar: p?.avatar_url || '',
        lastMsg: lastMsg?.content || 'Say hello 👋',
        time: timeStr,
        unread: lastMsg?.sender_id !== user.id,
        path: '/chat/' + otherId,
      }
    }))

    // Get group memberships
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id)
      .eq('status', 'active')

    const groupIds = memberships?.map(m => m.group_id) || []

    const groupChatsRaw: (Chat | null)[] = groupIds.length > 0 ? await Promise.all(
      groupIds.map(async groupId => {
        const { data: g } = await supabase
          .from('groups')
          .select('id, name, created_at, expires_at')
          .eq('id', groupId)
          .single()

        // Skip expired groups
        if (g?.expires_at && new Date(g.expires_at) < new Date()) {
          return null
        }

        const { data: msgs } = await supabase
          .from('group_messages')
          .select('content, created_at, sender_id')
          .eq('group_id', groupId)
          .order('created_at', { ascending: false })
          .limit(1)

        const lastMsg = msgs?.[0]
        const time = new Date(lastMsg?.created_at || g?.created_at || Date.now())
        const diff = Date.now() - time.getTime()
        const timeStr = diff < 3600000
          ? Math.floor(diff / 60000) + 'm'
          : diff < 86400000
          ? Math.floor(diff / 3600000) + 'h'
          : Math.floor(diff / 86400000) + 'd'

        let lastMsgText = 'No messages yet'
        if (lastMsg) {
          const { data: sender } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', lastMsg.sender_id)
            .single()
          const senderName = lastMsg.sender_id === user.id
            ? 'You'
            : sender?.full_name?.split(' ')[0] || 'Someone'
          lastMsgText = `${senderName}: ${lastMsg.content}`
        }

        return {
          id: groupId,
          type: 'group' as const,
          name: g?.name || 'Group',
          avatar: '',
          lastMsg: lastMsgText,
          time: timeStr,
          unread: lastMsg?.sender_id !== user.id,
          path: '/groups/' + groupId + '/chat',
        }
      })
    ) : []

    // Filter out null (expired groups)
    const groupChats = groupChatsRaw.filter((c): c is Chat => c !== null)

    // Merge and sort by most recent
    const allChats = [...directChats, ...groupChats].sort((a, b) => {
      const timeValue = (t: string) => {
        const num = parseInt(t)
        if (t.includes('m')) return num
        if (t.includes('h')) return num * 60
        return num * 1440
      }
      return timeValue(a.time) - timeValue(b.time)
    })

    setChats(allChats)
    setLoading(false)
  }

  function getInitials(name: string) {
    return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ padding: '52px 24px 16px', background: '#ffffff', borderBottom: '1px solid #e2e2d8' }}>
        <div style={{ fontSize: '24px', fontWeight: 800, color: '#0d0d0d', letterSpacing: '-0.5px' }}>Chats</div>
        <div style={{ fontSize: '13px', color: '#5a5a5a', marginTop: '2px' }}>Your conversations</div>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#5a5a5a', fontSize: '14px' }}>
            Loading chats...
          </div>
        )}

        {!loading && chats.length === 0 && (
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '40px', textAlign: 'center', border: '1.5px solid #e2e2d8', margin: '16px 24px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>💬</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0d0d0d', marginBottom: '8px' }}>No chats yet</div>
            <div style={{ fontSize: '14px', color: '#5a5a5a', lineHeight: 1.6, marginBottom: '20px' }}>
              Match with someone or join a group to start chatting
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                onClick={() => router.push('/nearby')}
                style={{ padding: '10px 20px', background: '#0d0d0d', color: '#CAFF00', border: 'none', borderRadius: '100px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Find matches
              </button>
              <button
                onClick={() => router.push('/groups')}
                style={{ padding: '10px 20px', background: '#f5f5f0', color: '#0d0d0d', border: '1.5px solid #e2e2d8', borderRadius: '100px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Join group
              </button>
            </div>
          </div>
        )}

        {!loading && chats.length > 0 && (
          <div style={{ background: '#ffffff', borderRadius: '20px', margin: '16px 24px', border: '1.5px solid #e2e2d8', overflow: 'hidden' }}>
            {chats.map((chat, index) => (
              <div
                key={chat.id}
                onClick={() => router.push(chat.path)}
                style={{
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  borderBottom: index < chats.length - 1 ? '1px solid #f0f0f0' : 'none',
                  background: chat.unread ? '#fafff5' : '#ffffff',
                }}
              >
                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {chat.avatar ? (
                    <img
                      src={chat.avatar}
                      alt={chat.name}
                      style={{ width: '48px', height: '48px', borderRadius: chat.type === 'group' ? '14px' : '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: chat.type === 'group' ? '14px' : '50%',
                      background: chat.type === 'group' ? '#0d0d0d' : '#CAFF00',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: chat.type === 'group' ? '22px' : '16px',
                      fontWeight: 800,
                      color: chat.type === 'group' ? '#CAFF00' : '#0d0d0d',
                    }}>
                      {chat.type === 'group' ? '👥' : getInitials(chat.name)}
                    </div>
                  )}
                  {chat.type === 'group' && (
                    <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '16px', height: '16px', borderRadius: '50%', background: '#CAFF00', border: '2px solid #ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 800, color: '#0d0d0d' }}>
                      G
                    </div>
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <div style={{ fontSize: '15px', fontWeight: chat.unread ? 800 : 600, color: '#0d0d0d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {chat.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#5a5a5a', flexShrink: 0, marginLeft: '8px' }}>
                      {chat.time} ago
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: chat.unread ? '#0d0d0d' : '#5a5a5a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: chat.unread ? 600 : 400 }}>
                    {chat.lastMsg}
                  </div>
                </div>

                {/* Unread dot */}
                {chat.unread && (
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#CAFF00', border: '1.5px solid #0d0d0d', flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}