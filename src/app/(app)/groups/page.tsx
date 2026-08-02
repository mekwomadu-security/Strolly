'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  member_count?: number
}

const activityIcons: Record<string, string> = {
  gym: '🏋️', jogging: '🏃', cycling: '🚴',
  football: '⚽', yoga: '🧘', swimming: '🏊',
  dog_walk: '🐕', badminton: '🏸', tennis: '🎾',
}

export default function GroupsPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])
  const [myGroups, setMyGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')
  const [tab, setTab] = useState<'discover' | 'mine'>('discover')

  useEffect(() => {
    fetchGroups()
  }, [])

  async function fetchGroups() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setCurrentUserId(user.id)

    // Fetch public groups
    const { data: publicGroups } = await supabase
      .from('groups')
      .select('*')
      .eq('is_public', true)
      .eq('is_active', true)
      .neq('admin_id', user.id)
      .order('created_at', { ascending: false })

    if (publicGroups) setGroups(publicGroups)

    // Fetch my groups
    const { data: memberOf } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (memberOf && memberOf.length > 0) {
      const groupIds = memberOf.map(m => m.group_id)
      const { data: myG } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (myG) setMyGroups(myG)
    }

    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0' }}>

      {/* Header */}
      <div style={{ padding: '56px 24px 20px', background: '#ffffff', borderBottom: '1px solid #e2e2d8' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ fontFamily: 'sans-serif', fontSize: '24px', fontWeight: 800, color: '#0d0d0d', letterSpacing: '-0.5px' }}>
              Groups
            </div>
            <div style={{ fontSize: '13px', color: '#5a5a5a', marginTop: '2px' }}>
              Join a group or create your own
            </div>
          </div>
          <button
            onClick={() => router.push('/groups/create')}
            style={{ padding: '10px 16px', background: '#0d0d0d', color: '#CAFF00', border: 'none', borderRadius: '100px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            + Create
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setTab('discover')}
            style={{ padding: '8px 16px', background: tab === 'discover' ? '#CAFF00' : '#f5f5f0', border: `1.5px solid ${tab === 'discover' ? '#a8d900' : '#e2e2d8'}`, borderRadius: '100px', fontSize: '13px', fontWeight: tab === 'discover' ? 700 : 500, color: '#0d0d0d', cursor: 'pointer' }}
          >
            Discover
          </button>
          <button
            onClick={() => setTab('mine')}
            style={{ padding: '8px 16px', background: tab === 'mine' ? '#CAFF00' : '#f5f5f0', border: `1.5px solid ${tab === 'mine' ? '#a8d900' : '#e2e2d8'}`, borderRadius: '100px', fontSize: '13px', fontWeight: tab === 'mine' ? 700 : 500, color: '#0d0d0d', cursor: 'pointer' }}
          >
            My Groups {myGroups.length > 0 && `(${myGroups.length})`}
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 24px', maxWidth: '480px', margin: '0 auto' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#5a5a5a' }}>
            Loading groups...
          </div>
        )}

        {/* Discover tab */}
        {!loading && tab === 'discover' && (
          <>
            {groups.length === 0 && (
              <div style={{ background: '#ffffff', borderRadius: '20px', padding: '32px', textAlign: 'center', border: '1.5px solid #e2e2d8' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
                <div style={{ fontFamily: 'sans-serif', fontSize: '18px', fontWeight: 800, color: '#0d0d0d', marginBottom: '8px' }}>
                  No groups yet
                </div>
                <div style={{ fontSize: '14px', color: '#5a5a5a', marginBottom: '20px' }}>
                  Be the first to create a group in your city!
                </div>
                <button
                  onClick={() => router.push('/groups/create')}
                  style={{ padding: '12px 24px', background: '#CAFF00', color: '#0d0d0d', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Create first group →
                </button>
              </div>
            )}

            {groups.map(group => (
              <div
                key={group.id}
                onClick={() => router.push(`/groups/${group.id}`)}
                style={{ background: '#ffffff', borderRadius: '20px', padding: '18px', marginBottom: '12px', border: '1.5px solid #e2e2d8', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseOver={e => e.currentTarget.style.borderColor = '#a8d900'}
                onMouseOut={e => e.currentTarget.style.borderColor = '#e2e2d8'}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', border: '2px solid #0d0d0d' }}>
                      {activityIcons[group.activity] || '🏃'}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'sans-serif', fontSize: '16px', fontWeight: 700, color: '#0d0d0d' }}>
                        {group.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#5a5a5a', marginTop: '2px' }}>
                        {group.city}
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '4px 10px', background: group.is_public ? '#f0ffe0' : '#f5f5f0', borderRadius: '100px', fontSize: '11px', fontWeight: 600, color: group.is_public ? '#2d6a00' : '#5a5a5a', border: `1px solid ${group.is_public ? '#a8d900' : '#e2e2d8'}` }}>
                    {group.is_public ? '🌍 Public' : '🔒 Private'}
                  </div>
                </div>

                {group.description && (
                  <div style={{ fontSize: '13px', color: '#5a5a5a', marginBottom: '10px', lineHeight: 1.5 }}>
                    {group.description}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ padding: '4px 10px', background: '#CAFF00', borderRadius: '100px', fontSize: '11px', fontWeight: 600, color: '#0d0d0d' }}>
                    {activityIcons[group.activity]} {group.activity.replace('_', ' ')}
                  </span>
                  <span style={{ padding: '4px 10px', background: '#f5f5f0', borderRadius: '100px', fontSize: '11px', fontWeight: 600, color: '#5a5a5a' }}>
                    {group.available_date} · {group.available_from} → {group.available_until}
                  </span>
                  {group.max_members && (
                    <span style={{ padding: '4px 10px', background: '#f5f5f0', borderRadius: '100px', fontSize: '11px', fontWeight: 600, color: '#5a5a5a' }}>
                      Max {group.max_members}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {/* My groups tab */}
        {!loading && tab === 'mine' && (
          <>
            {myGroups.length === 0 && (
              <div style={{ background: '#ffffff', borderRadius: '20px', padding: '32px', textAlign: 'center', border: '1.5px solid #e2e2d8' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
                <div style={{ fontFamily: 'sans-serif', fontSize: '18px', fontWeight: 800, color: '#0d0d0d', marginBottom: '8px' }}>
                  No groups yet
                </div>
                <div style={{ fontSize: '14px', color: '#5a5a5a', marginBottom: '20px' }}>
                  Create a group or join one from Discover
                </div>
                <button
                  onClick={() => router.push('/groups/create')}
                  style={{ padding: '12px 24px', background: '#CAFF00', color: '#0d0d0d', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Create a group →
                </button>
              </div>
            )}

            {myGroups.map(group => (
              <div
                key={group.id}
                onClick={() => router.push(`/groups/${group.id}`)}
                style={{ background: '#ffffff', borderRadius: '20px', padding: '18px', marginBottom: '12px', border: '1.5px solid #e2e2d8', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: '#0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                    {activityIcons[group.activity] || '🏃'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'sans-serif', fontSize: '16px', fontWeight: 700, color: '#0d0d0d' }}>
                      {group.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#5a5a5a', marginTop: '2px' }}>
                      {group.available_date} · {group.available_from} → {group.available_until}
                    </div>
                  </div>
                  {group.admin_id === currentUserId && (
                    <div style={{ padding: '4px 10px', background: '#0d0d0d', borderRadius: '100px', fontSize: '11px', fontWeight: 600, color: '#CAFF00' }}>
                      Admin
                    </div>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

      </div>

      {/* Bottom nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '80px', background: '#ffffff', borderTop: '1px solid #e2e2d8', display: 'flex', alignItems: 'flex-start', paddingTop: '12px', zIndex: 100 }}>
        <div onClick={() => router.push('/home')} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <div style={{ fontSize: '20px' }}>🗺️</div>
          <div style={{ fontSize: '10px', color: '#5a5a5a' }}>Nearby</div>
        </div>
        <div onClick={() => router.push('/schedule')} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <div style={{ fontSize: '20px' }}>🕐</div>
          <div style={{ fontSize: '10px', color: '#5a5a5a' }}>Schedule</div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#CAFF00', marginBottom: '-2px' }}></div>
          <div style={{ fontSize: '20px' }}>👥</div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#0d0d0d' }}>Groups</div>
        </div>
        <div onClick={() => router.push('/home')} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <div style={{ fontSize: '20px' }}>👤</div>
          <div style={{ fontSize: '10px', color: '#5a5a5a' }}>Profile</div>
        </div>
      </div>

    </div>
  )
}