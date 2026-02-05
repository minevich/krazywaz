import { NextResponse } from 'next/server'
import { getD1Database, getDb } from '@/lib/db'
import { customPlaylists, customPlaylistItems, shiurim } from '@/lib/schema'
import { eq, asc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const d1 = await getD1Database()
        if (!d1) {
            return NextResponse.json({ error: 'Database not available' }, { status: 500 })
        }
        const db = getDb(d1)
        const { id } = await params

        // Get playlist metadata
        const playlist = await db.select()
            .from(customPlaylists)
            .where(eq(customPlaylists.id, id))
            .get()

        if (!playlist) {
            return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
        }

        // Get playlist items with Shiur details
        const items = await db.select({
            id: customPlaylistItems.id,
            playlistId: customPlaylistItems.playlistId,
            shiurId: customPlaylistItems.shiurId,
            position: customPlaylistItems.position,
            addedAt: customPlaylistItems.addedAt,
            // Shiur details
            title: shiurim.title,
            thumbnail: shiurim.thumbnail,
            duration: shiurim.duration,
            date: shiurim.pubDate,
            slug: shiurim.slug
        })
            .from(customPlaylistItems)
            .innerJoin(shiurim, eq(customPlaylistItems.shiurId, shiurim.id))
            .where(eq(customPlaylistItems.playlistId, id))
            .orderBy(asc(customPlaylistItems.position))
            .all()

        return NextResponse.json({
            ...playlist,
            items
        })
    } catch (error: any) {
        console.error('Error fetching playlist details:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const d1 = await getD1Database()
        if (!d1) {
            return NextResponse.json({ error: 'Database not available' }, { status: 500 })
        }
        const db = getDb(d1)
        const { id } = await params

        const body = await request.json() as { title?: string, description?: string, category?: string }
        const { title, description, category } = body

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 })
        }

        const updated = await db.update(customPlaylists)
            .set({
                title,
                description,
                category,
                updatedAt: new Date()
            })
            .where(eq(customPlaylists.id, id))
            .returning()
            .get()

        return NextResponse.json(updated)
    } catch (error: any) {
        console.error('Error updating playlist:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const d1 = await getD1Database()
        if (!d1) {
            return NextResponse.json({ error: 'Database not available' }, { status: 500 })
        }
        const db = getDb(d1)
        const { id } = await params

        await db.delete(customPlaylists)
            .where(eq(customPlaylists.id, id))
            .execute()

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error deleting playlist:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
