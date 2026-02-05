import { NextResponse } from 'next/server'
import { getD1Database, getDb } from '@/lib/db'
import { customPlaylists, customPlaylistItems } from '@/lib/schema'
import { desc, sql, eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const d1 = await getD1Database()
        if (!d1) {
            return NextResponse.json({ error: 'Database not available' }, { status: 500 })
        }
        const db = getDb(d1)

        // Fetch playlists with item count
        const playlists = await db.select({
            id: customPlaylists.id,
            title: customPlaylists.title,
            description: customPlaylists.description,
            category: customPlaylists.category,
            createdAt: customPlaylists.createdAt,
            updatedAt: customPlaylists.updatedAt,
            itemCount: sql<number>`count(${customPlaylistItems.id})`
        })
            .from(customPlaylists)
            .leftJoin(customPlaylistItems, eq(customPlaylists.id, customPlaylistItems.playlistId))
            .groupBy(customPlaylists.id)
            .orderBy(desc(customPlaylists.updatedAt))
            .all()

        return NextResponse.json(playlists)
    } catch (error: any) {
        console.error('Error fetching playlists:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const d1 = await getD1Database()
        if (!d1) {
            return NextResponse.json({ error: 'Database not available' }, { status: 500 })
        }
        const db = getDb(d1)

        const body = await request.json() as { title?: string, description?: string, category?: string }
        const { title, description, category } = body

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 })
        }

        const newPlaylist = await db.insert(customPlaylists).values({
            title,
            description,
            category
        }).returning().get()

        return NextResponse.json(newPlaylist)
    } catch (error: any) {
        console.error('Error creating playlist:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
