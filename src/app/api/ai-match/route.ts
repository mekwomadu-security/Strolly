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
  if (km < 0.5) return `${Math.round(km * 1000)}m away`
  if (km < 1.0) return `${Math.round(km * 1000)}m away`
  return `${km.toFixed(1)}km away`
}

function getTimeOverlap(
  fromA: string, untilA: string,
  fromB: string, untilB: string
): number {
  const toMins = (t: string) => {
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

    // Get current user profile
    const { data: currentUser } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!currentUser) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const userLat = latitude || currentUser.latitude
    const userLng = longitude || currentUser.longitude
    const userFrom = availableFrom || currentUser.available_from || '00:00'
    const userUntil = availableUntil || currentUser.available_until || '23:59'

    // Get all potential matches
    // Must have same activity and location
    const today = new Date().toISOString().split('T')[0]

const { data: candidates } = await supabase
  .from('profiles')
  .select('*')
  .neq('id', user.id)
  .contains('activities', [activity])
  .eq('is_available', true)
  .not('latitude', 'is', null)
  .not('longitude', 'is', null)

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ error: 'No matches found nearby' }, { status: 404 })
    }

    // Score each candidate
    const scored = candidates
      .map(candidate => {
        const distance = calculateDistance(
          userLat, userLng,
          candidate.latitude, candidate.longitude
        )

        // Exclude anyone more than 10km away
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

        // Activity must match — already filtered above
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
      .slice(0, 5) // Top 5 matches

    if (scored.length === 0) {
      return NextResponse.json({ error: 'No matches found within 10km' }, { status: 404 })
    }

    // Send to Claude for reasoning
    const bestMatch = scored[0] as any

    const prompt = `You are Strolly's AI matching engine.

User wants to: ${activity.replace(/_/g, ' ')}
User location: ${userLat}, ${userLng}
User available: ${userFrom} - ${userUntil}

Best match found:
- Name: ${bestMatch.full_name}
- Distance: ${bestMatch.distanceLabel}
- Activity: ${activity.replace(/_/g, ' ')} (exact match)
- Available: ${bestMatch.available_from || 'flexible'} - ${bestMatch.available_until || 'flexible'}
- Time overlap: ${bestMatch.overlapMins} minutes
- Rating: ${bestMatch.rating || 5}/5 from ${bestMatch.session_count || 0} sessions
- Experience: ${bestMatch.experience_level || 'not specified'}
- Match score: ${bestMatch.totalScore}/110

Score breakdown:
- Distance: ${bestMatch.distanceScore}/40
- Activity: ${bestMatch.activityScore}/35
- Time overlap: ${bestMatch.timeScore}/25
- Rating bonus: ${bestMatch.ratingScore}/10

Write a SHORT 2-3 sentence explanation of why this is a great match.
Be specific about the distance, time overlap and shared activity.
Sound friendly and encouraging. Do not use bullet points.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    })

    const reasoning = (response.content[0] as any).text

    return NextResponse.json({
      match: {
        id: bestMatch.id,
        name: bestMatch.full_name,
        avatar: bestMatch.avatar_url,
        activity,
        distanceLabel: bestMatch.distanceLabel,
        distance: bestMatch.distance,
        score: bestMatch.totalScore,
        maxScore: 110,
        scorePercent: Math.round((bestMatch.totalScore / 110) * 100),
        distanceScore: bestMatch.distanceScore,
        activityScore: bestMatch.activityScore,
        timeScore: bestMatch.timeScore,
        ratingScore: bestMatch.ratingScore,
        overlapMins: bestMatch.overlapMins,
        rating: bestMatch.rating || 5,
        sessionCount: bestMatch.session_count || 0,
        reasoning,
        allMatches: scored.map((s: any) => ({
          id: s.id,
          name: s.full_name,
          avatar: s.avatar_url,
          score: s.totalScore,
          scorePercent: Math.round((s.totalScore / 110) * 100),
          distanceLabel: s.distanceLabel,
        })),
      }
    })

  } catch (error) {
    console.error('AI match error:', error)
    return NextResponse.json({ error: 'Matching failed' }, { status: 500 })
  }
}