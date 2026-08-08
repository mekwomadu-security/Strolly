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
            <button type="submit" style={{ padding: '8px 16px', background: 'transparent', border: '1.5px solid #e2e2d8', borderRadius: '100px', fontSize: '13px', color: '#5a5a5a', cursor: 'pointer' }}>
              Sign out
            </button>
          </form>
        </div>

        {/* Welcome card */}
        <div style={{ background: '#0d0d0d', borderRadius: '28px', padding: '32px', marginBottom: '16px' }}>

          {/* Welcome + profile photo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#CAFF00', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              ✦ Welcome to Strolly
            </div>
            <a href="/profile" style={{ textDecoration: 'none', flexShrink: 0 }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: '2.5px solid #CAFF00', display: 'block' }} />
              ) : (
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#CAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#0d0d0d' }}>
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

          {/* 2x2 buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <a href="/schedule" style={{ display: 'block', borderRadius: '16px', overflow: 'hidden', position: 'relative', height: '80px', textDecoration: 'none' }}>
              <img src="https://images.unsplash.com/photo-1685534536343-697641ada7dc?w=400&q=80" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'brightness(1.15)' }} alt="" />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0.05))', display: 'flex', alignItems: 'flex-end', padding: '8px 10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#CAFF00' }}>🏃 Let's go out </span>
              </div>
            </a>
            <a href="/groups" style={{ display: 'block', borderRadius: '16px', overflow: 'hidden', position: 'relative', height: '80px', textDecoration: 'none' }}>
              <img src="https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400&q=80" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'brightness(1.2)' }} alt="" />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0.05))', display: 'flex', alignItems: 'flex-end', padding: '8px 10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff' }}>👥 Groups </span>
              </div>
            </a>
            <a href="/ai-match" style={{ display: 'block', borderRadius: '16px', overflow: 'hidden', position: 'relative', height: '80px', textDecoration: 'none' }}>
              <img src="https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=400&q=80" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'brightness(1.2)' }} alt="" />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0.05))', display: 'flex', alignItems: 'flex-end', padding: '8px 10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#CAFF00' }}>✨ AI Match </span>
              </div>
            </a>
            <a href="/gym" style={{ display: 'block', borderRadius: '16px', overflow: 'hidden', position: 'relative', height: '80px', textDecoration: 'none' }}>
              <img src='https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300&q=80' style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'brightness(1.2)' }} alt="" />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0.05))', display: 'flex', alignItems: 'flex-end', padding: '8px 10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff' }}>🏋️ At the gym </span>
              </div>
            </a>
          </div>
        </div>

        {/* Activities */}
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '20px', border: '1.5px solid #e2e2d8', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>
            Your activities
          </div>
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
            {profile?.activities?.map((a: string) => {
              const photos: Record<string, string> = {
                gym: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80",
                jogging: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=300&q=80',
                cycling: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=300&q=80',
                football: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=300&q=80',
                yoga: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=300&q=80',
                swimming: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=300&q=80',
                dog_walk: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=300&q=80',
                badminton: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=300&q=80',
                tennis: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=300&q=80',
              }
              const labels: Record<string, string> = {
                gym: 'Gym', jogging: 'Jogging', cycling: 'Cycling',
                football: 'Football', yoga: 'Yoga', swimming: 'Swimming',
                dog_walk: 'Dog walk', badminton: 'Badminton', tennis: 'Tennis',
              }
              const photo = photos[a] || 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=300&q=80'
              const label = labels[a] || a
              return (
                <a key={a} href={'/schedule?activity=' + a} style={{ flexShrink: 0, width: '90px', textDecoration: 'none' }}>
                  <div style={{ borderRadius: '14px', overflow: 'hidden', position: 'relative', height: '110px' }}>
                    <img src={photo} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(1.1)', display: 'block' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)', display: 'flex', alignItems: 'flex-end', padding: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff' }}>{label}</span>
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
          <div style={{ fontSize: '11px', color: '#5a5a5a', marginTop: '10px' }}>
            Tap an activity to find a partner now
          </div>
        </div>

      </div>
    </div>
  )
}

//update photo- 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300&q=80'. dumbells
// "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80". - girlie one 
// doumentation to chnage both gym phtotos 