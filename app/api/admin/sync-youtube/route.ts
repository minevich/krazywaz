import { NextResponse } from 'next/server'
import { getD1Database, getDb } from '@/lib/db'
import { cachedPlaylists, cachedVideos, shiurim, platformLinks, systemCategories, systemCategoryRules } from '@/lib/schema'
import { YOUTUBE_API_KEY, YOUTUBE_CHANNEL_ID } from '@/lib/youtube'
import { eq } from 'drizzle-orm'

// Helper to categorize based on DB rules
function categorizePlaylistDynamic(title: string, rules: any[], categories: any[]): string {
    const lowerTitle = title.toLowerCase()
        .replace(/^parshas\s+/, '')
        .replace(/^parshat\s+/, '')
        .replace(/^parsha\s+/, '')

    // Sort rules by order? Already done if fetched sorted, but rules loop order matters if overlap.
    // Assuming rules have `categoryId`.

    for (const rule of rules) {
        const keywords = JSON.parse(rule.keywords) as string[]
        for (const keyword of keywords) {
            if (lowerTitle.includes(keyword.toLowerCase())) {
                const category = categories.find(c => c.id === rule.categoryId)
                return category ? category.name : 'Misc'
            }
        }
    }

    return 'Misc'
}

// POST - Sync YouTube playlists and videos to local cache
export async function POST() {
    try {
        const d1 = await getD1Database()
        if (!d1) {
            return NextResponse.json({ error: 'Database not available' }, { status: 500 })
        }
        const db = getDb(d1)

        // Fetch dynamic rules
        const rules = await db.select().from(systemCategoryRules).orderBy(systemCategoryRules.order).all()
        const categories = await db.select().from(systemCategories).all()

        // Step 1: Fetch all playlists from YouTube channel (with pagination)
        let allPlaylistsItems: any[] = []
        let nextToken: string | null = null

        do {
            let url = `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&channelId=${YOUTUBE_CHANNEL_ID}&maxResults=50&key=${YOUTUBE_API_KEY}`
            if (nextToken) {
                url += `&pageToken=${nextToken}`
            }

            const playlistsResponse = await fetch(url)

            if (!playlistsResponse.ok) {
                const errorData = await playlistsResponse.json().catch(() => ({}))
                console.error('YouTube API error:', errorData)
                throw new Error(`Failed to fetch playlists: ${playlistsResponse.status}`)
            }

            const data = await playlistsResponse.json() as any
            if (data.items) {
                allPlaylistsItems = [...allPlaylistsItems, ...data.items]
            }
            nextToken = data.nextPageToken
        } while (nextToken)

        const playlistsData = { items: allPlaylistsItems }

        if (playlistsData.items.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No playlists found',
                playlistCount: 0,
                videoCount: 0
            })
        }

        // Step 2: Get all shiurim and platform links for matching
        const allShiurim = await db.select().from(shiurim).all()
        const allLinks = await db.select().from(platformLinks).all()

        // Create a map of YouTube video ID -> shiur ID
        const videoIdToShiurId = new Map<string, string>()
        for (const link of allLinks) {
            if (link.youtube) {
                const match = link.youtube.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/)
                if (match) {
                    videoIdToShiurId.set(match[1], link.shiurId)
                }
            }
        }

        // Step 3: Don't clear cache - sync incrementally
        // Get already synced playlists and their videos
        const existingPlaylists = await db.select().from(cachedPlaylists).all()
        const existingPlaylistIds = new Set(existingPlaylists.map(p => p.id))
        const existingVideos = await db.select().from(cachedVideos).all()
        const playlistsWithVideos = new Set(existingVideos.map(v => v.playlistId))

        // We re-evaluate categories every sync now that rules are dynamic
        // const miscPlaylists = new Set(existingPlaylists.filter(p => p.category === 'Misc').map(p => p.id))

        let totalVideoCount = 0

        // Step 4: Update metadata and categories for ALL playlists first
        for (const playlist of playlistsData.items) {
            const playlistId = playlist.id
            const category = categorizePlaylistDynamic(playlist.snippet.title, rules, categories)

            await db.insert(cachedPlaylists).values({
                id: playlistId,
                title: playlist.snippet.title,
                description: playlist.snippet.description || '',
                thumbnail: playlist.snippet.thumbnails?.high?.url || playlist.snippet.thumbnails?.medium?.url || '',
                videoCount: playlist.contentDetails?.itemCount || 0,
                playlistUrl: `https://www.youtube.com/playlist?list=${playlistId}`,
                category: category,
                lastSynced: new Date()
            }).onConflictDoUpdate({
                target: cachedPlaylists.id,
                set: {
                    category: category,
                    title: playlist.snippet.title,
                    thumbnail: playlist.snippet.thumbnails?.high?.url || playlist.snippet.thumbnails?.medium?.url || '',
                    videoCount: playlist.contentDetails?.itemCount || 0,
                    lastSynced: new Date()
                }
            })
        }

        // Step 5: Fetch videos for ALL playlists
        const playlistsToProcess = playlistsData.items.slice(0, 250)
        const errors: string[] = []
        let processedPlaylists = 0

        for (const playlist of playlistsToProcess) {
            const playlistId = playlist.id
            processedPlaylists++

            // Fetch all videos from this playlist
            let nextPageToken: string | null = null
            const playlistVideos: Array<{
                id: string
                title: string
                thumbnail: string
                duration: string
                position: number
            }> = []

            do {
                let videosUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50&key=${YOUTUBE_API_KEY}`
                if (nextPageToken) {
                    videosUrl += `&pageToken=${nextPageToken}`
                }

                const videosResponse = await fetch(videosUrl)
                if (!videosResponse.ok) {
                    const errTxt = await videosResponse.text()
                    console.error(`Failed to fetch videos for playlist ${playlistId}: ${videosResponse.status}`, errTxt)
                    errors.push(`Playlist ${playlistId} failed: ${videosResponse.status}`)
                    break
                }

                const videosData = await videosResponse.json() as any

                if (!videosData.items || videosData.items.length === 0) {
                    break
                }

                for (const item of videosData.items) {
                    // Use snippet.resourceId.videoId as primary, fallback to contentDetails
                    const videoId = item.snippet?.resourceId?.videoId || item.contentDetails?.videoId
                    if (videoId) {
                        playlistVideos.push({
                            id: videoId,
                            title: item.snippet.title,
                            thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
                            duration: '',
                            position: item.snippet.position
                        })
                    }
                }

                nextPageToken = videosData.nextPageToken || null
            } while (nextPageToken)

            // Insert videos for this playlist
            for (const video of playlistVideos) {
                const shiurId = videoIdToShiurId.get(video.id) || null

                await db.insert(cachedVideos).values({
                    id: video.id,
                    playlistId: playlistId,
                    title: video.title,
                    thumbnail: video.thumbnail,
                    duration: video.duration,
                    position: video.position,
                    shiurId: shiurId
                }).onConflictDoNothing()
                totalVideoCount++
            }
        }

        return NextResponse.json({
            success: true,
            message: `Synced ${playlistsData.items.length} playlists, processed ${processedPlaylists}, found ${totalVideoCount} videos. Errors: ${errors.length}`,
            playlistCount: playlistsData.items.length,
            videoCount: totalVideoCount,
            errors: errors,
            syncedAt: new Date().toISOString()
        })
    } catch (error: any) {
        console.error('YouTube sync error:', error)
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
    }
}
