export const YOUTUBE_CHANNEL_ID = 'UCMrMvXraTLhAtpb0JZQOKhQ'

// Use environment variable if available, otherwise fallback to the hardcoded key
// This ensures it works even if .env is missing locally or in some deployments
export const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || 'AIzaSyDufIjgKWTjSY6e6YnLfuhHVC5dAwtJPLg'

// YouTube Data API v3 helper functions

interface YouTubeVideoStats {
    videoId: string
    viewCount: number
    likeCount?: number
}

interface YouTubeAPIResponse {
    items: Array<{
        id: string
        statistics: {
            viewCount: string
            likeCount?: string
        }
    }>
}

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractVideoId(url: string | null | undefined): string | null {
    if (!url) return null

    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ]

    for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match) return match[1]
    }

    return null
}

/**
 * Fetch view counts for multiple YouTube videos
 */
export async function fetchYouTubeStats(
    videoIds: string[],
    apiKey: string = YOUTUBE_API_KEY
): Promise<Map<string, YouTubeVideoStats>> {
    const results = new Map<string, YouTubeVideoStats>()

    if (!videoIds.length || !apiKey) {
        return results
    }

    // YouTube API allows up to 50 video IDs per request
    const batchSize = 50
    for (let i = 0; i < videoIds.length; i += batchSize) {
        const batch = videoIds.slice(i, i + batchSize)
        const ids = batch.join(',')

        try {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids}&key=${apiKey}`
            )

            if (!response.ok) {
                console.error('YouTube API error:', response.status, await response.text())
                continue
            }

            const data = await response.json() as YouTubeAPIResponse

            for (const item of data.items) {
                results.set(item.id, {
                    videoId: item.id,
                    viewCount: parseInt(item.statistics.viewCount, 10) || 0,
                    likeCount: item.statistics.likeCount ? parseInt(item.statistics.likeCount, 10) : undefined,
                })
            }
        } catch (error) {
            console.error('Error fetching YouTube stats:', error)
        }
    }

    return results
}

/**
 * Sync YouTube view counts for shiurim with YouTube links
 */
export async function syncYouTubeViews(
    shiurimWithYouTube: Array<{ shiurId: string; youtubeUrl: string }>,
    apiKey: string = YOUTUBE_API_KEY
): Promise<Map<string, number>> {
    const shiurToViews = new Map<string, number>()

    const videoIdToShiurId = new Map<string, string>()
    const videoIds: string[] = []

    for (const { shiurId, youtubeUrl } of shiurimWithYouTube) {
        const videoId = extractVideoId(youtubeUrl)
        if (videoId) {
            videoIdToShiurId.set(videoId, shiurId)
            videoIds.push(videoId)
        }
    }

    const stats = await fetchYouTubeStats(videoIds, apiKey)

    for (const [videoId, stat] of Array.from(stats.entries())) {
        const shiurId = videoIdToShiurId.get(videoId)
        if (shiurId) {
            shiurToViews.set(shiurId, stat.viewCount)
        }
    }

    return shiurToViews
}
