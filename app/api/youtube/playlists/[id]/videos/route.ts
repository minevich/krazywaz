import { NextRequest, NextResponse } from 'next/server'
import { getDb, getD1Database } from '@/lib/db'
import { shiurim, platformLinks } from '@/lib/schema'
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

        // Fetch all videos from the YouTube playlist
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

        // Now match videos to shiurim in the database
        const d1 = await getD1Database()

        if (!d1) {
            // Return videos without platform links if DB not available
            return NextResponse.json({
                playlistId,
                videos: allVideos.map(v => ({
                    ...v,
                    shiurId: null,
                    slug: null,
                    platforms: {
                        youtube: `https://www.youtube.com/watch?v=${v.id}`,
                        youtubeMusic: null,
                        spotify: null,
                        apple: null,
                        amazon: null,
                        pocket: null,
                        twentyFourSix: null,
                        castbox: null
                    }
                }))
            })
        }

        const db = getDb(d1)

        // Get all platform links from DB
        const allLinks = await db.select().from(platformLinks).all()
        const allShiurim = await db.select().from(shiurim).all()

        // Create a map of YouTube video ID -> platform links
        const videoIdToLinks = new Map<string, typeof allLinks[0]>()
        const shiurIdToShiur = new Map<string, typeof allShiurim[0]>()

        for (const shiur of allShiurim) {
            shiurIdToShiur.set(shiur.id, shiur)
        }

        for (const link of allLinks) {
            if (link.youtube) {
                // Extract video ID from YouTube URL
                const match = link.youtube.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/)
                if (match) {
                    videoIdToLinks.set(match[1], link)
                }
            }
        }

        // Build response with matched platform links
        const videosWithLinks: VideoWithLinks[] = allVideos.map(video => {
            const links = videoIdToLinks.get(video.id)
            const shiur = links ? shiurIdToShiur.get(links.shiurId) : null

            return {
                ...video,
                shiurId: links?.shiurId || null,
                slug: shiur?.slug || null,
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
