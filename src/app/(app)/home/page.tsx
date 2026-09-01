import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import RecentChatsSwiper from '@/components/RecentChatsSwiper'
import LocationCapture from '@/components/LocationCapture'

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

  const { data: convs } = await supabase
    .from('conversations')
    .select('id, user1_id, user2_id, created_at')
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(3)

  const recentChats = await Promise.all((convs || []).map(async conv => {
    const otherId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id
    const { data: p } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', otherId)
      .single()
    const { data: msgs } = await supabase
      .from('messages')
      .select('content, created_at, sender_id')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(1)
    const lastMsg = msgs?.[0]
    const time = new Date(lastMsg?.created_at || conv.created_at || Date.now())
    const diff = Date.now() - time.getTime()
    const timeStr = diff < 3600000
      ? Math.floor(diff / 60000) + 'm'
      : diff < 86400000
      ? Math.floor(diff / 3600000) + 'h'
      : Math.floor(diff / 86400000) + 'd'
    return {
      id: otherId,
      name: p?.full_name || 'Unknown',
      avatar: p?.avatar_url || '',
      lastMsg: lastMsg?.content || 'Hey Strollian 👋',
      time: timeStr,
      unread: lastMsg?.sender_id !== user.id,
    }
  }))

  const activityPhotos: Record<string, string> = {
    gym: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300&q=80',
    jogging: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=300&q=80',
    cycling: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=300&q=80',
    football: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=300&q=80',
    yoga: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=300&q=80',
    swimming: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=300&q=80',
    dog_walk: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=300&q=80',
    badminton: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=300&q=80',
    tennis: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=300&q=80',
  }

  const activityLabels: Record<string, string> = {
    gym: 'Gym', jogging: 'Jogging', cycling: 'Cycling',
    football: 'Football', yoga: 'Yoga', swimming: 'Swimming',
    dog_walk: 'Dog walk', badminton: 'Badminton', tennis: 'Tennis',
  }

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', padding: '40px 24px 100px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div style={{ fontFamily: 'sans-serif', fontSize: '28px', fontWeight: 800, letterSpacing: '-1px', color: '#0d0d0d' }}>
            Str<span style={{ background: '#0d0d0d', color: '#CAFF00', padding: '2px 10px', borderRadius: '8px', marginLeft: '2px' }}>olly</span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <a href="/notifications" style={{ position: 'relative', width: '36px', height: '36px', borderRadius: '50%', background: '#ffffff', border: '1.5px solid #e2e2d8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', textDecoration: 'none' }}>
              🔔
              <div style={{ position: 'absolute', top: '0', right: '0', width: '8px', height: '8px', borderRadius: '50%', background: '#ff3b30', border: '2px solid #f5f5f0' }} />
            </a>
            <form action={signOut}>
              <button type="submit" style={{ padding: '8px 16px', background: 'transparent', border: '1.5px solid #e2e2d8', borderRadius: '100px', fontSize: '13px', color: '#5a5a5a', cursor: 'pointer' }}>
                Sign out
              </button>
            </form>
          </div>
        </div>

        {/* Welcome card */}
        <div style={{ background: '#0d0d0d', borderRadius: '28px', padding: '32px', marginBottom: '16px' }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
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

          {/* 2x2 photo buttons — single line text each */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <a href="/schedule" style={{ display: 'block', borderRadius: '16px', overflow: 'hidden', position: 'relative', height: '88px', textDecoration: 'none', border: '1.5px solid #CAFF00' }}>
              <img src="https://images.unsplash.com/photo-1685534536343-697641ada7dc?w=300&q=80" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(1.1)', display: 'block' }} alt="" />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 8px 7px', background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#CAFF00', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}> Schedule a session</div>
              </div>
            </a>
            <a href="/groups" style={{ display: 'block', borderRadius: '16px', overflow: 'hidden', position: 'relative', height: '88px', textDecoration: 'none' }}>
              <img src="https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=300&q=80" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(1.15)', display: 'block' }} alt="" />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 8px 7px', background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>👥 Join or Create Groups</div>
              </div>
            </a>
            <a href="/ai-match" style={{ display: 'block', borderRadius: '16px', overflow: 'hidden', position: 'relative', height: '88px', textDecoration: 'none' }}>
              <img src="https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=300&q=80" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(1.15)', display: 'block' }} alt="" />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 8px 7px', background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#CAFF00', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>✨ Strolly AI . Instant Match</div>
              </div>
            </a>
            <a href="/gym" style={{ display: 'block', borderRadius: '16px', overflow: 'hidden', position: 'relative', height: '88px', textDecoration: 'none' }}>
              <img src="https://images.unsplash.com/photo-1518611012118-696072aa579a?w=300&q=80" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(1.15)', display: 'block' }} alt="" />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 8px 7px', background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>⚡Strolly AI · Instant Gym Match</div>
              </div>
            </a>
          </div>
        </div>

        {/* Activities */}
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '18px', border: '1.5px solid #e2e2d8', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Your activities
          </div>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
            {profile?.activities?.map((a: string) => {
              const photo = activityPhotos[a] || activityPhotos.jogging
              const label = activityLabels[a] || a
              return (
                <a key={a} href={'/schedule?activity=' + a} style={{ flexShrink: 0, width: '84px', textDecoration: 'none' }}>
                  <div style={{ borderRadius: '14px', overflow: 'hidden', position: 'relative', height: '100px' }}>
                    <img src={photo} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(1.05)', display: 'block' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 7px 7px', background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)' }}>
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

        {/* Recent chats + activities swiper */}
        <RecentChatsSwiper chats={recentChats} />

      </div>
      <LocationCapture />
      <BottomNav />
    </div>
  )
}