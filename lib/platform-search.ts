/**
 * Platform Search Utilities
 * Search Apple Podcasts and Spotify for podcast episodes by title
 */

// Your podcast show IDs - update these with your actual podcast IDs
const APPLE_PODCAST_ID = '1701685139' // Rabbi Kraz's Shiurim on Apple Podcasts
const SPOTIFY_SHOW_ID = '6ZbhpCYBCqSZGOgQb1BwFz' // Rabbi Kraz's Shiurim on Spotify

interface SearchResult {
    platform: 'apple' | 'spotify'
    title: string
    url: string
    similarity: number
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
export function calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim()
    const s2 = str2.toLowerCase().trim()

    if (s1 === s2) return 1

    const longer = s1.length > s2.length ? s1 : s2
    const shorter = s1.length > s2.length ? s2 : s1

    if (longer.length === 0) return 1

    // Calculate Levenshtein distance
    const costs: number[] = []
    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i
        for (let j = 0; j <= s2.length; j++) {
            if (i === 0) {
                costs[j] = j
            } else if (j > 0) {
                let newValue = costs[j - 1]
                if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                    newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
                }
                costs[j - 1] = lastValue
                lastValue = newValue
            }
        }
        if (i > 0) costs[s2.length] = lastValue
    }

    const distance = costs[s2.length]
    return (longer.length - distance) / longer.length
}

/**
 * Normalize title for better matching
 * Removes common prefixes, special characters, etc.
 */
function normalizeTitle(title: string): string {
    return title
        .toLowerCase()
        .replace(/^(parshas?|parsha|פרשת)\s*/i, '') // Remove parsha prefix
        .replace(/[^\w\s]/g, '') // Remove special chars
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim()
}

/**
 * Search Apple Podcasts for an episode by title
 * Uses iTunes Search API - no authentication required
 */
export async function searchApplePodcasts(title: string): Promise<SearchResult | null> {
    try {
        // First try to get episodes from the specific podcast
        const feedUrl = `https://itunes.apple.com/lookup?id=${APPLE_PODCAST_ID}&entity=podcastEpisode&limit=200`

        console.log('[Apple] Fetching:', feedUrl)

        const response = await fetch(feedUrl, {
            headers: { 'Accept': 'application/json' }
        })

        if (!response.ok) {
            console.error('[Apple] API error:', response.status, response.statusText)
            return null
        }

        const text = await response.text()
        console.log('[Apple] Response length:', text.length)

        let data: { results?: any[] }
        try {
            data = JSON.parse(text)
        } catch (e) {
            console.error('[Apple] JSON parse error:', e)
            return null
        }

        console.log('[Apple] Results count:', data.results?.length || 0)

        if (!data.results || data.results.length === 0) {
            console.log('[Apple] No results found')
            return null
        }

        // Skip first result (it's the podcast itself, not an episode)
        const episodes = data.results.slice(1)
        console.log('[Apple] Episodes count:', episodes.length)

        const normalizedSearch = normalizeTitle(title)
        console.log('[Apple] Searching for:', normalizedSearch)

        // Find best matching episode
        let bestMatch: SearchResult | null = null
        let bestSimilarity = 0

        for (const episode of episodes) {
            const episodeTitle = episode.trackName || ''
            const normalizedEpisode = normalizeTitle(episodeTitle)

            // Calculate similarity
            const similarity = calculateSimilarity(normalizedSearch, normalizedEpisode)

            // Also check if one contains the other
            const containsMatch = normalizedEpisode.includes(normalizedSearch) ||
                normalizedSearch.includes(normalizedEpisode)

            const adjustedSimilarity = containsMatch ? Math.max(similarity, 0.85) : similarity

            if (adjustedSimilarity > bestSimilarity && adjustedSimilarity >= 0.6) {
                bestSimilarity = adjustedSimilarity
                bestMatch = {
                    platform: 'apple',
                    title: episodeTitle,
                    url: episode.trackViewUrl || `https://podcasts.apple.com/podcast/id${APPLE_PODCAST_ID}`,
                    similarity: adjustedSimilarity
                }
            }
        }

        console.log('[Apple] Best match:', bestMatch?.title, 'similarity:', bestSimilarity)
        return bestMatch
    } catch (error) {
        console.error('[Apple] Error:', error)
        return null
    }
}

/**
 * Get Spotify access token using Client Credentials flow
 */
async function getSpotifyToken(): Promise<string | null> {
    const clientId = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

    if (!clientId || !clientSecret) {
        console.log('Spotify credentials not configured')
        return null
    }

    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
            },
            body: 'grant_type=client_credentials'
        })

        if (!response.ok) {
            console.error('Spotify auth error:', response.status)
            return null
        }

        const data = await response.json() as { access_token?: string }
        return data.access_token || null
    } catch (error) {
        console.error('Error getting Spotify token:', error)
        return null
    }
}

/**
 * Search Spotify for an episode by title
 */
