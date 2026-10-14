'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  created_by: string
  admin_id: string
  is_member?: boolean
  is_recurring?: boolean
  expires_at?: string
  latitude?: number
  longitude?: number
  distance?: number | null
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function getDistanceLabel(km: number): string {
  if (km < 0.1) return 'Same area'
  if (km < 1.0) return `${Math.round(km * 1000)}m away`
  return `${km.toFixed(1)}km away`
}

export default function GroupsPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])
  const [myGroups, setMyGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'discover' | 'mine'>('discover')

  useEffect(() => {
    fetchGroups()
  }, [])

  async function fetchGroups() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('latitude, longitude')
      .eq('id', user.id)
      .single()

    const now = new Date().toISOString()

    // Only show public groups on discover
    const { data: allGroups } = await supabase
      .from('groups')
      .select('*')
      .eq('is_public', true)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('created_at', { ascending: false })

    // Get my memberships — includes private groups
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id, status')
      .eq('user_id', user.id)
      .eq('status', 'active')

    // Get my private groups too
    const { data: myPrivateGroups } = await supabase
      .from('groups')
      .select('*')
      .eq('is_public', false)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .in('id', memberships?.map(m => m.group_id) || ['none'])

    const myGroupIds = memberships?.map(m => m.group_id) || []

    const enrichGroup = (g: any) => {
      let distance = null
      if (profile?.latitude && g.latitude) {
        distance = calculateDistance(profile.latitude, profile.longitude, g.latitude, g.longitude)
      }
      return { ...g, is_member: myGroupIds.includes(g.id), distance }
    }

    const enrichedPublic = (allGroups || []).map(enrichGroup)
    const enrichedPrivate = (myPrivateGroups || []).map(enrichGroup)

    // Sort by distance
    const sortByDistance = (arr: any[]) => arr.sort((a, b) => {
      if (a.distance === null) return 1
      if (b.distance === null) return -1
      return a.distance - b.distance
    })

    setGroups(sortByDistance(enrichedPublic))

    // My groups = public I joined + private I'm in
    const allMine = [...enrichedPublic.filter(g => myGroupIds.includes(g.id)), ...enrichedPrivate]
    setMyGroups(sortByDistance(allMine))

    setLoading(false)
  }

  async function joinGroup(groupId: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('group_members').insert({
      group_id: groupId,
      user_id: user.id,
      status: 'active',
      role: 'member',
    })

    fetchGroups()
    router.push('/groups/' + groupId)
  }

  function formatSchedule(group: Group) {
    const date = group.scheduled_date
    const from = group.scheduled_from
    const until = group.scheduled_until
    if (!date) return ''
    const d = new Date(date)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    let dayLabel = d.toLocaleDateString('en', { weekday: 'short' })
    if (d.toDateString() === today.toDateString()) dayLabel = 'Today'
    if (d.toDateString() === tomorrow.toDateString()) dayLabel = 'Tomorrow'
    return `${dayLabel} · ${from} → ${until}`
  }

  const displayGroups = tab === 'discover' ? groups : myGroups

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', paddingBottom: '90px' }}>

      {/* Header */}
      <div style={{ padding: '52px 24px 20px', background: '#ffffff', borderBottom: '1px solid #e2e2d8' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0d0d0d', letterSpacing: '-0.5px' }}>Groups</div>
            <div style={{ fontSize: '13px', color: '#5a5a5a', marginTop: '2px' }}>Find your fitness tribe nearby</div>
          </div>
          <button
            onClick={() => router.push('/groups/create')}
            style={{ padding: '10px 18px', background: '#0d0d0d', color: '#CAFF00', border: 'none', borderRadius: '100px', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}
          >
            + Create
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setTab('discover')}
            style={{ padding: '8px 20px', background: tab === 'discover' ? '#0d0d0d' : '#f5f5f0', color: tab === 'discover' ? '#CAFF00' : '#0d0d0d', border: 'none', borderRadius: '100px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
          >
            Discover
          </button>
          <button
            onClick={() => setTab('mine')}
            style={{ padding: '8px 20px', background: tab === 'mine' ? '#0d0d0d' : '#f5f5f0', color: tab === 'mine' ? '#CAFF00' : '#0d0d0d', border: 'none', borderRadius: '100px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
          >
            My Groups ({myGroups.length})
          </button>
        </div>
      </div>

      <div style={{ padding: '16px 24px', maxWidth: '480px', margin: '0 auto' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#5a5a5a', fontSize: '14px' }}>
            Loading groups...
          </div>
        )}

        {!loading && displayGroups.length === 0 && (
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '40px 24px', textAlign: 'center', border: '1.5px solid #e2e2d8' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0d0d0d', marginBottom: '8px' }}>
              {tab === 'discover' ? 'No groups yet' : 'Not in any groups'}
            </div>
            <div style={{ fontSize: '14px', color: '#5a5a5a', lineHeight: 1.6, marginBottom: '24px' }}>
              {tab === 'discover' ? 'Be the first to create a fitness group!' : 'Join or create a group'}
            </div>
            <button
              onClick={() => tab === 'discover' ? router.push('/groups/create') : setTab('discover')}
              style={{ padding: '12px 24px', background: '#0d0d0d', color: '#CAFF00', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
            >
              {tab === 'discover' ? '+ Create group' : 'Discover groups →'}
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {displayGroups.map((group, index) => {
            const isDark = index % 2 === 0
            return (
              <div
                key={group.id}
                style={{
                  background: isDark ? '#0d0d0d' : '#ffffff',
                  borderRadius: '24px',
                  padding: '20px',
                  border: isDark ? 'none' : '2px solid #0d0d0d',
                }}
              >
                {/* Label */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: isDark ? '#CAFF00' : '#0d0d0d', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {group.is_recurring ? '🔄 Recurring' : '📅 One-time'} · {group.is_public ? '🌍 Public' : '🔒 Private'}
                  </div>
                  {group.distance !== null && group.distance !== undefined && (
                    <div style={{ fontSize: '10px', color: isDark ? 'rgba(255,255,255,0.5)' : '#5a5a5a', fontWeight: 600 }}>
                      📍 {getDistanceLabel(group.distance)}
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '20px', fontWeight: 800, color: isDark ? '#ffffff' : '#0d0d0d', letterSpacing: '-0.5px', marginBottom: '4px' }}>
                  {group.name}
                </div>
                <div style={{ fontSize: '12px', color: isDark ? 'rgba(255,255,255,0.5)' : '#5a5a5a', marginBottom: group.description ? '8px' : '14px' }}>
                  📍 {group.city}
                </div>
                {group.description && (
                  <div style={{ fontSize: '13px', color: isDark ? 'rgba(255,255,255,0.5)' : '#5a5a5a', lineHeight: 1.6, marginBottom: '14px' }}>
                    {group.description}
                  </div>
                )}

                {/* Details */}
                <div style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#f5f5f0', borderRadius: '14px', padding: '12px', marginBottom: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {group.scheduled_date && (
                      <div>
                        <div style={{ fontSize: '10px', color: isDark ? 'rgba(255,255,255,0.35)' : '#5a5a5a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>When</div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: isDark ? '#ffffff' : '#0d0d0d' }}>{formatSchedule(group)}</div>
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '10px', color: isDark ? 'rgba(255,255,255,0.35)' : '#5a5a5a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Members</div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: isDark ? '#ffffff' : '#0d0d0d' }}>
                        👥 {group.max_members ? `Max ${group.max_members}` : 'No limit'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: isDark ? 'rgba(255,255,255,0.35)' : '#5a5a5a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Status</div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: group.is_member ? '#CAFF00' : isDark ? '#ffffff' : '#0d0d0d' }}>
                        {group.is_member ? '✅ Joined' : '🔓 Open'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {group.is_member ? (
                    <>
                      <button
                        onClick={() => router.push('/groups/' + group.id + '/chat')}
                        style={{ flex: 1, padding: '11px', background: '#CAFF00', color: '#0d0d0d', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        💬 Group chat
                      </button>
                      <button
                        onClick={() => router.push('/groups/' + group.id)}
                        style={{ padding: '11px 16px', background: isDark ? 'rgba(255,255,255,0.1)' : '#f5f5f0', color: isDark ? '#ffffff' : '#0d0d0d', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Info
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => joinGroup(group.id)}
                      style={{ flex: 1, padding: '11px', background: isDark ? '#CAFF00' : '#0d0d0d', color: isDark ? '#0d0d0d' : '#CAFF00', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Join group →
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}