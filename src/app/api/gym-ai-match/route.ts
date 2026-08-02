import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: Request) {
  try {
    const { gym_id, gym_activity, gym_name } = await request.json()

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

    // Get everyone checked into same gym right now
    const { data: gymUsers } = await supabase
      .from('profiles')
      .select('*')
      .eq('current_gym_id', gym_id)
      .eq('gym_checked_in', true)
      .neq('id', user.id)

    if (!gymUsers || gymUsers.length === 0) {
      return NextResponse.json({
        match: null,
        matches: [],
        message: 'No one else checked in at this gym right now'
      })
    }

    // Build prompt for Claude
    const usersDescription = gymUsers.map((u, i) => `
${i + 1}. ${u.full_name}
   - Currently doing: ${u.current_gym_activity || 'general workout'}
   - Activities they love: ${u.activities?.join(', ') || 'not specified'}
   - City: ${u.city}
`).join('\n')

    const prompt = `You are a gym partner matching AI for Strolly app.

Current user:
- Name: ${currentProfile?.full_name}
- Currently doing at ${gym_name}: ${gym_activity}
- Activities they love: ${currentProfile?.activities?.join(', ') || 'not specified'}

People also checked in at ${gym_name} right now:
${usersDescription}

Rank these people from best to worst gym partner for the current user.
Consider: similar gym activity, shared fitness interests, good partner potential.

Respond ONLY with valid JSON, no other text:
{
  "matches": [
    {
      "user_id_index": 0,
      "score": 91,
      "reason": "One sentence explaining why this is a great gym partner match"
    }
  ]
}`

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

    const cleanJson = responseText.replace(/```json|```/g, '').trim()
    const aiResult = JSON.parse(cleanJson)

    const rankedMatches = aiResult.matches.map((m: any) => ({
      ...gymUsers[m.user_id_index],
      score: m.score,
      reason: m.reason,
    }))

    return NextResponse.json({
      matches: rankedMatches,
      total_scanned: gymUsers.length,
    })

  } catch (error) {
    console.error('Gym AI match error:', error)
    return NextResponse.json({ error: 'Gym AI match failed' }, { status: 500 })
  }
}