import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check if user has completed onboarding
  const { data: profile } = await supabase
    .from('profiles')
    .select('activities, city')
    .eq('id', user.id)
    .single()

  // If no activities saved → go to onboarding
  if (!profile?.activities || profile.activities.length === 0) {
    redirect('/onboarding')
  }

  const name = user.user_metadata?.full_name ?? user.email ?? 'there'

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', padding: '40px 24px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>

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

       <div style={{ background: '#0d0d0d', borderRadius: '28px', padding: '32px', marginBottom: '16px' }}>
  <div style={{ fontSize: '13px', fontWeight: 800, color: '#CAFF00', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
    ✦ Welcome to Strolly
  </div>
  <div style={{ fontFamily: 'sans-serif', fontSize: '26px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px', lineHeight: 1.2, marginBottom: '10px' }}>
    Hey, {name} 👋
  </div>
  <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: '20px' }}>
    You're in {profile?.city}. Ready to find a partner?
  </div>
  <a href="/schedule" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '12px 20px', background: '#CAFF00', color: '#0d0d0d', borderRadius: '100px', fontSize: '14px', fontWeight: 800, textDecoration: 'none' }}>
    🏃 Let's go out today →
  </a>
 <a href="/groups" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '8px 14px', background: 'rgba(255,255,255,0.1)', color: '#ffffff', borderRadius: '100px', fontSize: '12px', fontWeight: 700, textDecoration: 'none', marginTop: '10px', marginLeft: '20px' }}>
  👥 Create / Join Groups →
</a>
<a href="/ai-match" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '12px 20px', background: '#CAFF00', color: '#0d0d0d', borderRadius: '100px', fontSize: '14px', fontWeight: 800, textDecoration: 'none', marginTop: '10px' }}>
  ✨ AI Instant Match →
</a>
  <a href="/gym" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', background: 'rgba(255,255,255,0.1)', color: '#ffffff', borderRadius: '100px',    marginLeft: '50px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
    🏋️ I'm at the gym →
  </a>
</div>

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

        <div style={{ background: '#f0ffe0', borderRadius: '20px', padding: '20px', border: '1.5px solid #a8d900' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0d0d0d', marginBottom: '10px' }}>
            What's next — Phase 3
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: '#5a5a5a' }}>
            <div>→ Nearby users API route</div>
            <div>→ Real AI matching with Claude</div>
            <div>→ Real time chat</div>
            <div>→ Gym check-in feature</div>
          </div>
        </div>

      </div>
    </div>
  )
}