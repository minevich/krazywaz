import { NextResponse } from 'next/server'
import { getD1Database, getDb } from '@/lib/db'
import { customPlaylistItems, customPlaylists } from '@/lib/schema'
import { eq, sql, inArray } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

// Add items to playlist
export async function POST(
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
        const playlistId = id

        const body = await request.json() as { shiurIds?: string[] }
        const { shiurIds } = body // Array of shiur IDs to add

        if (!shiurIds || !Array.isArray(shiurIds) || shiurIds.length === 0) {
            return NextResponse.json({ error: 'shiurIds array is required' }, { status: 400 })
        }

        // Get current max position
        const result = await db.select({
            maxPos: sql<number>`max(${customPlaylistItems.position})`
        })
            .from(customPlaylistItems)
            .where(eq(customPlaylistItems.playlistId, playlistId))
            .get()

        let nextPos = (result?.maxPos || 0) + 1

        const itemsToInsert = shiurIds.map((shiurId, index) => ({
            playlistId,
            shiurId,
            position: nextPos + index
        }))

        // Verify shiurim exist? (Optional, DB will constrain if FK set, but Drizzle might not enforce unless using `run_command` with constraints enabled in SQLite. Assume safe for now.)

        // Insert items
        const inserted = await db.insert(customPlaylistItems)
            .values(itemsToInsert)
            .returning()
            .all()

        // Update playlist updatedAt
        await db.update(customPlaylists)
            .set({ updatedAt: new Date() })
            .where(eq(customPlaylists.id, playlistId))
            .execute()

        return NextResponse.json(inserted)
    } catch (error: any) {
        console.error('Error adding playlist items:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// Reorder items
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
        const playlistId = id

        const body = await request.json() as { items?: { id: string, position: number }[] }
        const { items } = body // Array of { id: string, position: number }

        if (!items || !Array.isArray(items)) {
            return NextResponse.json({ error: 'items array is required' }, { status: 400 })
        }

        // Batch update is hard with SQLite/Drizzle in one query.
        // We'll loop through. Transaction recommended.

        await db.transaction(async (tx) => {
            for (const item of items) {
                await tx.update(customPlaylistItems)
                    .set({ position: item.position })
                    .where(eq(customPlaylistItems.id, item.id))
                    .run() // Using .run() for transaction steps
            }

            // Update playlist updatedAt
            await tx.update(customPlaylists)
                .set({ updatedAt: new Date() })
                .where(eq(customPlaylists.id, playlistId))
                .run()
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error reordering playlist items:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// Remove item(s) endpoint
// Since DELETE usually doesn't take a body universally in some clients, we might check Query params or path.
// But we created this route for "items".
// Maybe creating /api/admin/playlists/[id]/items/[itemId] is cleaner for single delete.
// But for batch delete, passing IDs in body of DELETE request is allowed by spec but not always supported.
// I'll assume we delete single item via `DELETE /api/admin/playlists/[id]/items/[itemId]`
// Or I can accept DELETE with body here. I'll implement DELETE here with body for now as it's an admin internal API.

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
        // playlistId = id

        // Get itemId from query param ?itemId=...
        const { searchParams } = new URL(request.url)
        const itemId = searchParams.get('itemId')

        if (!itemId) {
            return NextResponse.json({ error: 'itemId query param required' }, { status: 400 })
        }

        await db.delete(customPlaylistItems)
            .where(eq(customPlaylistItems.id, itemId))
            .execute()

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error deleting playlist item:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
