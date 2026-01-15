import { NextRequest, NextResponse } from 'next/server'
import { getDb, getD1Database } from '@/lib/db'
import { shiurim, analyticsCache, platformSyncs } from '@/lib/schema'
import { sql, eq } from 'drizzle-orm'

interface CSVRow {
    episodeName: string
    plays: number
}

/**
 * CSV Import for Spotify/Apple Podcast Analytics
 * 
 * Accepts CSV data with episode names and play counts,
 * matches them to shiurim by title, and updates analytics_cache.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as {
            platform: 'spotify' | 'apple' | 'amazon'
            data: CSVRow[]
        }

        const { platform, data } = body

        if (!platform || !data || !Array.isArray(data)) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
        }

        const d1 = await getD1Database()
        if (!d1) {
            return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
        }

        const db = getDb(d1)

        // Get all shiurim for matching
        const allShiurim = await db.select({ id: shiurim.id, title: shiurim.title }).from(shiurim).all()

        // Create a map for fuzzy matching (lowercase, trimmed)
        const shiurMap = new Map<string, string>()
        for (const s of allShiurim) {
            if (s.title) {
                shiurMap.set(s.title.toLowerCase().trim(), s.id)
            }
        }

        let matched = 0
        let unmatched = 0
        const unmatchedTitles: string[] = []

        for (const row of data) {
            const normalizedName = row.episodeName.toLowerCase().trim()

            // Try exact match first
            let shiurId = shiurMap.get(normalizedName)

            // Try partial match if no exact match
            if (!shiurId) {
                for (const [title, id] of Array.from(shiurMap.entries())) {
                    if (title.includes(normalizedName) || normalizedName.includes(title)) {
                        shiurId = id
                        break
                    }
                }
            }

            if (shiurId) {
                // Determine which column to update based on platform
                const updateField = platform === 'spotify' ? 'spotifyPlays' :
                    platform === 'apple' ? 'applePlays' : 'amazonPlays'

                await db
                    .insert(analyticsCache)
                    .values({
                        shiurId,
                        [updateField === 'spotifyPlays' ? 'spotifyPlays' :
                            updateField === 'applePlays' ? 'applePlays' : 'amazonPlays']: row.plays,
                        totalViews: row.plays,
                        lastManualSync: new Date(),
                    })
                    .onConflictDoUpdate({
                        target: analyticsCache.shiurId,
                        set: {
                            ...(platform === 'spotify' && { spotifyPlays: row.plays }),
                            ...(platform === 'apple' && { applePlays: row.plays }),
                            ...(platform === 'amazon' && { amazonPlays: row.plays }),
                            totalViews: sql`${analyticsCache.websiteViews} + ${analyticsCache.youtubeViews} + 
                CASE WHEN ${platform === 'spotify'} THEN ${row.plays} ELSE ${analyticsCache.spotifyPlays} END +
                CASE WHEN ${platform === 'apple'} THEN ${row.plays} ELSE ${analyticsCache.applePlays} END +
                CASE WHEN ${platform === 'amazon'} THEN ${row.plays} ELSE ${analyticsCache.amazonPlays} END +
                ${analyticsCache.otherPlays}`,
                            lastManualSync: sql`unixepoch()`,
                            lastUpdated: sql`unixepoch()`,
                        },
                    })
                matched++
            } else {
                unmatched++
                if (unmatchedTitles.length < 10) {
                    unmatchedTitles.push(row.episodeName)
                }
            }
        }

        // Log the sync
        await db.insert(platformSyncs).values({
            platform,
            recordsUpdated: matched,
            status: 'success',
            metadata: JSON.stringify({ unmatched, unmatchedTitles }),
        })

        return NextResponse.json({
            success: true,
            matched,
            unmatched,
            unmatchedTitles: unmatchedTitles.slice(0, 5),
        })

    } catch (error) {
        console.error('CSV import error:', error)
        return NextResponse.json({ error: 'Failed to import CSV' }, { status: 500 })
    }
}
