'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
  full_name?: string
  avatar_url?: string
  image_url?: string
  is_edited?: boolean
  reply_to_id?: string
  reply_to_content?: string
}

interface Group {
  id: string
  name: string
  is_public: boolean
  created_by: string
  admin_id: string
}

interface Member {
  user_id: string
  role: string
  full_name: string
  avatar_url: string
}

export default function GroupChatPage() {
  const router = useRouter()
  const params = useParams()
  const groupId = params.id as string

  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [memberCount, setMemberCount] = useState(0)
  const [showMembers, setShowMembers] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [menuMsgId, setMenuMsgId] = useState<string | null>(null)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { initChat() }, [])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function initChat() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setCurrentUserId(user.id)

    const { data: groupData } = await supabase
      .from('groups').select('*').eq('id', groupId).single()
    if (!groupData) { router.push('/groups'); return }
    setGroup(groupData)

    const isAdmin = user.id === groupData.created_by || user.id === groupData.admin_id

    const { data: membership } = await supabase
      .from('group_members').select('id, status')
      .eq('group_id', groupId).eq('user_id', user.id).maybeSingle()

    if (isAdmin && !membership) {
      await supabase.from('group_members').upsert({
        group_id: groupId, user_id: user.id, status: 'active', role: 'admin',
      }, { onConflict: 'group_id,user_id' })
    } else if (!isAdmin && (!membership || membership.status !== 'active')) {
      router.push('/groups/' + groupId); return
    }

    const { data: membersData } = await supabase
      .from('group_members').select('user_id, role')
      .eq('group_id', groupId).eq('status', 'active')

    if (membersData) {
      const enriched = await Promise.all(membersData.map(async m => {
        const { data: p } = await supabase.from('profiles')
          .select('full_name, avatar_url').eq('id', m.user_id).single()
        return { user_id: m.user_id, role: m.role, full_name: p?.full_name || 'Unknown', avatar_url: p?.avatar_url || '' }
      }))
      setMembers(enriched)
      setMemberCount(enriched.length)
    }

    await fetchMessages()
    setLoading(false)

    supabase.channel('group-chat-' + groupId)
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
        async (payload: any) => {
          const { data: profile } = await supabase.from('profiles')
            .select('full_name, avatar_url').eq('id', payload.new.sender_id).single()
          setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, {
            ...payload.new, full_name: profile?.full_name || 'Unknown', avatar_url: profile?.avatar_url || '',
          }])
        })
      .on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
        (payload: any) => setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m)))
      .on('postgres_changes' as any, { event: 'DELETE', schema: 'public', table: 'group_messages' },
        (payload: any) => setMessages(prev => prev.filter(m => m.id !== payload.old.id)))
      .subscribe()
  }

  async function fetchMessages() {
    const supabase = createClient()
    const { data: msgs } = await supabase
      .from('group_messages').select('*')
      .eq('group_id', groupId).order('created_at', { ascending: true })

    if (msgs) {
      const enriched = await Promise.all(msgs.map(async m => {
        const { data: p } = await supabase.from('profiles')
          .select('full_name, avatar_url').eq('id', m.sender_id).single()
        return { ...m, full_name: p?.full_name || 'Unknown', avatar_url: p?.avatar_url || '' }
      }))
      setMessages(enriched)
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || sending) return
    setSending(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('group_messages').insert({
      group_id: groupId,
      sender_id: user.id,
      content: newMessage.trim(),
      reply_to_id: replyTo?.id || null,
      reply_to_content: replyTo?.content || null,
    })

    if (error) alert('Failed to send: ' + error.message)
    setNewMessage('')
    setReplyTo(null)
    setSending(false)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'].includes(file.type)) {
      alert('Only images allowed'); return
    }
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return }

    setUploading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const fileName = `${user.id}/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('chat-images').upload(fileName, file)
    if (error) { alert('Upload failed: ' + error.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('chat-images').getPublicUrl(fileName)
    await supabase.from('group_messages').insert({
      group_id: groupId, sender_id: user.id, content: '', image_url: publicUrl,
    })

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function saveEdit(msgId: string) {
    if (!editText.trim()) return
    const supabase = createClient()
    await supabase.from('group_messages')
      .update({ content: editText.trim(), is_edited: true })
      .eq('id', msgId).eq('sender_id', currentUserId)
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: editText.trim(), is_edited: true } : m))
    setEditingId(null)
    setEditText('')
  }

  async function deleteMessage(msgId: string) {
    if (!confirm('Delete this message?')) return
    const supabase = createClient()
    await supabase.from('group_messages').delete().eq('id', msgId).eq('sender_id', currentUserId)
    setMessages(prev => prev.filter(m => m.id !== msgId))
    setMenuMsgId(null)
  }

  function startReply(msg: Message) {
    setReplyTo(msg)
    setMenuMsgId(null)
    inputRef.current?.focus()
  }

  function getInitials(name: string) {
    return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'
  }

  function formatTime(ts: string) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: '14px', color: '#5a5a5a' }}>Loading chat...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

      {/* Members slide-in panel */}
      {showMembers && (
        <div onClick={() => setShowMembers(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 100 }} />
      )}
      <div style={{ position: 'fixed', top: 0, right: showMembers ? 0 : '-300px', width: '280px', height: '100vh', background: '#ffffff', zIndex: 101, transition: 'right 0.3s ease', boxShadow: '-4px 0 20px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '52px 20px 16px', borderBottom: '1px solid #e2e2d8' }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0d0d0d' }}>Members</div>
          <div style={{ fontSize: '12px', color: '#5a5a5a', marginTop: '2px' }}>{memberCount} in this group</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
          {members.map(member => (
            <div key={member.user_id} onClick={() => { setShowMembers(false); router.push('/user/' + member.user_id) }}
              style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              {member.avatar_url ? (
                <img src={member.avatar_url} alt={member.full_name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: '#0d0d0d', flexShrink: 0 }}>
                  {getInitials(member.full_name)}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0d0d0d' }}>{member.full_name}</div>
                {member.role === 'admin' && <div style={{ fontSize: '11px', color: '#5a5a5a' }}>👑 Admin</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Header */}
      <div style={{ padding: '52px 20px 14px', background: '#ffffff', borderBottom: '1px solid #e2e2d8', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <button onClick={() => router.push('/groups')} style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f5f5f0', border: 'none', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#0d0d0d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group?.name}</div>
          <div style={{ fontSize: '11px', color: '#5a5a5a', marginTop: '1px' }}>{memberCount} member{memberCount !== 1 ? 's' : ''} · Group chat</div>
        </div>
        <button onClick={() => setShowMembers(true)} style={{ padding: '6px 14px', background: '#f5f5f0', color: '#0d0d0d', border: 'none', borderRadius: '100px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
          Members
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>👋</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0d0d0d', marginBottom: '6px' }}>Welcome to {group?.name}!</div>
            <div style={{ fontSize: '14px', color: '#5a5a5a' }}>Be the first to say something</div>
          </div>
        )}

        {messages.map(msg => {
          const isMe = msg.sender_id === currentUserId
          const isEditing = editingId === msg.id
          const showMenu = menuMsgId === msg.id

          return (
            <div key={msg.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexDirection: isMe ? 'row-reverse' : 'row' }}>
              {!isMe && (
                <div style={{ flexShrink: 0 }}>
                  {msg.avatar_url ? (
                    <img src={msg.avatar_url} alt={msg.full_name} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: '#0d0d0d' }}>
                      {getInitials(msg.full_name || '')}
                    </div>
                  )}
                </div>
              )}

              <div style={{ maxWidth: '72%', position: 'relative' }}>
                {!isMe && (
                  <div style={{ fontSize: '11px', color: '#5a5a5a', marginBottom: '3px', paddingLeft: '2px' }}>{msg.full_name}</div>
                )}

                {isEditing ? (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
                    <textarea
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      autoFocus rows={2}
                      style={{ padding: '10px 14px', borderRadius: '18px', fontSize: '14px', border: '2px solid #CAFF00', outline: 'none', resize: 'none', background: '#f5f5f0', color: '#0d0d0d', minWidth: '180px' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <button onClick={() => saveEdit(msg.id)} style={{ padding: '6px 10px', background: '#0d0d0d', color: '#CAFF00', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>Save</button>
                      <button onClick={() => { setEditingId(null); setEditText('') }} style={{ padding: '6px 10px', background: '#f5f5f0', color: '#5a5a5a', border: '1px solid #e2e2d8', borderRadius: '8px', fontSize: '11px', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Reply quote */}
                    {msg.reply_to_content && (
                      <div style={{ padding: '6px 10px', background: '#f5f5f0', borderLeft: '3px solid #CAFF00', borderRadius: '8px', marginBottom: '4px', fontSize: '12px', color: '#5a5a5a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                  </>
                )}
              </div>
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
              Replying to {replyTo.sender_id === currentUserId ? 'yourself' : replyTo.full_name?.split(' ')[0]}
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
            placeholder={replyTo ? 'Type your reply...' : `Message ${group?.name || 'the group'}...`}
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