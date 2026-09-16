import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic()

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function getDistanceScore(km: number): number {
  if (km < 0.1) return 40
  if (km < 0.5) return 35
  if (km < 1.0) return 28
  if (km < 2.0) return 20
  if (km < 5.0) return 10
  if (km < 10.0) return 5
  return 0
}

function getDistanceLabel(km: number): string {
  if (km < 0.1) return 'Same building'
  if (km < 1.0) return `${Math.round(km * 1000)}m away`
  return `${km.toFixed(1)}km away`
}

function getTimeOverlap(
  fromA: string, untilA: string,
  fromB: string, untilB: string
): number {
  const toMins = (t: string) => {
    if (!t) return 0
    const [h, m] = t.split(':').map(Number)
    return h * 60 + (m || 0)
  }
  const start = Math.max(toMins(fromA), toMins(fromB))
  const end = Math.min(toMins(untilA), toMins(untilB))
  return Math.max(0, end - start)
}

function getTimeScore(overlapMins: number): number {
  if (overlapMins >= 120) return 25
  if (overlapMins >= 60) return 20
  if (overlapMins >= 30) return 12
  if (overlapMins >= 15) return 6
  return 0
}

function getRatingScore(rating: number): number {
  return Math.round((rating / 5) * 10)
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { activity, latitude, longitude, availableFrom, availableUntil } = body

    const { data: currentUser } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!currentUser) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const userLat = latitude || currentUser.latitude
    const userLng = longitude || currentUser.longitude

    if (!userLat || !userLng) {
      return NextResponse.json({
        error: 'Please enable location to find matches near you'
      }, { status: 400 })
    }

    const userFrom = availableFrom || currentUser.available_from || '00:00'
    const userUntil = availableUntil || currentUser.available_until || '23:59'

    const today = new Date().toISOString().split('T')[0]

    // Only match people who specifically scheduled THIS activity today
    const { data: candidates } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .eq('current_activity', activity)
      .eq('is_available', true)
      .eq('available_date', today)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({
        error: `Nobody has scheduled ${activity.replace(/_/g, ' ')} for today. Check back later or try a different activity.
                 you can as well use the scheduled feature to see other similar activites in your selected activty list`

      }, { status: 404 })
    }

    const scored = candidates
      .map(candidate => {
        const distance = calculateDistance(
          userLat, userLng,
          candidate.latitude, candidate.longitude
        )

        if (distance > 10) return null

        const distanceScore = getDistanceScore(distance)
        const distanceLabel = getDistanceLabel(distance)

        const overlapMins = getTimeOverlap(
          userFrom, userUntil,
          candidate.available_from || '00:00',
          candidate.available_until || '23:59'
        )
        const timeScore = getTimeScore(overlapMins)
        const ratingScore = getRatingScore(candidate.rating || 5)
        const activityScore = 35
        const totalScore = distanceScore + activityScore + timeScore + ratingScore

        return {
          ...candidate,
          distance,
          distanceLabel,
          distanceScore,
          activityScore,
          timeScore,
          ratingScore,
          totalScore,
          overlapMins,
        }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.totalScore - a.totalScore)
      .slice(0, 5)

    if (scored.length === 0) {
      return NextResponse.json({
        error: 'No matches found within 10km. Try again later.'
      }, { status: 404 })
    }

    // Generate reasoning for ALL matches
    const allMatchesWithReasoning = await Promise.all(
      scored.map(async (s: any) => {
        const prompt = `You are Strolly's AI matching engine.

THE PERSON YOU MATCHED IS CALLED: ${s.full_name}
DO NOT use any other name. Only use: ${s.full_name}

Activity: ${activity.replace(/_/g, ' ')}
Distance: ${s.distanceLabel}
Time overlap: ${s.overlapMins} minutes
Rating: ${s.rating || 5}/5
Sessions: ${s.session_count || 0}

Write 2 sentences max about why ${s.full_name} is a great match.
Use the name ${s.full_name} naturally in your response.
No markdown formatting. No bullet points. No asterisks.`

        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 150,
          messages: [{ role: 'user', content: prompt }],
        })

        return {
          id: s.id,
          name: s.full_name,
          avatar: s.avatar_url,
          activity,
          score: s.totalScore,
          maxScore: 110,
          scorePercent: Math.round((s.totalScore / 110) * 100),
          distanceLabel: s.distanceLabel,
          distance: s.distance,
          distanceScore: s.distanceScore,
          activityScore: s.activityScore,
          timeScore: s.timeScore,
          ratingScore: s.ratingScore,
          overlapMins: s.overlapMins,
          rating: s.rating || 5,
          sessionCount: s.session_count || 0,
          reasoning: (response.content[0] as any).text,
        }
      })
    )

    const bestMatch = allMatchesWithReasoning[0]

    return NextResponse.json({
      match: {
        ...bestMatch,
        allMatches: allMatchesWithReasoning,
      }
    })

  } catch (error) {
    console.error('AI match error:', error)
    return NextResponse.json({ error: 'Matching failed' }, { status: 500 })
  }
}