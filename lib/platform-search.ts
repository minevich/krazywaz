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

        const response = await fetch(feedUrl, {
            headers: { 'Accept': 'application/json' }
        })

        if (!response.ok) {
            console.error('Apple Podcasts API error:', response.status)
            return null
        }

        const data = await response.json() as { results?: any[] }

        if (!data.results || data.results.length === 0) {
            return null
        }

        // Skip first result (it's the podcast itself, not an episode)
        const episodes = data.results.slice(1)

        const normalizedSearch = normalizeTitle(title)

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

        return bestMatch
    } catch (error) {
        console.error('Error searching Apple Podcasts:', error)
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
 * Search all platforms for a shiur by title
 */
export async function searchAllPlatforms(title: string): Promise<{
    apple: SearchResult | null
    spotify: SearchResult | null
}> {
    const [apple, spotify] = await Promise.all([
        searchApplePodcasts(title),
        searchSpotify(title)
    ])

    return { apple, spotify }
}
