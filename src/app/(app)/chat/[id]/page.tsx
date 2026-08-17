'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SessionBanner from '@/components/SessionBanner'

interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
}

interface Profile {
  id: string
  full_name: string
  current_activity: string
  available_time: string
  avatar_url: string
}

export default function ChatPage() {
  const router = useRouter()
  const params = useParams()
  const otherId = params.id as string

  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null)
  const [conversationId, setConversationId] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const otherProfileRef = useRef<Profile | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    initChat()
    return () => {
      const supabase = createClient()
      supabase.channel(`chat-${conversationId}`).unsubscribe()
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  async function initChat() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setCurrentUserId(user.id)

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, current_activity, available_time, avatar_url')
      .eq('id', otherId)
      .single()

    if (profile) {
      setOtherProfile(profile)
      otherProfileRef.current = profile
    }

    let convId = ''
    let isNew = false

    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .or(
        `and(user1_id.eq.${user.id},user2_id.eq.${otherId}),` +
        `and(user1_id.eq.${otherId},user2_id.eq.${user.id})`
      )
      .maybeSingle()

    if (existing) {
      convId = existing.id
    } else {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({ user1_id: user.id, user2_id: otherId })
        .select('id')
        .single()
      if (newConv) { convId = newConv.id; isNew = true }
    }

    setConversationId(convId)

    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })

    if (msgs) setMessages(msgs)
    setLoading(false)

    if (isNew && convId) {
      const activity = otherProfileRef.current?.current_activity?.replace('_', ' ') || 'work out'
      await supabase.from('messages').insert({
        conversation_id: convId,
        sender_id: user.id,
        content: `Hey Strollian! 👋 — want to ${activity} together?`,
      })
    }

    supabase
      .channel(`chat-${convId}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${convId}`,
        },
        (payload: any) => {
          setMessages(prev => [...prev, payload.new as Message])
        }
      )
      .subscribe()
  }

  async function sendMessage() {
    if (!newMessage.trim() || !conversationId || sending) return
    setSending(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: newMessage.trim(),
    })

    if (!error) setNewMessage('')
    setSending(false)
  }

  function formatTime(timestamp: string) {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const initials = otherProfile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '??'

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '56px 24px 16px', background: '#ffffff', borderBottom: '1px solid #e2e2d8', display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
        <button
          onClick={() => router.back()}
          style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f5f5f0', border: 'none', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          ←
        </button>

        {/* Avatar — real photo or initials */}
        <div
          onClick={() => router.push('/user/' + otherId)}
          style={{ width: '44px', height: '44px', borderRadius: '14px', border: '2px solid #0d0d0d', flexShrink: 0, cursor: 'pointer', overflow: 'hidden' }}
        >
          {otherProfile?.avatar_url ? (
            <img src={otherProfile.avatar_url} alt={otherProfile.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '16px', color: '#0d0d0d' }}>
              {initials}
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div
            onClick={() => router.push('/user/' + otherId)}
            style={{ fontFamily: 'sans-serif', fontSize: '16px', fontWeight: 700, color: '#0d0d0d', cursor: 'pointer' }}
          >
            {otherProfile?.full_name || 'Loading...'}
          </div>
          <div style={{ fontSize: '11px', color: '#5a5a5a', marginTop: '2px' }}>
            <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', marginRight: '4px', verticalAlign: 'middle' }}></span>
            Active now
          </div>
        </div>
      </div>

      {/* Session banner — replaces the old activity bar, handles all states */}
      {conversationId && (
        <SessionBanner
          conversationId={conversationId}
          currentUserId={currentUserId}
          otherId={otherId}
          otherName={otherProfile?.full_name || ''}
          activity={otherProfile?.current_activity || ''}
          availableTime={otherProfile?.available_time || ''}
        />
      )}

      {/* Messages */}
      <div style={{ flex: 1, padding: '8px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#5a5a5a', fontSize: '14px' }}>
            Loading messages...
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>👋</div>
            <div style={{ fontFamily: 'sans-serif', fontSize: '16px', fontWeight: 700, color: '#0d0d0d', marginBottom: '6px' }}>
              Say hello to {otherProfile?.full_name?.split(' ')[0]}!
            </div>
            <div style={{ fontSize: '13px', color: '#5a5a5a' }}>
              You've been matched. Start the conversation.
            </div>
          </div>
        )}

        {messages.map(msg => {
          const isMe = msg.sender_id === currentUserId
          return (
            <div
              key={msg.id}
              style={{ maxWidth: '75%', alignSelf: isMe ? 'flex-end' : 'flex-start' }}
            >
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
              <div style={{ fontSize: '10px', color: '#5a5a5a', marginTop: '3px', padding: '0 2px', textAlign: isMe ? 'right' : 'left' }}>
                {formatTime(msg.created_at)}
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
          placeholder={`Message ${otherProfile?.full_name?.split(' ')[0] || ''}…`}
          rows={1}
          style={{ flex: 1, padding: '12px 16px', background: '#f5f5f0', border: '1.5px solid #e2e2d8', borderRadius: '24px', fontFamily: 'sans-serif', fontSize: '14px', color: '#0d0d0d', resize: 'none', outline: 'none' }}
        />
        <button
          onClick={sendMessage}
          disabled={sending || !newMessage.trim()}
          style={{
            width: '44px',
            height: '44px',
            flexShrink: 0,
            background: newMessage.trim() ? '#CAFF00' : '#e2e2d8',
            border: '2px solid #0d0d0d',
            borderRadius: '50%',
            cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: sending ? 0.6 : 1,
            transition: 'all 0.15s',
          }}
        >
          ↑
        </button>
      </div>

    </div>
  )
}