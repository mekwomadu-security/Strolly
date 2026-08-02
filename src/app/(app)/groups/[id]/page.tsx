'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Group {
  id: string
  name: string
  activity: string
  description: string
  available_date: string
  available_from: string
  available_until: string
  is_public: boolean
  max_members: number | null
  city: string
  admin_id: string
}

interface Member {
  id: string
  user_id: string
  status: string
  profiles: {
    full_name: string
  }
}

interface SearchResult {
  id: string
  full_name: string
  city: string
}

const activityIcons: Record<string, string> = {
  gym: '🏋️', jogging: '🏃', cycling: '🚴',
  football: '⚽', yoga: '🧘', swimming: '🏊',
  dog_walk: '🐕', badminton: '🏸', tennis: '🎾',
}

export default function GroupDetailPage() {
  const router = useRouter()
  const params = useParams()
  const groupId = params.id as string

  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const [isMember, setIsMember] = useState(false)
  const [memberStatus, setMemberStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [addingUser, setAddingUser] = useState<string | null>(null)

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
      .select('*, profiles(full_name)')
      .eq('group_id', groupId)

    if (membersData) {
      setMembers(membersData)
      const myMembership = membersData.find(m => m.user_id === user.id)
      if (myMembership) {
        setIsMember(myMembership.status === 'active')
        setMemberStatus(myMembership.status)
      } else {
        setIsMember(false)
        setMemberStatus('')
      }
    }

    setLoading(false)
  }

  async function handleJoin() {
    setJoining(true)
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: existing } = await supabase
      .from('group_members')
      .select('id, status')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      if (existing.status === 'active') {
        router.push(`/groups/${groupId}/chat`)
        return
      }
      if (existing.status === 'pending') {
        setError('Your join request is pending admin approval')
        setJoining(false)
        return
      }
    }

    if (group?.is_public) {
      const { error } = await supabase
        .from('group_members')
        .insert({ group_id: groupId, user_id: user.id, status: 'active' })

      if (!error) {
        router.push(`/groups/${groupId}/chat`)
      } else {
        setError(error.message)
      }
    } else {
      const { error } = await supabase
        .from('group_members')
        .insert({ group_id: groupId, user_id: user.id, status: 'pending' })

      if (!error) {
        setMemberStatus('pending')
        setSuccess('Join request sent! Wait for admin approval.')
      } else {
        setError(error.message)
      }
    }

    setJoining(false)
  }
  async function handleLeave() {
    if (!confirm('Leave this group?')) return
    setLeaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.id)

    router.push('/groups')
  }

  async function searchUsers(query: string) {
    setSearchQuery(query)
    if (query.length < 2) { setSearchResults([]); return }
    setSearching(true)

    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, city')
      .ilike('full_name', `%${query}%`)
      .neq('id', currentUserId)
      .limit(5)

    if (data) {
      const memberIds = members.map(m => m.user_id)
      setSearchResults(data.filter(u => !memberIds.includes(u.id)))
    }
    setSearching(false)
  }

  async function addUserToGroup(userId: string) {
    setAddingUser(userId)
    const supabase = createClient()

    const { data: existing } = await supabase
      .from('group_members')
      .select('id, status')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single()

    if (existing) {
      if (existing.status === 'active') {
        setAddingUser(null)
        return
      }
      await supabase
        .from('group_members')
        .update({ status: 'active' })
        .eq('group_id', groupId)
        .eq('user_id', userId)
    } else {
      await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: userId,
          status: group?.is_public ? 'active' : 'pending',
        })

      // Send notification
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: group?.is_public ? 'group_added' : 'group_invite',
          title: group?.is_public
            ? `You were added to ${group?.name}`
            : `You're invited to join ${group?.name}`,
          message: group?.is_public
            ? `${group?.name} · ${group?.activity} · ${group?.available_date}`
            : `Admin invited you to join ${group?.name}. Accept or decline below.`,
          group_id: groupId,
        })
    }

    setSearchQuery('')
    setSearchResults([])
    setSuccess('Member added successfully!')
    setTimeout(() => setSuccess(null), 3000)
    fetchGroup()
    setAddingUser(null)
  }

  async function handleRemoveMember(userId: string) {
    const supabase = createClient()
    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId)
    fetchGroup()
  }

  async function handleDeleteGroup() {
    if (!confirm('Delete this group? This cannot be undone.')) return
    const supabase = createClient()
    await supabase.from('groups').delete().eq('id', groupId)
    router.push('/groups')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '14px', color: '#5a5a5a' }}>Loading group...</div>
      </div>
    )
  }

  if (!group) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '14px', color: '#5a5a5a' }}>Group not found</div>
      </div>
    )
  }

  const isAdmin = currentUserId === group.admin_id
  const activeMembers = members.filter(m => m.status === 'active')
  const pendingMembers = members.filter(m => m.status === 'pending')
  const isFull = group.max_members !== null && activeMembers.length >= group.max_members

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0' }}>

      {/* Header */}
      <div style={{ background: '#0d0d0d', padding: '56px 24px 32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '150px', height: '150px', borderRadius: '50%', background: '#CAFF00', opacity: 0.08 }} />
        <button
          onClick={() => router.push('/groups')}
          style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', marginBottom: '16px' }}
        >
          ←
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>
            {activityIcons[group.activity] || '🏃'}
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>
              {group.name}
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
              {group.city} · {group.is_public ? '🌍 Public' : '🔒 Private'}
            </div>
          </div>
        </div>
        {group.description && (
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: '12px' }}>
            {group.description}
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ padding: '5px 12px', background: '#CAFF00', borderRadius: '100px', fontSize: '12px', fontWeight: 600, color: '#0d0d0d' }}>
            {activityIcons[group.activity]} {group.activity.replace('_', ' ')}
          </span>
          <span style={{ padding: '5px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>
            {group.available_date} · {group.available_from} → {group.available_until}
          </span>
          <span style={{ padding: '5px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>
            👥 {activeMembers.length}{group.max_members ? `/${group.max_members}` : ''} members
          </span>
        </div>
      </div>

      <div style={{ padding: '20px 24px', maxWidth: '480px', margin: '0 auto' }}>

        {/* Success message */}
        {success && (
          <div style={{ padding: '12px 16px', background: '#f0ffe0', border: '1.5px solid #a8d900', borderRadius: '12px', fontSize: '13px', color: '#2d6a00', marginBottom: '16px', fontWeight: 600 }}>
            ✅ {success}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{ padding: '12px 16px', background: '#fff0f0', border: '1.5px solid #ffcccc', borderRadius: '12px', fontSize: '13px', color: '#cc0000', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* Pending request message */}
        {memberStatus === 'pending' && (
          <div style={{ padding: '16px', background: '#f0ffe0', border: '1.5px solid #a8d900', borderRadius: '16px', fontSize: '14px', color: '#2d6a00', marginBottom: '20px', fontWeight: 600 }}>
            ⏳ Join request sent — waiting for admin approval
          </div>
        )}

        {/* Join button — only show if not a member and not pending */}
        {!isMember && !isAdmin && memberStatus !== 'pending' && (
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={handleJoin}
              disabled={joining || isFull}
              style={{ width: '100%', padding: '16px', background: isFull ? '#e2e2d8' : '#CAFF00', color: isFull ? '#999' : '#0d0d0d', fontSize: '16px', fontWeight: 700, border: 'none', borderRadius: '16px', cursor: isFull ? 'not-allowed' : 'pointer', opacity: joining ? 0.7 : 1 }}
            >
              {isFull ? 'Group is full' : joining ? 'Joining...' : group.is_public ? 'Join group →' : 'Request to join →'}
            </button>
          </div>
        )}

        {/* Member actions — chat + leave */}
        {(isMember || isAdmin) && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button
              onClick={() => router.push(`/groups/${groupId}/chat`)}
              style={{ flex: 1, padding: '14px', background: '#0d0d0d', color: '#CAFF00', fontSize: '15px', fontWeight: 700, border: 'none', borderRadius: '16px', cursor: 'pointer' }}
            >
              💬 Group chat
            </button>
            {!isAdmin && (
              <button
                onClick={handleLeave}
                disabled={leaving}
                style={{ padding: '14px 18px', background: '#fff0f0', color: '#cc0000', fontSize: '14px', fontWeight: 600, border: '1.5px solid #ffcccc', borderRadius: '16px', cursor: 'pointer' }}
              >
                Leave
              </button>
            )}
            {isAdmin && (
              <button
                onClick={handleDeleteGroup}
                style={{ padding: '14px 18px', background: '#fff0f0', color: '#cc0000', fontSize: '14px', fontWeight: 600, border: '1.5px solid #ffcccc', borderRadius: '16px', cursor: 'pointer' }}
              >
                Delete
              </button>
            )}
          </div>
        )}

        {/* Add members */}
        {(isAdmin || (isMember && group.is_public)) && (
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '18px', border: '1.5px solid #e2e2d8', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
              {group.is_public ? 'Add members' : 'Invite members'}
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={e => searchUsers(e.target.value)}
              placeholder="Search by name..."
              style={{ width: '100%', padding: '12px 14px', background: '#f5f5f0', border: '1.5px solid #e2e2d8', borderRadius: '12px', fontSize: '14px', color: '#0d0d0d', outline: 'none' }}
              onFocus={e => e.target.style.borderColor = '#a8d900'}
              onBlur={e => e.target.style.borderColor = '#e2e2d8'}
            />
            {searching && (
              <div style={{ fontSize: '13px', color: '#5a5a5a', marginTop: '8px' }}>Searching...</div>
            )}
            {searchResults.length > 0 && (
              <div style={{ marginTop: '8px', border: '1.5px solid #e2e2d8', borderRadius: '12px', overflow: 'hidden' }}>
                {searchResults.map((user, index) => (
                  <div key={user.id} style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: index < searchResults.length - 1 ? '1px solid #e2e2d8' : 'none', background: '#ffffff' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: '#0d0d0d', flexShrink: 0 }}>
                      {user.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0d0d0d' }}>{user.full_name}</div>
                      <div style={{ fontSize: '12px', color: '#5a5a5a' }}>{user.city}</div>
                    </div>
                    <button
                      onClick={() => addUserToGroup(user.id)}
                      disabled={addingUser === user.id}
                      style={{ padding: '6px 14px', background: '#CAFF00', color: '#0d0d0d', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: addingUser === user.id ? 0.6 : 1 }}
                    >
                      {addingUser === user.id ? '...' : group.is_public ? 'Add' : 'Invite'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
              <div style={{ fontSize: '13px', color: '#5a5a5a', marginTop: '8px' }}>No users found</div>
            )}
          </div>
        )}

        {/* Pending requests */}
        {isAdmin && pendingMembers.length > 0 && (
          <div style={{ background: '#ffffff', borderRadius: '20px', border: '1.5px solid #e2e2d8', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e2d8', background: '#f0ffe0' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#2d6a00', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Pending requests ({pendingMembers.length})
              </div>
            </div>
            {pendingMembers.map((member, index) => (
              <div key={member.id} style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: index < pendingMembers.length - 1 ? '1px solid #e2e2d8' : 'none' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f5f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', color: '#0d0d0d', flexShrink: 0, border: '1.5px solid #e2e2d8' }}>
                  {member.profiles?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0d0d0d' }}>{member.profiles?.full_name || 'Unknown'}</div>
                  <div style={{ fontSize: '11px', color: '#5a5a5a', marginTop: '2px' }}>Wants to join</div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => addUserToGroup(member.user_id)} style={{ padding: '6px 12px', background: '#CAFF00', color: '#0d0d0d', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                    Accept
                  </button>
                  <button onClick={() => handleRemoveMember(member.user_id)} style={{ padding: '6px 12px', background: '#fff0f0', color: '#cc0000', border: '1px solid #ffcccc', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Active members */}
        <div style={{ background: '#ffffff', borderRadius: '20px', border: '1.5px solid #e2e2d8', overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #e2e2d8' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Members ({activeMembers.length})
            </div>
          </div>
          {activeMembers.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#5a5a5a', fontSize: '14px' }}>
              No members yet
            </div>
          )}
          {activeMembers.map((member, index) => (
            <div key={member.id} style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: index < activeMembers.length - 1 ? '1px solid #e2e2d8' : 'none' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', color: '#0d0d0d', flexShrink: 0 }}>
                {member.profiles?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0d0d0d' }}>{member.profiles?.full_name || 'Unknown'}</div>
                {member.user_id === group.admin_id && (
                  <div style={{ fontSize: '11px', color: '#5a5a5a', marginTop: '2px' }}>Admin</div>
                )}
              </div>
              {isAdmin && member.user_id !== currentUserId && (
                <button onClick={() => handleRemoveMember(member.user_id)} style={{ padding: '6px 12px', background: '#fff0f0', color: '#cc0000', border: '1px solid #ffcccc', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  Remove 
                </button>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  )

}