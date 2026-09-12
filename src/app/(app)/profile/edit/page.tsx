'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  { id: 'golfing', label: 'Golfing', icon: '🏌🏿‍♂️' },

]

const experienceLevels = ['Beginner', 'Intermediate', 'Advanced']
const preferredTimes = ['Morning', 'Afternoon', 'Evening', 'Flexible']
const fitnessGoals = ['Lose weight', 'Build muscle', 'Stay active', 'Train for event', 'Make friends', 'Have fun']

export default function EditProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState('')
  const [photos, setPhotos] = useState<any[]>([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [city, setCity] = useState('')
  const [selectedActivities, setSelectedActivities] = useState<string[]>([])
  const [experienceLevel, setExperienceLevel] = useState('Beginner')
  const [preferredTime, setPreferredTime] = useState('Flexible')
  const [fitnessGoal, setFitnessGoal] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (data) {
      setFullName(data.full_name || '')
      setBio(data.bio || '')
      setCity(data.city || '')
      setSelectedActivities(data.activities || [])
      setExperienceLevel(data.experience_level || 'Beginner')
      setPreferredTime(data.preferred_time || 'Flexible')
      setFitnessGoal(data.fitness_goal || '')
    }

    const { data: photosData } = await supabase
      .from('profile_photos')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })

    if (photosData) setPhotos(photosData)
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        bio,
        city,
        activities: selectedActivities,
        experience_level: experienceLevel.toLowerCase(),
        preferred_time: preferredTime.toLowerCase(),
        fitness_goal: fitnessGoal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
    setSaving(false)
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (photos.length >= 5) {
      setError('Maximum 5 photos allowed')
      return
    }

    setUploadingPhoto(true)
    setError(null)

    const supabase = createClient()
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('Profile-Photos')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      setError(uploadError.message)
      setUploadingPhoto(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('Profile-Photos')
      .getPublicUrl(fileName)

    await supabase.from('profile_photos').insert({
      user_id: userId,
      photo_url: publicUrl,
      position: photos.length,
    })

    if (photos.length === 0) {
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId)
    }

    fetchProfile()
    setUploadingPhoto(false)
  }

  async function handleDeletePhoto(photoId: string, photoUrl: string) {
    const supabase = createClient()
    await supabase.from('profile_photos').delete().eq('id', photoId)

    const path = photoUrl.split('/Profile-Photos/')[1]
    if (path) {
      await supabase.storage.from('Profile-Photos').remove([path])
    }

    fetchProfile()
  }

  async function handleChangeEmail() {
    if (!newEmail) { setError('Please enter a new email'); return }
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    if (error) {
      setError(error.message)
    } else {
      setEmailSent(true)
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'DELETE') {
      setError('Please type DELETE to confirm')
      return
    }
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('delete_user')
    if (error) {
      await supabase.auth.signOut()
    }
    router.push('/login')
  }

  function toggleActivity(id: string) {
    setSelectedActivities(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '14px', color: '#5a5a5a' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', paddingBottom: '40px' }}>

      {/* Header */}
      <div style={{ padding: '56px 24px 20px', background: '#ffffff', borderBottom: '1px solid #e2e2d8', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          onClick={() => router.push('/profile')}
          style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f5f5f0', border: 'none', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0d0d0d', letterSpacing: '-0.5px' }}>Edit profile</div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '8px 18px', background: '#0d0d0d', color: '#CAFF00', border: 'none', borderRadius: '100px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div style={{ padding: '20px 24px', maxWidth: '480px', margin: '0 auto' }}>

        {success && (
          <div style={{ padding: '12px 16px', background: '#f0ffe0', border: '1.5px solid #a8d900', borderRadius: '12px', fontSize: '13px', color: '#2d6a00', marginBottom: '16px', fontWeight: 600 }}>
            ✅ Profile saved successfully!
          </div>
        )}

        {error && (
          <div style={{ padding: '12px 16px', background: '#fff0f0', border: '1.5px solid #ffcccc', borderRadius: '12px', fontSize: '13px', color: '#cc0000', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* Photos */}
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '18px', border: '1.5px solid #e2e2d8', marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Photos ({photos.length}/5)
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {photos.map((photo, index) => (
              <div key={photo.id} style={{ position: 'relative' }}>
                <img
                  src={photo.photo_url}
                  alt="Profile"
                  style={{ width: '90px', height: '90px', borderRadius: '14px', objectFit: 'cover', border: index === 0 ? '2px solid #CAFF00' : '1.5px solid #e2e2d8' }}
                />
                {index === 0 && (
                  <div style={{ position: 'absolute', bottom: '4px', left: '4px', background: '#CAFF00', borderRadius: '6px', padding: '1px 6px', fontSize: '9px', fontWeight: 700, color: '#0d0d0d' }}>
                    MAIN
                  </div>
                )}
                <button
                  onClick={() => handleDeletePhoto(photo.id, photo.photo_url)}
                  style={{ position: 'absolute', top: '4px', right: '4px', width: '20px', height: '20px', borderRadius: '50%', background: '#cc0000', color: '#ffffff', border: 'none', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
                >
                  ×
                </button>
              </div>
            ))}
            {photos.length < 5 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{ width: '90px', height: '90px', borderRadius: '14px', border: '2px dashed #e2e2d8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: '4px' }}
                onMouseOver={e => e.currentTarget.style.borderColor = '#a8d900'}
                onMouseOut={e => e.currentTarget.style.borderColor = '#e2e2d8'}
              >
                <div style={{ fontSize: '24px' }}>+</div>
                <div style={{ fontSize: '10px', color: '#5a5a5a', fontWeight: 600 }}>
                  {uploadingPhoto ? 'Uploading...' : 'Add photo'}
                </div>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            style={{ display: 'none' }}
          />
        </div>

        {/* Personal info */}
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '18px', border: '1.5px solid #e2e2d8', marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
            Personal info
          </div>
          {[
            { label: 'Full name', value: fullName, setter: setFullName, placeholder: 'Your name' },
            { label: 'City', value: city, setter: setCity, placeholder: 'Your city' },
          ].map(field => (
            <div key={field.label} style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                {field.label}
              </label>
              <input
                type="text"
                value={field.value}
                onChange={e => field.setter(e.target.value)}
                placeholder={field.placeholder}
                style={{ width: '100%', padding: '12px 14px', background: '#f5f5f0', border: '1.5px solid #e2e2d8', borderRadius: '12px', fontSize: '14px', color: '#0d0d0d', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = '#a8d900'}
                onBlur={e => e.target.style.borderColor = '#e2e2d8'}
              />
            </div>
          ))}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              Bio
            </label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell people about yourself..."
              rows={3}
              style={{ width: '100%', padding: '12px 14px', background: '#f5f5f0', border: '1.5px solid #e2e2d8', borderRadius: '12px', fontSize: '14px', color: '#0d0d0d', outline: 'none', resize: 'none' }}
              onFocus={e => e.target.style.borderColor = '#a8d900'}
              onBlur={e => e.target.style.borderColor = '#e2e2d8'}
            />
          </div>
        </div>

        {/* Activities */}
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '18px', border: '1.5px solid #e2e2d8', marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Activities
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {activities.map(a => (
              <button
                key={a.id}
                onClick={() => toggleActivity(a.id)}
                style={{ padding: '8px 14px', background: selectedActivities.includes(a.id) ? '#CAFF00' : '#f5f5f0', border: `1.5px solid ${selectedActivities.includes(a.id) ? '#a8d900' : '#e2e2d8'}`, borderRadius: '100px', fontSize: '13px', fontWeight: selectedActivities.includes(a.id) ? 700 : 500, color: '#0d0d0d', cursor: 'pointer' }}
              >
                {a.icon} {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fitness profile */}
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '18px', border: '1.5px solid #e2e2d8', marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
            Fitness profile
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
              Experience level
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {experienceLevels.map(level => (
                <button
                  key={level}
                  onClick={() => setExperienceLevel(level)}
                  style={{ flex: 1, padding: '10px', background: experienceLevel === level ? '#0d0d0d' : '#f5f5f0', color: experienceLevel === level ? '#CAFF00' : '#0d0d0d', border: `1.5px solid ${experienceLevel === level ? '#0d0d0d' : '#e2e2d8'}`, borderRadius: '12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
              Preferred time
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {preferredTimes.map(time => (
                <button
                  key={time}
                  onClick={() => setPreferredTime(time)}
                  style={{ padding: '8px 14px', background: preferredTime === time ? '#0d0d0d' : '#f5f5f0', color: preferredTime === time ? '#CAFF00' : '#0d0d0d', border: `1.5px solid ${preferredTime === time ? '#0d0d0d' : '#e2e2d8'}`, borderRadius: '100px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
              Fitness goal
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {fitnessGoals.map(goal => (
                <button
                  key={goal}
                  onClick={() => setFitnessGoal(goal)}
                  style={{ padding: '8px 14px', background: fitnessGoal === goal ? '#CAFF00' : '#f5f5f0', border: `1.5px solid ${fitnessGoal === goal ? '#a8d900' : '#e2e2d8'}`, borderRadius: '100px', fontSize: '12px', fontWeight: fitnessGoal === goal ? 700 : 500, color: '#0d0d0d', cursor: 'pointer' }}
                >
                  {goal}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Change email */}
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '18px', border: '1.5px solid #e2e2d8', marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>
            Change email
          </div>
          {emailSent ? (
            <div style={{ padding: '12px', background: '#f0ffe0', border: '1.5px solid #a8d900', borderRadius: '12px', fontSize: '13px', color: '#2d6a00', fontWeight: 600 }}>
              ✅ Confirmation sent to both emails. Check your inbox.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="New email address"
                style={{ flex: 1, padding: '12px 14px', background: '#f5f5f0', border: '1.5px solid #e2e2d8', borderRadius: '12px', fontSize: '14px', color: '#0d0d0d', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = '#a8d900'}
                onBlur={e => e.target.style.borderColor = '#e2e2d8'}
              />
              <button
                onClick={handleChangeEmail}
                style={{ padding: '12px 16px', background: '#0d0d0d', color: '#CAFF00', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Update →
              </button>
            </div>
          )}
        </div>

        {/* Delete account */}
        <div style={{ background: '#fff0f0', borderRadius: '20px', padding: '18px', border: '1.5px solid #ffcccc', marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#cc0000', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
            ⚠️ Delete account
          </div>
          <div style={{ fontSize: '13px', color: '#5a5a5a', lineHeight: 1.6, marginBottom: '14px' }}>
            This permanently deletes your profile, matches, chats and groups. This cannot be undone.
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder='Type "DELETE" to confirm'
              style={{ flex: 1, padding: '12px 14px', background: '#ffffff', border: '1.5px solid #ffcccc', borderRadius: '12px', fontSize: '14px', color: '#0d0d0d', outline: 'none' }}
            />
            <button
              onClick={handleDeleteAccount}
              disabled={deleting || deleteConfirm !== 'DELETE'}
              style={{ padding: '12px 16px', background: deleteConfirm === 'DELETE' ? '#cc0000' : '#e2e2d8', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: 700, cursor: deleteConfirm === 'DELETE' ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}