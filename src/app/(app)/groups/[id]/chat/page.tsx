'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  content: string
  sender_id: string
  is_deleted: boolean
  created_at: string
  profiles: {
    full_name: string
  }
}

interface Group {
  id: string
  name: string
  activity: string
  admin_id: string
}

const activityIcons: Record<string, string> = {
  gym: '🏋️', jogging: '🏃', cycling: '🚴',
  football: '⚽', yoga: '🧘', swimming: '🏊',
  dog_walk: '🐕', badminton: '🏸', tennis: '🎾',
}

export default function GroupChatPage() {
  const router = useRouter()
  const params = useParams()
  const groupId = params.id as string

  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [group, setGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    initChat()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function initChat() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setCurrentUserId(user.id)

    // Check if member
    const { data: member } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!member) {
      router.push(`/groups/${groupId}`)
      return
    }

    // Get group info
    const { data: groupData } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single()

    if (groupData) setGroup(groupData)

    // Get messages
    const { data: msgs } = await supabase
      .from('group_messages')
      .select('*, profiles(full_name)')
      .eq('group_id', groupId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    if (msgs) setMessages(msgs)
    setLoading(false)

    // Realtime subscription
    supabase
      .channel(`group-chat-${groupId}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`,
        },
        async (payload: any) => {
          const { data: newMsg } = await supabase
            .from('group_messages')
            .select('*, profiles(full_name)')
            .eq('id', payload.new.id)
            .single()

          if (newMsg) {
            setMessages(prev => [...prev, newMsg])
          }
        }
      )
      .subscribe()
  }

  async function sendMessage() {
    if (!newMessage.trim() || sending) return
    setSending(true)

    const supabase = createClient()
    await supabase.from('group_messages').insert({
      group_id: groupId,
      sender_id: currentUserId,
      content: newMessage.trim(),
    })

    setNewMessage('')
    setSending(false)
  }

  async function deleteMessage(messageId: string) {
    const supabase = createClient()
    await supabase
      .from('group_messages')
      .update({ is_deleted: true })
      .eq('id', messageId)

    setMessages(prev => prev.filter(m => m.id !== messageId))
  }

  function formatTime(timestamp: string) {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '56px 24px 16px', background: '#ffffff', borderBottom: '1px solid #e2e2d8', display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
        <button
          onClick={() => router.push(`/groups/${groupId}`)}
          style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f5f5f0', border: 'none', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          ←
        </button>
        <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', border: '2px solid #0d0d0d', flexShrink: 0 }}>
          {activityIcons[group?.activity || ''] || '👥'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'sans-serif', fontSize: '16px', fontWeight: 700, color: '#0d0d0d' }}>
            {group?.name || 'Group Chat'}
          </div>
          <div style={{ fontSize: '11px', color: '#5a5a5a', marginTop: '2px' }}>
            Group chat
          </div>
        </div>
        <button
          onClick={() => router.push(`/groups/${groupId}`)}
          style={{ padding: '8px 14px', background: '#f5f5f0', border: '1.5px solid #e2e2d8', borderRadius: '100px', fontSize: '12px', fontWeight: 600, color: '#0d0d0d', cursor: 'pointer' }}
        >
          Members
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, padding: '16px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#5a5a5a', fontSize: '14px' }}>
            Loading messages...
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>👋</div>
            <div style={{ fontFamily: 'sans-serif', fontSize: '16px', fontWeight: 700, color: '#0d0d0d', marginBottom: '6px' }}>
              Welcome to {group?.name}!
            </div>
            <div style={{ fontSize: '13px', color: '#5a5a5a' }}>
              Be the first to say something
            </div>
          </div>
        )}

        {messages.map(msg => {
          const isMe = msg.sender_id === currentUserId
          const isAdmin = group?.admin_id === currentUserId

          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              {/* Sender name for others */}
              {!isMe && (
                <div style={{ fontSize: '11px', color: '#5a5a5a', marginBottom: '4px', paddingLeft: '4px' }}>
                  {msg.profiles?.full_name}
                </div>
              )}
              <div style={{ maxWidth: '75%', position: 'relative' }}>
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '18px',
                  fontSize: '14px',
                  lineHeight: 1.45,
                  background: isMe ? '#0d0d0d' : '#f5f5f0',
                  color: isMe ? '#CAFF00' : '#0d0d0d',
                  borderBottomRightRadius: isMe ? '4px' : '18px',
                  borderBottomLeftRadius: isMe ? '18px' : '4px',
                }}>
                  {msg.content}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{ fontSize: '10px', color: '#5a5a5a' }}>
                    {formatTime(msg.created_at)}
                  </div>
                  {(isMe || isAdmin) && (
                    <button
                      onClick={() => deleteMessage(msg.id)}
                      style={{ fontSize: '10px', color: '#cc0000', background: 'none', border: 'none', cursor: 'pointer', padding: '0' }}
                    >
                      delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 24px 36px', display: 'flex', gap: '10px', alignItems: 'flex-end', borderTop: '1px solid #e2e2d8', background: '#ffffff', flexShrink: 0 }}>
        <textarea
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
          placeholder="Message the group…"
          rows={1}
          style={{ flex: 1, padding: '12px 16px', background: '#f5f5f0', border: '1.5px solid #e2e2d8', borderRadius: '24px', fontFamily: 'sans-serif', fontSize: '14px', color: '#0d0d0d', resize: 'none', outline: 'none' }}
        />
        <button
          onClick={sendMessage}
          disabled={sending || !newMessage.trim()}
          style={{ width: '44px', height: '44px', flexShrink: 0, background: newMessage.trim() ? '#CAFF00' : '#e2e2d8', border: '2px solid #0d0d0d', borderRadius: '50%', cursor: newMessage.trim() ? 'pointer' : 'not-allowed', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          
        </button>
      </div>

    </div>
  )
}