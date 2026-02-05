import { NextResponse } from 'next/server'
import { getD1Database, getDb } from '@/lib/db'
import { cachedPlaylists } from '@/lib/schema'
import { YOUTUBE_API_KEY, YOUTUBE_CHANNEL_ID } from '@/lib/youtube'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Try to get cached playlists from database first
    const d1 = await getD1Database()

    if (d1) {
      const db = getDb(d1)
      const cached = await db.select().from(cachedPlaylists).all()

      if (cached.length > 0) {
        // Return cached data
        const playlists = cached.map(p => ({
          id: p.id,
          title: p.title,
          description: p.description || '',
          thumbnail: p.thumbnail || '',
          videoCount: p.videoCount || 0,
          playlistUrl: p.playlistUrl || `https://www.youtube.com/playlist?list=${p.id}`,
          category: p.category,
        }))
        return NextResponse.json(playlists)
      }
    }

    // Fallback: Fetch from YouTube API if no cache
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
      return NextResponse.json([])
    }

    const playlists = playlistsData.items.map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      videoCount: item.contentDetails?.itemCount || 0,
      publishedAt: item.snippet.publishedAt,
      playlistUrl: `https://www.youtube.com/playlist?list=${item.id}`,
    }))

    return NextResponse.json(playlists)
  } catch (error: any) {
    console.error('Error fetching playlists:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch playlists' },
      { status: 500 }
    )
  }
}
