import { NextRequest, NextResponse } from 'next/server'
import { getDb, getD1Database } from '@/lib/db'
import { platformLinks, analyticsCache, platformSyncs } from '@/lib/schema'
import { syncYouTubeViews } from '@/lib/youtube'
import { sql, eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
    try {
        const d1 = await getD1Database()
        if (!d1) {
            return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
        }

        const db = getDb(d1)

        // Get all shiurim with YouTube links
        const linksWithYouTube = await db
            .select({
                shiurId: platformLinks.shiurId,
                youtube: platformLinks.youtube,
            })
            .from(platformLinks)
            .all()

        const shiurimWithYouTube = linksWithYouTube
            .filter(l => l.youtube)
            .map(l => ({
                shiurId: l.shiurId,
                youtubeUrl: l.youtube!,
            }))

        if (shiurimWithYouTube.length === 0) {
            return NextResponse.json({
                success: true,
                synced: 0,
                message: 'No shiurim with YouTube links found'
            })
        }

        // Fetch YouTube stats
        const viewCounts = await syncYouTubeViews(shiurimWithYouTube)

        // Update analytics cache for each shiur
        let updatedCount = 0
        for (const [shiurId, youtubeViews] of Array.from(viewCounts.entries())) {
            await db
                .insert(analyticsCache)
                .values({
                    shiurId,
                    youtubeViews,
                    totalViews: youtubeViews,
                    lastYoutubeSync: new Date(),
                })
                .onConflictDoUpdate({
                    target: analyticsCache.shiurId,
                    set: {
                        youtubeViews,
                        totalViews: sql`${analyticsCache.websiteViews} + ${youtubeViews} + ${analyticsCache.spotifyPlays} + ${analyticsCache.applePlays} + ${analyticsCache.amazonPlays} + ${analyticsCache.otherPlays}`,
                        lastYoutubeSync: sql`unixepoch()`,
                        lastUpdated: sql`unixepoch()`,
                    },
                })
            updatedCount++
        }

        // Log the sync
        await db.insert(platformSyncs).values({
            platform: 'youtube',
            recordsUpdated: updatedCount,
            status: 'success',
        })

        return NextResponse.json({
            success: true,
            synced: updatedCount,
            total: shiurimWithYouTube.length,
        })

    } catch (error) {
        console.error('YouTube sync error:', error)

        // Log the error
        const d1 = await getD1Database()
        if (d1) {
            const db = getDb(d1)
            await db.insert(platformSyncs).values({
                platform: 'youtube',
                status: 'error',
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
            })
        }

        return NextResponse.json({ error: 'Failed to sync YouTube' }, { status: 500 })
    }
}
