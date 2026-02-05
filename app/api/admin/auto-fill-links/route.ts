import { NextResponse } from 'next/server'
import { getD1Database, getDb } from '@/lib/db'
import { shiurim, platformLinks } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { searchAllPlatforms } from '@/lib/platform-search'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes for processing many shiurim

interface AutoFillOptions {
    overwrite?: boolean
    minSimilarity?: number
    limit?: number
}

interface AutoFillResult {
    shiurId: string
    title: string
    appleMatch: { url: string; similarity: number } | null
    spotifyMatch: { url: string; similarity: number } | null
    youtubeMatch: { url: string; similarity: number } | null
    youtubeMusicMatch: { url: string; similarity: number } | null
    updated: boolean
    error?: string
}

interface PlatformLink {
    id: string
    shiurId: string
    apple: string | null
    spotify: string | null
    youtube: string | null
    youtubeMusic: string | null
    amazon: string | null
    pocket: string | null
    twentyFourSix: string | null
    castbox: string | null
}

export async function POST(request: Request) {
    try {
        // Check auth (simple check - in production use proper auth)
        const authHeader = request.headers.get('authorization')
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get database
        const d1 = await getD1Database()
        if (!d1) {
            return NextResponse.json({ error: 'Database not available' }, { status: 500 })
        }
        const db = getDb(d1)

        // Get options from request body
        const body = await request.json().catch(() => ({})) as AutoFillOptions
        const {
            overwrite = false, // Whether to overwrite existing links
            minSimilarity = 0.7, // Minimum similarity threshold
            limit = 0 // 0 = no limit
        } = body

        // Get all shiurim
        const allShiurim = await db.select().from(shiurim).all()

        // Get existing platform links
        const existingLinks = await db.select().from(platformLinks).all()
        const linksByShiurId = new Map<string, PlatformLink>(
            existingLinks.map((l: PlatformLink) => [l.shiurId, l])
        )

        const results: AutoFillResult[] = []
        let processed = 0
        let updated = 0
        let skipped = 0

        for (const shiur of allShiurim) {
            if (limit > 0 && processed >= limit) break

            const existingLink = linksByShiurId.get(shiur.id)

            // Skip if already has all links and not overwriting
            if (!overwrite && existingLink?.apple && existingLink?.spotify && existingLink?.youtube && existingLink?.youtubeMusic) {
                skipped++
                continue
            }

            processed++

            try {
                // Search platforms
                const matches = await searchAllPlatforms(shiur.title)

                const result: AutoFillResult = {
                    shiurId: shiur.id,
                    title: shiur.title,
                    appleMatch: matches.apple ? {
                        url: matches.apple.url,
                        similarity: matches.apple.similarity
                    } : null,
                    spotifyMatch: matches.spotify ? {
                        url: matches.spotify.url,
                        similarity: matches.spotify.similarity
                    } : null,
                    youtubeMatch: matches.youtube ? {
                        url: matches.youtube.url,
                        similarity: matches.youtube.similarity
                    } : null,
                    youtubeMusicMatch: matches.youtubeMusic ? {
                        url: matches.youtubeMusic.url,
                        similarity: matches.youtubeMusic.similarity
                    } : null,
                    updated: false
                }

                // Determine what to update
                const updates: { apple?: string; spotify?: string; youtube?: string; youtubeMusic?: string; updatedAt?: Date } = {}

                if (matches.apple && matches.apple.similarity >= minSimilarity) {
                    if (overwrite || !existingLink?.apple) {
                        updates.apple = matches.apple.url
                    }
                }

                if (matches.spotify && matches.spotify.similarity >= minSimilarity) {
                    if (overwrite || !existingLink?.spotify) {
                        updates.spotify = matches.spotify.url
                    }
                }

                if (matches.youtube && matches.youtube.similarity >= minSimilarity) {
                    if (overwrite || !existingLink?.youtube) {
                        updates.youtube = matches.youtube.url
                    }
                }

                if (matches.youtubeMusic && matches.youtubeMusic.similarity >= minSimilarity) {
                    if (overwrite || !existingLink?.youtubeMusic) {
                        updates.youtubeMusic = matches.youtubeMusic.url
                    }
                }

                // Update database if we have new links
                if (Object.keys(updates).length > 0) {
                    updates.updatedAt = new Date()

                    if (existingLink) {
                        // Update existing record
                        await db.update(platformLinks)
                            .set(updates)
                            .where(eq(platformLinks.shiurId, shiur.id))
                    } else {
                        // Create new record
                        await db.insert(platformLinks).values({
                            shiurId: shiur.id,
                            ...updates
                        })
                    }
                    result.updated = true
                    updated++
                }

                results.push(result)

                // Rate limit: Apple allows ~20 req/min, Spotify is more generous
                // Add small delay between requests
                await new Promise(resolve => setTimeout(resolve, 200))

            } catch (error: any) {
                results.push({
                    shiurId: shiur.id,
                    title: shiur.title,
                    appleMatch: null,
                    spotifyMatch: null,
                    youtubeMatch: null,
                    youtubeMusicMatch: null,
                    updated: false,
                    error: error.message
                })
            }
        }

        return NextResponse.json({
            success: true,
            summary: {
                total: allShiurim.length,
                processed,
                updated,
                skipped,
                failed: results.filter(r => r.error).length
            },
            results
        })

    } catch (error: any) {
        console.error('Auto-fill error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to auto-fill links' },
            { status: 500 }
        )
    }
}

// GET endpoint to check status/preview what would be updated
export async function GET() {
    try {
        // Get database
        const d1 = await getD1Database()
        if (!d1) {
            return NextResponse.json({ error: 'Database not available' }, { status: 500 })
        }
        const db = getDb(d1)

        // Get all shiurim
        const allShiurim = await db.select().from(shiurim).all()

        // Get existing platform links
        const existingLinks = await db.select().from(platformLinks).all()
        const linksByShiurId = new Map<string, PlatformLink>(
            existingLinks.map((l: PlatformLink) => [l.shiurId, l])
        )

        const shiurimWithoutApple = allShiurim.filter(s => !linksByShiurId.get(s.id)?.apple).length
        const shiurimWithoutSpotify = allShiurim.filter(s => !linksByShiurId.get(s.id)?.spotify).length
        const shiurimWithBoth = allShiurim.filter(s => {
            const link = linksByShiurId.get(s.id)
            return link?.apple && link?.spotify
        }).length

        return NextResponse.json({
            total: allShiurim.length,
            withBothLinks: shiurimWithBoth,
            missingApple: shiurimWithoutApple,
            missingSpotify: shiurimWithoutSpotify,
            hasSpotifyCredentials: !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET)
        })

    } catch (error: any) {
        console.error('Error getting status:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}
