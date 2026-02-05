import { NextRequest, NextResponse } from 'next/server'
import { getDb, getD1Database } from '@/lib/db'
import { shiurim, platformLinks, cachedVideos } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { YOUTUBE_API_KEY } from '@/lib/youtube'

export const dynamic = 'force-dynamic'

interface PlaylistVideo {
    id: string
    title: string
    thumbnail: string
    duration: string
    position: number
}

interface VideoWithLinks extends PlaylistVideo {
    shiurId: string | null
    slug: string | null
    platforms: {
        youtube: string | null
        youtubeMusic: string | null
        spotify: string | null
        apple: string | null
        amazon: string | null
        pocket: string | null
        twentyFourSix: string | null
        castbox: string | null
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: playlistId } = await params

        if (!playlistId) {
            return NextResponse.json(
                { error: 'Playlist ID is required' },
                { status: 400 }
            )
        }

        const d1 = await getD1Database()
        if (!d1) {
            return NextResponse.json({ error: 'Database not available' }, { status: 500 })
        }
        const db = getDb(d1)

        // Try to get cached videos first
        const cached = await db
            .select()
            .from(cachedVideos)
            .where(eq(cachedVideos.playlistId, playlistId))
            .all()

        // Get platform links and shiurim for matching
        const allLinks = await db.select().from(platformLinks).all()
        const allShiurim = await db.select().from(shiurim).all()

        // Create maps for quick lookup
        const linksByShiurId = new Map(allLinks.map(l => [l.shiurId, l]))
        const shiurIdToShiur = new Map(allShiurim.map(s => [s.id, s]))

        // Map of YouTube video ID -> shiur data
        const videoIdToData = new Map<string, { shiurId: string; slug: string | null; links: typeof allLinks[0] | null }>()
        for (const link of allLinks) {
            if (link.youtube) {
                const match = link.youtube.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/)
                if (match) {
                    const shiur = shiurIdToShiur.get(link.shiurId)
                    videoIdToData.set(match[1], {
                        shiurId: link.shiurId,
                        slug: shiur?.slug || null,
                        links: link
                    })
                }
            }
        }

        // If we have cached videos, use them
        if (cached.length > 0) {
            const videosWithLinks: VideoWithLinks[] = cached
                .sort((a, b) => (a.position || 0) - (b.position || 0))
                .map(video => {
                    // Use videoId column for lookup (it stores the actual YT ID)
                    const data = videoIdToData.get(video.videoId)
                    const links = data?.links

                    return {
                        id: video.videoId, // Return actual YT ID
                        title: video.title,
                        thumbnail: video.thumbnail || '',
                        duration: video.duration || '',
                        position: video.position || 0,
                        shiurId: video.shiurId || data?.shiurId || null,
                        slug: data?.slug || null,
                        platforms: {
                            youtube: `https://www.youtube.com/watch?v=${video.videoId}`, // Use actual YT ID
                            youtubeMusic: links?.youtubeMusic || null,
                            spotify: links?.spotify || null,
                            apple: links?.apple || null,
                            amazon: links?.amazon || null,
                            pocket: links?.pocket || null,
                            twentyFourSix: links?.twentyFourSix || null,
                            castbox: links?.castbox || null
                        }
                    }
                })

            return NextResponse.json({
                playlistId,
                videos: videosWithLinks
            })
        }

        // Fallback: Fetch from YouTube API
        const allVideos: PlaylistVideo[] = []
        let nextPageToken: string | null = null

        do {
            let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50&key=${YOUTUBE_API_KEY}`
            if (nextPageToken) {
                url += `&pageToken=${nextPageToken}`
            }

            const response = await fetch(url)
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                console.error('YouTube API error:', errorData)
                throw new Error(`Failed to fetch playlist videos: ${response.status}`)
            }

            const data = await response.json() as any

            // Get video IDs for duration lookup
            const videoIds = data.items.map((item: any) => item.contentDetails.videoId).join(',')

            // Fetch video details for duration
            const detailsResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`
            )
            const detailsData = await detailsResponse.json() as any
            const durationMap = new Map<string, string>()

            for (const video of detailsData.items || []) {
                const duration = video.contentDetails.duration
                const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
                const hours = parseInt(match?.[1] || '0')
                const minutes = parseInt(match?.[2] || '0')
                const seconds = parseInt(match?.[3] || '0')

                let durationStr = ''
                if (hours > 0) {
                    durationStr = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                } else {
                    durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`
                }
                durationMap.set(video.id, durationStr)
            }

            for (const item of data.items) {
                const videoId = item.contentDetails.videoId
                allVideos.push({
                    id: videoId,
                    title: item.snippet.title,
                    thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
                    duration: durationMap.get(videoId) || '',
                    position: item.snippet.position
                })
            }

            nextPageToken = data.nextPageToken || null
        } while (nextPageToken)

        // Build response with matched platform links
        const videosWithLinks: VideoWithLinks[] = allVideos.map(video => {
            const data = videoIdToData.get(video.id)
            const links = data?.links

            return {
                ...video,
                shiurId: data?.shiurId || null,
                slug: data?.slug || null,
                platforms: {
                    youtube: `https://www.youtube.com/watch?v=${video.id}`,
                    youtubeMusic: links?.youtubeMusic || null,
                    spotify: links?.spotify || null,
                    apple: links?.apple || null,
                    amazon: links?.amazon || null,
                    pocket: links?.pocket || null,
                    twentyFourSix: links?.twentyFourSix || null,
                    castbox: links?.castbox || null
                }
            }
        })

        return NextResponse.json({
            playlistId,
            videos: videosWithLinks
        })

    } catch (error: any) {
        console.error('Error fetching playlist videos:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch playlist videos' },
            { status: 500 }
        )
    }
}
