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
        'Vaetchanan', 'Va\'etchanan', 'Vaeschanan', 'Va\'eschanan', 'V\'eschanan',
        'Eikev', 'Ekev',
        'Reeh', 'Re\'eh', 'R\'eih',
        'Shoftim', 'Shofetim', 'Shophtim',
        'Ki Teitzei', 'Ki Tetzei', 'Ki Tetze', 'Ki-Teitzei', 'Ki Seitzei', 'Ki-Seitzei',
        'Ki Tavo', 'Ki Savo', 'Ki-Tavo',
        'Nitzavim', 'Nitsavim',
        'Vayeilech', 'Vayelech',
        'Haazinu', 'Ha\'azinu',
        'Vezot Haberakhah', 'V\'zot Habracha', 'Zos Habracha'
    ],
    'Holidays': [
        'Rosh Hashanah', 'Rosh Hashana',
        'Yom Kippur',
        'Sukkos', 'Sukkot',
        'Chanukah', 'Hanukkah',
        'Purim',
        'Pesach', 'Passover',
        'Shavuos', 'Shavuot',
        'Tisha B\'Av', 'Tisha Bav', 'Three Weeks',
        'Rosh Chodesh',
        'Lag BaOmer'
    ]
}

function categorizePlaylist(title: string): string {
    // Normalize title: remove common prefixes and convert to lower case
    const lowerTitle = title.toLowerCase()
        .replace(/^parshas\s+/, '')
        .replace(/^parshat\s+/, '')
        .replace(/^parsha\s+/, '')

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
        const miscPlaylists = new Set(existingPlaylists.filter(p => p.category === 'Misc').map(p => p.id))

        let totalVideoCount = 0

        // Step 4: Process playlists that either don't exist, have no videos, or are 'Misc' (to recheck category)
        // Step 4: Update metadata and categories for ALL playlists first
        // This ensures all 67+ playlists get their correct category/title immediately
        for (const playlist of playlistsData.items) {
            const playlistId = playlist.id
            const category = categorizePlaylist(playlist.snippet.title)

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

        // Step 5: Fetch videos only for playlists that need them (new or no videos)
        // We don't need to check 'Misc' here because we just updated categories above!
        const playlistsNeedingVideos = playlistsData.items.filter((p: any) =>
            !existingPlaylistIds.has(p.id) || !playlistsWithVideos.has(p.id)
        )

        const playlistsToProcess = playlistsNeedingVideos.slice(0, 5)

        for (const playlist of playlistsToProcess) {
            const playlistId = playlist.id
            // Playlist already inserted above, just fetch videos

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

                // Skip duration lookup to reduce API calls (stays within subrequest limit)
                for (const item of videosData.items) {
                    const videoId = item.contentDetails.videoId
                    playlistVideos.push({
                        id: videoId,
                        title: item.snippet.title,
                        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
                        duration: '', // Duration omitted to reduce API calls
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
