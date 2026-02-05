import { NextResponse } from 'next/server'
import { getD1Database, getDb } from '@/lib/db'
import { cachedPlaylists } from '@/lib/schema'

export async function GET() {
    try {
        const d1 = await getD1Database()
        if (!d1) {
            return NextResponse.json({ error: 'Database not available' }, { status: 500 })
        }
        const db = getDb(d1)

        const playlists = await db.select().from(cachedPlaylists).all()

        return NextResponse.json({
            count: playlists.length,
            playlists: playlists.map(p => ({
                id: p.id,
                title: p.title,
                category: p.category,
                videoCount: p.videoCount
            }))
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
