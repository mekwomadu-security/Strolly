'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'

const days = ['Today', 'Tomorrow', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getDateFromDay(day: string): string {
  const today = new Date()
  const map: Record<string, number> = {
    'Today': 0, 'Tomorrow': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5, 'Sun': 6
  }
  const offset = map[day] ?? 0
  const d = new Date(today.getTime() + offset * 86400000)
  return d.toISOString().split('T')[0]
}

export default function CreateGroupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedDay, setSelectedDay] = useState('Today')
  const [from, setFrom] = useState('06:00')
  const [until, setUntil] = useState('22:00')
  const [maxMembers, setMaxMembers] = useState<number | ''>('')
  const [isPublic, setIsPublic] = useState(true)
  const [isRecurring, setIsRecurring] = useState(false)
  const [loading, setLoading] = useState(false)

  async function createGroup() {
    if (!name) return
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('city, latitude, longitude')
      .eq('id', user.id)
      .single()

    const scheduledDate = getDateFromDay(selectedDay)
    const expiresAt = isRecurring
      ? null
      : new Date(`${scheduledDate}T${until}:00`).toISOString()

    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        name,
        description,
        activity: name,
        city: profile?.city || 'Unknown',
        is_public: isPublic,
        max_members: maxMembers || null,
        scheduled_date: scheduledDate,
        scheduled_from: from,
        scheduled_until: until,
        created_by: user.id,
        admin_id: user.id,
        latitude: profile?.latitude || null,
        longitude: profile?.longitude || null,
        is_recurring: isRecurring,
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (error) { 
  console.error('Group creation error:', error)
  alert('Error: ' + error.message)
  setLoading(false)
  return 
}

    await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: user.id,
      status: 'active',
      role: 'admin',
    })

    setLoading(false)
    router.push('/groups/' + group.id)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ background: '#0d0d0d', padding: '52px 24px 28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: '#CAFF00', opacity: 0.06 }} />

        <button
          onClick={() => step === 1 ? router.back() : setStep(s => s - 1)}
          style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}
        >
          ←
        </button>

        <div style={{ fontSize: '11px', fontWeight: 800, color: '#CAFF00', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
          Step {step} of 2
        </div>
        <div style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px', marginBottom: '6px' }}>
          {step === 1 ? 'Name your group' : 'When is it?'}
        </div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginBottom: '20px' }}>
          {step === 1 ? 'Give your group a name people will remember' : 'Set the date and time for your group'}
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {[1, 2].map(i => (
            <div
              key={i}
              style={{ height: '4px', borderRadius: '2px', background: i <= step ? '#CAFF00' : 'rgba(255,255,255,0.15)', flex: 1, transition: 'all 0.3s' }}
            />
          ))}
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: '480px', margin: '0 auto' }}>

        {/* Step 1 */}
        {step === 1 && (
          <div>
            {/* Name */}
            <div style={{ background: '#ffffff', borderRadius: '20px', padding: '20px', border: '1.5px solid #e2e2d8', marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                Group name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Morning Joggers Regina"
                style={{ width: '100%', padding: '0', background: 'transparent', border: 'none', fontSize: '18px', fontWeight: 700, color: '#0d0d0d', outline: 'none' }}
              />
              {name && (
                <div style={{ fontSize: '12px', color: '#5a5a5a', marginTop: '6px' }}>{name.length} characters</div>
              )}
            </div>

            {/* Description */}
            <div style={{ background: '#ffffff', borderRadius: '20px', padding: '20px', border: '1.5px solid #e2e2d8', marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                Description <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What is this group about? Who should join?"
                rows={3}
                style={{ width: '100%', padding: '0', background: 'transparent', border: 'none', fontSize: '14px', color: '#0d0d0d', outline: 'none', resize: 'none', lineHeight: 1.6 }}
              />
            </div>

            {/* Max members */}
            <div style={{ background: '#ffffff', borderRadius: '20px', padding: '20px', border: '1.5px solid #e2e2d8', marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>
                Max members <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <input
                type="number"
                min={2}
                placeholder="e.g. 10"
                value={maxMembers}
                onChange={e => {
                  if (e.target.value === '') setMaxMembers('')
                  else {
                    const val = parseInt(e.target.value)
                    if (!isNaN(val) && val >= 2) setMaxMembers(val)
                  }
                }}
                style={{ width: '100%', padding: '14px 16px', background: '#f5f5f0', border: '1.5px solid #e2e2d8', borderRadius: '14px', fontSize: '22px', fontWeight: 800, color: '#0d0d0d', outline: 'none', textAlign: 'center' }}
              />
              <div style={{ fontSize: '11px', color: '#5a5a5a', marginTop: '8px', textAlign: 'center' }}>
                Leave empty for no limit · Use ↑↓ or type
              </div>
            </div>

            {/* Visibility */}
            <div style={{ background: '#ffffff', borderRadius: '20px', padding: '20px', border: '1.5px solid #e2e2d8', marginBottom: '24px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>
                Visibility
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <button
                  onClick={() => setIsPublic(true)}
                  style={{ flex: 1, padding: '14px 12px', background: isPublic ? '#0d0d0d' : '#f5f5f0', color: isPublic ? '#CAFF00' : '#0d0d0d', border: 'none', borderRadius: '14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
                >
                  <span style={{ fontSize: '20px' }}>🌍</span>
                  <span>Public</span>
                  <span style={{ fontSize: '10px', fontWeight: 400, opacity: 0.7 }}>Anyone can join</span>
                </button>
                <button
                  onClick={() => setIsPublic(false)}
                  style={{ flex: 1, padding: '14px 12px', background: !isPublic ? '#0d0d0d' : '#f5f5f0', color: !isPublic ? '#CAFF00' : '#0d0d0d', border: 'none', borderRadius: '14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
                >
                  <span style={{ fontSize: '20px' }}>🔒</span>
                  <span>Private</span>
                  <span style={{ fontSize: '10px', fontWeight: 400, opacity: 0.7 }}>Invite only</span>
                </button>
              </div>
              <div style={{ fontSize: '12px', color: '#5a5a5a', lineHeight: 1.5, padding: '8px 12px', background: '#f9f9f7', borderRadius: '10px' }}>
                {isPublic
                  ? '✅ Anyone can discover and join this group'
                  : ' You are the admin. Only people you invite can join.'
                } 
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!name}
              style={{ width: '100%', padding: '16px', background: name ? '#0d0d0d' : '#e2e2d8', color: name ? '#CAFF00' : '#5a5a5a', border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: 700, cursor: name ? 'pointer' : 'not-allowed' }}
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div>

            {/* Day picker */}
            <div style={{ background: '#ffffff', borderRadius: '20px', padding: '20px', border: '1.5px solid #e2e2d8', marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>
                Day
              </label>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {days.map(day => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    style={{ flexShrink: 0, padding: '8px 16px', background: selectedDay === day ? '#0d0d0d' : '#f5f5f0', color: selectedDay === day ? '#CAFF00' : '#0d0d0d', border: 'none', borderRadius: '100px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Time */}
            <div style={{ background: '#ffffff', borderRadius: '20px', padding: '20px', border: '1.5px solid #e2e2d8', marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>
                Time
              </label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: '#5a5a5a', marginBottom: '6px' }}>From</div>
                  <input
                    type="time"
                    value={from}
                    onChange={e => setFrom(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', background: '#f5f5f0', border: '1.5px solid #e2e2d8', borderRadius: '12px', fontSize: '15px', fontWeight: 700, color: '#0d0d0d', outline: 'none' }}
                  />
                </div>
                <div style={{ fontSize: '16px', color: '#5a5a5a', marginTop: '18px', fontWeight: 700 }}>→</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: '#5a5a5a', marginBottom: '6px' }}>Until</div>
                  <input
                    type="time"
                    value={until}
                    onChange={e => setUntil(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', background: '#f5f5f0', border: '1.5px solid #e2e2d8', borderRadius: '12px', fontSize: '15px', fontWeight: 700, color: '#0d0d0d', outline: 'none' }}
                  />
                </div>
              </div>
            </div>

            {/* Recurring */}
            <div style={{ background: '#ffffff', borderRadius: '20px', padding: '20px', border: '1.5px solid #e2e2d8', marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>
                Frequency
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setIsRecurring(false)}
                  style={{ flex: 1, padding: '14px 12px', background: !isRecurring ? '#0d0d0d' : '#f5f5f0', color: !isRecurring ? '#CAFF00' : '#0d0d0d', border: 'none', borderRadius: '14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
                >
                  <span style={{ fontSize: '20px' }}>📅</span>
                  <span>One-time</span>
                  <span style={{ fontSize: '10px', fontWeight: 400, opacity: 0.7 }}>Expires after event</span>
                </button>
                <button
                  onClick={() => setIsRecurring(true)}
                  style={{ flex: 1, padding: '14px 12px', background: isRecurring ? '#0d0d0d' : '#f5f5f0', color: isRecurring ? '#CAFF00' : '#0d0d0d', border: 'none', borderRadius: '14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
                >
                  <span style={{ fontSize: '20px' }}>🔄</span>
                  <span>Recurring</span>
                  <span style={{ fontSize: '10px', fontWeight: 400, opacity: 0.7 }}>Never expires</span>
                </button>
              </div>
            </div>

            {/* Summary */}
            <div style={{ background: '#0d0d0d', borderRadius: '20px', padding: '18px', marginBottom: '20px' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#CAFF00', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
                ✦ Group summary
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>{name}</div>
              {description && (
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginBottom: '10px', lineHeight: 1.5 }}>{description}</div>
              )}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ padding: '4px 10px', background: '#CAFF00', borderRadius: '100px', fontSize: '11px', fontWeight: 700, color: '#0d0d0d' }}>
                  {selectedDay} · {from} → {until}
                </span>
                {maxMembers && (
                  <span style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                    👥 Max {maxMembers}
                  </span>
                )}
                <span style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                  {isPublic ? '🌍 Public' : '🔒 Private'}
                </span>
                <span style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                  {isRecurring ? '🔄 Recurring' : '📅 One-time'}
                </span>
              </div>
            </div>

            <button
              onClick={createGroup}
              disabled={loading}
              style={{ width: '100%', padding: '16px', background: '#CAFF00', color: '#0d0d0d', border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: 800, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Creating...' : 'Create group'}
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}