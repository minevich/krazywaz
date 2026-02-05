import { NextResponse } from 'next/server'
import { getD1Database, getDb } from '@/lib/db'
import { cachedPlaylists } from '@/lib/schema'
import { eq } from 'drizzle-orm'

// GET - Fetch all playlists categorized as 'Holidays'
export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const d1 = await getD1Database()
        if (!d1) {
            return NextResponse.json({ error: 'Database not available' }, { status: 500 })
        }
        const db = getDb(d1)

        const holidayPlaylists = await db
            .select()
            .from(cachedPlaylists)
            .where(eq(cachedPlaylists.category, 'Holidays'))
            .all()

        // Sort by title? Or manual order?
        // For now, allow frontend to sort or just default sort

        return NextResponse.json({
            playlists: holidayPlaylists
        })
    } catch (error: any) {
        console.error('Error fetching holiday playlists:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
