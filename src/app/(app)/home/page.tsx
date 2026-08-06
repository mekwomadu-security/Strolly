import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('activities, city, avatar_url')
    .eq('id', user.id)
    .single()

  if (!profile?.activities || profile.activities.length === 0) {
    redirect('/onboarding')
  }

  const name = user.user_metadata?.full_name ?? user.email ?? 'there'
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', padding: '40px 24px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div style={{ fontFamily: 'sans-serif', fontSize: '28px', fontWeight: 800, letterSpacing: '-1px', color: '#0d0d0d' }}>
            Str<span style={{ background: '#0d0d0d', color: '#CAFF00', padding: '2px 10px', borderRadius: '8px', marginLeft: '2px' }}>olly</span>
          </div>
          <form action={signOut}>
            <button type="submit" style={{ padding: '3px 7px', background: 'transparent', border: '1.5px solid #e2e2d8', borderRadius: '100px', fontSize: '13px', color: '#5a5a5a', cursor: 'pointer' }}>
              Sign out
            </button>
          </form>
        </div>

        {/* Welcome card */}
        <div style={{ background: '#0d0d0d', borderRadius: '28px', padding: '32px', marginBottom: '16px' }}>

          {/* Welcome line + profile photo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#CAFF00', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              ✦ Welcome to Strolly
            </div>
            <a href="/profile" style={{ textDecoration: 'none', flexShrink: 0 }}>
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: '2.5px solid #CAFF00', display: 'block' }}
                />
              ) : (
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#0d0d0d', border: '2.5px solid rgba(202,255,0,0.3)' }}>
                  {initials}
                </div>
              )}
            </a>
          </div>

          <div style={{ fontFamily: 'sans-serif', fontSize: '26px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px', lineHeight: 1.2, marginBottom: '8px' }}>
            Hey, {name} 👋
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: '20px' }}>
            You're in {profile?.city}. Ready to find a partner?
          </div>

          {/* Buttons — 2x2 grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <a href="/schedule" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px 8px', background: '#CAFF00', color: '#0d0d0d', borderRadius: '100px', fontSize: '11px', fontWeight: 700, textDecoration: 'none', textAlign: 'center', whiteSpace: 'nowrap' }}>
              🏃 Let's go out →
            </a>
            <a href="/groups" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px 8px', background: 'rgba(255,255,255,0.12)', color: '#ffffff', borderRadius: '100px', fontSize: '11px', fontWeight: 700, textDecoration: 'none', textAlign: 'center', whiteSpace: 'nowrap' }}>
              👥 Groups →
            </a>
            <a href="/ai-match" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px 8px', background: '#CAFF00', color: '#0d0d0d', borderRadius: '100px', fontSize: '11px', fontWeight: 700, textDecoration: 'none', textAlign: 'center', whiteSpace: 'nowrap' }}>
              ✨ AI Match →
            </a>
            <a href="/gym" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px 8px', background: 'rgba(255,255,255,0.12)', color: '#ffffff', borderRadius: '100px', fontSize: '11px', fontWeight: 700, textDecoration: 'none', textAlign: 'center', whiteSpace: 'nowrap' }}>
              🏋️ At the gym →
            </a>
          </div>
        </div>

        {/* Activities */}
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '20px', border: '1.5px solid #e2e2d8', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Your activities
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {profile?.activities?.map((a: string) => (
              <span key={a} style={{ padding: '6px 14px', background: '#CAFF00', borderRadius: '100px', fontSize: '13px', fontWeight: 600, color: '#0d0d0d' }}>
                {a}
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}