export async function searchSpotify(title: string): Promise<SearchResult | null> {
    try {
        const token = await getSpotifyToken()
        if (!token) return null

        // Get episodes from the show
        const response = await fetch(
            `https://api.spotify.com/v1/shows/${SPOTIFY_SHOW_ID}/episodes?limit=50&market=US`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        )

        if (!response.ok) {
            console.error('Spotify API error:', response.status)
            return null
        }

        const data = await response.json() as { items?: any[] }

        if (!data.items || data.items.length === 0) {
            return null
        }

        const normalizedSearch = normalizeTitle(title)

        // Find best matching episode
        let bestMatch: SearchResult | null = null
        let bestSimilarity = 0

        for (const episode of data.items) {
            const episodeTitle = episode.name || ''
            const normalizedEpisode = normalizeTitle(episodeTitle)

            const similarity = calculateSimilarity(normalizedSearch, normalizedEpisode)

            const containsMatch = normalizedEpisode.includes(normalizedSearch) ||
                normalizedSearch.includes(normalizedEpisode)

            const adjustedSimilarity = containsMatch ? Math.max(similarity, 0.85) : similarity

            if (adjustedSimilarity > bestSimilarity && adjustedSimilarity >= 0.6) {
                bestSimilarity = adjustedSimilarity
                bestMatch = {
                    platform: 'spotify',
                    title: episodeTitle,
                    url: episode.external_urls?.spotify || `https://open.spotify.com/episode/${episode.id}`,
                    similarity: adjustedSimilarity
                }
            }
        }

        return bestMatch
    } catch (error) {
        console.error('Error searching Spotify:', error)
        return null
    }
}

/**
 * Search YouTube for a video by title on the channel
 * Returns both YouTube and YouTube Music URLs (same video ID)
 */
export async function searchYouTube(title: string): Promise<{
    youtube: SearchResult | null
    youtubeMusic: SearchResult | null
}> {
    const { YOUTUBE_API_KEY, YOUTUBE_CHANNEL_ID } = await import('./youtube')

    if (!YOUTUBE_API_KEY) {
        console.log('YouTube API key not configured')
        return { youtube: null, youtubeMusic: null }
    }

    try {
        // Search for videos on the channel by title
        const searchQuery = encodeURIComponent(title)
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${YOUTUBE_CHANNEL_ID}&q=${searchQuery}&type=video&maxResults=10&key=${YOUTUBE_API_KEY}`
        )

        if (!response.ok) {
            console.error('YouTube API error:', response.status)
            return { youtube: null, youtubeMusic: null }
        }

        const data = await response.json() as {
            items?: Array<{
                id: { videoId: string }
                snippet: { title: string }
            }>
        }

        if (!data.items || data.items.length === 0) {
            return { youtube: null, youtubeMusic: null }
        }

        const normalizedSearch = normalizeTitle(title)

        // Find best matching video
        let bestMatch: { videoId: string; title: string; similarity: number } | null = null
        let bestSimilarity = 0

        for (const item of data.items) {
            const videoTitle = item.snippet.title || ''
            const normalizedVideo = normalizeTitle(videoTitle)

            const similarity = calculateSimilarity(normalizedSearch, normalizedVideo)

            const containsMatch = normalizedVideo.includes(normalizedSearch) ||
                normalizedSearch.includes(normalizedVideo)

            const adjustedSimilarity = containsMatch ? Math.max(similarity, 0.85) : similarity

            if (adjustedSimilarity > bestSimilarity && adjustedSimilarity >= 0.6) {
                bestSimilarity = adjustedSimilarity
                bestMatch = {
                    videoId: item.id.videoId,
                    title: videoTitle,
                    similarity: adjustedSimilarity
                }
            }
        }

        if (!bestMatch) {
            return { youtube: null, youtubeMusic: null }
        }

        // Return both YouTube and YouTube Music URLs (same video ID)
        return {
            youtube: {
                platform: 'apple', // Type hack - we'll handle this in the route
                title: bestMatch.title,
                url: `https://www.youtube.com/watch?v=${bestMatch.videoId}`,
                similarity: bestMatch.similarity
            },
            youtubeMusic: {
                platform: 'apple', // Type hack
                title: bestMatch.title,
                url: `https://music.youtube.com/watch?v=${bestMatch.videoId}`,
                similarity: bestMatch.similarity
            }
        }
    } catch (error) {
        console.error('Error searching YouTube:', error)
        return { youtube: null, youtubeMusic: null }
    }
}

/**
 * Search all platforms for a shiur by title
 */
export async function searchAllPlatforms(title: string): Promise<{
    apple: SearchResult | null
    spotify: SearchResult | null
    youtube: SearchResult | null
    youtubeMusic: SearchResult | null
}> {
    const [apple, spotify, ytResults] = await Promise.all([
        searchApplePodcasts(title),
        searchSpotify(title),
        searchYouTube(title)
    ])

    return {
        apple,
        spotify,
        youtube: ytResults.youtube,
        youtubeMusic: ytResults.youtubeMusic
    }
}

