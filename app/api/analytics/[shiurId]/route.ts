import { NextRequest, NextResponse } from 'next/server'
import { getDb, getD1Database } from '@/lib/db'
import { analyticsCache } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ shiurId: string }> }
) {
    try {
        const { shiurId } = await params

        if (!shiurId) {
            return NextResponse.json({ error: 'shiurId required' }, { status: 400 })
        }

        const d1 = await getD1Database()
        if (!d1) {
            return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
        }

        const db = getDb(d1)

        // Get cached analytics
        const stats = await db
            .select()
            .from(analyticsCache)
            .where(eq(analyticsCache.shiurId, shiurId))
            .get()

        if (!stats) {
            // No analytics yet, return zeros
            return NextResponse.json({
                shiurId,
                websiteViews: 0,
                youtubeViews: 0,
                spotifyPlays: 0,
                applePlays: 0,
                amazonPlays: 0,
                otherPlays: 0,
                totalViews: 0,
                lastUpdated: null,
            })
        }

        return NextResponse.json({
            shiurId,
            websiteViews: stats.websiteViews || 0,
            youtubeViews: stats.youtubeViews || 0,
            spotifyPlays: stats.spotifyPlays || 0,
            applePlays: stats.applePlays || 0,
            amazonPlays: stats.amazonPlays || 0,
            otherPlays: stats.otherPlays || 0,
            totalViews: stats.totalViews || 0,
            lastUpdated: stats.lastUpdated,
        })

    } catch (error) {
        console.error('Error fetching analytics:', error)
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }
}
