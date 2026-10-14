'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SessionBanner from '@/components/SessionBanner'

interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
  image_url?: string
  is_edited?: boolean
  reply_to_id?: string
  reply_to_content?: string
}

interface OtherUser {
  id: string
  full_name: string
  avatar_url: string
  current_activity: string
  available_from: string
  available_until: string
  rating: number
  session_count: number
}

export default function ChatPage() {
  const router = useRouter()
  const params = useParams()
  const otherId = params.id as string

  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [menuMsgId, setMenuMsgId] = useState<string | null>(null)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { initChat() }, [otherId])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function initChat() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setCurrentUserId(user.id)

    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', otherId).single()
    if (profile) setOtherUser(profile)

    const { data: existing } = await supabase
      .from('conversations').select('id')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${otherId}),and(user1_id.eq.${otherId},user2_id.eq.${user.id})`)
      .is('closed_at', null).maybeSingle()

    let convId = existing?.id
    if (!convId) {
      const { data: newConv } = await supabase
        .from('conversations').insert({ user1_id: user.id, user2_id: otherId })
        .select('id').single()
      convId = newConv?.id
    }
    if (!convId) return
    setConversationId(convId)

    const { data: msgs } = await supabase
      .from('messages').select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    if (msgs) setMessages(msgs)
    setLoading(false)

    supabase.channel('chat-' + convId)
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` },
        (payload: any) => setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new]))
      .on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` },
        (payload: any) => setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m)))
      .on('postgres_changes' as any, { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload: any) => setMessages(prev => prev.filter(m => m.id !== payload.old.id)))
      .subscribe()
  }

  async function sendMessage() {
    if (!newMessage.trim() || sending || !conversationId) return
    setSending(true)
    const supabase = createClient()

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: newMessage.trim(),
      reply_to_id: replyTo?.id || null,
      reply_to_content: replyTo?.content || null,
    })

    setNewMessage('')
    setReplyTo(null)
    setSending(false)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !conversationId) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'].includes(file.type)) {
      alert('Only images allowed'); return
    }
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return }

    setUploading(true)
    const supabase = createClient()
    const fileName = `${currentUserId}/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('chat-images').upload(fileName, file)
    if (error) { alert('Upload failed: ' + error.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('chat-images').getPublicUrl(fileName)
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: '',
      image_url: publicUrl,
    })

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function saveEdit(msgId: string) {
    if (!editText.trim()) return
    const supabase = createClient()
    await supabase.from('messages')
      .update({ content: editText.trim(), is_edited: true })
      .eq('id', msgId).eq('sender_id', currentUserId)
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: editText.trim(), is_edited: true } : m))
    setEditingId(null)
    setEditText('')
  }

  async function deleteMessage(msgId: string) {
    if (!confirm('Delete this message?')) return
    const supabase = createClient()
    await supabase.from('messages').delete().eq('id', msgId).eq('sender_id', currentUserId)
    setMessages(prev => prev.filter(m => m.id !== msgId))
    setMenuMsgId(null)
  }

  function startReply(msg: Message) {
    setReplyTo(msg)
    setMenuMsgId(null)
    inputRef.current?.focus()
  }

  function formatTime(ts: string) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  function getInitials(name: string) {
    return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: '14px', color: '#5a5a5a' }}>Loading chat...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '52px 20px 14px', background: '#ffffff', borderBottom: '1px solid #e2e2d8', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <button onClick={() => router.back()} style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f5f5f0', border: 'none', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>←</button>
        <div onClick={() => router.push('/user/' + otherId)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}>
          {otherUser?.avatar_url ? (
            <img src={otherUser.avatar_url} alt={otherUser.full_name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: '#0d0d0d', flexShrink: 0 }}>
              {getInitials(otherUser?.full_name || '')}
            </div>
          )}
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0d0d0d' }}>{otherUser?.full_name}</div>
            <div style={{ fontSize: '11px', color: '#5a5a5a' }}>Tap to view profile</div>
          </div>
        </div>
      </div>

      {/* Session banner */}
      {conversationId && (
        <SessionBanner
          conversationId={conversationId}
          currentUserId={currentUserId}
          otherId={otherId}
          otherName={otherUser?.full_name || ''}
          activity={otherUser?.current_activity || 'workout'}
          availableTime={otherUser?.available_from && otherUser?.available_until
            ? `${otherUser.available_from} – ${otherUser.available_until}` : undefined}
        />
      )}

      {/* Messages */}
      <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>👋</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0d0d0d', marginBottom: '6px' }}>Say hello to {otherUser?.full_name?.split(' ')[0]}!</div>
            <div style={{ fontSize: '14px', color: '#5a5a5a' }}>Start the conversation</div>
          </div>
        )}

        {messages.map(msg => {
          const isMe = msg.sender_id === currentUserId
          const isEditing = editingId === msg.id
          const showMenu = menuMsgId === msg.id

          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>

              {isEditing ? (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', maxWidth: '72%' }}>
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    autoFocus
                    rows={2}
                    style={{ padding: '10px 14px', borderRadius: '18px', fontSize: '14px', border: '2px solid #CAFF00', outline: 'none', resize: 'none', background: '#f5f5f0', color: '#0d0d0d', minWidth: '200px' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button onClick={() => saveEdit(msg.id)} style={{ padding: '6px 10px', background: '#0d0d0d', color: '#CAFF00', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>Save</button>
                    <button onClick={() => { setEditingId(null); setEditText('') }} style={{ padding: '6px 10px', background: '#f5f5f0', color: '#5a5a5a', border: '1px solid #e2e2d8', borderRadius: '8px', fontSize: '11px', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ maxWidth: '72%', position: 'relative' }}>

                  {/* Reply quote */}
                  {msg.reply_to_content && (
                    <div style={{ padding: '6px 10px', background: '#f5f5f0', borderLeft: '3px solid #CAFF00', borderRadius: '8px', marginBottom: '4px', fontSize: '12px', color: '#5a5a5a', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      ↩ {msg.reply_to_content}
                    </div>
                  )}

                  {msg.image_url ? (
                    <img src={msg.image_url} alt="shared image" style={{ maxWidth: '100%', borderRadius: '14px', display: 'block', cursor: 'pointer' }} onClick={() => window.open(msg.image_url, '_blank')} />
                  ) : (
                    <div style={{ padding: '10px 14px', borderRadius: '18px', fontSize: '14px', lineHeight: 1.45, background: isMe ? '#0d0d0d' : '#f5f5f0', color: isMe ? '#CAFF00' : '#0d0d0d', borderBottomRightRadius: isMe ? '4px' : '18px', borderBottomLeftRadius: isMe ? '18px' : '4px' }}>
                      {msg.content}
                    </div>
                  )}

                  {/* Time + edited + dots */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                    {msg.is_edited && <span style={{ fontSize: '10px', color: '#5a5a5a', fontStyle: 'italic' }}>edited ·</span>}
                    <span style={{ fontSize: '10px', color: '#5a5a5a' }}>{formatTime(msg.created_at)}</span>
                    <button
                      onClick={e => { e.stopPropagation(); setMenuMsgId(showMenu ? null : msg.id) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#5a5a5a', padding: '0 2px', lineHeight: 1 }}
                    >
                      ···
                    </button>
                  </div>

                  {/* Menu */}
                  {showMenu && (
                    <div style={{ position: 'absolute', right: isMe ? 0 : 'auto', left: isMe ? 'auto' : 0, top: '100%', marginTop: '4px', background: '#ffffff', borderRadius: '12px', border: '1.5px solid #e2e2d8', overflow: 'hidden', zIndex: 50, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: '140px' }}>
                      <button
                        onClick={e => { e.stopPropagation(); startReply(msg) }}
                        style={{ width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#0d0d0d', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        ↩️ Reply
                      </button>
                      {isMe && !msg.image_url && (
                        <button
                          onClick={e => { e.stopPropagation(); setEditingId(msg.id); setEditText(msg.content); setMenuMsgId(null) }}
                          style={{ width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#0d0d0d', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                           Edit
                        </button>
                      )}
                      {isMe && (
                        <button
                          onClick={e => { e.stopPropagation(); deleteMessage(msg.id) }}
                          style={{ width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#cc0000', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                           Delete
                        </button>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); setMenuMsgId(null) }}
                        style={{ width: '100%', padding: '10px 16px', background: '#f5f5f0', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#5a5a5a', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        ✕ Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div style={{ padding: '8px 20px', background: '#f5f5f0', borderTop: '1px solid #e2e2d8', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ flex: 1, borderLeft: '3px solid #CAFF00', paddingLeft: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#0d0d0d', marginBottom: '2px' }}>
              Replying to {replyTo.sender_id === currentUserId ? 'yourself' : otherUser?.full_name?.split(' ')[0]}
            </div>
            <div style={{ fontSize: '12px', color: '#5a5a5a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {replyTo.content || '📷 Image'}
            </div>
          </div>
          <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#5a5a5a' }}>×</button>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '12px 20px 36px', borderTop: '1px solid #e2e2d8', background: '#ffffff', flexShrink: 0 }}>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />

        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{ width: '44px', height: '44px', flexShrink: 0, background: '#f5f5f0', border: '1.5px solid #e2e2d8', borderRadius: '50%', cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', transform: 'rotate(45deg)', opacity: uploading ? 0.5 : 1 }}
          >
            {uploading ? '⏳' : '📎'}
          </button>

          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder={replyTo ? 'Type your reply...' : `Message ${otherUser?.full_name?.split(' ')[0] || ''}...`}
            rows={1}
            style={{ flex: 1, padding: '12px 16px', background: '#f5f5f0', border: '1.5px solid #e2e2d8', borderRadius: '24px', fontFamily: 'sans-serif', fontSize: '14px', color: '#0d0d0d', resize: 'none', outline: 'none' }}
          />

          <button
            onClick={sendMessage}
            disabled={sending || !newMessage.trim()}
            style={{ width: '44px', height: '44px', flexShrink: 0, background: newMessage.trim() ? '#0d0d0d' : '#e2e2d8', border: newMessage.trim() ? '2px solid #CAFF00' : '2px solid #e2e2d8', borderRadius: '50%', cursor: newMessage.trim() ? 'pointer' : 'not-allowed', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: newMessage.trim() ? '#CAFF00' : '#5a5a5a' }}
          >
            ↑
          </button>
        </div>

        {uploading && <div style={{ fontSize: '12px', color: '#5a5a5a', marginTop: '6px', textAlign: 'center' }}>Uploading image...</div>}
      </div>
    </div>
  )
}