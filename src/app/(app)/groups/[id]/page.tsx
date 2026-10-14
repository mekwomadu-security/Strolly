'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'

interface Group {
  id: string
  name: string
  description: string
  city: string
  is_public: boolean
  max_members: number | null
  scheduled_date: string
  scheduled_from: string
  scheduled_until: string
  available_date: string
  available_from: string
  available_until: string
  admin_id: string
  created_by: string
  is_recurring: boolean
  expires_at: string
}

interface Member {
  id: string
  user_id: string
  status: string
  role: string
  profiles: {
    full_name: string
    avatar_url: string
  }
}

export default function GroupDetailPage() {
  const router = useRouter()
  const params = useParams()
  const groupId = params.id as string

  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')
  const [isMember, setIsMember] = useState(false)
  const [memberStatus, setMemberStatus] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchGroup()
  }, [])

  async function fetchGroup() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setCurrentUserId(user.id)

    const { data: groupData } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single()

    if (groupData) setGroup(groupData)

    const { data: membersData } = await supabase
      .from('group_members')
      .select('*, profiles(full_name, avatar_url)')
      .eq('group_id', groupId)

    if (membersData) {
      setMembers(membersData)
      const mine = membersData.find(m => m.user_id === user.id)
      setIsMember(mine?.status === 'active')
      setMemberStatus(mine?.status || '')
    }

    setLoading(false)
  }

  async function joinGroup() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (group?.is_public) {
      await supabase.from('group_members').insert({
        group_id: groupId, user_id: user.id, status: 'active', role: 'member'
      })
      // Notify creator
      await supabase.from('notifications').insert({
        user_id: group.created_by || group.admin_id,
        type: 'group_join',
        title: `Someone joined ${group.name}`,
        message: `A new member joined your group`,
        group_id: groupId,
      })
      router.push('/groups/' + groupId + '/chat')
    } else {
      await supabase.from('group_members').insert({
        group_id: groupId, user_id: user.id, status: 'pending', role: 'member'
      })
      setMemberStatus('pending')
      setSuccess('Request sent! Admin will review.')
    }
    fetchGroup()
  }

  async function leaveGroup() {
    if (!confirm('Leave this group?')) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', user.id)
    router.push('/groups')
  }

  async function deleteGroup() {
    if (!confirm('Delete this group? Cannot be undone.')) return
    const supabase = createClient()
    await supabase.from('groups').delete().eq('id', groupId)
    router.push('/groups')
  }

  async function searchUsers(query: string) {
    setSearchQuery(query)
    if (query.length < 2) { setSearchResults([]); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, city')
      .ilike('full_name', `%${query}%`)
      .neq('id', currentUserId)
      .limit(5)
    if (data) {
      const memberIds = members.map(m => m.user_id)
      setSearchResults(data.filter(u => !memberIds.includes(u.id)))
    }
  }

  async function addMember(userId: string, userName: string) {
    const supabase = createClient()
    const isPublic = group?.is_public

    await supabase.from('group_members').insert({
      group_id: groupId,
      user_id: userId,
      status: isPublic ? 'active' : 'pending',
      role: 'member',
    })

    await supabase.from('notifications').insert({
      user_id: userId,
      type: isPublic ? 'group_added' : 'group_invite',
      title: isPublic ? `You were added to ${group?.name}` : `Invite to join ${group?.name}`,
      message: isPublic
        ? `You have been added to ${group?.name}`
        : `You have been invited to join ${group?.name}. Check your groups to accept.`,
      group_id: groupId,
    })

    setSearchQuery('')
    setSearchResults([])
    setSuccess(isPublic ? `${userName} added!` : `Invite sent to ${userName}!`)
    setTimeout(() => setSuccess(''), 3000)
    fetchGroup()
  }

  async function removeMember(userId: string) {
    const supabase = createClient()
    await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId)
    fetchGroup()
  }

  async function acceptRequest(userId: string) {
    const supabase = createClient()
    await supabase.from('group_members').update({ status: 'active' }).eq('group_id', groupId).eq('user_id', userId)
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'group_accepted',
      title: `Request approved!`,
      message: `Your request to join ${group?.name} was approved`,
      group_id: groupId,
    })
    fetchGroup()
  }

  function getInitials(name: string) {
    return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'
  }

  function formatSchedule() {
    if (!group) return ''
    const date = group.scheduled_date || group.available_date
    const from = group.scheduled_from || group.available_from
    const until = group.scheduled_until || group.available_until
    if (!date) return ''
    const d = new Date(date)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    let dayLabel = d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })
    if (d.toDateString() === today.toDateString()) dayLabel = 'Today'
    if (d.toDateString() === tomorrow.toDateString()) dayLabel = 'Tomorrow'
    return `${dayLabel} · ${from} → ${until}`
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: '14px', color: '#5a5a5a' }}>Loading...</div>
    </div>
  )

  if (!group) return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontSize: '40px' }}>😔</div>
      <div style={{ fontSize: '18px', fontWeight: 800, color: '#0d0d0d' }}>Group not found</div>
      <button onClick={() => router.push('/groups')} style={{ padding: '12px 24px', background: '#0d0d0d', color: '#CAFF00', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
        Back to groups
      </button>
    </div>
  )

  const isAdmin = currentUserId === group.created_by || currentUserId === group.admin_id
  const activeMembers = members.filter(m => m.status === 'active')
  const pendingMembers = members.filter(m => m.status === 'pending')
  const isFull = group.max_members !== null && activeMembers.length >= group.max_members

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ background: '#0d0d0d', padding: '52px 24px 28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '150px', height: '150px', borderRadius: '50%', background: '#CAFF00', opacity: 0.08 }} />

        <button onClick={() => router.push('/groups')} style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          ←
        </button>

        <div style={{ fontSize: '11px', fontWeight: 800, color: '#CAFF00', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
          {group.is_recurring ? '🔄 Recurring' : '📅 One-time'} · {group.is_public ? '🌍 Public' : '🔒 Private'}
          {isAdmin && <span style={{ marginLeft: '8px' }}>·Admin</span>}
        </div>

        <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px', marginBottom: '4px' }}>{group.name}</div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>📍 {group.city}</div>

        {group.description && (
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: '14px' }}>{group.description}</div>
        )}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {formatSchedule() && (
            <span style={{ padding: '4px 12px', background: '#CAFF00', borderRadius: '100px', fontSize: '11px', fontWeight: 700, color: '#0d0d0d' }}>
              {formatSchedule()}
            </span>
          )}
          <span style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
            👥 {activeMembers.length}{group.max_members ? `/${group.max_members}` : ''} members
          </span>
        </div>
      </div>

      <div style={{ padding: '20px 24px', maxWidth: '480px', margin: '0 auto' }}>

        {success && (
          <div style={{ padding: '12px 16px', background: '#f0ffe0', border: '1.5px solid #a8d900', borderRadius: '12px', fontSize: '13px', color: '#2d6a00', marginBottom: '16px', fontWeight: 600 }}>
            ✅ {success}
          </div>
        )}
        {error && (
          <div style={{ padding: '12px 16px', background: '#fff0f0', border: '1.5px solid #ffcccc', borderRadius: '12px', fontSize: '13px', color: '#cc0000', marginBottom: '16px' }}>
            ⚠️ {error}
          </div>
        )}
        {memberStatus === 'pending' && (
          <div style={{ padding: '14px 16px', background: '#f0ffe0', border: '1.5px solid #a8d900', borderRadius: '14px', fontSize: '13px', color: '#2d6a00', marginBottom: '16px', fontWeight: 600 }}>
            ⏳ Request sent — waiting for admin approval
          </div>
        )}

        {/* Join button */}
        {!isMember && !isAdmin && memberStatus !== 'pending' && (
          <button
            onClick={joinGroup}
            disabled={isFull}
            style={{ width: '100%', padding: '16px', background: isFull ? '#e2e2d8' : '#CAFF00', color: isFull ? '#999' : '#0d0d0d', fontSize: '16px', fontWeight: 700, border: 'none', borderRadius: '16px', cursor: isFull ? 'not-allowed' : 'pointer', marginBottom: '16px' }}
          >
            {isFull ? 'Group is full' : group.is_public ? 'Join group →' : 'Request to join →'}
          </button>
        )}

        {/* Member/Admin actions */}
        {(isMember || isAdmin) && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <button
              onClick={() => router.push(`/groups/${groupId}/chat`)}
              style={{ flex: 1, padding: '14px', background: '#0d0d0d', color: '#CAFF00', fontSize: '14px', fontWeight: 700, border: 'none', borderRadius: '14px', cursor: 'pointer' }}
            >
              💬 Group chat
            </button>
            {isAdmin ? (
              <button
                onClick={deleteGroup}
                style={{ padding: '14px 18px', background: '#fff0f0', color: '#cc0000', fontSize: '13px', fontWeight: 600, border: '1.5px solid #ffcccc', borderRadius: '14px', cursor: 'pointer' }}
              >
                🗑 Delete
              </button>
            ) : (
              <button
                onClick={leaveGroup}
                style={{ padding: '14px 18px', background: '#fff0f0', color: '#cc0000', fontSize: '13px', fontWeight: 600, border: '1.5px solid #ffcccc', borderRadius: '14px', cursor: 'pointer' }}
              >
                Leave
              </button>
            )}
          </div>
        )}

        {/* Search + add/invite — admin always, members only for public */}
        {(isAdmin || (isMember && group.is_public)) && (
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '18px', border: '1.5px solid #e2e2d8', marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
              {isAdmin && !group.is_public ? '🔒 Invite by name' : '➕ Add members'}
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={e => searchUsers(e.target.value)}
              placeholder="Search by name..."
              style={{ width: '100%', padding: '12px 14px', background: '#f5f5f0', border: '1.5px solid #e2e2d8', borderRadius: '12px', fontSize: '14px', color: '#0d0d0d', outline: 'none', marginBottom: '8px' }}
            />
            {searchResults.map((u, i) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: i < searchResults.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt={u.full_name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: '#0d0d0d', flexShrink: 0 }}>
                    {getInitials(u.full_name)}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0d0d0d' }}>{u.full_name}</div>
                  <div style={{ fontSize: '11px', color: '#5a5a5a' }}>{u.city}</div>
                </div>
                <button
                  onClick={() => addMember(u.id, u.full_name)}
                  style={{ padding: '6px 14px', background: '#CAFF00', color: '#0d0d0d', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  {isAdmin && !group.is_public ? 'Invite' : 'Add'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pending requests — admin only */}
        {isAdmin && pendingMembers.length > 0 && (
          <div style={{ background: '#ffffff', borderRadius: '20px', border: '1.5px solid #e2e2d8', overflow: 'hidden', marginBottom: '14px' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e2d8', background: '#f0ffe0' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#2d6a00', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Pending requests ({pendingMembers.length})
              </div>
            </div>
            {pendingMembers.map((member, i) => (
              <div key={member.id} style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: i < pendingMembers.length - 1 ? '1px solid #e2e2d8' : 'none' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#f5f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', color: '#0d0d0d', flexShrink: 0, border: '1.5px solid #e2e2d8' }}>
                  {getInitials(member.profiles?.full_name || '?')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0d0d0d' }}>{member.profiles?.full_name || 'Unknown'}</div>
                  <div style={{ fontSize: '11px', color: '#5a5a5a' }}>Wants to join</div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => acceptRequest(member.user_id)} style={{ padding: '6px 12px', background: '#CAFF00', color: '#0d0d0d', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                    Accept
                  </button>
                  <button onClick={() => removeMember(member.user_id)} style={{ padding: '6px 12px', background: '#fff0f0', color: '#cc0000', border: '1px solid #ffcccc', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      

        {/* Active members */}
        <div style={{ background: '#ffffff', borderRadius: '20px', border: '1.5px solid #e2e2d8', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e2d8' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Members ({activeMembers.length})
            </div>
          </div>
          {activeMembers.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#5a5a5a', fontSize: '14px' }}>No members yet</div>
          )}
          {activeMembers.map((member, i) => {
            const memberIsAdmin = member.user_id === group.created_by || member.user_id === group.admin_id
            return (
              <div key={member.id} style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: i < activeMembers.length - 1 ? '1px solid #f0f0f0' : 'none', cursor: 'pointer' }} onClick={() => router.push('/user/' + member.user_id)}>
                {member.profiles?.avatar_url ? (
                  <img src={member.profiles.avatar_url} alt={member.profiles.full_name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1.5px solid #e2e2d8' }} />
                ) : (
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', color: '#0d0d0d', flexShrink: 0 }}>
                    {getInitials(member.profiles?.full_name || '?')}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0d0d0d' }}>{member.profiles?.full_name || 'Unknown'}</div>
                  {memberIsAdmin && <div style={{ fontSize: '11px', color: '#5a5a5a', marginTop: '1px' }}> Admin</div>}
                </div>
                {isAdmin && !memberIsAdmin && (
                  <button
                    onClick={e => { e.stopPropagation(); removeMember(member.user_id) }}
                    style={{ padding: '6px 12px', background: '#fff0f0', color: '#cc0000', border: '1px solid #ffcccc', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}