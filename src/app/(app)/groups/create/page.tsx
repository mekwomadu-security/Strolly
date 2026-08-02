'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const activities = [
  { id: 'gym', label: 'Gym', icon: '🏋️' },
  { id: 'jogging', label: 'Jogging', icon: '🏃' },
  { id: 'cycling', label: 'Cycling', icon: '🚴' },
  { id: 'football', label: 'Football', icon: '⚽' },
  { id: 'yoga', label: 'Yoga', icon: '🧘' },
  { id: 'swimming', label: 'Swimming', icon: '🏊' },
  { id: 'dog_walk', label: 'Dog walk', icon: '🐕' },
  { id: 'badminton', label: 'Badminton', icon: '🏸' },
  { id: 'tennis', label: 'Tennis', icon: '🎾' },
]

const days = ['Today', 'Tomorrow', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const times = ['6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM']

export default function CreateGroupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [activity, setActivity] = useState('')
  const [day, setDay] = useState('Today')
  const [from, setFrom] = useState('')
  const [until, setUntil] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [maxMembers, setMaxMembers] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!name.trim()) { setError('Please enter a group name'); return }
    if (!activity) { setError('Please pick an activity'); return }
    if (!from || !until) { setError('Please set your time window'); return }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Check for time conflicts
    const { data: conflicts } = await supabase
      .from('groups')
      .select('id')
      .eq('admin_id', user.id)
      .eq('available_date', day)
      .eq('is_active', true)
      .lte('available_from', until)
      .gte('available_until', from)

    if (conflicts && conflicts.length > 0) {
      setError('You already have a group at this time. Please choose a different time.')
      setLoading(false)
      return
    }

    // Get user city
    const { data: profile } = await supabase
      .from('profiles')
      .select('city')
      .eq('id', user.id)
      .single()

    // Create the group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: name.trim(),
        description: description.trim(),
        activity,
        admin_id: user.id,
        available_date: day,
        available_from: from,
        available_until: until,
        is_public: isPublic,
        max_members: maxMembers ? parseInt(maxMembers) : null,
        city: profile?.city || '',
        is_active: true,
      })
      .select('id')
      .single()

    if (groupError) {
      setError(groupError.message)
      setLoading(false)
      return
    }

    // Auto add admin as member
    await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: user.id,
      status: 'active',
    })

    router.push(`/groups/${group.id}`)
  }

  const selectedActivity = activities.find(a => a.id === activity)

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0' }}>

      {/* Header */}
      <div style={{ padding: '56px 24px 20px', background: '#ffffff', borderBottom: '1px solid #e2e2d8', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          onClick={() => step === 1 ? router.push('/groups') : setStep(step - 1)}
          style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f5f5f0', border: 'none', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          ←
        </button>
        <div>
          <div style={{ fontFamily: 'sans-serif', fontSize: '20px', fontWeight: 800, color: '#0d0d0d' }}>
            Create a group
          </div>
          <div style={{ fontSize: '12px', color: '#5a5a5a', marginTop: '2px' }}>
            Step {step} of 3
          </div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', gap: '4px', padding: '0' }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{ flex: 1, height: '3px', background: s <= step ? '#0d0d0d' : '#e2e2d8', transition: 'background 0.3s' }} />
        ))}
      </div>

      <div style={{ padding: '24px', maxWidth: '480px', margin: '0 auto' }}>

        {/* Step 1 — Group details */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#0d0d0d', marginBottom: '4px' }}>
                Name your group
              </div>
              <div style={{ fontSize: '14px', color: '#5a5a5a' }}>
                Give your group a name people will recognise
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Group name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Morning Joggers Regina"
                style={{ padding: '14px 16px', background: '#ffffff', border: '1.5px solid #e2e2d8', borderRadius: '14px', fontSize: '15px', color: '#0d0d0d', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = '#a8d900'}
                onBlur={e => e.target.style.borderColor = '#e2e2d8'}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What's this group about?"
                rows={3}
                style={{ padding: '14px 16px', background: '#ffffff', border: '1.5px solid #e2e2d8', borderRadius: '14px', fontSize: '15px', color: '#0d0d0d', outline: 'none', resize: 'none' }}
                onFocus={e => e.target.style.borderColor = '#a8d900'}
                onBlur={e => e.target.style.borderColor = '#e2e2d8'}
              />
            </div>

            {/* Public/Private toggle */}
            <div style={{ background: '#ffffff', borderRadius: '20px', padding: '20px', border: '1.5px solid #e2e2d8' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
                Group visibility
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div
                  onClick={() => setIsPublic(true)}
                  style={{ flex: 1, padding: '14px', background: isPublic ? '#CAFF00' : '#f5f5f0', border: `2px solid ${isPublic ? '#a8d900' : '#e2e2d8'}`, borderRadius: '14px', cursor: 'pointer', textAlign: 'center' }}
                >
                  <div style={{ fontSize: '20px', marginBottom: '6px' }}>🌍</div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#0d0d0d' }}>Public</div>
                  <div style={{ fontSize: '11px', color: '#5a5a5a', marginTop: '4px' }}>Anyone can join</div>
                </div>
                <div
                  onClick={() => setIsPublic(false)}
                  style={{ flex: 1, padding: '14px', background: !isPublic ? '#0d0d0d' : '#f5f5f0', border: `2px solid ${!isPublic ? '#0d0d0d' : '#e2e2d8'}`, borderRadius: '14px', cursor: 'pointer', textAlign: 'center' }}
                >
                  <div style={{ fontSize: '20px', marginBottom: '6px' }}>🔒</div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: !isPublic ? '#CAFF00' : '#0d0d0d' }}>Private</div>
                  <div style={{ fontSize: '11px', color: !isPublic ? 'rgba(255,255,255,0.5)' : '#5a5a5a', marginTop: '4px' }}>Invite only</div>
                </div>
              </div>
            </div>

            {/* Max members */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Max members (optional)
              </label>
              <input
                type="number"
                value={maxMembers}
                onChange={e => setMaxMembers(e.target.value)}
                placeholder="Leave empty for unlimited"
                min="2"
                max="100"
                style={{ padding: '14px 16px', background: '#ffffff', border: '1.5px solid #e2e2d8', borderRadius: '14px', fontSize: '15px', color: '#0d0d0d', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = '#a8d900'}
                onBlur={e => e.target.style.borderColor = '#e2e2d8'}
              />
            </div>

            {error && <div style={{ padding: '12px 16px', background: '#fff0f0', border: '1.5px solid #ffcccc', borderRadius: '12px', fontSize: '13px', color: '#cc0000' }}>{error}</div>}

            <button
              onClick={() => { if (!name.trim()) { setError('Please enter a group name'); return } setError(null); setStep(2) }}
              style={{ width: '100%', padding: '16px', background: '#0d0d0d', color: '#CAFF00', fontSize: '16px', fontWeight: 700, border: 'none', borderRadius: '16px', cursor: 'pointer' }}
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2 — Activity */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#0d0d0d', marginBottom: '4px' }}>
                What activity?
              </div>
              <div style={{ fontSize: '14px', color: '#5a5a5a' }}>
                Pick the activity for this group
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              {activities.map(a => (
                <div
                  key={a.id}
                  onClick={() => setActivity(a.id)}
                  style={{ background: activity === a.id ? '#CAFF00' : '#ffffff', border: `2px solid ${activity === a.id ? '#a8d900' : '#e2e2d8'}`, borderRadius: '16px', padding: '16px 10px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}
                >
                  <div style={{ fontSize: '28px', marginBottom: '6px' }}>{a.icon}</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0d0d0d' }}>{a.label}</div>
                </div>
              ))}
            </div>

            {error && <div style={{ padding: '12px 16px', background: '#fff0f0', border: '1.5px solid #ffcccc', borderRadius: '12px', fontSize: '13px', color: '#cc0000' }}>{error}</div>}

            <button
              onClick={() => { if (!activity) { setError('Please pick an activity'); return } setError(null); setStep(3) }}
              style={{ width: '100%', padding: '16px', background: '#0d0d0d', color: '#CAFF00', fontSize: '16px', fontWeight: 700, border: 'none', borderRadius: '16px', cursor: 'pointer' }}
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 3 — Schedule */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#0d0d0d', marginBottom: '4px' }}>
                When is it?
              </div>
              <div style={{ fontSize: '14px', color: '#5a5a5a' }}>
                Set the date and time for this group activity
              </div>
            </div>

            {/* Day */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Day</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {days.map(d => (
                  <button key={d} onClick={() => setDay(d)} style={{ padding: '8px 14px', background: day === d ? '#0d0d0d' : '#ffffff', border: `2px solid ${day === d ? '#0d0d0d' : '#e2e2d8'}`, borderRadius: '100px', fontSize: '13px', fontWeight: day === d ? 700 : 500, color: day === d ? '#CAFF00' : '#0d0d0d', cursor: 'pointer' }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* From */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>From</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {times.map(t => (
                  <button key={t} onClick={() => setFrom(t)} style={{ padding: '8px 12px', background: from === t ? '#0d0d0d' : '#ffffff', border: `2px solid ${from === t ? '#0d0d0d' : '#e2e2d8'}`, borderRadius: '100px', fontSize: '12px', fontWeight: from === t ? 700 : 500, color: from === t ? '#CAFF00' : '#0d0d0d', cursor: 'pointer' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Until */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Until</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {times.map(t => (
                  <button key={t} onClick={() => setUntil(t)} style={{ padding: '8px 12px', background: until === t ? '#CAFF00' : '#ffffff', border: `2px solid ${until === t ? '#a8d900' : '#e2e2d8'}`, borderRadius: '100px', fontSize: '12px', fontWeight: until === t ? 700 : 500, color: '#0d0d0d', cursor: 'pointer' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            {activity && from && until && (
              <div style={{ background: '#0d0d0d', borderRadius: '20px', padding: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#CAFF00', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Group summary</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>{name}</div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
                  {selectedActivity?.icon} {selectedActivity?.label} · {day} · {from} → {until}
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                  {isPublic ? '🌍 Public group' : '🔒 Private group'} {maxMembers ? `· Max ${maxMembers} members` : '· Unlimited members'}
                </div>
              </div>
            )}

            {error && <div style={{ padding: '12px 16px', background: '#fff0f0', border: '1.5px solid #ffcccc', borderRadius: '12px', fontSize: '13px', color: '#cc0000' }}>{error}</div>}

            <button
              onClick={handleCreate}
              disabled={loading}
              style={{ width: '100%', padding: '16px', background: '#CAFF00', color: '#0d0d0d', fontSize: '16px', fontWeight: 700, border: 'none', borderRadius: '16px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Creating group…' : 'Create group 🎉'}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}