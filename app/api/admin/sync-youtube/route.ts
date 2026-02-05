import { NextResponse } from 'next/server'
import { getD1Database, getDb } from '@/lib/db'
import { cachedPlaylists, cachedVideos, shiurim, platformLinks } from '@/lib/schema'
import { YOUTUBE_API_KEY, YOUTUBE_CHANNEL_ID } from '@/lib/youtube'
import { eq } from 'drizzle-orm'

// Parsha names for each Chumash to categorize playlists
const CHUMASH_PARSHAS: Record<string, string[]> = {
    'Bereishis': [
        'Bereishis', 'Bereshit', 'Genesis',
        'Noach', 'Noah',
        'Lech Lecha', 'Lech-Lecha',
        'Vayera', 'Vayeira',
        'Chayei Sarah', 'Chayei-Sarah', 'Chaye Sarah',
        'Toldos', 'Toldot', 'Toledot',
        'Vayetzei', 'Vayetze',
        'Vayishlach', 'Vayishlah',
        'Vayeshev', 'Vayeishev',
        'Miketz', 'Mikeitz',
        'Vayigash',
        'Vayechi', 'Vaychi'
    ],
    'Shemos': [
        'Shemos', 'Shemot', 'Exodus',
        'Vaera', 'Va\'era',
        'Bo',
        'Beshalach', 'Beshallach',
        'Yisro', 'Yitro', 'Jethro',
        'Mishpatim',
        'Terumah', 'Trumah',
        'Tetzaveh', 'Tetzave',
        'Ki Tisa', 'Ki Tissa', 'Ki-Tisa',
        'Vayakhel', 'Vayakeil',
        'Pekudei', 'Pekude'
    ],
    'Vayikra': [
        'Vayikra', 'Leviticus',
        'Tzav', 'Tsav',
        'Shemini', 'Shmini',
        'Tazria', 'Tazri\'a',
        'Metzora', 'Metzorah',
        'Acharei Mot', 'Acharei', 'Achrei Mot',
        'Kedoshim', 'Kdoshim',
        'Emor',
        'Behar', 'B\'har',
        'Bechukotai', 'Bechukosai', 'Behukotai'
    ],
    'Bamidbar': [
        'Bamidbar', 'Bemidbar', 'Numbers',
        'Nasso', 'Naso',
        'Behaalotecha', 'Beha\'alotcha', 'Behaalosecha',
        'Shelach', 'Shlach', 'Sh\'lach',
        'Korach', 'Korah',
        'Chukat', 'Chukkat', 'Hukat',
        'Balak',
        'Pinchas', 'Pinhas', 'Phineas',
        'Matot', 'Matos',
        'Masei', 'Masse', 'Masey'
    ],
    'Devarim': [
        'Devarim', 'Deuteronomy', 'D\'varim',
        'Vaetchanan', 'Va\'etchanan', 'Vaeschanan',
        'Eikev', 'Ekev',
        'Reeh', 'Re\'eh', 'R\'eih',
        'Shoftim', 'Shofetim',
        'Ki Teitzei', 'Ki Tetzei', 'Ki Tetze', 'Ki-Teitzei',
        'Ki Tavo', 'Ki Savo', 'Ki-Tavo',
        'Nitzavim', 'Nitsavim',
        'Vayeilech', 'Vayelech',
        'Haazinu', 'Ha\'azinu',
        'Vezot Haberakhah', 'V\'zot Habracha', 'Zos Habracha'
    ]
}

function categorizePlaylist(title: string): string {
    const lowerTitle = title.toLowerCase()

    for (const [chumash, parshas] of Object.entries(CHUMASH_PARSHAS)) {
        for (const parsha of parshas) {
            if (lowerTitle.includes(parsha.toLowerCase())) {
                return chumash
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

        // Step 1: Fetch all playlists from YouTube channel
        const playlistsResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&channelId=${YOUTUBE_CHANNEL_ID}&maxResults=50&key=${YOUTUBE_API_KEY}`
        )

        if (!playlistsResponse.ok) {
            const errorData = await playlistsResponse.json().catch(() => ({}))
            console.error('YouTube API error:', errorData)
            throw new Error(`Failed to fetch playlists: ${playlistsResponse.status}`)
        }

        const playlistsData = await playlistsResponse.json() as any

        if (!playlistsData.items || playlistsData.items.length === 0) {
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

        // Step 3: Clear existing cache
        await db.delete(cachedVideos)
        await db.delete(cachedPlaylists)

        let totalVideoCount = 0

        // Step 4: Process each playlist
        for (const playlist of playlistsData.items) {
            const playlistId = playlist.id
            const category = categorizePlaylist(playlist.snippet.title)

            // Insert playlist
            await db.insert(cachedPlaylists).values({
                id: playlistId,
                title: playlist.snippet.title,
                description: playlist.snippet.description || '',
                thumbnail: playlist.snippet.thumbnails?.high?.url || playlist.snippet.thumbnails?.medium?.url || '',
                videoCount: playlist.contentDetails?.itemCount || 0,
                playlistUrl: `https://www.youtube.com/playlist?list=${playlistId}`,
                category: category,
                lastSynced: new Date()
            })

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
                    console.error('Failed to fetch videos for playlist:', playlistId)
                    break
                }

                const videosData = await videosResponse.json() as any

                if (!videosData.items || videosData.items.length === 0) {
                    break
                }

                // Get video IDs for duration lookup
                const videoIds = videosData.items.map((item: any) => item.contentDetails.videoId).join(',')

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

                for (const item of videosData.items) {
                    const videoId = item.contentDetails.videoId
                    playlistVideos.push({
                        id: videoId,
                        title: item.snippet.title,
                        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
                        duration: durationMap.get(videoId) || '',
                        position: item.snippet.position
                    })
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
            message: `Synced ${playlistsData.items.length} playlists and ${totalVideoCount} videos`,
            playlistCount: playlistsData.items.length,
            videoCount: totalVideoCount,
            syncedAt: new Date().toISOString()
        })
    } catch (error: any) {
        console.error('YouTube sync error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
