import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: Request) {
  try {
    const { activity } = await request.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user profile
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Get current time to find people available RIGHT NOW
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTimeStr = `${currentHour}:${currentMinute.toString().padStart(2, '0')}`

    // Find nearby users available right now with same activity
    const { data: nearbyUsers } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .eq('current_activity', activity)
      .eq('is_available', true)
      .not('available_from', 'is', null)
      .not('available_until', 'is', null)

    if (!nearbyUsers || nearbyUsers.length === 0) {
      return NextResponse.json({
        match: null,
        message: 'No one available right now for this activity'
      })
    }

    // Build prompt for Claude
    const usersDescription = nearbyUsers.map((u, i) => `
${i + 1}. ${u.full_name}
   - City: ${u.city}
   - Activities they love: ${u.activities?.join(', ') || 'not specified'}
   - Current activity: ${u.current_activity}
   - Available: ${u.available_from} → ${u.available_until}
   - Available date: ${u.available_date}
`).join('\n')

    const prompt = `You are a fitness partner matching AI for Strolly app.

Current user profile:
- Name: ${currentProfile?.full_name}
- City: ${currentProfile?.city}
- Activities they love: ${currentProfile?.activities?.join(', ') || 'not specified'}
- Looking for: ${activity} partner RIGHT NOW

Available people nearby:
${usersDescription}

Rank these people from best to worst match for the current user.
Consider: shared activities, same city, availability window.

Respond ONLY with valid JSON in this exact format, no other text:
{
  "matches": [
    {
      "user_id_index": 0,
      "score": 94,
      "reason": "One sentence explaining why this is a great match"
    }
  ]
}`

    // Call Claude API
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = response.content[0].type === 'text'
      ? response.content[0].text
      : ''

    // Parse Claude response
    const cleanJson = responseText.replace(/```json|```/g, '').trim()
    const aiResult = JSON.parse(cleanJson)

    // Map indexes back to actual users
    const rankedMatches = aiResult.matches.map((m: any) => ({
      ...nearbyUsers[m.user_id_index],
      score: m.score,
      reason: m.reason,
    }))

    return NextResponse.json({
      matches: rankedMatches,
      total_scanned: nearbyUsers.length,
    })

  } catch (error) {
    console.error('AI match error:', error)
    return NextResponse.json({ error: 'AI match failed' }, { status: 500 })
  }
}