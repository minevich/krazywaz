import { NextRequest, NextResponse } from 'next/server'
import { getD1Database, getDb } from '@/lib/db'
import { cachedPlaylists, cachedVideos, shiurim, platformLinks } from '@/lib/schema'
import { YOUTUBE_API_KEY } from '@/lib/youtube'
import { eq, sql } from 'drizzle-orm'

// POST - Sync videos for playlists that have no videos cached yet
export async function POST(request: NextRequest) {
    try {
        const d1 = await getD1Database()
        if (!d1) {
            return NextResponse.json({ error: 'Database not available' }, { status: 500 })
        }
        const db = getDb(d1)

        // Get all shiurim and platform links for matching video IDs to shiurim
        const allLinks = await db.select().from(platformLinks).all()
        const videoIdToShiurId = new Map<string, string>()
        for (const link of allLinks) {
            if (link.youtube) {
                const match = link.youtube.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/)
                if (match) {
                    videoIdToShiurId.set(match[1], link.shiurId)
                }
            }
        }

        // Find playlists that have no videos synced
        const allPlaylists = await db.select().from(cachedPlaylists).all()
        const allVideos = await db.select().from(cachedVideos).all()

        // Get playlist IDs that have videos
        const playlistsWithVideos = new Set(allVideos.map(v => v.playlistId))

        // Find playlists without videos
        const playlistsNeedingVideos = allPlaylists.filter(p => !playlistsWithVideos.has(p.id))

        if (playlistsNeedingVideos.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'All playlists already have videos synced',
                playlistsProcessed: 0,
                videosAdded: 0
            })
        }

        // Process only 3 playlists at a time to stay within subrequest limits
        const playlistsToProcess = playlistsNeedingVideos.slice(0, 3)
        let totalVideosAdded = 0

        for (const playlist of playlistsToProcess) {
            // Fetch videos for this playlist (just first page to limit subrequests)
            const videosUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlist.id}&maxResults=50&key=${YOUTUBE_API_KEY}`

            const videosResponse = await fetch(videosUrl)
            if (!videosResponse.ok) {
                console.error('Failed to fetch videos for playlist:', playlist.id)
                continue
            }

            const videosData = await videosResponse.json() as any

            if (!videosData.items || videosData.items.length === 0) {
                continue
            }

            for (const item of videosData.items) {
                const videoId = item.contentDetails.videoId
                const shiurId = videoIdToShiurId.get(videoId) || null

                await db.insert(cachedVideos).values({
                    id: videoId,
                    playlistId: playlist.id,
                    title: item.snippet.title,
                    thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
                    duration: '',
                    position: item.snippet.position,
                    shiurId: shiurId
                }).onConflictDoNothing()

                totalVideosAdded++
            }
        }

        const remaining = playlistsNeedingVideos.length - playlistsToProcess.length

        return NextResponse.json({
            success: true,
            message: remaining > 0
                ? `Synced videos. ${remaining} playlists still need videos - click sync again.`
                : 'All playlist videos synced!',
            playlistsProcessed: playlistsToProcess.length,
            videosAdded: totalVideosAdded,
            remaining: remaining
        })
    } catch (error: any) {
        console.error('Video sync error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
