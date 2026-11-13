import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const activityLabels: Record<string, string> = {
  gym: 'Gym', jogging: 'Jogging', cycling: 'Cycling',
  football: 'Football', yoga: 'Yoga', swimming: 'Swimming',
  dog_walk: 'Dog walk', badminton: 'Badminton', tennis: 'Tennis',
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { action, receiverId, senderId } = body

    // ─── SEND a match request ───────────────────────────────────────────────
    if (action === 'send') {
      const { data: existing } = await supabase
        .from('match_requests')
        .select('id, status')
        .eq('sender_id', user.id)
        .eq('receiver_id', receiverId)
        .single()

      if (existing) {
        return NextResponse.json({ status: existing.status })
      }

      const { error } = await supabase
        .from('match_requests')
        .insert({ sender_id: user.id, receiver_id: receiverId, status: 'pending' })

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      const { data: sender } = await supabase
        .from('profiles')
        .select('full_name, current_activity')
        .eq('id', user.id)
        .single()

      const activityLabel = activityLabels[sender?.current_activity || ''] || sender?.current_activity || 'an activity'

      await supabase.from('notifications').insert({
        user_id: receiverId,
        type: 'match_request',
        title: `${sender?.full_name} wants to work out with you`,
        message: `They want to do ${activityLabel} together today`,
        sender_id: user.id,
        is_read: false,
      })

      return NextResponse.json({ status: 'pending' })
    }

    // ─── ACCEPT ─────────────────────────────────────────────────────────────
    if (action === 'accept') {
      await supabase
        .from('match_requests')
        .update({ status: 'accepted' })
        .eq('sender_id', senderId)
        .eq('receiver_id', user.id)

      const { data: receiver } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      await supabase.from('notifications').insert({
        user_id: senderId,
        type: 'match_accepted',
        title: `${receiver?.full_name} accepted your request!`,
        message: `You can now chat and plan your session together`,
        sender_id: user.id,
        is_read: false,
      })

      return NextResponse.json({ status: 'accepted' })
    }

    // ─── DECLINE ─────────────────────────────────────────────────────────────
    if (action === 'decline') {
      await supabase
        .from('match_requests')
        .update({ status: 'declined' })
        .eq('sender_id', senderId)
        .eq('receiver_id', user.id)

      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('type', 'match_request')
        .eq('sender_id', senderId)

      return NextResponse.json({ status: 'declined' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Match request error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
