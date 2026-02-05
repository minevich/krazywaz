import { NextRequest, NextResponse } from 'next/server'
import { getDb, getD1Database } from '@/lib/db'
import { shiurim, analyticsCache } from '@/lib/schema'
import { sql, desc } from 'drizzle-orm'

export async function GET(request: NextRequest) {
    try {
        const d1 = await getD1Database()
        if (!d1) {
            return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
        }

        const db = getDb(d1)

        // Get all shiurim with their analytics (if any)
        // Query from shiurim table to ensure ALL shiurim are included
        const result = await db
            .select({
                id: shiurim.id,
                shiurId: shiurim.id,
                title: shiurim.title,
                pubDate: shiurim.pubDate,
                websiteViews: analyticsCache.websiteViews,
                youtubeViews: analyticsCache.youtubeViews,
                spotifyPlays: analyticsCache.spotifyPlays,
                applePlays: analyticsCache.applePlays,
                amazonPlays: analyticsCache.amazonPlays,
                otherPlays: analyticsCache.otherPlays,
                totalViews: analyticsCache.totalViews,
                lastYoutubeSync: analyticsCache.lastYoutubeSync,
            })
            .from(shiurim)
            .leftJoin(analyticsCache, sql`${shiurim.id} = ${analyticsCache.shiurId}`)
            .orderBy(desc(shiurim.pubDate))
            .all()

        // Calculate summary
        const summary = {
            totalViews: 0,
            totalWebsite: 0,
            totalYoutube: 0,
            totalSpotify: 0,
            totalApple: 0,
            totalAmazon: 0,
            shiurimCount: 0,
            lastYoutubeSync: null as Date | string | null,
        }

        for (const item of result) {
            summary.totalViews += item.totalViews || 0
            summary.totalWebsite += item.websiteViews || 0
            summary.totalYoutube += item.youtubeViews || 0
            summary.totalSpotify += item.spotifyPlays || 0
            summary.totalApple += item.applePlays || 0
            summary.totalAmazon += item.amazonPlays || 0
            summary.shiurimCount++
            if (item.lastYoutubeSync) {
                summary.lastYoutubeSync = item.lastYoutubeSync
            }
        }

        // Filter out items without titles (shiur deleted)
        const analytics = result
            .filter(item => item.title)
            .map(item => ({
                ...item,
                websiteViews: item.websiteViews || 0,
                youtubeViews: item.youtubeViews || 0,
                spotifyPlays: item.spotifyPlays || 0,
                applePlays: item.applePlays || 0,
                amazonPlays: item.amazonPlays || 0,
                otherPlays: item.otherPlays || 0,
                totalViews: item.totalViews || 0,
            }))

        return NextResponse.json({
            analytics,
            summary,
        })

    } catch (error) {
        console.error('Error fetching analytics:', error)
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }
}
